# app/services/review_service.py में modify करें
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import json
from datetime import datetime, timedelta

from app.crud.review import review_crud  # Import the instance
from app.models.book import Book
from app.services.ai_service import ai_service
from app.services.cache_service import cache_service
from app.core.logger import logger

class ReviewService:
    def __init__(self):
        self.cache_prefix = "book_review_summary"
        self.cache_ttl = 86400  # 24 hours
    
    async def get_review_summary(
        self,
        db: Session,
        book_id: int,
        use_cache: bool = True,
        force_ai: bool = False,
        max_reviews_for_ai: int = 20
    ) -> Dict[str, Any]:
        """
        Get comprehensive review summary for a book
        """
        cache_key = f"{self.cache_prefix}:{book_id}"
        
        # Check cache
        if use_cache:
            cached_data = cache_service.get(cache_key)
            if cached_data:
                try:
                    # Add from_cache flag
                    cached_data["from_cache"] = True
                    return cached_data
                except:
                    pass
        
        # Get book info
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return None
        
        # Get reviews using review_crud instance
        reviews = review_crud.get_by_book(db, book_id, limit=100)
        
        # Calculate basic statistics using review_crud
        stats = review_crud.get_book_summary(db, book_id)
        
        # Generate quick summary
        quick_summary = await self._generate_quick_summary(reviews)
        
        # Generate AI summary if conditions met
        ai_summary = None
        should_use_ai = force_ai or self._should_use_ai_analysis(reviews)
        
        if should_use_ai:
            ai_summary = await self._generate_ai_summary(
                reviews=reviews,
                book=book,
                max_reviews=max_reviews_for_ai
            )
        
        # Prepare review samples
        recent_reviews_sample = self._get_review_samples(reviews)
        
        # Compile final summary
        final_summary = {
            "book_id": book_id,
            "book_title": book.title,
            "book_author": book.author,
            "book_genre": book.genre if hasattr(book, 'genre') else None,
            "book_year": book.year_published if hasattr(book, 'year_published') else None,
            "total_reviews": stats.get("total_reviews", 0),
            "average_rating": stats.get("average_rating", 0),
            "rating_distribution": stats.get("rating_distribution", {}),
            "quick_summary": quick_summary,
            "ai_summary": ai_summary or {
                "available": False,
                "message": "Insufficient reviews for AI analysis",
                "minimum_reviews_required": 3,
                "minimum_text_reviews_required": 2,
                "current_reviews": len(reviews),
                "current_text_reviews": sum(1 for r in reviews if r.review_text and r.review_text.strip())
            },
            "recent_reviews_sample": recent_reviews_sample,
            "analysis_metadata": {
                "ai_used": should_use_ai,
                "total_reviews_analyzed": len(reviews),
                "cache_enabled": True,
                "generated_at": datetime.now().isoformat(),
                "summary_version": "1.0"
            },
            "from_cache": False
        }
        
        # Cache the result
        cache_service.set(cache_key, final_summary, self.cache_ttl)
        
        return final_summary
    
    def _should_use_ai_analysis(self, reviews: List) -> bool:
        """Determine if we should use AI analysis"""
        if len(reviews) < 3:
            return False
        
        text_reviews = sum(1 for r in reviews 
                          if r.review_text and 
                          len(r.review_text.strip()) > 20)
        
        return text_reviews >= 2
    
    async def _generate_quick_summary(self, reviews: List) -> Dict[str, Any]:
        """Generate quick statistical summary"""
        if not reviews:
            return {
                "sentiment": "No reviews",
                "summary": "No reviews available for this book yet.",
                "total_reviews": 0,
                "reviews_with_text": 0,
                "summary_type": "empty"
            }
        
        ratings = [r.rating for r in reviews if r.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Simple sentiment
        if avg_rating >= 4.5:
            sentiment = "Excellent"
        elif avg_rating >= 4.0:
            sentiment = "Very Positive"
        elif avg_rating >= 3.5:
            sentiment = "Positive"
        elif avg_rating >= 3.0:
            sentiment = "Mixed"
        elif avg_rating >= 2.0:
            sentiment = "Negative"
        else:
            sentiment = "Very Negative"
        
        reviews_with_text = sum(1 for r in reviews if r.review_text and r.review_text.strip())
        
        return {
            "sentiment": sentiment,
            "average_rating": round(avg_rating, 2),
            "total_reviews": len(reviews),
            "reviews_with_text": reviews_with_text,
            "summary_type": "statistical"
        }
    
    async def _generate_ai_summary(
        self, 
        reviews: List, 
        book: Book,
        max_reviews: int = 20
    ) -> Dict[str, Any]:
        """Generate AI summary"""
        try:
            # Prepare reviews data
            review_dicts = []
            for review in reviews[:max_reviews]:
                review_dicts.append({
                    "rating": review.rating,
                    "review_text": review.review_text[:1000] if review.review_text else "",
                    "has_text": bool(review.review_text and review.review_text.strip())
                })
            
            # Generate AI summary
            ai_response = await ai_service.generate_review_summary(
                reviews=review_dicts,
                book_title=book.title,
                book_author=book.author
            )
            
            if ai_response and isinstance(ai_response, dict):
                return {
                    "available": True,
                    "analysis": ai_response
                }
            else:
                return {
                    "available": False,
                    "message": "AI analysis completed but no structured response"
                }
                
        except Exception as e:
            logger.error(f"AI summary generation failed: {str(e)}")
            return {
                "available": False,
                "error": str(e),
                "message": "Failed to generate AI analysis"
            }
    
    def _get_review_samples(self, reviews: List, sample_size: int = 3) -> List[Dict[str, Any]]:
        """Get sample reviews"""
        samples = []
        for review in reviews[:sample_size]:
            sample = {
                "id": review.id,
                "rating": review.rating,
                "has_text": bool(review.review_text and review.review_text.strip()),
                "user_id": review.user_id,
                "created_at": review.created_at.isoformat() if review.created_at else None
            }
            
            if review.review_text and review.review_text.strip():
                text = review.review_text.strip()
                sample["excerpt"] = text[:150] + "..." if len(text) > 150 else text
            
            samples.append(sample)
        
        return samples
    
    async def background_refresh_summary(self, db: Session, book_id: int):
        """Background task to refresh summary"""
        try:
            logger.info(f"Starting background summary refresh for book {book_id}")
            await self.get_review_summary(
                db=db,
                book_id=book_id,
                use_cache=False,
                force_ai=True
            )
            logger.info(f"Background summary refresh completed for book {book_id}")
        except Exception as e:
            logger.error(f"Error in background refresh: {str(e)}")

# Create global instance
review_service = ReviewService()