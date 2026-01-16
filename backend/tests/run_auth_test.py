# tests/run_auth_test.py
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
        
        response = client.post("/auth/signup", json={
            "username": "newuser",
            "password": "newpass123"
        })
        
        print(f"Signup response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        assert response.json()["message"] == "User created"
        assert "user_id" in response.json()
        assert response.json()["role_id"] == 2  # Regular user role

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
        
        print(f"Signup existing user response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 400
        assert response.json()["detail"] == "Username exists"

    def test_create_admin(self, client: TestClient, mock_db_session):
        """Test creating admin user"""
        # Mock queries
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = None
        
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None
        
        mock_db_session.execute.side_effect = [mock_result1, mock_result2]
        
        response = client.post("/auth/create-admin", json={
            "username": "adminuser",
            "password": "adminpass123"
        })
        
        print(f"Create admin response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Admin created"
        assert response.json()["role_id"] == 1  # Admin role
        assert response.json()["role_name"] == "admin"

    def test_login_success(self, client: TestClient, mock_db_session, mock_user):
        """Test successful login"""
        # Setup mock user with roles
        mock_role = MagicMock()
        mock_role.name = "user"
        mock_user.roles = [mock_role]
        
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        # Mock verify_password
        with patch('app.routes.auth.verify_password', return_value=True):
            # Mock token creation
            with patch('app.routes.auth.create_access_token', return_value="mock_token_123"):
                # Mock AuthToken save
                mock_auth_token = MagicMock()
                mock_auth_token.id = 456
                mock_db_session.add.return_value = None
                
                response = client.post("/auth/login", json={
                    "username": "testuser",
                    "password": "testpass"
                })
                
                print(f"Login success response: {response.status_code} - {response.json()}")
                
                assert response.status_code == 200
                assert response.json()["access_token"] == "mock_token_123"
                assert response.json()["token_type"] == "bearer"
                assert response.json()["username"] == "testuser"

    def test_login_user_not_found(self, client: TestClient, mock_db_session):
        """Test login with non-existent user"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        response = client.post("/auth/login", json={
            "username": "nonexistent",
            "password": "wrongpass"
        })
        
        print(f"Login not found response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

    def test_login_wrong_password(self, client: TestClient, mock_db_session, mock_user):
        """Test login with wrong password"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db_session.execute.return_value = mock_result
        
        with patch('app.routes.auth.verify_password', return_value=False):
            response = client.post("/auth/login", json={
                "username": "testuser",
                "password": "wrongpassword"
            })
            
            print(f"Login wrong password response: {response.status_code} - {response.json()}")
            
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid credentials"

    def test_logout_success(self, client: TestClient, mock_db_session):
        """Test successful logout"""
        # Mock token data
        mock_token = "valid_token_123"
        
        # Create a proper mock for current user
        # We need to mock the actual User model attributes
        mock_current_user = MagicMock()
        mock_current_user.id = 1
        mock_current_user.username = "testuser"
        
        # Mock auth token from database
        mock_auth_token = MagicMock()
        mock_auth_token.id = 789
        mock_auth_token.token = mock_token
        mock_auth_token.user_id = 1
        mock_auth_token.is_revoked = False
        
        # Mock database query for token
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_auth_token
        mock_db_session.execute.return_value = mock_result
        
        # IMPORTANT: We need to patch get_current_user in the auth router
        # But since get_current_user is a dependency, we need to override it
        from app.main import app
        from app.core.auth import get_current_user
        
        async def mock_get_current_user():
            return mock_current_user
        
        # Override the dependency
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            response = client.post(
                "/auth/logout",
                headers={"Authorization": f"Bearer {mock_token}"}
            )
            
            print(f"Logout success response: {response.status_code} - {response.json()}")
            
            assert response.status_code == 200
            assert response.json()["message"] == "Logged out successfully"
            assert response.json()["token_id"] == 789
            assert response.json()["user_id"] == 1
            
        finally:
            # Clear the override
            app.dependency_overrides.pop(get_current_user, None)

    def test_logout_no_token(self, client: TestClient):
        """Test logout without token"""
        response = client.post("/auth/logout")
        
        print(f"Logout no token response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 401
        
        # Check for either possible error message
        error_detail = response.json()["detail"]
        assert error_detail in ["No token provided", "Not authenticated"]

    def test_logout_token_already_revoked(self, client: TestClient, mock_db_session):
        """Test logout with already revoked token"""
        mock_token = "revoked_token_123"
        
        # Mock current user
        mock_current_user = MagicMock()
        mock_current_user.id = 1
        mock_current_user.username = "testuser"
        
        # Mock database query - token not found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        # Override get_current_user dependency
        from app.main import app
        from app.core.auth import get_current_user
        
        async def mock_get_current_user():
            return mock_current_user
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            response = client.post(
                "/auth/logout",
                headers={"Authorization": f"Bearer {mock_token}"}
            )
            
            print(f"Logout revoked token response: {response.status_code} - {response.json()}")
            
            assert response.status_code == 200
            assert response.json()["message"] == "Token already revoked or not found"
            assert response.json()["user_id"] == 1
            
        finally:
            app.dependency_overrides.pop(get_current_user, None)


    def test_logout_invalid_token_format(self, client: TestClient):
        """Test logout with invalid token format"""
        response = client.post(
            "/auth/logout",
            headers={"Authorization": "InvalidTokenFormat"}
        )
        
        print(f"Logout invalid token format response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 401
        
        # Check for either possible error message
        error_detail = response.json()["detail"]
        assert error_detail in ["No token provided", "Not authenticated"]