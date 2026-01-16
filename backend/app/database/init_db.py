# app/database/init_db.py
from app.database.database import Base, engine, AsyncSessionLocal
import app.database.models as models
from sqlalchemy import select, insert
from passlib.context import CryptContext
import asyncio

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)

async def init_db():
    """Initialize database and create tables"""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    # Insert master data
    await insert_default_roles()
    await insert_default_admin_user()
    print("Database initialized successfully!")

async def insert_default_roles():
    """Insert default roles: admin and user"""
    async with AsyncSessionLocal() as session:
        try:
            # Check which roles already exist
            result = await session.execute(select(models.Role))
            existing_roles = result.scalars().all()
            existing_names = {role.name for role in existing_roles}
            
            roles_to_insert = []
            
            if "admin" not in existing_names:
                roles_to_insert.append(models.Role(name="admin"))
            
            if "user" not in existing_names:
                roles_to_insert.append(models.Role(name="user"))
            
            if roles_to_insert:
                session.add_all(roles_to_insert)
                await session.commit()
                print(f"Inserted roles: {[r.name for r in roles_to_insert]}")
            else:
                print("Roles already exist in database")
                
        except Exception as e:
            await session.rollback()
            print(f"Error inserting roles: {e}")
            raise

async def insert_default_admin_user():
    """Insert default admin user if it doesn't exist"""
    async with AsyncSessionLocal() as session:
        try:
            print("="*50)
            print("STARTING ADMIN USER CREATION")
            print("="*50)
            
            # STEP 1: Check if admin user already exists
            result = await session.execute(
                select(models.User).where(models.User.username == "admin")
            )
            admin_user = result.scalar_one_or_none()
            
            if admin_user:
                print(f"Admin user already exists with ID: {admin_user.id}")
                # Check if admin user has admin role
                if admin_user.roles:
                    print(f"Admin user already has roles: {[r.name for r in admin_user.roles]}")
                else:
                    print("Admin user exists but has no roles assigned")
                return
            
            # STEP 2: Get admin role
            result = await session.execute(
                select(models.Role).where(models.Role.name == "admin")
            )
            admin_role = result.scalar_one_or_none()
            
            if not admin_role:
                print("Admin role not found, creating it first...")
                admin_role = models.Role(name="admin")
                session.add(admin_role)
                await session.commit()
                await session.refresh(admin_role)
                print(f"Created admin role with id: {admin_role.id}")
            else:
                print(f"Found admin role with id: {admin_role.id}")
            
            # STEP 3: Create admin user
            hashed_password = hash_password("12345678")
            print(f"Hashed password: {hashed_password[:20]}...")
            
            admin_user = models.User(
                username="admin",
                password_hash=hashed_password,
                is_active=True
            )
            
            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)
            print(f"Created admin user with id: {admin_user.id}")
            
            # STEP 4: MANUALLY INSERT into user_roles association table
            print(f"Attempting to insert into user_roles: user_id={admin_user.id}, role_id={admin_role.id}")
            
            # Method 1: Using SQL directly
            from sqlalchemy import text
            insert_query = text("""
                INSERT INTO user_roles (user_id, role_id) 
                VALUES (:user_id, :role_id)
                ON CONFLICT (user_id, role_id) DO NOTHING
            """)
            
            try:
                await session.execute(
                    insert_query, 
                    {"user_id": admin_user.id, "role_id": admin_role.id}
                )
                await session.commit()
                print("Successfully inserted into user_roles table")
            except Exception as insert_error:
                print(f"Error with direct SQL insert: {insert_error}")
                await session.rollback()
                
                # Method 2: Using SQLAlchemy core
                try:
                    from sqlalchemy import insert as sql_insert
                    stmt = sql_insert(models.user_roles).values(
                        user_id=admin_user.id,
                        role_id=admin_role.id
                    )
                    await session.execute(stmt)
                    await session.commit()
                    print("Successfully inserted using SQLAlchemy core")
                except Exception as core_error:
                    print(f"Error with SQLAlchemy core insert: {core_error}")
                    await session.rollback()
                    
                    # Method 3: Try to assign role through relationship
                    try:
                        # Reload objects
                        await session.refresh(admin_user)
                        await session.refresh(admin_role)
                        
                        # Assign role
                        admin_user.roles.append(admin_role)
                        await session.commit()
                        print("Successfully assigned role through relationship")
                    except Exception as rel_error:
                        print(f"Error with relationship assignment: {rel_error}")
                        await session.rollback()
            
            # Verify the insertion
            verify_query = text("""
                SELECT * FROM user_roles 
                WHERE user_id = :user_id AND role_id = :role_id
            """)
            result = await session.execute(
                verify_query, 
                {"user_id": admin_user.id, "role_id": admin_role.id}
            )
            verification = result.fetchone()
            
            if verification:
                print("✓ VERIFICATION SUCCESSFUL: Entry found in user_roles table")
            else:
                print("✗ VERIFICATION FAILED: No entry in user_roles table")
                
            # Also check via relationship
            await session.refresh(admin_user)
            if admin_user.roles:
                print(f"✓ User has roles via relationship: {[r.name for r in admin_user.roles]}")
            else:
                print("✗ User has no roles via relationship")
            
            print("\n" + "="*50)
            print("ADMIN USER CREATION PROCESS COMPLETE")
            print("="*50)
            print(f"Username: admin")
            print(f"Password: 12345678")
            print(f"User ID: {admin_user.id}")
            print(f"Role ID: {admin_role.id}")
            print("="*50 + "\n")
            
        except Exception as e:
            await session.rollback()
            print(f"Error inserting admin user: {e}")
            import traceback
            traceback.print_exc()
            raise

# Run this standalone to test
async def test_init():
    print("Testing database initialization...")
    await init_db()
    
    # Verify after init
    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        query = text("""
            SELECT u.id, u.username, r.id as role_id, r.name as role_name
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.username = 'admin'
        """)
        result = await session.execute(query)
        rows = result.fetchall()
        
        print("\n" + "="*50)
        print("FINAL VERIFICATION")
        print("="*50)
        for row in rows:
            print(f"User: {row.username} (ID: {row.id}) - Role: {row.role_name} (ID: {row.role_id})")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(test_init())