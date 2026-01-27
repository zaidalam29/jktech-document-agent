from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError, HTTPException
from contextlib import asynccontextmanager
from datetime import datetime

from app.core.config import settings
from app.core.logger import logger
from app.core.init_db import init_db
from app.api.v1.api import api_router
from dotenv import load_dotenv
import os
load_dotenv()

# Import from error_handlers
from app.core.error_handlers import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    DatabaseError,
    ExternalServiceError,
    health_check,
    get_request_id
)

# Import middleware
from app.middleware.request_middleware import (
    RequestIDMiddleware,
    RequestLoggingMiddleware
)
from app.middleware.rate_limit_middleware import RateLimitMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info(f"{'='*60}")
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"{'='*60}")
    
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {str(e)}")
        raise
    
    # Startup completed
    logger.info("Application startup completed")
    
    yield
    
    # Shutdown
    logger.info("Application shutdown started")
    # Add any cleanup logic here
    logger.info("Application shutdown completed")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Book Management System with AI-powered features",
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None
)

# Add exception handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(AppError, global_exception_handler)
app.add_exception_handler(ValidationError, global_exception_handler)
app.add_exception_handler(AuthenticationError, global_exception_handler)
app.add_exception_handler(AuthorizationError, global_exception_handler)
app.add_exception_handler(NotFoundError, global_exception_handler)
app.add_exception_handler(RateLimitError, global_exception_handler)
app.add_exception_handler(ServiceUnavailableError, global_exception_handler)
app.add_exception_handler(DatabaseError, global_exception_handler)
app.add_exception_handler(ExternalServiceError, global_exception_handler)

# Add middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Add rate limiting only in production
if not settings.DEBUG and settings.ENVIRONMENT != "test":
    app.add_middleware(RateLimitMiddleware)

# Configure CORS - FIXED: Property access (no parentheses)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,  # FIXED: Property, not method
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID", 
        "X-Error-Code",
        "X-RateLimit-Limit", 
        "X-RateLimit-Remaining", 
        "X-RateLimit-Reset",
        "Retry-After"
    ]
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs" if settings.DEBUG else None,
        "health": "/health",
        "status": "operational"
    }

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health():
    """Comprehensive health check"""
    return await health_check()

# Simple ping endpoint
@app.get("/ping", tags=["Health"])
async def ping():
    """Simple ping endpoint for load balancers"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": settings.PROJECT_NAME
    }

# API info endpoint
@app.get("/api/info", tags=["Api"])
async def api_info(request: Request):
    """Get API information"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "base_path": settings.API_V1_STR,
        "request_id": get_request_id(),
        "features": {
            "authentication": True,
            "book_management": True,
            "document_ingestion": True,
            "ai_qa": True,
            "recommendations": True,
            "rate_limiting": not settings.DEBUG,
            "error_tracking": True,
            "structured_logging": True
        },
        "endpoints": {
            "auth": f"{settings.API_V1_STR}/auth",
            "books": f"{settings.API_V1_STR}/books",
            "ingestion": f"{settings.API_V1_STR}/ingestion",
            "qa": f"{settings.API_V1_STR}/qa",
            "recommendations": f"{settings.API_V1_STR}/recommendations"
        }
    }

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT if hasattr(settings, 'PORT') else 8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
        proxy_headers=True,
        forwarded_allow_ips="*",
        timeout_keep_alive=30
    )