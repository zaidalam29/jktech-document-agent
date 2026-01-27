import logging
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
from contextvars import ContextVar

from app.core.config import settings

# Context variables for structured logging
request_id_var = ContextVar("request_id", default="")
user_id_var = ContextVar("user_id", default="")

# Create base logger
logger = logging.getLogger("book_management")

# Set log level based on config
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logger.setLevel(log_level)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(log_level)

# Create formatters
# Simple formatter for development
simple_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# JSON formatter for production/staging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get()
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)

# Choose formatter based on environment
if settings.ENVIRONMENT in ["production", "staging"]:
    console_handler.setFormatter(JSONFormatter())
else:
    console_handler.setFormatter(simple_formatter)

# Add handler to logger
logger.addHandler(console_handler)

# Prevent duplicate logs
logger.propagate = False

# Structured Logger Class
class StructuredLogger:
    """Enhanced logger for structured logging"""
    
    @staticmethod
    def info(message: str, **kwargs):
        """Log info level with structured data"""
        extra = {
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            **kwargs
        }
        logger.info(message, extra={"extra": extra})
    
    @staticmethod
    def error(message: str, error: Optional[Exception] = None, **kwargs):
        """Log error level with structured data"""
        extra = {
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            **kwargs
        }
        
        if error:
            extra.update({
                "error_type": type(error).__name__,
                "error_message": str(error)
            })
        
        logger.error(message, extra={"extra": extra}, exc_info=error)
    
    @staticmethod
    def warning(message: str, **kwargs):
        """Log warning level with structured data"""
        extra = {
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            **kwargs
        }
        logger.warning(message, extra={"extra": extra})
    
    @staticmethod
    def debug(message: str, **kwargs):
        """Log debug level with structured data"""
        if logger.level <= logging.DEBUG:
            extra = {
                "request_id": request_id_var.get(),
                "user_id": user_id_var.get(),
                **kwargs
            }
            logger.debug(message, extra={"extra": extra})
    
    @staticmethod
    def critical(message: str, **kwargs):
        """Log critical level with structured data"""
        extra = {
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            **kwargs
        }
        logger.critical(message, extra={"extra": extra})

# Context variable helpers
def get_request_id() -> str:
    """Get current request ID"""
    return request_id_var.get()

def get_user_id() -> str:
    """Get current user ID"""
    return user_id_var.get()

def set_request_id(request_id: str):
    """Set request ID"""
    request_id_var.set(request_id)

def set_user_id(user_id: str):
    """Set user ID"""
    user_id_var.set(str(user_id))

# Function to create child logger
def get_logger(name: str) -> logging.Logger:
    """Get a child logger with the same configuration"""
    child_logger = logger.getChild(name)
    child_logger.propagate = False
    for handler in logger.handlers:
        child_logger.addHandler(handler)
    return child_logger

# Logging configuration helpers
def configure_file_logging(log_file: str = "app.log"):
    """Configure file logging"""
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(log_level)
    
    if settings.ENVIRONMENT in ["production", "staging"]:
        file_handler.setFormatter(JSONFormatter())
    else:
        file_handler.setFormatter(simple_formatter)
    
    logger.addHandler(file_handler)
    return file_handler

def configure_rotating_file_logging(
    log_file: str = "app.log", 
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
):
    """Configure rotating file logging"""
    from logging.handlers import RotatingFileHandler
    
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=max_bytes, 
        backupCount=backup_count
    )
    file_handler.setLevel(log_level)
    
    if settings.ENVIRONMENT in ["production", "staging"]:
        file_handler.setFormatter(JSONFormatter())
    else:
        file_handler.setFormatter(simple_formatter)
    
    logger.addHandler(file_handler)
    return file_handler

# Initialize structured logger instance
structured_logger = StructuredLogger()

# Export everything
__all__ = [
    "logger",
    "structured_logger",
    "StructuredLogger",
    "get_request_id",
    "get_user_id",
    "set_request_id",
    "set_user_id",
    "get_logger",
    "configure_file_logging",
    "configure_rotating_file_logging"
]