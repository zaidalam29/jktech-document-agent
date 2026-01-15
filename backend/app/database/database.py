from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# -------------------------------------------------
# Base class for all SQLAlchemy models
# -------------------------------------------------
Base = declarative_base()

# -------------------------------------------------
# Async SQLAlchemy Engine
# -------------------------------------------------
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    future=True,
)

# -------------------------------------------------
# Async Session Factory
# -------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# -------------------------------------------------
# Dependency for FastAPI routes
# -------------------------------------------------
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# -------------------------------------------------
# Create tables function
# -------------------------------------------------
async def create_tables():
    """
    Create all tables in the database
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")

# -------------------------------------------------
# Drop tables function (for development)
# -------------------------------------------------
async def drop_tables():
    """
    Drop all tables (use with caution)
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("🗑️ Tables dropped!")