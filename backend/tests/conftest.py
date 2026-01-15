import pytest
import pytest_asyncio  # Add this import
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database.database import get_db
from app.database.models import User, Role, Book, Review, Document
from app.core.security import hash_password, create_access_token
import os
from types import SimpleNamespace

# Set testing environment
os.environ["TESTING"] = "true"

# ==================== MOCK DB SESSION (ONE DEFINITION ONLY) ====================

@pytest_asyncio.fixture  # Change to pytest_asyncio.fixture
async def mock_db_session():
    """Create a mock database session"""
    session = AsyncMock(spec=AsyncSession)
    
    # Mock execute method
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result
    
    # Mock async methods properly
    session.commit = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.add = Mock()
    session.close = AsyncMock()
    
    # Additional async methods
    session.begin = AsyncMock()
    session.begin_nested = AsyncMock()
    
    # Return the session
    yield session

# ==================== SAMPLE BOOK FIXTURE ====================

@pytest.fixture
def sample_book():
    """Create a sample book for testing"""
    book = Book(
        id=1,
        title="Clean Code",
        author="Robert C. Martin",
        genre="Science",
        year_published=2026
    )
    # Add summary attribute
    book.summary = None
    # Add reviews attribute
    book.reviews = []
    
    # Add dict method for Pydantic serialization
    def to_dict():
        return {
            'id': book.id,
            'title': book.title,
            'author': book.author,
            'genre': book.genre,
            'year_published': book.year_published,
            'summary': book.summary,
            'reviews': book.reviews
        }
    
    book.dict = to_dict
    book.model_dump = to_dict
    
    return book

# ==================== FIXED MOCK BOOK (KEEP THIS FOR SYNC TESTS) ====================

@pytest.fixture
def mock_book():
    """Create a properly mock book with all required attributes"""
    # Create a simple class that will serialize correctly
    class SerializableBook:
        def __init__(self):
            self.id = 1
            self.title = "Test Book"
            self.author = "Test Author"
            self.genre = "Science"
            self.year_published = 2026
            self.summary = "Test summary"
            self.reviews = []
        
        def dict(self):
            # For Pydantic serialization
            return {
                'id': self.id,
                'title': self.title,
                'author': self.author,
                'genre': self.genre,
                'year_published': self.year_published,
                'summary': self.summary
            }
    
    book = SerializableBook()
    
    # Also wrap it in a MagicMock for database interactions
    mock = MagicMock(spec=Book, wraps=book)
    
    # Set all attributes
    mock.id = 1
    mock.title = "Test Book"
    mock.author = "Test Author"
    mock.genre = "Science"
    mock.year_published = 2026
    mock.summary = "Test summary"
    mock.reviews = []
    
    # Make sure dict() method works
    mock.dict = book.dict
    
    # For Pydantic model_dump
    mock.model_dump = Mock(return_value={
        'id': 1,
        'title': 'Test Book',
        'author': 'Test Author',
        'genre': 'Science',
        'year_published': 2026,
        'summary': 'Test summary'
    })
    
    return mock

# ==================== FIXED CLIENT WITH PROPER AUTH ====================

@pytest.fixture
def client(mock_db_session):
    def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db

    with patch('app.main.rag_pipeline') as mock_rag:
        mock_rag.index_book = AsyncMock()
        mock_rag.search_similar_books = Mock(return_value=[])

        with patch('app.main.generate_summary_llama3', AsyncMock(return_value="Generated summary")):
            with patch('app.main.generate_summary', AsyncMock(return_value="Review summary")):
                with TestClient(app) as test_client:
                    yield test_client

    app.dependency_overrides.clear()

# ==================== AUTH HEADERS FIX ====================

@pytest.fixture
def auth_headers():
    """Create working auth headers"""
    # Create a token that will pass verify_user
    token = create_access_token({"sub": "testuser", "roles": ["user"]})
    return {"Authorization": f"Bearer {token}"}

# ==================== OTHER FIXTURES ====================

@pytest.fixture
def mock_user():
    """Create a mock user"""
    user = MagicMock(spec=User)
    user.id = 1
    user.username = "testuser"
    user.password_hash = hash_password("testpass")
    user.is_active = True
    user.roles = []
    return user

@pytest.fixture
def mock_admin_user():
    """Create a mock admin user"""
    admin_role = MagicMock(spec=Role)
    admin_role.name = "admin"
    
    user = MagicMock(spec=User)
    user.id = 1
    user.username = "admin"
    user.password_hash = hash_password("admin123")
    user.is_active = True
    user.roles = [admin_role]
    return user

@pytest.fixture
def admin_token():
    """Create admin JWT token"""
    return create_access_token({"sub": "admin", "roles": ["admin"]})

def create_mock_verify_user(should_succeed=True):
    """Create a mock verify_user function"""
    from fastapi import HTTPException
    
    def mock_verify():
        if should_succeed:
            return "testuser"
        else:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return mock_verify

@pytest.fixture
def mock_db():
    """
    Mock database session for testing
    """
    db = MagicMock()
    return db

# ==================== TEST SETUP HELPERS ====================

@pytest.fixture
def setup_book_found(mock_db_session, mock_book):
    """Setup for book found scenario"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_book
    
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [mock_book]
    mock_result.scalars.return_value = mock_scalars
    
    mock_db_session.execute.return_value = mock_result
    return mock_db_session

@pytest.fixture
def setup_book_not_found(mock_db_session):
    """Setup for book not found scenario"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalars.return_value.all.return_value = []
    mock_db_session.execute.return_value = mock_result
    return mock_db_session

