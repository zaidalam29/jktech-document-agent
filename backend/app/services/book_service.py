from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.book import Book
from app.services.ai_service import ai_service
from app.core.logger import logger
import asyncio

class BookService:
    """Service for book-related operations with AI integration"""
    
    async def generate_book_summary(self, content: str, title: str, author: str) -> Optional[str]:
        """
        Generate book summary using AI
        """
        try:
            print(f"DEBUG generate_book_summary: Starting for {title}")
            print(f"DEBUG: Content preview: {content[:200]}")
            
            system_prompt = """You are a book summary expert..."""
            
            content_preview = content[:2000]
            
            prompt = f"""Generate a professional book summary for:
            
            Title: {title}
            Author: {author}
            
            Book Content:
            {content_preview}"""
            
            print(f"DEBUG: Calling ai_service.generate_completion")
            
            # Direct AI call test
            from app.services.ai_service import ai_service
            print(f"DEBUG: AI Service: {ai_service}")
            print(f"DEBUG: API Key present: {bool(ai_service.api_key)}")
            
            summary = await ai_service.generate_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=500
            )
            
            print(f"DEBUG: AI service returned: {summary[:100] if summary else 'None'}")
            
            return summary
            
        except Exception as e:
            print(f"DEBUG: Error in generate_book_summary: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
        
    
    async def create_book_with_summary(
        self, 
        db: Session, 
        book_data: Dict[str, Any], 
        user_id: int
    ) -> Optional[Book]:
        """
        Create book with AI-generated summary
        
        Args:
            db: Database session
            book_data: Book data dictionary
            user_id: User ID who is creating the book
            
        Returns:
            Created Book object or None
        """
        try:
            # Extract data
            title = book_data.get("title")
            author = book_data.get("author")
            content = book_data.get("content")
            
            # Generate summary
            summary = await self.generate_book_summary(content, title, author)
            
            # Create book
            book = Book(
                title=title,
                author=author,
                genre=book_data.get("genre"),
                year_published=book_data.get("year_published"),
                content=content,
                summary=summary,
                user_id=user_id
            )
            
            db.add(book)
            db.commit()
            db.refresh(book)
            
            logger.info(f"Book created with AI summary: {book.id}")
            return book
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating book with summary: {str(e)}")
            return None
    
    async def regenerate_book_summary(self, db: Session, book_id: int) -> Optional[Book]:
        """
        Regenerate summary for an existing book
        """
        try:
            print(f"DEBUG: Starting summary regeneration for book: {book_id}")
            
            book = db.query(Book).filter(Book.id == book_id).first()
            if not book:
                print(f"DEBUG: Book not found: {book_id}")
                return None
            
            print(f"DEBUG: Book found: ID={book.id}, Title={book.title}")
            print(f"DEBUG: Content: {book.content[:100] if book.content else 'No content'}")
            
            # Check if book has sufficient content
            if not book.content or len(book.content.strip()) < 10:
                print(f"DEBUG: Book content too short: {len(book.content) if book.content else 0}")
                return None
            
            # Generate new summary
            print(f"DEBUG: Calling AI service...")
            summary = await self.generate_book_summary(
                content=book.content,
                title=book.title,
                author=book.author
            )
            
            print(f"DEBUG: AI response: {'Received' if summary else 'None'}")
            if summary:
                print(f"DEBUG: Summary length: {len(summary)}")
            
            if summary:
                print(f"DEBUG: Updating book in database")
                book.summary = summary
                db.commit()
                db.refresh(book)
                
                print(f"DEBUG: Success! Book updated")
                return book
            else:
                print(f"DEBUG: AI failed to generate summary")
                return None
                
        except Exception as e:
            print(f"DEBUG: Exception occurred: {str(e)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return None
    
    def get_book_summary_status(self, book: Book) -> Dict[str, Any]:
        """
        Get summary generation status for a book
        
        Returns:
            Dictionary with summary status information
        """
        return {
            "has_summary": bool(book.summary and book.summary.strip()),
            "summary_length": len(book.summary) if book.summary else 0,
            "content_length": len(book.content) if book.content else 0,
            "can_regenerate": bool(book.content and len(book.content.strip()) > 50)
        }

# Global instance
book_service = BookService()