from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import uuid

# Import from logger instead of defining here
from app.core.logger import (
    StructuredLogger, 
    get_request_id, 
    get_user_id, 
    set_request_id, 
    set_user_id
)

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate or get request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        set_request_id(request_id)
        
        # Add to request state
        request.state.request_id = request_id
        
        # Continue processing
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Start time
        start_time = time.time()
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Get request ID
        request_id = get_request_id()
        
        # Log request start
        StructuredLogger.info(
            "Request started",
            endpoint=request.url.path,
            method=request.method,
            client_ip=client_ip,
            query_params=dict(request.query_params)
        )
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log request completion
            StructuredLogger.info(
                "Request completed",
                endpoint=request.url.path,
                method=request.method,
                status_code=response.status_code,
                duration=f"{duration:.3f}s",
                response_size=len(response.body) if hasattr(response, 'body') else 0
            )
            
            return response
            
        except Exception as exc:
            # Log unhandled exception
            duration = time.time() - start_time
            
            StructuredLogger.error(
                "Unhandled exception in request",
                error=exc,
                endpoint=request.url.path,
                method=request.method,
                duration=f"{duration:.3f}s"
            )
            
            raise