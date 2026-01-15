import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
from app.database.models import Review, Book
from datetime import datetime
import asyncio

class TestReviews:
    def test_add_review(self, client: TestClient, sample_book, auth_headers):
        """Test adding a review to a book"""
        print(f"Sample book ID: {sample_book.id}")
        
        # Instead of modifying mock_db_session, patch the get_db dependency directly
        with patch('app.main.get_db') as mock_get_db:
            # Create a fresh mock session
            mock_session = AsyncMock()
            
            # Mock execute as async method
            async def async_execute(query):
                query_str = str(query).lower()
                if "select" in query_str and "books" in query_str and "where" in query_str:
                    mock_result = MagicMock()
                    mock_result.scalar_one_or_none.return_value = sample_book
                    return mock_result
                # For any other query
                mock_result = MagicMock()
                mock_scalars = MagicMock()
                mock_scalars.all.return_value = []
                mock_result.scalars.return_value = mock_scalars
                mock_result.scalar_one_or_none.return_value = None
                return mock_result
            
            mock_session.execute = AsyncMock(side_effect=async_execute)
            mock_session.add = MagicMock()
            mock_session.commit = AsyncMock(return_value=None)
            
            # Create a complete mock review object
            mock_review = MagicMock(spec=Review)
            mock_review.id = 1
            mock_review.book_id = sample_book

    def test_add_review_book_not_found(self, client: TestClient, auth_headers, mock_db_session):
        """Test adding review to non-existent book"""
        # Mock execute as async
        async def async_execute(query):
            query_str = str(query).lower()
            if "select" in query_str and "books" in query_str:
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                return mock_result
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            return mock_result
        
        mock_db_session.execute = MagicMock(side_effect=async_execute)
        mock_db_session.commit = AsyncMock(return_value=None)
        
        response = client.post("/books/999/reviews", 
            json={
                "user_id": 1,
                "review_text": "Great book!",
                "rating": 5
            },
            headers=auth_headers
        )
        
        print(f"Add review to non-existent book response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 404
        assert "Book not found" in response.json()["detail"]

    def test_get_reviews(self, client: TestClient, sample_book, mock_db_session):
        """Test getting reviews for a book"""
        print(f"Sample book ID in get_reviews: {sample_book.id}")
        
        # Mock execute as async
        async def async_execute(query):
            query_str = str(query).lower()
            if "select" in query_str and "books" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = sample_book
                return mock_result
            elif "select" in query_str and "reviews" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_scalars = MagicMock()
                
                # Create mock review
                mock_review = MagicMock(spec=Review)
                mock_review.id = 1
                mock_review.book_id = sample_book.id
                mock_review.user_id = 1
                mock_review.review_text = "Great book!"
                mock_review.rating = 5
                mock_review.created_at = datetime.now()
                
                # Mock user
                mock_user = MagicMock()
                mock_user.username = "testuser"
                mock_review.user = mock_user
                
                # Serialization
                def review_to_dict():
                    return {
                        'id': 1,
                        'book_id': sample_book.id,
                        'user_id': 1,
                        'review_text': "Great book!",
                        'rating': 5,
                        'created_at': mock_review.created_at.isoformat(),
                        'user': {'username': 'testuser'}
                    }
                
                mock_review.dict = MagicMock(side_effect=review_to_dict)
                mock_scalars.all.return_value = [mock_review]
                mock_result.scalars.return_value = mock_scalars
                return mock_result
            
            # Default
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            return mock_result
        
        mock_db_session.execute = MagicMock(side_effect=async_execute)
        
        response = client.get(f"/books/{sample_book.id}/reviews")
    
        print(f"Get reviews response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_reviews_book_not_found(self, client: TestClient, mock_db_session):
        """Test getting reviews for non-existent book"""
        async def async_execute(query):
            query_str = str(query).lower()
            if "select" in query_str and "books" in query_str:
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = None
                return mock_result
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            return mock_result
        
        mock_db_session.execute = MagicMock(side_effect=async_execute)
        
        response = client.get("/books/999/reviews")
    
        print(f"Get reviews for non-existent book response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 404
        assert "Book not found" in response.json()["detail"]

    def test_book_summary(self, client: TestClient, sample_book, mock_db_session):
        """Test getting book summary"""
        print(f"Sample book ID in book_summary: {sample_book.id}")
        
        async def async_execute(query):
            query_str = str(query).lower()
            if "select" in query_str and "books" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = sample_book
                return mock_result
            elif "select" in query_str and "reviews" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_scalars = MagicMock()
                
                # Create mock reviews
                mock_review1 = MagicMock(spec=Review)
                mock_review1.rating = 4
                mock_review1.review_text = "Good book"
                
                mock_review2 = MagicMock(spec=Review)
                mock_review2.rating = 5
                mock_review2.review_text = "Excellent!"
                
                mock_scalars.all.return_value = [mock_review1, mock_review2]
                mock_result.scalars.return_value = mock_scalars
                return mock_result
            
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            return mock_result
        
        mock_db_session.execute = MagicMock(side_effect=async_execute)
        
        # Mock the summary generation
        with patch('app.main.generate_summary', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = "Test summary of reviews"
            
            response = client.get(f"/books/{sample_book.id}/summary")
    
        print(f"Book summary response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        assert "rating" in response.json()

    def test_book_summary_no_reviews(self, client: TestClient, sample_book, mock_db_session):
        """Test getting summary for book with no reviews"""
        print(f"Sample book ID in book_summary_no_reviews: {sample_book.id}")
        
        async def async_execute(query):
            query_str = str(query).lower()
            if "select" in query_str and "books" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_result.scalar_one_or_none.return_value = sample_book
                return mock_result
            elif "select" in query_str and "reviews" in query_str and "where" in query_str:
                mock_result = MagicMock()
                mock_scalars = MagicMock()
                mock_scalars.all.return_value = []
                mock_result.scalars.return_value = mock_scalars
                return mock_result
            
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            return mock_result
        
        mock_db_session.execute = MagicMock(side_effect=async_execute)
        
        response = client.get(f"/books/{sample_book.id}/summary")
    
        print(f"Book summary with no reviews response: {response.status_code}")
        print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        assert "rating" in response.json()