# app/core/token_cleanup.py
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select, delete
from app.database.models import AuthToken

async def cleanup_expired_tokens(db: AsyncSession, days: int = 7):
    """
    Delete tokens older than specified days
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    await db.execute(
        delete(AuthToken).where(
            AuthToken.created_at < cutoff_date
        )
    )
    
    await db.commit()
    print(f"✅ Cleaned up expired tokens older than {days} days")