from datetime import datetime
from typing import Dict, Any
import redis
import httpx
from sqlalchemy import text

from app.core.config import settings
from app.core.logger import StructuredLogger
from app.core.database import SessionLocal

async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check endpoint
    Checks all critical services
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.VERSION,
        "services": {}
    }
    
    # Check database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health_status["services"]["database"] = {
            "status": "healthy",
            "response_time": "ok"
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "response_time": "timeout"
        }
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
            r = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=2)
            r.ping()
            health_status["services"]["redis"] = {
                "status": "healthy",
                "response_time": "ok"
            }
        else:
            health_status["services"]["redis"] = {
                "status": "not_configured"
            }
    except Exception as e:
        health_status["services"]["redis"] = {
            "status": "unhealthy",
            "error": str(e),
            "response_time": "timeout"
        }
        health_status["status"] = "degraded"
    
    # Check external services
    health_status["services"]["external"] = {}
    
    # Check OpenRouter
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(os.getenv("OPENROUTER_BASE_URL"))
            health_status["services"]["external"]["openrouter"] = {
                "status": "reachable" if response.status_code < 500 else "unreachable",
                "response_time": f"{response.elapsed.total_seconds():.3f}s"
            }
    except Exception as e:
        health_status["services"]["external"]["openrouter"] = {
            "status": "unreachable",
            "error": str(e),
            "response_time": "timeout"
        }
        health_status["status"] = "degraded"
    
    # Check storage
    try:
        import os
        from pathlib import Path
        
        # Check data directory
        data_dir = Path("data")
        if data_dir.exists():
            health_status["services"]["storage"] = {
                "status": "healthy",
                "path": str(data_dir.absolute()),
                "writable": os.access(data_dir, os.W_OK)
            }
        else:
            try:
                data_dir.mkdir(parents=True, exist_ok=True)
                health_status["services"]["storage"] = {
                    "status": "healthy",
                    "path": str(data_dir.absolute()),
                    "writable": True
                }
            except Exception as e:
                health_status["services"]["storage"] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "writable": False
                }
                health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["storage"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # System info
    try:
        import psutil
        health_status["system"] = {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "uptime": psutil.boot_time()
        }
    except ImportError:
        health_status["system"] = {"info": "psutil not installed"}
    except Exception as e:
        health_status["system"] = {"error": str(e)}
    
    # Log health check
    StructuredLogger.info(
        "Health check completed",
        status=health_status["status"],
        unhealthy_services=[
            service for service, status in health_status["services"].items()
            if status.get("status") in ["unhealthy", "unreachable"]
        ]
    )
    
    return health_status

async def liveness_check() -> Dict[str, Any]:
    """Simple liveness check"""
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat()
    }

async def readiness_check() -> Dict[str, Any]:
    """Readiness check for load balancers"""
    checks = {}
    
    # Check database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = "ready"
    except Exception as e:
        checks["database"] = f"not_ready: {str(e)}"
    
    # Overall status
    all_ready = all(status == "ready" for status in checks.values())
    
    return {
        "status": "ready" if all_ready else "not_ready",
        "timestamp": datetime.now().isoformat(),
        "checks": checks
    }