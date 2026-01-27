from pydantic_settings import BaseSettings
from pathlib import Path
from functools import lru_cache
from typing import List, Optional
from urllib.parse import quote_plus
import json
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "JKtech Book Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    PORT: int = 8000  # ADD THIS
    
    # Database Settings (PostgreSQL)
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "password")  # FIXED: Changed from POSTGRES_USER
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "book_management")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))  # FIXED: Convert to int
    
    # Direct Database URL (optional - will be constructed if not provided)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    UPLOAD_DIR: str = "uploads/documents"
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".txt"]
    MAX_FILE_SIZE_MB: int = 50
    
    def get_upload_path(self) -> Path:
        """Get absolute upload path"""
        path = Path(self.UPLOAD_DIR)
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)
        return path
    
    @property
    def get_database_url(self) -> str:
        """Construct database URL with proper encoding for special characters"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        # Encode password to handle special characters
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        
        return (
            f"postgresql://{self.POSTGRES_USER}:{encoded_password}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )
    
    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Redis Settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    
    @property
    def get_redis_url(self) -> str:
        """Construct Redis URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # AI Service Settings (OpenRouter)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "openai/gpt-3.5-turbo")
    AI_MAX_TOKENS: int = int(os.getenv("AI_MAX_TOKENS", "2000"))
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))
    
    # CORS Settings - FIXED: Provide default value and proper parsing
    BACKEND_CORS_ORIGINS_STR: str = os.getenv(
        "BACKEND_CORS_ORIGINS", 
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from string"""
        origins = []
        if self.BACKEND_CORS_ORIGINS_STR:
            # Split by comma and strip whitespace
            origins = [origin.strip() for origin in self.BACKEND_CORS_ORIGINS_STR.split(",")]
        return origins
    
    # Logging Settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()