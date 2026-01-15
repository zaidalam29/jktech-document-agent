import asyncio
import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def create_tables():

    from app.database import models
    from app.database.database import engine, Base
    
    print("Creating database tables...")
    print(f"Models to create: {list(Base.metadata.tables.keys())}")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("Tables created!")
    
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        )
        tables = [row[0] for row in result.fetchall()]
        
        print("\n📋 Tables in database:")
        for table in sorted(tables):
            print(f"  • {table}")

if __name__ == "__main__":
    asyncio.run(create_tables())