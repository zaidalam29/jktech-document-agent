from app.database.database import Base, engine
import app.database.models 

async def init_db():
    async with engine.begin() as conn:
        # ✅ Only create missing tables
        await conn.run_sync(Base.metadata.create_all)
