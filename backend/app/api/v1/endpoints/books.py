# app/api/v1/endpoints/books.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.book import Book, BookCreate, BookUpdate, BookWithReviews
from app.crud.book import book_crud
from app.api.deps import get_current_user, require_role
from app.core.logger import logger

router = APIRouter()

@router.post("", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_in: BookCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new book with AI-generated summary.
    
    - Any authenticated user can create a book
    - Summary is automatically generated from book content
    - Uses AI (Llama3 via OpenRouter)
    """
    try:
        # Create book with AI summary
        book = await book_crud.create(db=db, book_in=book_in, user_id=current_user.id)
        
        if not book:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create book with AI summary"
            )
        
        logger.info(f"Book created with AI summary: {book.id} by user {current_user.username}")
        
        return book
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating book: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create book"
        )

@router.get("", response_model=List[Book])
def get_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    genre: Optional[str] = None,
    author: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all books with optional filtering.
    - Public endpoint (no authentication required)
    - Supports filtering by genre, author, and search term
    - Pagination with skip and limit
    - Includes AI-generated summaries
    """
    try:
        books = book_crud.get_multi(
            db=db, 
            skip=skip, 
            limit=limit,
            genre=genre,
            author=author,
            search=search
        )
        return books
    except Exception as e:
        logger.error(f"Error fetching books: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch books"
        )

@router.get("/my-books", response_model=List[Book])
def get_my_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all books created by the current user.
    - Requires authentication
    """
    try:
        books = book_crud.get_user_books(
            db=db, 
            user_id=current_user.id, 
            skip=skip, 
            limit=limit
        )
        return books
    except Exception as e:
        logger.error(f"Error fetching user books: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch your books"
        )

@router.get("/{book_id}", response_model=Book)
def get_book(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific book by ID.
    - Public endpoint (no authentication required)
    - Includes AI-generated summary
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    return book

@router.get("/{book_id}/details", response_model=BookWithReviews)
def get_book_with_reviews(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a book with all its reviews and average rating.
    - Public endpoint (no authentication required)
    - Includes AI-generated summary
    """
    book_data = book_crud.get_with_reviews(db=db, book_id=book_id)
    if not book_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    # Prepare response
    book_dict = {
        **book_data["book"].__dict__,
        "reviews": book_data["reviews"],
        "average_rating": book_data["average_rating"],
        "total_reviews": book_data["total_reviews"]
    }
    
    return book_dict

@router.put("/{book_id}", response_model=Book)
def update_book(
    book_id: int,
    book_in: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a book.
    - Only the book creator or admin can update
    - Does NOT regenerate summary automatically
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    # Check permission - only creator or admin can update
    user_roles = [role.name for role in current_user.roles]
    if book.user_id != current_user.id and "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this book"
        )
    
    try:
        updated_book = book_crud.update(db=db, book=book, book_in=book_in)
        logger.info(f"Book updated: {book_id} by user {current_user.username}")
        return updated_book
    except Exception as e:
        logger.error(f"Error updating book: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update book"
        )

@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a book.
    - Only the book creator or admin can delete
    - This will also delete all associated reviews (cascade)
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    # Check permission - only creator or admin can delete
    user_roles = [role.name for role in current_user.roles]
    if book.user_id != current_user.id and "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this book"
        )
    
    try:
        book_crud.delete(db=db, book_id=book_id)
        logger.info(f"Book deleted: {book_id} by user {current_user.username}")
        return None
    except Exception as e:
        logger.error(f"Error deleting book: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete book"
        )

@router.get("/stats/count")
def get_books_count(db: Session = Depends(get_db)):
    """
    Get total count of books.
    - Public endpoint
    """
    try:
        count = book_crud.count(db=db)
        return {"total_books": count}
    except Exception as e:
        logger.error(f"Error counting books: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to count books"
        )

@router.post("/{book_id}/regenerate-summary", response_model=Book)
async def regenerate_book_summary(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate AI summary for a book.
    
    - Requires authentication
    - Only book creator or admin can regenerate
    - Uses current book content to generate new summary
    - Overwrites existing summary
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    # Check permission - only creator or admin can regenerate
    user_roles = [role.name for role in current_user.roles]
    if book.user_id != current_user.id and "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to regenerate summary for this book"
        )
    
    # Check if book has content for regeneration
    if not book.content or len(book.content.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book content is too short to generate summary"
        )
    
    try:
        # Regenerate summary
        updated_book = await book_crud.regenerate_summary(db=db, book_id=book_id)
        
        if not updated_book:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to regenerate summary or check llm key"
            )
        
        logger.info(f"Summary regenerated for book: {book_id} by user {current_user.username}")
        
        return updated_book
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate summary"
        )

@router.get("/{book_id}/summary-info")
def get_book_summary_info(
    book_id: int,
    db: Session = Depends(get_db)
):
    """
    Get summary generation information for a book.
    
    - Public endpoint
    - Shows if summary exists, content length, etc.
    """
    book = book_crud.get(db=db, book_id=book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )
    
    try:
        summary_info = book_crud.get_summary_info(book)
        return {
            "book_id": book_id,
            "title": book.title,
            "has_summary": summary_info["has_summary"],
            "summary_length": summary_info["summary_length"],
            "content_length": summary_info["content_length"],
            "can_regenerate": summary_info["can_regenerate"],
            "summary_preview": (
                book.summary[:200] + "..." 
                if book.summary and len(book.summary) > 200 
                else book.summary
            ) if book.summary else None
        }
    except Exception as e:
        logger.error(f"Error getting summary info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get summary information"
        )