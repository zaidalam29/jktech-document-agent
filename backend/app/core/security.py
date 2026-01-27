from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
from functools import wraps
from fastapi import HTTPException, Request
import time

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
    

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
            key = f"ratelimit:{client_ip}:{func.__name__}"
            
            # Simple in-memory rate limiting for now
            # In production, use Redis
            current_time = time.time()
            request_count = getattr(request.app.state, 'rate_limits', {}).get(key, [])
            
            # Remove old requests
            request_count = [t for t in request_count if current_time - t < period]
            
            if len(request_count) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Try again in {period} seconds."
                )
            
            # Add current request
            request_count.append(current_time)
            if not hasattr(request.app.state, 'rate_limits'):
                request.app.state.rate_limits = {}
            request.app.state.rate_limits[key] = request_count
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator    