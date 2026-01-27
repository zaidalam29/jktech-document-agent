from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from app.core.database import engine, SessionLocal, Base
from app.core.logger import logger

# IMPORTANT: Import all models BEFORE creating tables
from app.models.user import User, Role, user_roles
from app.models.auth_token import AuthToken
from app.models.book import Book
from app.models.review import Review
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.core.security import get_password_hash

def init_db():
    """Initialize database with tables and default data"""
    try:
        logger.info("=" * 60)
        logger.info("Starting Database Initialization")
        logger.info("=" * 60)
        
        # Step 1: Create all tables
        logger.info("Step 1: Creating database tables...")
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created successfully!")
        except Exception as e:
            logger.error(f"❌ Error creating tables: {str(e)}")
            raise
        
        # Step 2: Verify tables were created
        logger.info("Step 2: Verifying tables...")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            logger.info(f"Found {len(tables)} table(s):")
            for table in sorted(tables):
                logger.info(f"   - {table}")
        else:
            logger.warning("⚠️  No tables found!")
            raise Exception("Tables were not created")
        
        # Step 3: Create session and add default data
        logger.info("Step 3: Creating default data...")
        db: Session = SessionLocal()
        
        try:
            # Check if roles already exist
            existing_roles = db.query(Role).count()
            
            if existing_roles == 0:
                logger.info("Creating default roles...")
                
                # Create roles
                user_role = Role(name="user")
                admin_role = Role(name="admin")
                
                db.add(user_role)
                db.add(admin_role)
                db.commit()
                
                logger.info("Default roles created: user, admin")
            else:
                logger.info(f"Roles already exist ({existing_roles} roles found)")
            
            # Check if admin user exists
            admin_user = db.query(User).filter(User.username == "admin").first()
            
            if not admin_user:
                logger.info("Creating default admin user...")
                
                # Create admin user
                admin_user = User(
                    username="admin",
                    password_hash=get_password_hash("12345678"),
                    is_active=True
                )
                
                # Assign admin role
                admin_role = db.query(Role).filter(Role.name == "admin").first()
                if admin_role:
                    admin_user.roles.append(admin_role)
                
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)
                
                logger.info("Admin user created!")
                logger.info("   Username: admin")
                logger.info("   Password: 12345678")
                logger.info("   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!")
            else:
                logger.info(f"Admin user already exists (ID: {admin_user.id})")
            
            # Step 4: Final verification
            logger.info("Step 4: Final verification...")
            total_users = db.query(User).count()
            total_roles = db.query(Role).count()
            
            logger.info(f"   Users: {total_users}")
            logger.info(f"   Roles: {total_roles}")
            
            logger.info("=" * 60)
            logger.info("Database Initialization Complete!")
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"❌ Error during data initialization: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    init_db()