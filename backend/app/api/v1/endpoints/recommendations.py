from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.book import Book
from app.models.review import Review
from app.api.deps import get_current_user, get_current_active_user
from app.services.recommendation_service import RecommendationService
from app.core.logger import StructuredLogger
from app.core.config import settings

from app.core.error_handlers import (
    AppError,
    ValidationError,
    NotFoundError
)
from app.core.security import rate_limit


router = APIRouter()


class BookRecommendation(BaseModel):
    """Individual book recommendation"""
    book_id: int
    title: str
    author: str
    genre: Optional[str] = None
    year: Optional[int] = None
    score: float
    reason: str
    strategy: Optional[str] = None

class RecommendationResponse(BaseModel):
    """Recommendation response - all fields optional except success"""
    success: bool
    user_id: Optional[int] = None  # Make optional
    recommendations: List[BookRecommendation] = []  # Default empty list
    total_generated: int = 0  # Default 0
    source: str
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    request_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    
    class Config:
        # Allow extra fields during response validation
        extra = "ignore"

# Or better, create a success response model
class SuccessResponse(BaseModel):
    success: bool = True
    message: str

# And use Union for different response types
from typing import Union

RecommendationAPIResponse = Union[RecommendationResponse, SuccessResponse]

# Rate limiting for recommendation endpoints
@rate_limit(limit=30, period=60)
@router.get("/", response_model=RecommendationResponse)
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    genre: Optional[str] = None,
    author: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    min_rating: Optional[float] = None,
    force_refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get personalized book recommendations
    """
    StructuredLogger.info(
        "Recommendation request",
        user_id=current_user.id,
        limit=limit,
        genre=genre,
        force_refresh=force_refresh
    )
    
    try:
        # Prepare filters
        filters = {}
        if genre:
            filters['genre'] = genre
        if author:
            filters['author'] = author
        if year_from:
            filters['year_from'] = year_from
        if year_to:
            filters['year_to'] = year_to
        if min_rating:
            filters['min_rating'] = min_rating
        
        # Get recommendations
        service = RecommendationService(db)
        result = await service.get_recommendations(
            user_id=current_user.id,
            limit=limit,
            filters=filters,
            force_refresh=force_refresh
        )
        
        # Ensure response matches schema
        if "user_id" not in result:
            result["user_id"] = current_user.id
        if "total_generated" not in result:
            result["total_generated"] = len(result.get("recommendations", []))
        if "generated_at" not in result:
            result["generated_at"] = datetime.now().isoformat()
        
        return result
        
    except AppError as e:
        StructuredLogger.warning(
            "Recommendation request failed",
            user_id=current_user.id,
            error=e.message
        )
        raise HTTPException(
            status_code=e.status_code,
            detail={"message": e.message, "code": e.code}
        )
    except Exception as e:
        StructuredLogger.error(
            "Recommendation request failed",
            user_id=current_user.id,
            error=e
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations"
        )

@rate_limit(limit=10, period=60)
@router.get("/popular", response_model=RecommendationResponse)
async def get_popular_recommendations(
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get popular book recommendations
    """
    try:
        service = RecommendationService(db)
        
        # Get all active books
        all_books = db.query(Book).filter(Book.is_active == True).all()
        
        # Use popular strategy
        popular_books = []
        for book in all_books:
            if not book.reviews:
                continue
            
            avg_rating = book.avg_rating or 0
            review_count = book.review_count or 0
            
            # Simple popularity score
            popularity = (avg_rating * 0.6) + (min(review_count, 100) / 100 * 0.4)
            
            if popularity > 2.5:
                popular_books.append({
                    "book_id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "genre": book.genre,
                    "year": book.year,
                    "score": round(popularity, 3),
                    "reason": f"Highly rated ({avg_rating:.1f}⭐, {review_count} reviews)",
                    "strategy": "popular"
                })
        
        # Sort by score
        popular_books.sort(key=lambda x: x["score"], reverse=True)
        recommendations = popular_books[:limit]
        
        return {
            "success": True,
            "user_id": current_user.id,
            "recommendations": recommendations,
            "total_generated": len(recommendations),
            "source": "popular",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        StructuredLogger.error("Popular recommendations failed", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get popular recommendations"
        )

@rate_limit(limit=10, period=60)
@router.get("/new", response_model=RecommendationResponse)
async def get_new_releases(
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get new book releases
    """
    try:
        current_year = datetime.now().year
        
        # Get books from last 3 years
        new_books = db.query(Book).filter(
            Book.is_active == True,
            Book.year_published >= current_year - 3
        ).order_by(Book.year_published.desc()).limit(limit * 2).all()
        
        recommendations = []
        for book in new_books:
            recency_score = (book.year_published - (current_year - 3)) / 3 if book.year_published else 0.5
            
            recommendations.append({
                "book_id": book.id,
                "title": book.title,
                "author": book.author,
                "genre": book.genre,
                "year": book.year_published,
                "score": round(recency_score, 3),
                "reason": f"New release ({book.year_published})",
                "strategy": "new"
            })
        
        return {
            "success": True,
            "user_id": current_user.id,
            "recommendations": recommendations[:limit],
            "total_generated": len(recommendations),
            "source": "new_releases",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        StructuredLogger.error("New releases failed", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get new releases"
        )

@rate_limit(limit=5, period=60)
@router.post("/clear-cache")
async def clear_recommendation_cache(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Clear cached recommendations for current user
    """
    try:
        service = RecommendationService(db)
        await service.clear_user_cache(current_user.id)
        
        StructuredLogger.info(
            "Cache cleared",
            user_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Recommendation cache cleared",
            "user_id": current_user.id
        }
        
    except Exception as e:
        StructuredLogger.error("Cache clear failed", error=e, user_id=current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear cache"
        )

@router.get("/stats")
async def get_recommendation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recommendation system statistics
    """
    try:
        service = RecommendationService(db)
        stats = service.get_service_stats()
        
        # Add basic user stats
        user_reviews = db.query(Review).filter(Review.user_id == current_user.id).count()
        total_books = db.query(Book).filter(Book.is_active == True).count()
        
        stats.update({
            "user_reviews_count": user_reviews,
            "total_books_available": total_books,
            "user_id": current_user.id
        })
        
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        StructuredLogger.error("Failed to get stats", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )