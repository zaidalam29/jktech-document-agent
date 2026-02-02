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
print("Setting up SQLite in-memory database for tests")
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
    print("Tables created successfully")
    
    yield
    
    print("\n🧹 Cleaning up...")
    Base.metadata.drop_all(bind=test_engine)
    print("Cleanup completed")


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
    # First, clean up any existing tokens for this user
    db_session.query(AuthToken).filter(AuthToken.user_id == test_user.id).delete()
    db_session.commit()
    
    # Create token with unique data
    access_token = security_module.create_access_token(
        data={
            "sub": test_user.username, 
            "user_id": test_user.id
        }
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


@pytest.fixture
def clean_token(db_session: Session, test_user: User) -> str:
    """Create a clean token without duplicates"""
    # Force cleanup before creating token
    db_session.query(AuthToken).filter(AuthToken.user_id == test_user.id).delete()
    db_session.commit()
    
    # Create new token - security.py will add unique jti and rnd
    access_token = security_module.create_access_token(
        data={
            "sub": test_user.username, 
            "user_id": test_user.id
        }
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
        # Delete all auth tokens FIRST
        db_session.query(AuthToken).delete()
        
        # Delete all users (except maybe default roles)
        db_session.query(User).filter(
            User.username.notlike("role_%")
        ).delete(synchronize_session=False)
        
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        logger.debug(f"Cleanup warning: {e}")
        
@pytest.fixture
def role_crud():
    """Provide role CRUD instance"""
    from app.crud.user import role_crud
    return role_crud


@pytest.fixture
def user_crud():
    """Provide user CRUD instance"""
    from app.crud.user import user_crud
    return user_crud        

@pytest.fixture
def review_crud():
    """Provide review CRUD instance"""
    from app.crud.review import review_crud
    return review_crud


from io import BytesIO
from fastapi import UploadFile
from pathlib import Path
from unittest.mock import MagicMock

@pytest.fixture
def mock_upload_file():
    """Create a mock upload file for testing"""
    # Create a mock text file
    file_content = b"This is a test document content for testing."
    file_like = BytesIO(file_content)
    
    # Create a mock UploadFile
    upload_file = MagicMock(spec=UploadFile)
    upload_file.filename = "test_document.txt"
    upload_file.content_type = "text/plain"
    upload_file.size = len(file_content)
    upload_file.file = file_like
    upload_file.read.return_value = file_content
    
    return upload_file

@pytest.fixture
def sample_text_file(tmp_path):
    """Create a sample text file on disk"""
    test_dir = tmp_path / "test_documents"
    test_dir.mkdir()
    
    file_path = test_dir / "sample.txt"
    file_path.write_text("This is a sample text file for testing.")
    
    return file_path

@pytest.fixture
def test_document(db_session, test_user):
    """Create a test document in database"""
    from app.models.document import Document, DocumentStatus
    
    # Check if document already exists
    existing_doc = db_session.query(Document).filter(
        Document.filename == "test_document.txt"
    ).first()
    
    if existing_doc:
        return existing_doc
    
    document = Document(
        filename="test_document_123.txt",
        original_filename="test_document.txt",
        file_size=1024,
        file_type="text",
        local_path="/tmp/test_document_123.txt",  # Mock path
        uploaded_by=test_user.id,
        user_id=test_user.id,
        status=DocumentStatus.UPLOADED,
        is_public=True,
        description="Test document for unit testing",
        tags="test,document,unit-test",
        content="This is test document content for unit testing."
    )
    
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    
    return document

@pytest.fixture
def private_document(db_session, test_user):
    """Create a private test document"""
    from app.models.document import Document, DocumentStatus
    
    document = Document(
        filename="private_document_456.txt",
        original_filename="private_document.txt",
        file_size=512,
        file_type="text",
        local_path="/tmp/private_document_456.txt",
        uploaded_by=test_user.id,
        user_id=test_user.id,
        status=DocumentStatus.UPLOADED,
        is_public=False,  # Private document
        description="Private test document",
        tags="private,test",
        content="This is a private test document."
    )
    
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    
    return document

@pytest.fixture
def admin_document(db_session, admin_user):
    """Create a test document owned by admin"""
    from app.models.document import Document, DocumentStatus
    
    document = Document(
        filename="admin_document_789.txt",
        original_filename="admin_document.txt",
        file_size=2048,
        file_type="text",
        local_path="/tmp/admin_document_789.txt",
        uploaded_by=admin_user.id,
        user_id=admin_user.id,
        status=DocumentStatus.UPLOADED,
        is_public=True,
        description="Admin's test document",
        tags="admin,test",
        content="This is admin's test document."
    )
    
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    
    return document

@pytest.fixture
def pdf_document(db_session, test_user):
    """Create a PDF test document"""
    from app.models.document import Document, DocumentStatus
    
    document = Document(
        filename="test_document_999.pdf",
        original_filename="test_document.pdf",
        file_size=3072,
        file_type="pdf",
        local_path="/tmp/test_document_999.pdf",
        uploaded_by=test_user.id,
        user_id=test_user.id,
        status=DocumentStatus.UPLOADED,
        is_public=True,
        description="PDF test document",
        tags="pdf,test",
        content=None  # PDFs don't have content field
    )
    
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    
    return document

@pytest.fixture
def multiple_documents(db_session, test_user):
    """Create multiple test documents"""
    from app.models.document import Document, DocumentStatus
    
    documents = []
    
    for i in range(5):
        document = Document(
            filename=f"multi_doc_{i}.txt",
            original_filename=f"document_{i}.txt",
            file_size=512 * (i + 1),
            file_type="text",
            local_path=f"/tmp/multi_doc_{i}.txt",
            uploaded_by=test_user.id,
            user_id=test_user.id,
            status=DocumentStatus.UPLOADED,
            is_public=(i % 2 == 0),  # Alternate public/private
            description=f"Test document {i}",
            tags=f"test,document_{i}",
            content=f"Content for document {i}"
        )
        
        db_session.add(document)
        documents.append(document)
    
    db_session.commit()
    
    # Refresh all documents
    for doc in documents:
        db_session.refresh(doc)
    
    return documents

@pytest.fixture
def document_crud():
    """Provide document CRUD instance (if you have one)"""
    # If you have a document CRUD class
    try:
        from app.crud.document import document_crud
        return document_crud
    except ImportError:
        # Return a mock or None if not implemented
        return None

@pytest.fixture
def mock_file_operations(mocker):
    """Mock file system operations for testing"""
    # Mock os.path.exists
    mock_exists = mocker.patch('os.path.exists')
    mock_exists.return_value = True
    
    # Mock os.remove
    mock_remove = mocker.patch('os.remove')
    
    # Mock open for file reading
    mock_open = mocker.patch('builtins.open', mocker.mock_open(read_data="File content"))
    
    return {
        'exists': mock_exists,
        'remove': mock_remove,
        'open': mock_open
    }

@pytest.fixture
def temp_upload_dir(tmp_path):
    """Create temporary upload directory for tests"""
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    
    # Override settings for tests
    original_upload_dir = None
    try:
        from app.core.config import settings
        original_upload_dir = settings.UPLOAD_DIR
        settings.UPLOAD_DIR = str(upload_dir)
    except:
        pass
    
    yield upload_dir
    
    # Restore original settings
    if original_upload_dir:
        settings.UPLOAD_DIR = original_upload_dir

# Also update your extreme_cleanup fixture to clean documents:
@pytest.fixture(autouse=True)
def extreme_cleanup(db_session: Session):
    """
    Extreme cleanup to avoid any conflicts
    """
    # Store current state
    yield
    
    # Clean EVERYTHING after each test
    try:
        # Delete all documents
        from app.models.document import Document
        db_session.query(Document).delete()
        
        # Delete all reviews
        from app.models.review import Review
        db_session.query(Review).delete()
        
        # Delete all books
        from app.models.book import Book
        db_session.query(Book).delete()
        
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
        
@pytest.fixture
def ingestion_service():
    """Provide ingestion service instance"""
    from app.services.ingestion_service import IngestionService
    return IngestionService

@pytest.fixture
def mock_background_tasks():
    """Mock background tasks"""
    from fastapi import BackgroundTasks
    return BackgroundTasks()  

# Add to conftest.py
import asyncio

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def anyio_backend():
    """Specify anyio backend for async tests."""
    return 'asyncio'   

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def anyio_backend():
    """Specify anyio backend for async tests."""
    return 'asyncio'   