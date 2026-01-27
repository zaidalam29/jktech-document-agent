from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from app.api import deps
from app.crud.book import book_crud  # book_crud instance
from app.crud.review import review_crud  # review_crud instance
from app.services.review_service import review_service
from app.services.cache_service import cache_service
from app.core.logger import logger

router = APIRouter()

@router.get("/book/{book_id}/summary")
async def get_book_review_summary_advanced(
    book_id: int,
    refresh: bool = Query(False, description="Force refresh cache and AI analysis"),
    use_ai: bool = Query(True, description="Enable AI-powered analysis"),
    detailed: bool = Query(False, description="Return detailed analysis with samples"),
    db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Get advanced review summary with AI-powered insights.
    
    Features:
    - AI-powered sentiment and theme analysis
    - Smart caching (24 hours)
    - Review samples
    - Rating analytics
    
    Use /api/v1/reviews/book/{book_id}/summary for basic statistics only.
    """
    # Check if book exists
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        # Get summary from service
        summary = await review_service.get_review_summary(
            db=db,
            book_id=book_id,
            use_cache=not refresh,
            force_ai=use_ai
        )
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate summary"
            )
        
        # Return simplified version if not detailed
        if not detailed:
            response = {
                "book": {
                    "id": book_id,
                    "title": summary.get("book_title", ""),
                    "author": summary.get("book_author", ""),
                    "genre": summary.get("book_genre"),
                    "published_year": summary.get("book_year")
                },
                "statistics": {
                    "total_reviews": summary.get("total_reviews", 0),
                    "average_rating": summary.get("average_rating", 0),
                    "rating_distribution": summary.get("rating_distribution", {})
                },
                "quick_summary": summary.get("quick_summary", {}),
                "ai_analysis_available": summary.get("ai_summary", {}).get("available", False),
                "from_cache": summary.get("from_cache", False)
            }
            
            # Add AI summary if available
            if summary.get("ai_summary", {}).get("available"):
                ai_data = summary["ai_summary"].get("analysis", {})
                response["ai_insights"] = {
                    "sentiment": ai_data.get("sentiment"),
                    "key_themes": ai_data.get("key_themes", [])[:5],
                    "common_praises": ai_data.get("common_praises", [])[:3],
                    "common_criticisms": ai_data.get("common_criticisms", [])[:3],
                    "target_audience": ai_data.get("target_audience", "")
                }
            
            return response
        
        # Return full detailed summary
        return summary
        
    except Exception as e:
        logger.error(f"Error in advanced summary endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate advanced summary: {str(e)}"
        )

@router.get("/book/{book_id}/summary/quick")
async def get_quick_summary(
    book_id: int,
    db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Get quick summary (cached, fast response).
    Returns cached data if available, otherwise basic stats.
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        # Try to get from cache first
        cache_key = f"book_review_summary:{book_id}"
        cached_data = cache_service.get(cache_key)
        
        if cached_data:
            return {
                "book": {
                    "id": book_id,
                    "title": book.title,
                    "author": book.author
                },
                "total_reviews": cached_data.get("total_reviews", 0),
                "average_rating": cached_data.get("average_rating", 0),
                "from_cache": True,
                "cached_at": cached_data.get("analysis_metadata", {}).get("generated_at")
            }
        
        # Fall back to basic stats using review_crud instance
        stats = review_crud.get_book_summary(db=db, book_id=book_id)
        return {
            "book": {
                "id": book_id,
                "title": book.title,
                "author": book.author
            },
            "total_reviews": stats.get("total_reviews", 0),
            "average_rating": stats.get("average_rating", 0),
            "from_cache": False,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in quick summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch quick summary"
        )

@router.post("/book/{book_id}/summary/refresh")
async def refresh_advanced_summary(
    book_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Trigger refresh of advanced summary.
    Runs in background to avoid long request times.
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    # Add background task to refresh summary
    background_tasks.add_task(
        review_service.background_refresh_summary,
        db,
        book_id
    )
    
    return {
        "message": "Summary refresh triggered in background",
        "book_id": book_id,
        "book_title": book.title,
        "status": "processing"
    }

@router.get("/book/{book_id}/summary/status")
async def get_summary_status(
    book_id: int,
    db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Check status of summary generation and cache.
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        cache_key = f"book_review_summary:{book_id}"
        cached = cache_service.get(cache_key)
        
        # Get basic stats
        stats = review_crud.get_book_summary(db=db, book_id=book_id)
        
        # Get reviews for AI analysis
        from app.models.review import Review
        reviews_for_ai = db.query(Review).filter(
            Review.book_id == book_id,
            Review.review_text.isnot(None)
        ).count()
        
        # Calculate cache age if cached
        cache_age = None
        if cached and "analysis_metadata" in cached:
            try:
                cache_time = datetime.fromisoformat(
                    cached["analysis_metadata"].get("generated_at", "2000-01-01")
                )
                age = datetime.now() - cache_time
                cache_age = round(age.total_seconds() / 60, 2)
            except:
                pass
        
        return {
            "book_id": book_id,
            "book_title": book.title,
            "cached": cached is not None,
            "cache_age_minutes": cache_age,
            "total_reviews": stats.get("total_reviews", 0),
            "reviews_with_text": reviews_for_ai,
            "ai_analysis_eligible": reviews_for_ai >= 3,
            "summary_available": stats.get("total_reviews", 0) > 0
        }
        
    except Exception as e:
        logger.error(f"Error checking summary status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check summary status"
        )

@router.get("/batch")
async def get_batch_summaries(
    book_ids: str = Query(..., description="Comma-separated book IDs (max 20)"),
    simple: bool = Query(True, description="Simple format for each book"),
    db: Session = Depends(deps.get_db)
) -> Dict[str, Any]:
    """
    Get summaries for multiple books efficiently.
    Uses cache when available, falls back to basic stats.
    """
    try:
        # Parse and validate book IDs
        ids = []
        for id_str in book_ids.split(","):
            id_str = id_str.strip()
            if id_str.isdigit():
                ids.append(int(id_str))
        
        if not ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid book IDs provided"
            )
        
        if len(ids) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 20 books per batch request"
            )
        
        results = []
        for book_id in ids:
            try:
                book = book_crud.get(db=db, book_id=book_id)
                if book:
                    # Try to get from cache first
                    cache_key = f"book_review_summary:{book_id}"
                    cached = cache_service.get(cache_key)
                    
                    if cached and simple:
                        results.append({
                            "book_id": book_id,
                            "title": book.title,
                            "author": book.author,
                            "total_reviews": cached.get("total_reviews", 0),
                            "average_rating": cached.get("average_rating", 0),
                            "from_cache": True
                        })
                    else:
                        # Get basic stats using review_crud instance
                        stats = review_crud.get_book_summary(db=db, book_id=book_id)
                        results.append({
                            "book_id": book_id,
                            "title": book.title,
                            "author": book.author,
                            "total_reviews": stats.get("total_reviews", 0),
                            "average_rating": stats.get("average_rating", 0),
                            "from_cache": False
                        })
            except Exception as e:
                logger.warning(f"Error processing book {book_id}: {str(e)}")
                results.append({
                    "book_id": book_id,
                    "error": "Failed to fetch data",
                    "from_cache": False
                })
        
        return {
            "total_requested": len(ids),
            "successful": len([r for r in results if "error" not in r]),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch summaries: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process batch request"
        )