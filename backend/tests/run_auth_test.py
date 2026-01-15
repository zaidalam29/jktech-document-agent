import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.security import hash_password, verify_password

class TestAuth:
    def test_signup(self, client: TestClient, mock_db_session):
        """Test user signup"""
        # Mock the database query - no existing user
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        # Mock commit
        mock_db_session.commit = AsyncMock()
        
        response = client.post("/auth/signup", json={
            "username": "newuser",
            "password": "newpass123"
        })
        
        print(f"Signup response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        assert "successfully" in response.json()["message"]
        
        # Verify database was called
        assert mock_db_session.add.called
        assert mock_db_session.commit.called

    def test_signup_user_exists(self, client: TestClient, mock_db_session, mock_user):
        """Test signup with existing username"""
        # Mock the database query - user exists
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        response = client.post("/auth/signup", json={
            "username": "testuser",
            "password": "newpass123"
        })
        
        print(f"Signup existing user response: {response.status_code}")
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_admin(self, client: TestClient, mock_db_session):
        """Test creating admin user"""
        # Mock first query - no admin role
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = None
        
        # Mock second query - for user check
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None
        
        # Setup execute to return different values
        mock_db_session.execute.side_effect = [mock_result1, mock_result2]
        
        # Mock commit and flush
        mock_db_session.commit = AsyncMock()
        mock_db_session.flush = AsyncMock()
        
        response = client.post("/auth/create-admin", json={
            "username": "adminuser",
            "password": "adminpass123"
        })
        
        print(f"Create admin response: {response.status_code}")
        
        assert response.status_code == 200
        assert "successfully" in response.json()["message"]

    def test_login_success(self, client: TestClient, mock_db_session, mock_user):
        """Test successful login"""
        # Mock the database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        # Mock verify_password to return True
        with patch('app.routes.auth.verify_password', return_value=True):
            response = client.post("/auth/login", json={
                "username": "testuser",
                "password": "testpass"
            })
            
            print(f"Login success response: {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 200
            assert "access_token" in response.json()
            assert response.json()["token_type"] == "bearer"

    def test_login_user_not_found(self, client: TestClient, mock_db_session):
        """Test login with non-existent user"""
        # Mock the database query - no user found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        response = client.post("/auth/login", json={
            "username": "nonexistent",
            "password": "wrongpass"
        })
        
        print(f"Login not found response: {response.status_code}")
        
        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_wrong_password(self, client: TestClient, mock_db_session, mock_user):
        """Test login with wrong password"""
        # Mock the database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        # Mock verify_password to return False
        with patch('app.routes.auth.verify_password', return_value=False):
            response = client.post("/auth/login", json={
                "username": "testuser",
                "password": "wrongpassword"
            })
            
            print(f"Login wrong password response: {response.status_code}")
            
            assert response.status_code == 401
            assert "Invalid" in response.json()["detail"]

    def test_logout(self, client: TestClient):
        """Test logout endpoint"""
        response = client.post("/auth/logout")
        
        print(f"Logout response: {response.status_code}")
        
        assert response.status_code == 200
        assert "Logout" in response.json()["message"]