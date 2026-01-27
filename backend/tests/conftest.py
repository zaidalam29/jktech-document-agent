import os
import pytest
from typing import Dict, Any, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import logging
from datetime import datetime, timedelta
from unittest.mock import patch

# Import your actual modules
from app.core.database import Base, get_db
from app.main import app
from app.core.config import settings
from app.models.user import User, Role
from app.models.auth_token import AuthToken
import app.core.security as security_module

# Configure test logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Override settings for testing
settings.DEBUG = True
settings.TESTING = True

# Use SQLite in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

print("\n" + "="*60)
print("🚀 Setting up SQLite in-memory database for tests")
print("="*60 + "\n")

# Create test engine
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

# Create test session
TestingSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=test_engine
)


def override_get_db() -> Generator[Session, None, None]:
    """
    Override the get_db dependency for testing
    """
    db = TestingSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Override the database dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Create all tables before tests
    """
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=test_engine)
    print("✅ Tables created successfully")
    
    yield
    
    print("\n🧹 Cleaning up...")
    Base.metadata.drop_all(bind=test_engine)
    print("✅ Cleanup completed")


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    """
    Create test client
    """
    return TestClient(app)


@pytest.fixture
def test_user_data() -> Dict[str, Any]:
    """Sample test user data"""
    return {
        "username": "testuser",
        "password": "TestPass123!",
    }


@pytest.fixture
def setup_roles(db_session: Session):
    """Setup roles in database"""
    # Create roles if they don't exist
    user_role = db_session.query(Role).filter(Role.name == "user").first()
    if not user_role:
        user_role = Role(name="user")  # No description parameter
        db_session.add(user_role)
    
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        admin_role = Role(name="admin")  # No description parameter
        db_session.add(admin_role)
    
    db_session.commit()
    return {"user": user_role, "admin": admin_role}


@pytest.fixture
def test_user(db_session: Session, test_user_data: Dict, setup_roles) -> User:
    """Create a test user in database"""
    # Check if user exists
    existing_user = db_session.query(User).filter(
        User.username == test_user_data["username"]
    ).first()
    
    if existing_user:
        return existing_user
    
    # Get user role
    user_role = db_session.query(Role).filter(Role.name == "user").first()
    
    # Create user
    user = User(
        username=test_user_data["username"],
        password_hash=security_module.get_password_hash(test_user_data["password"]),
        is_active=True,
    )
    
    if user_role:
        user.roles.append(user_role)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def auth_token(db_session: Session, test_user: User) -> str:
    """Create and return a valid auth token for test user"""
    # Create token
    access_token = security_module.create_access_token(
        data={"sub": test_user.username, "user_id": test_user.id}
    )
    
    # Save to database
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    auth_token_record = AuthToken(
        user_id=test_user.id,
        token=access_token,
        expires_at=expires_at,
    )
    
    db_session.add(auth_token_record)
    db_session.commit()
    
    return access_token


@pytest.fixture
def admin_user(db_session: Session, setup_roles) -> User:
    """Create an admin user for testing"""
    # Check if user exists
    existing_admin = db_session.query(User).filter(User.username == "admin_user").first()
    if existing_admin:
        return existing_admin
    
    # Get admin role
    admin_role = db_session.query(Role).filter(Role.name == "admin").first()
    
    # Create admin user
    user = User(
        username="admin_user",
        password_hash=security_module.get_password_hash("AdminPass123!"),
        is_active=True,
    )
    
    if admin_role:
        user.roles.append(admin_role)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def admin_token(db_session: Session, admin_user: User) -> str:
    """Create auth token for admin user"""
    access_token = security_module.create_access_token(
        data={"sub": admin_user.username, "user_id": admin_user.id}
    )
    
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    auth_token_record = AuthToken(
        user_id=admin_user.id,
        token=access_token,
        expires_at=expires_at,
    )
    
    db_session.add(auth_token_record)
    db_session.commit()
    
    return access_token


@pytest.fixture
def inactive_user(db_session: Session, setup_roles) -> User:
    """Create an inactive user for testing"""
    # Get user role
    user_role = db_session.query(Role).filter(Role.name == "user").first()
    
    user = User(
        username="inactive_user",
        password_hash=security_module.get_password_hash("TestPass123!"),
        is_active=False,
    )
    
    if user_role:
        user.roles.append(user_role)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def headers(auth_token: str) -> Dict[str, str]:
    """Return headers with authorization token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    """Return headers with admin authorization token"""
    return {"Authorization": f"Bearer {admin_token}"}

# tests/conftest.py - Add this function

@pytest.fixture
def clean_token(db_session: Session, test_user: User) -> str:
    """Create a clean token without duplicates"""
    # Remove any existing tokens for this user
    db_session.query(AuthToken).filter(AuthToken.user_id == test_user.id).delete()
    db_session.commit()
    
    # Create new token
    access_token = security_module.create_access_token(
        data={"sub": test_user.username, "user_id": test_user.id}
    )
    
    # Save to database
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    auth_token_record = AuthToken(
        user_id=test_user.id,
        token=access_token,
        expires_at=expires_at,
    )
    
    db_session.add(auth_token_record)
    db_session.commit()
    
    return access_token


@pytest.fixture
def clean_headers(clean_token: str) -> Dict[str, str]:
    """Return headers with clean authorization token"""
    return {"Authorization": f"Bearer {clean_token}"}


@pytest.fixture(autouse=True)
def extreme_cleanup(db_session: Session):
    """
    Extreme cleanup to avoid any conflicts
    """
    # Store current state
    yield
    
    # Clean EVERYTHING after each test
    try:
        # Delete all auth tokens
        db_session.query(AuthToken).delete()
        
        # Delete all users (except maybe default roles)
        db_session.query(User).filter(
            User.username.notlike("role_%")
        ).delete(synchronize_session=False)
        
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        logger.debug(f"Cleanup warning: {e}")