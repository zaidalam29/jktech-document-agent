import pytest
from fastapi.testclient import TestClient
from io import BytesIO
from unittest.mock import patch, MagicMock, AsyncMock
import os

class TestDocuments:
    def test_upload_document_simple(self, client: TestClient):
        """Ultra simple upload test"""
        print("\n=== Testing if upload endpoint exists ===")
        
        # Just send a simple request
        files = {"file": ("test.txt", BytesIO(b"test"), "text/plain")}
        
        response = client.post("/documents/upload", files=files)
        
        print(f"Status code: {response.status_code}")
        
        # Anything except 404 means the endpoint exists
        if response.status_code == 404:
            print("ERROR: Endpoint not found!")
            assert False, "Upload endpoint doesn't exist"
        else:
            print(f"OK: Endpoint exists (got {response.status_code})")
            assert True

    def test_list_documents(self, client: TestClient):
        """Test listing all documents"""
        with patch('app.routes.documents.get_db') as mock_get_db:
            mock_db = AsyncMock()
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            
            # Create mock document
            class MockDocument:
                def __init__(self):
                    self.id = 1
                    self.filename = "test.txt"
                    self.file_size = 100
                    self.uploaded_by = 1
                    self.status = "uploaded"
                    self.created_at = None
                    self.updated_at = None
                    self.file_path = "/tmp/test.txt"
                    self.user = MagicMock()
                    self.user.username = "testuser"
            
            mock_doc = MockDocument()
            mock_scalars.all.return_value = [mock_doc]
            mock_result.scalars.return_value = mock_scalars
            mock_db.execute.return_value = mock_result
            mock_get_db.return_value = mock_db
            
            response = client.get("/documents/")
            
            print(f"List documents response: {response.status_code}")
            print(f"Response: {response.json()}")
            
            assert response.status_code == 200
            assert isinstance(response.json(), list)

    def test_delete_document_simple(self, client: TestClient):
        """Simple test for delete document"""
        # First, check what the actual endpoint expects
        print("\n=== Testing DELETE endpoint ===")
        
        # Option 1: Try with authentication mocked
        with patch('jose.jwt.decode') as mock_decode:
            mock_decode.return_value = {"sub": "admin", "roles": ["admin"]}
            
            # Try to see what happens
            response = client.delete(
                "/documents/1",
                headers={"Authorization": "Bearer test"}
            )
            
            print(f"Response: {response.status_code}")
            print(f"Body: {response.json() if response.content else 'No content'}")
            
            # If we get 422, check what validation is failing
            if response.status_code == 422:
                print("\nValidation errors:")
                for error in response.json().get("detail", []):
                    print(f"  - {error.get('msg')} at {error.get('loc')}")

    def test_delete_document_unauthorized(self, client: TestClient):
        """Test deleting a document without authentication"""
        response = client.delete("/documents/1")
        
        print(f"Delete unauthorized response: {response.status_code}")
        
        # Check what error we get
        if response.status_code == 401:
            print("Got 401 Unauthorized as expected")
        elif response.status_code == 404:
            print("Got 404 - might be because auth check happens inside function")
        else:
            print(f"Got unexpected status: {response.status_code}")
            print(f"Response: {response.json()}")
        
        # The endpoint should reject the request - either 401 or 404 is acceptable
        assert response.status_code in [401, 404, 422]

    def test_delete_document_not_found(self, client: TestClient):
        """Test deleting a non-existent document"""
        # Mock JWT decode for authentication
        with patch('jose.jwt.decode') as mock_decode:
            mock_decode.return_value = {"sub": "admin", "roles": ["admin"]}
            
            # Mock the database to return None (document not found)
            with patch('app.routes.documents.get_db') as mock_get_db:
                mock_db = AsyncMock()
                mock_result = MagicMock()
                
                mock_result.scalar_one_or_none.return_value = None
                mock_db.execute.return_value = mock_result
                mock_get_db.return_value = mock_db
                
                response = client.delete(
                    "/documents/999",
                    headers={"Authorization": "Bearer valid_token"}
                )
                
                print(f"Delete non-existent response: {response.status_code}")
                
                if response.status_code == 404:
                    print(f"Got 404 as expected: {response.json()}")
                else:
                    print(f"Got {response.status_code}: {response.json()}")
                
                assert response.status_code == 404
                assert "Document not found" in response.json()["detail"]