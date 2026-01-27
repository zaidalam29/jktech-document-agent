# app/crud/book.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.book import Book
from app.models.review import Review
from app.schemas.book import BookCreate, BookUpdate
from app.services.book_service import book_service

class CRUDBook:
    """CRUD operations for Book model"""
    
    async def create(self, db: Session, book_in: BookCreate, user_id: int) -> Book:
        """Create a new book with AI-generated summary"""
        try:
            # Convert to dict for service
            book_data = book_in.model_dump()
            
            # Use service to create book with AI summary
            book = await book_service.create_book_with_summary(
                db=db,
                book_data=book_data,
                user_id=user_id
            )
            
            if not book:
                raise Exception("Failed to create book with AI summary")
                
            return book
                
        except Exception as e:
            db.rollback()
            raise e
    
    def get(self, db: Session, book_id: int) -> Optional[Book]:
        """Get a book by ID"""
        return db.query(Book).filter(Book.id == book_id).first()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        genre: Optional[str] = None,
        author: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Book]:
        """Get multiple books with optional filtering"""
        query = db.query(Book)
        
        # Apply filters
        if genre:
            query = query.filter(Book.genre.ilike(f"%{genre}%"))
        
        if author:
            query = query.filter(Book.author.ilike(f"%{author}%"))
        
        if search:
            query = query.filter(
                (Book.title.ilike(f"%{search}%")) | 
                (Book.author.ilike(f"%{search}%")) |
                (Book.summary.ilike(f"%{search}%")) |
                (Book.content.ilike(f"%{search}%"))
            )
        
        return query.order_by(Book.created_at.desc()).offset(skip).limit(limit).all()
    
    def update(
        self, 
        db: Session, 
        book: Book, 
        book_in: BookUpdate
    ) -> Book:
        """Update a book"""
        update_data = book_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(book, field, value)
        
        db.add(book)
        db.commit()
        db.refresh(book)
        return book
    
    def delete(self, db: Session, book_id: int) -> bool:
        """Delete a book"""
        book = db.query(Book).filter(Book.id == book_id).first()
        if book:
            db.delete(book)
            db.commit()
            return True
        return False
    
    def get_with_reviews(self, db: Session, book_id: int) -> Optional[dict]:
        """Get book with reviews and average rating"""
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            return None
        
        # Get reviews
        reviews = db.query(Review).filter(Review.book_id == book_id).all()
        
        # Calculate average rating
        avg_rating = db.query(func.avg(Review.rating)).filter(
            Review.book_id == book_id
        ).scalar()
        
        return {
            "book": book,
            "reviews": reviews,
            "average_rating": round(float(avg_rating), 1) if avg_rating else None,
            "total_reviews": len(reviews)
        }
    
    def get_user_books(
        self, 
        db: Session, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Book]:
        """Get all books created by a specific user"""
        return db.query(Book).filter(
            Book.user_id == user_id
        ).order_by(Book.created_at.desc()).offset(skip).limit(limit).all()
    
    def count(self, db: Session) -> int:
        """Get total count of books"""
        return db.query(Book).count()
    
    async def regenerate_summary(self, db: Session, book_id: int) -> Optional[Book]:
        """Regenerate AI summary for a book"""
        return await book_service.regenerate_book_summary(db, book_id)
    
    def get_summary_info(self, book: Book) -> Dict[str, Any]:
        """Get summary information for a book"""
        return book_service.get_book_summary_status(book)

# Create global instance
book_crud = CRUDBook()