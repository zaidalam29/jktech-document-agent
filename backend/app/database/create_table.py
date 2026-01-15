import asyncio
import sys
import os
from sqlalchemy import text

# Get the parent directory (project root)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# Add parent directory to Python path
sys.path.insert(0, parent_dir)

async def init_db():
    # Now use relative import
    from app.database import models
    
    from app.database.database import engine, Base
    
    print("🔄 Creating database tables...")
    print(f"📊 Models registered: {list(Base.metadata.tables.keys())}")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Tables created successfully!")
    
    # Verify in PostgreSQL
    async with engine.connect() as conn:
        result = await conn.execute(
            text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
        )
        tables = result.fetchall()
        
        print("\n📋 Created tables in database:")
        if tables:
            for table in tables:
                print(f"  • {table[0]}")
        else:
            print("  No tables found!")

if __name__ == "__main__":
    asyncio.run(init_db())