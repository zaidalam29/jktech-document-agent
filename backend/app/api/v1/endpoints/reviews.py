from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.review import Review, ReviewCreate, ReviewUpdate
from app.crud.review import review_crud
from app.crud.book import book_crud
from app.api.deps import get_current_user
from app.core.logger import logger

router = APIRouter()

@router.post("", response_model=Review, status_code=status.HTTP_201_CREATED)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new review for a book.
    - Requires authentication
    - User can only have one review per book
    """
    # Check if book exists
    book = book_crud.get(db=db, book_id=review_in.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {review_in.book_id} not found"
        )
    
    # Check if user already reviewed this book
    existing_review = review_crud.get_user_review_for_book(
        db=db, 
        user_id=current_user.id, 
        book_id=review_in.book_id
    )
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this book. Use PUT to update your review."
        )
    
    try:
        review = review_crud.create(db=db, review_in=review_in, user_id=current_user.id)
        logger.info(f"Review created: {review.id} by user {current_user.username} for book {review_in.book_id}")
        return review
    except Exception as e:
        logger.error(f"Error creating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create review"
        )

@router.get("/book/{book_id}", response_model=List[Review])
def get_book_reviews(
    book_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    Get all reviews for a specific book.
    - Public endpoint (no authentication required)
    """
    # Check if book exists
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        reviews = review_crud.get_by_book(db=db, book_id=book_id, skip=skip, limit=limit)
        return reviews
    except Exception as e:
        logger.error(f"Error fetching reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch reviews"
        )

@router.get("/book/{book_id}/summary")
def get_book_review_summary(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get aggregated rating and review summary for a book.
    - Public endpoint
    - Returns average rating, total reviews, and rating distribution
    """
    # Check if book exists
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        summary = review_crud.get_book_summary(db=db, book_id=book_id)
        # Don't include full reviews in summary
        summary_data = {
            "book_id": summary["book_id"],
            "total_reviews": summary["total_reviews"],
            "average_rating": summary["average_rating"],
            "rating_distribution": summary["rating_distribution"]
        }
        return summary_data
    except Exception as e:
        logger.error(f"Error fetching review summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch review summary"
        )

@router.get("/my-reviews", response_model=List[Review])
def get_my_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all reviews created by the current user.
    - Requires authentication
    """
    try:
        reviews = review_crud.get_by_user(
            db=db, 
            user_id=current_user.id, 
            skip=skip, 
            limit=limit
        )
        return reviews
    except Exception as e:
        logger.error(f"Error fetching user reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch your reviews"
        )

@router.get("/{review_id}", response_model=Review)
def get_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific review by ID.
    - Public endpoint
    """
    review = review_crud.get(db=db, review_id=review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with id {review_id} not found"
        )
    return review

@router.put("/{review_id}", response_model=Review)
def update_review(
    review_id: int,
    review_in: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a review.
    - Only the review creator can update their own review
    """
    review = review_crud.get(db=db, review_id=review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with id {review_id} not found"
        )
    
    # Check permission - only creator can update
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    try:
        updated_review = review_crud.update(db=db, review=review, review_in=review_in)
        logger.info(f"Review updated: {review_id} by user {current_user.username}")
        return updated_review
    except Exception as e:
        logger.error(f"Error updating review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update review"
        )

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a review.
    - Only the review creator or admin can delete
    """
    review = review_crud.get(db=db, review_id=review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with id {review_id} not found"
        )
    
    # Check permission - only creator or admin can delete
    user_roles = [role.name for role in current_user.roles]
    if review.user_id != current_user.id and "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    try:
        review_crud.delete(db=db, review_id=review_id)
        logger.info(f"Review deleted: {review_id} by user {current_user.username}")
        return None
    except Exception as e:
        logger.error(f"Error deleting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete review"
        )
        
def get_book_summary(self, db: Session, book_id: int) -> Dict[str, Any]:
        """
        Get aggregated rating statistics for a book
        Returns basic stats without AI analysis
        """
        from app.models.review import Review
        
        # Calculate rating statistics
        result = db.query(
            func.count(Review.id).label('total_reviews'),
            func.coalesce(func.avg(Review.rating), 0).label('average_rating')
        ).filter(Review.book_id == book_id).first()
        
        # Calculate rating distribution
        rating_distribution = {}
        for rating in range(1, 6):
            count = db.query(func.count(Review.id)).filter(
                Review.book_id == book_id,
                Review.rating == rating
            ).scalar()
            rating_distribution[str(rating)] = count or 0
        
        return {
            "book_id": book_id,
            "total_reviews": result.total_reviews or 0,
            "average_rating": round(float(result.average_rating or 0), 2),
            "rating_distribution": rating_distribution
        }
    
def get_reviews_for_analysis(self, db: Session, book_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get reviews for AI analysis
        Returns structured data with text and ratings
        """
        from app.models.review import Review
        
        reviews = db.query(Review).filter(
            Review.book_id == book_id,
            Review.review_text.isnot(None)
        ).order_by(Review.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": review.id,
                "rating": review.rating,
                "review_text": review.review_text,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "has_text": True if review.review_text and review.review_text.strip() else False
            }
            for review in reviews
        ]        