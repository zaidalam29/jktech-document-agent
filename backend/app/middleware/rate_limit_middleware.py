from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
import time
import redis
from typing import Dict, Optional

from app.core.config import settings
from app.core.logger import StructuredLogger
from app.middleware.request_middleware import get_request_id

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        self._init_redis()
        self.memory_cache: Dict[str, list] = {}
        
    def _init_redis(self):
        """Initialize Redis connection if available"""
        try:
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.redis_client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=5,
                    retry_on_timeout=True
                )
                # Test connection
                self.redis_client.ping()
                StructuredLogger.info("Redis connected for rate limiting")
            else:
                StructuredLogger.warning("Redis not configured, using in-memory rate limiting")
                self.redis_client = None
        except Exception as e:
            StructuredLogger.warning(f"Redis connection failed: {e}, using in-memory rate limiting")
            self.redis_client = None
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limit(request):
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_identifier(request)
        
        # Check rate limit
        if not await self._check_rate_limit(client_id, request):
            return self._rate_limit_exceeded_response(request)
        
        # Process request
        return await call_next(request)
    
    def _should_skip_rate_limit(self, request: Request) -> bool:
        """Check if rate limiting should be skipped for this request"""
        skip_paths = ['/docs', '/redoc', '/openapi.json', '/health', '/']
        
        # Skip in development mode
        if settings.DEBUG:
            return True
        
        # Skip for certain paths
        if request.url.path in skip_paths:
            return True
        
        return False
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique identifier for client"""
        # Try to get API key first
        api_key = request.headers.get('X-API-Key') or request.headers.get('Authorization')
        if api_key:
            return f"api_key:{api_key[:20]}"
        
        # Fallback to IP
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"
    
    async def _check_rate_limit(self, client_id: str, request: Request) -> bool:
        """Check if client has exceeded rate limit"""
        limit_type = self._get_limit_type(request)
        limit = self._get_limit(limit_type)
        window = 60  # 1 minute window
        
        if self.redis_client:
            return self._check_redis_rate_limit(client_id, limit_type, limit, window)
        else:
            return self._check_memory_rate_limit(client_id, limit_type, limit, window)
    
    def _check_redis_rate_limit(self, client_id: str, limit_type: str, limit: int, window: int) -> bool:
        """Check rate limit using Redis"""
        try:
            key = f"ratelimit:{client_id}:{limit_type}"
            
            # Use Redis pipeline for atomic operations
            pipeline = self.redis_client.pipeline()
            current_time = int(time.time())
            
            # Remove old entries
            pipeline.zremrangebyscore(key, 0, current_time - window)
            
            # Get current count
            pipeline.zcard(key)
            
            # Add current request
            pipeline.zadd(key, {str(current_time): current_time})
            
            # Set expiry
            pipeline.expire(key, window)
            
            results = pipeline.execute()
            current_count = results[1] if len(results) > 1 else 0
            
            return current_count < limit
            
        except Exception as e:
            StructuredLogger.error(f"Redis rate limit error: {e}")
            # Fallback to memory
            return self._check_memory_rate_limit(client_id, limit_type, limit, window)
    
    def _check_memory_rate_limit(self, client_id: str, limit_type: str, limit: int, window: int) -> bool:
        """Check rate limit using in-memory storage"""
        current_time = time.time()
        key = f"{client_id}:{limit_type}"
        
        if key not in self.memory_cache:
            self.memory_cache[key] = []
        
        # Remove old timestamps
        self.memory_cache[key] = [
            t for t in self.memory_cache[key] 
            if current_time - t < window
        ]
        
        # Check limit
        if len(self.memory_cache[key]) >= limit:
            return False
        
        # Add current timestamp
        self.memory_cache[key].append(current_time)
        
        # Clean up old keys (optional, for memory management)
        if len(self.memory_cache) > 10000:
            self._cleanup_memory_cache()
        
        return True
    
    def _cleanup_memory_cache(self):
        """Clean up old entries from memory cache"""
        current_time = time.time()
        window = 60
        
        keys_to_delete = []
        for key, timestamps in self.memory_cache.items():
            # Remove timestamps older than window
            self.memory_cache[key] = [
                t for t in timestamps 
                if current_time - t < window
            ]
            
            # Mark for deletion if empty
            if not self.memory_cache[key]:
                keys_to_delete.append(key)
        
        # Delete empty keys
        for key in keys_to_delete:
            del self.memory_cache[key]
    
    def _get_limit_type(self, request: Request) -> str:
        """Get rate limit type based on request"""
        if request.url.path.startswith('/api/v1/auth'):
            return 'auth'
        elif request.url.path.startswith('/api/v1/upload'):
            return 'upload'
        elif request.method == 'POST':
            return 'write'
        else:
            return 'read'
    
    def _get_limit(self, limit_type: str) -> int:
        """Get rate limit based on type"""
        limits = {
            'auth': 10,      # 10 requests per minute for auth
            'upload': 5,     # 5 uploads per minute
            'write': 50,     # 50 write requests per minute
            'read': 200      # 200 read requests per minute
        }
        return limits.get(limit_type, 100)
    
    def _rate_limit_exceeded_response(self, request: Request) -> JSONResponse:
        """Return rate limit exceeded response"""
        request_id = get_request_id()
        
        StructuredLogger.warning(
            "Rate limit exceeded",
            request_id=request_id,
            endpoint=request.url.path,
            method=request.method,
            client_ip=request.client.host if request.client else "unknown"
        )
        
        return JSONResponse(
            status_code=HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "request_id": request_id,
                    "retry_after": 60  # Retry after 60 seconds
                }
            },
            headers={
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time() + 60)),
                "Retry-After": "60"
            }
        )