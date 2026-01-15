import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def debug_password_hashing():
    from app.core.security import hash_password, verify_password
    
    print("🧪 Testing password hashing...")
    
    # Test 1: Basic hashing
    password = "12345678"
    hashed = hash_password(password)
    
    print(f"Password: {password}")
    print(f"Hashed: {hashed}")
    print(f"Hash length: {len(hashed)}")
    print(f"Hash starts with: {hashed[:20]}")
    
    # Verify
    print(f"\n🔍 Verification tests:")
    print(f"Correct password '12345678': {verify_password('12345678', hashed)}")
    print(f"Wrong password '123456': {verify_password('123456', hashed)}")
    print(f"Empty password '': {verify_password('', hashed)}")
    
    # Test 2: Check database directly
    print(f"\n📊 Checking database...")
    from app.database.database import engine
    from sqlalchemy import text
    
    async with engine.connect() as conn:
        # Check all users
        result = await conn.execute(
            text("SELECT id, username, password_hash, LENGTH(password_hash) as len FROM users")
        )
        users = result.fetchall()
        
        print(f"Total users in DB: {len(users)}")
        for user in users:
            user_id, username, password_hash, hash_len = user
            print(f"\nUser: {username} (ID: {user_id})")
            print(f"  Password hash: {password_hash[:50]}..." if password_hash else "  No password hash")
            print(f"  Hash length: {hash_len}")
            
            # Test verification
            if password_hash:
                print(f"  Verify '12345678': {verify_password('12345678', password_hash)}")
                print(f"  Verify '123456': {verify_password('123456', password_hash)}")

if __name__ == "__main__":
    asyncio.run(debug_password_hashing())