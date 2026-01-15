import pytest
from tests.run_app_test import test_client
from fastapi.testclient import TestClient

class TestBooksSimple:
    
    def test_create_book_success(self):
        """Test creating a new book successfully"""
        print("\n📚 Test 1: Create Book")
        
        response = test_client.post("/books", json={
            "title": "New Test Book",
            "author": "New Test Author",
            "genre": "Sci-Fi",
            "year_published": 2024
        })
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        assert response.status_code == 200
        assert response.json()["title"] == "New Test Book"

    def test_get_books(self):
        """Test getting all books"""
        print("\n📚 Test 2: Get All Books")
        
        response = test_client.get("/books")
        
        print(f"   Status: {response.status_code}")
        print(f"   Books count: {len(response.json())}")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 1

    def test_get_book_by_id_found(self):
        """Test getting a specific book by ID (found)"""
        print("\n📚 Test 3: Get Book By ID (Found)")
        
        response = test_client.get("/books/1")
        
        print(f"   Status: {response.status_code}")
        print(f"   Book title: {response.json()['title']}")
        
        assert response.status_code == 200
        assert response.json()["title"] == "Test Book"

    def test_get_book_by_id_not_found(self):
        """Test getting a non-existent book"""
        print("\n📚 Test 4: Get Book By ID (Not Found)")
        
        response = test_client.get("/books/999")
        
        print(f"   Status: {response.status_code}")
        
        assert response.status_code == 404
        assert "Book not found" in response.json()["detail"]

    def test_update_book_success(self):
        """Test updating a book with authentication"""
        print("\n📚 Test 5: Update Book (Authenticated)")
        
        response = test_client.put(
            "/books/1",
            json={"title": "Updated Book Title"},
            headers={"Authorization": "Bearer any_token"}
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Updated title: {response.json()['title']}")
        
        # Should succeed because verify_user is mocked to succeed
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Book Title"

    def test_delete_book_success(self):
        """Test deleting a book with authentication"""
        print("\n📚 Test 7: Delete Book (Authenticated)")
        
        response = test_client.delete(
            "/books/1",
            headers={"Authorization": "Bearer any_token"}
        )
        
        print(f"   Status: {response.status_code}")
        
        # Should succeed
        assert response.status_code == 204

    def test_generate_summary(self):
        """Test generating book summary"""
        print("\n📚 Test 9: Generate Summary")
        
        response = test_client.post(
            "/books/1/generate-summary",
            headers={"Authorization": "Bearer any_token"}
        )
        
        print(f"   Status: {response.status_code}")
        print(f"   Summary: {response.json()}")
        
        # Should succeed
        assert response.status_code == 200
        assert "summary" in response.json()