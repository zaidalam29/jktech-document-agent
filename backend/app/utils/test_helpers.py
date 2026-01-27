"""
Test helper functions
"""

import hashlib
import json
from typing import Dict, Any
from datetime import datetime, timedelta


def generate_test_token(user_id: int, username: str, expires_in: int = 30) -> str:
    """Generate a test token (for mocking)"""
    payload = {
        "sub": username,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=expires_in),
        "iat": datetime.utcnow()
    }
    
    # Simple hash-based token for testing
    token_string = f"{user_id}:{username}:{expires_in}"
    return hashlib.sha256(token_string.encode()).hexdigest()


def assert_error_response(response, expected_status: int, expected_detail: str = None):
    """Assert standardized error response"""
    assert response.status_code == expected_status
    data = response.json()
    assert "detail" in data
    if expected_detail:
        assert expected_detail in data["detail"]


def create_test_headers(token: str) -> Dict[str, str]:
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


def validate_user_response(data: Dict[str, Any], expected_username: str):
    """Validate user response structure"""
    assert "id" in data
    assert data["username"] == expected_username
    assert "is_active" in data
    assert isinstance(data["is_active"], bool)
    assert "roles" in data
    assert isinstance(data["roles"], list)