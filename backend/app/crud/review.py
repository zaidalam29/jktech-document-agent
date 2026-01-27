from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.review import Review
from app.models.book import Book
from app.schemas.review import ReviewCreate, ReviewUpdate

class CRUDReview:
    """CRUD operations for Review model"""
    
    def create(self, db: Session, review_in: ReviewCreate, user_id: int) -> Review:
        """Create a new review"""
        review = Review(
            book_id=review_in.book_id,
            user_id=user_id,
            review_text=review_in.review_text,
            rating=review_in.rating
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review
    
    def get(self, db: Session, review_id: int) -> Optional[Review]:
        """Get a review by ID"""
        return db.query(Review).filter(Review.id == review_id).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Review]:
        """Get multiple reviews"""
        return db.query(Review).offset(skip).limit(limit).all()
    
    def get_by_book(
        self, 
        db: Session, 
        book_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Review]:
        """Get all reviews for a specific book"""
        return db.query(Review).filter(
            Review.book_id == book_id
        ).offset(skip).limit(limit).all()
    
    def get_by_user(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Review]:
        """Get all reviews by a specific user"""
        return db.query(Review).filter(
            Review.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_user_review_for_book(
        self, 
        db: Session, 
        user_id: int, 
        book_id: int
    ) -> Optional[Review]:
        """Check if user already reviewed a book"""
        return db.query(Review).filter(
            Review.user_id == user_id,
            Review.book_id == book_id
        ).first()
    
    def update(
        self, 
        db: Session, 
        review: Review, 
        review_in: ReviewUpdate
    ) -> Review:
        """Update a review"""
        update_data = review_in.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(review, field, value)
        
        db.add(review)
        db.commit()
        db.refresh(review)
        return review
    
    def delete(self, db: Session, review_id: int) -> bool:
        """Delete a review"""
        review = db.query(Review).filter(Review.id == review_id).first()
        if review:
            db.delete(review)
            db.commit()
            return True
        return False
    
    def get_book_summary(self, db: Session, book_id: int) -> dict:
        """Get aggregated rating and review summary for a book"""
        reviews = db.query(Review).filter(Review.book_id == book_id).all()
        
        if not reviews:
            return {
                "book_id": book_id,
                "total_reviews": 0,
                "average_rating": None,
                "rating_distribution": {
                    "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
                }
            }
        
        # Calculate average rating
        avg_rating = db.query(func.avg(Review.rating)).filter(
            Review.book_id == book_id
        ).scalar()
        
        # Rating distribution
        distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in reviews:
            rating_key = str(int(review.rating))
            distribution[rating_key] = distribution.get(rating_key, 0) + 1
        
        return {
            "book_id": book_id,
            "total_reviews": len(reviews),
            "average_rating": round(float(avg_rating), 1) if avg_rating else None,
            "rating_distribution": distribution,
            "reviews": reviews
        }
    
    def count_by_book(self, db: Session, book_id: int) -> int:
        """Count reviews for a specific book"""
        return db.query(Review).filter(Review.book_id == book_id).count()

def get_reviews_by_book(db: Session, book_id: int, skip: int = 0, limit: int = 100) -> List[Review]:
    """Get all reviews for a specific book"""
    return db.query(Review)\
        .filter(Review.book_id == book_id)\
        .order_by(Review.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
        
# Create global instance
review_crud = CRUDReview()