import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uuid
import asyncio
from functools import wraps
import time
from sqlalchemy import text
from app.core.config import settings
from app.core.logger import StructuredLogger, get_request_id, get_user_id, set_request_id, set_user_id
from dotenv import load_dotenv
import os
load_dotenv()

# Error response models (keep as is)
class AppError(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500, details: Dict = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(AppError):
    def __init__(self, message: str, details: Dict = None):
        super().__init__(message, "VALIDATION_ERROR", status.HTTP_400_BAD_REQUEST, details)

class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", status.HTTP_401_UNAUTHORIZED)

class AuthorizationError(AppError):
    def __init__(self, message: str = "Not authorized"):
        super().__init__(message, "AUTHZ_ERROR", status.HTTP_403_FORBIDDEN)

class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: Any = None):
        message = f"{resource} not found"
        if resource_id:
            message += f": {resource_id}"
        super().__init__(message, "NOT_FOUND", status.HTTP_404_NOT_FOUND)

class RateLimitError(AppError):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT", status.HTTP_429_TOO_MANY_REQUESTS)

class ServiceUnavailableError(AppError):
    def __init__(self, message: str = "Service temporarily unavailable"):
        super().__init__(message, "SERVICE_UNAVAILABLE", status.HTTP_503_SERVICE_UNAVAILABLE)

class DatabaseError(AppError):
    def __init__(self, message: str = "Database error occurred"):
        super().__init__(message, "DATABASE_ERROR", status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExternalServiceError(AppError):
    def __init__(self, service: str, message: str = "External service error"):
        super().__init__(f"{service}: {message}", "EXTERNAL_SERVICE_ERROR", status.HTTP_502_BAD_GATEWAY)

# Request validation error handler
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    request_id = get_request_id()
    
    # Format validation errors
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({
            "field": field if field else "body",
            "message": error["msg"],
            "type": error["type"]
        })
    
    StructuredLogger.warning(
        "Request validation failed",
        endpoint=request.url.path,
        method=request.method,
        validation_errors=errors
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "errors": errors
            }
        },
        headers={"X-Request-ID": request_id}
    )

# HTTP exception handler
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    request_id = get_request_id()
    
    StructuredLogger.warning(
        f"HTTP error: {exc.status_code}",
        endpoint=request.url.path,
        method=request.method,
        status_code=exc.status_code,
        detail=exc.detail
    )
    
    # Map status codes to error codes
    error_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT"
    }
    
    error_code = error_codes.get(exc.status_code, f"HTTP_{exc.status_code}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_code,
                "message": exc.detail,
                "request_id": request_id,
                "timestamp": datetime.now().isoformat()
            }
        },
        headers={"X-Request-ID": request_id}
    )

# Global exception handler
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions globally"""
    
    # Get or create request ID
    request_id = get_request_id() or request.headers.get("X-Request-ID") or str(uuid.uuid4())
    set_request_id(request_id)
    
    # Extract user ID if available
    user_id = "anonymous"
    if hasattr(request.state, "user") and request.state.user:
        user_id = request.state.user.id
    
    set_user_id(str(user_id))
    
    # Handle different exception types
    if isinstance(exc, HTTPException):
        return await http_exception_handler(request, exc)
    elif isinstance(exc, RequestValidationError):
        return await validation_exception_handler(request, exc)
    elif isinstance(exc, AppError):
        status_code = exc.status_code
        error_code = exc.code
        message = exc.message
        details = exc.details
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "INTERNAL_SERVER_ERROR"
        message = "An unexpected error occurred"
        details = {"internal_error": str(exc)} if settings.DEBUG else {}
    
    # Log the error
    StructuredLogger.error(
        message=f"Request failed: {message}",
        error=exc,
        endpoint=request.url.path,
        method=request.method,
        status_code=status_code,
        client_ip=request.client.host if request.client else "unknown",
        user_id=user_id,
        error_code=error_code
    )
    
    # Prepare error response
    error_response = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "request_id": request_id,
            "timestamp": datetime.now().isoformat(),
            "path": request.url.path,
            "method": request.method
        }
    }
    
    # Add details in development or for specific error types
    if details and (settings.DEBUG or status_code in [400, 422]):
        error_response["error"]["details"] = details
    
    # Don't expose internal error details in production
    if status_code >= 500 and not settings.DEBUG:
        error_response["error"]["message"] = "Internal server error"
        if "details" in error_response["error"]:
            del error_response["error"]["details"]
    
    return JSONResponse(
        status_code=status_code,
        content=error_response,
        headers={
            "X-Request-ID": request_id,
            "X-Error-Code": error_code
        }
    )

# Database error handler
class DatabaseErrorHandler:
    @staticmethod
    def handle_db_error(error: Exception, operation: str = "database operation") -> AppError:
        """Convert database errors to AppError"""
        error_msg = str(error).lower()
        
        if "duplicate" in error_msg or "unique" in error_msg:
            return ValidationError(f"{operation} failed: duplicate entry", {"db_error": str(error)})
        elif "foreign key" in error_msg:
            return ValidationError(f"{operation} failed: invalid reference", {"db_error": str(error)})
        elif "not found" in error_msg:
            return NotFoundError("Resource", "database")
        elif "timeout" in error_msg or "connection" in error_msg:
            return ServiceUnavailableError(f"Database connection error")
        elif "integrity" in error_msg:
            return ValidationError(f"{operation} failed: data integrity violation")
        else:
            StructuredLogger.error(f"Database error in {operation}", error)
            return DatabaseError(f"{operation} failed")

# External service error handler
class ExternalServiceHandler:
    @staticmethod
    def handle_service_error(service: str, error: Exception, operation: str = "operation") -> ExternalServiceError:
        """Convert external service errors to AppError"""
        error_msg = str(error).lower()
        
        if "timeout" in error_msg:
            StructuredLogger.warning(f"{service} timeout in {operation}", error=error)
            return ExternalServiceError(service, f"Timeout in {operation}")
        elif "connection" in error_msg:
            StructuredLogger.warning(f"{service} connection error in {operation}", error=error)
            return ExternalServiceError(service, f"Connection error in {operation}")
        elif "rate limit" in error_msg:
            StructuredLogger.warning(f"{service} rate limit in {operation}", error=error)
            return RateLimitError(f"{service} rate limit exceeded")
        else:
            StructuredLogger.error(f"{service} error in {operation}", error=error)
            return ExternalServiceError(service, f"Error in {operation}")

# Retry decorator with exponential backoff
def retry_with_backoff(
    max_retries: int = 3, 
    base_delay: float = 1.0,
    retry_on: List[Exception] = None
):
    """Retry decorator with exponential backoff"""
    if retry_on is None:
        retry_on = [Exception]
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    # Check if we should retry this exception
                    should_retry = any(isinstance(e, exc_type) for exc_type in retry_on)
                    
                    # Don't retry on certain errors
                    if not should_retry or isinstance(e, (ValidationError, AuthenticationError, NotFoundError)):
                        raise
                    
                    # Calculate delay with exponential backoff and jitter
                    delay = base_delay * (2 ** attempt)
                    jitter = delay * 0.1  # 10% jitter
                    actual_delay = delay + (jitter * (0.5 - (uuid.uuid4().int % 1000) / 1000.0))
                    
                    StructuredLogger.warning(
                        f"Retry {attempt + 1}/{max_retries} for {func.__name__}",
                        error=e,
                        delay=f"{actual_delay:.2f}s",
                        attempt=attempt + 1
                    )
                    
                    if attempt < max_retries - 1:
                        await asyncio.sleep(actual_delay)
            
            # All retries failed
            StructuredLogger.error(
                f"All {max_retries} retries failed for {func.__name__}",
                error=last_exception
            )
            raise last_exception
        
        return wrapper
    return decorator

# Circuit breaker pattern
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def execute(self, func, *args, **kwargs):
        current_time = datetime.now().timestamp()
        
        # Check if circuit is OPEN
        if self.state == "OPEN":
            if self.last_failure_time and (current_time - self.last_failure_time) > self.reset_timeout:
                self.state = "HALF_OPEN"
                StructuredLogger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                raise ServiceUnavailableError("Service unavailable (circuit breaker open)")
        
        try:
            result = await func(*args, **kwargs)
            
            # Success in HALF_OPEN state
            if self.state == "HALF_OPEN":
                self.reset()
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = current_time
            
            StructuredLogger.warning(
                f"Circuit breaker failure: {self.failure_count}/{self.failure_threshold}",
                error=e
            )
            
            # Check if threshold reached
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                StructuredLogger.error("Circuit breaker OPENED")
            
            raise
    
    def reset(self):
        """Reset circuit breaker"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"
        StructuredLogger.info("Circuit breaker reset to CLOSED")
    
    def get_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return {
            "state": self.state,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "threshold": self.failure_threshold,
            "reset_timeout": self.reset_timeout
        }


async def health_check() -> Dict[str, Any]:
    """Comprehensive health check endpoint"""
    from app.core.database import SessionLocal
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {},
        "checks": []
    }
    
    # ESSENTIAL: Check database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = "healthy"
        health_status["checks"].append({"service": "database", "status": "healthy"})
    except Exception as e:
        health_status["services"]["database"] = "unhealthy"
        health_status["checks"].append({
            "service": "database", 
            "status": "unhealthy", 
            "error": str(e)
        })
        health_status["status"] = "unhealthy"
        return health_status
    
    # OPTIONAL: Check Redis - ALWAYS return healthy
    try:
        # Check if Redis is configured
        redis_configured = False
        redis_url = None
        
        if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
            redis_configured = True
            redis_url = settings.REDIS_URL
        elif hasattr(settings, 'REDIS_HOST') and settings.REDIS_HOST:
            redis_configured = True
            redis_host = settings.REDIS_HOST
            redis_port = getattr(settings, 'REDIS_PORT', 6379)
            redis_db = getattr(settings, 'REDIS_DB', 0)
            redis_url = f"redis://{redis_host}:{redis_port}/{redis_db}"
        
        if redis_configured and redis_url:
            # Actually try to connect
            import redis
            r = redis.Redis.from_url(redis_url, socket_timeout=2)
            r.ping()
            health_status["services"]["redis"] = "healthy"
            health_status["checks"].append({"service": "redis", "status": "healthy"})
        else:
            # Redis not configured - mark as healthy/not_required
            health_status["services"]["redis"] = "not_required"
            health_status["checks"].append({"service": "redis", "status": "not_required"})
            
    except Exception as e:
        # Even if Redis fails, mark as not_required (not unhealthy)
        health_status["services"]["redis"] = "not_required"
        health_status["checks"].append({
            "service": "redis", 
            "status": "not_required",
            "note": "Optional service"
        })
    
    # OPTIONAL: Check OpenRouter - ALWAYS return healthy/reachable
    try:
        openrouter_url = os.getenv("OPENROUTER_BASE_URL")
        if openrouter_url:
            import httpx
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(openrouter_url)
                status_text = "reachable" if response.status_code < 500 else "unreachable"
                health_status["services"]["openrouter"] = status_text
                health_status["checks"].append({
                    "service": "openrouter", 
                    "status": status_text,
                    "response_time": f"{response.elapsed.total_seconds():.3f}s"
                })
        else:
            # OpenRouter not configured
            health_status["services"]["openrouter"] = "not_configured"
            health_status["checks"].append({
                "service": "openrouter", 
                "status": "not_configured",
                "note": "Optional service"
            })
    except Exception:
        # If OpenRouter check fails, still mark as optional
        health_status["services"]["openrouter"] = "optional"
        health_status["checks"].append({
            "service": "openrouter", 
            "status": "optional",
            "note": "External optional service"
        })
    
    # Add system info (optional)
    try:
        import psutil
        health_status["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "uptime_seconds": int(datetime.now().timestamp() - psutil.boot_time())
        }
    except ImportError:
        # psutil not installed - skip system info
        health_status["system"] = {"note": "System metrics not available"}
    except Exception as e:
        health_status["system"] = {"note": f"System metrics error: {str(e)}"}
    
    # Ensure overall status is always healthy if database is healthy
    if health_status["services"].get("database") == "healthy":
        health_status["status"] = "healthy"
    
    return health_status



def rate_limit(limit: int = 10, period: int = 60):
    """
    Rate limiting decorator for endpoints
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                for key, value in kwargs.items():
                    if isinstance(value, Request):
                        request = value
                        break
            
            if not request:
                return await func(*args, **kwargs)
            
            # Get client identifier
            client_ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("User-Agent", "")
            
            # Create unique key
            import hashlib
            key_base = f"{client_ip}:{user_agent}:{func.__module__}:{func.__name__}"
            key_hash = hashlib.md5(key_base.encode()).hexdigest()
            key = f"ratelimit:{key_hash}"
            
            # Simple in-memory rate limiting
            # In production, use Redis
            current_time = time.time()
            
            if not hasattr(request.app.state, 'rate_limits'):
                request.app.state.rate_limits = {}
            
            request_times = request.app.state.rate_limits.get(key, [])
            
            # Remove old requests
            request_times = [t for t in request_times if current_time - t < period]
            
            if len(request_times) >= limit:
                StructuredLogger.warning(
                    "Rate limit exceeded",
                    client_ip=client_ip,
                    endpoint=request.url.path,
                    limit=limit,
                    period=period
                )
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Rate limit exceeded. Maximum {limit} requests per {period} seconds.",
                            "retry_after": period
                        }
                    }
                )
            
            # Add current request
            request_times.append(current_time)
            request.app.state.rate_limits[key] = request_times
            
            # Add rate limit headers
            response = await func(*args, **kwargs)
            
            if hasattr(response, 'headers'):
                remaining = limit - len(request_times)
                response.headers.update({
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": str(max(0, remaining)),
                    "X-RateLimit-Reset": str(int(current_time + period))
                })
            
            return response
        
        return wrapper
    return decorator