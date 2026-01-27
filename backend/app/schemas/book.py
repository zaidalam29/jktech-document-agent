# app/schemas/book.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    genre: Optional[str] = Field(None, max_length=100)
    year_published: Optional[int] = Field(None, ge=1000, le=9999)
    content: str = Field(..., description="Book content/description for AI summary generation")
    # Note: summary field removed from input
    
    @validator('year_published')
    def validate_year(cls, v):
        if v and v > datetime.now().year:
            raise ValueError('Year cannot be in the future')
        return v

class BookCreate(BookBase):
    """Schema for creating a book"""
    pass

class BookUpdate(BaseModel):
    """Schema for updating a book - all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    author: Optional[str] = Field(None, min_length=1, max_length=255)
    genre: Optional[str] = Field(None, max_length=100)
    year_published: Optional[int] = Field(None, ge=1000, le=9999)
    content: Optional[str] = None
    
    @validator('year_published')
    def validate_year(cls, v):
        if v and v > datetime.now().year:
            raise ValueError('Year cannot be in the future')
        return v

class Book(BookBase):
    """Schema for book response"""
    id: int
    user_id: Optional[int] = None
    summary: Optional[str] = None  # AI-generated summary
    
    class Config:
        from_attributes = True

class BookInDBBase(BookBase):
    id: int
    user_id: int
    summary: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class BookWithReviews(Book):
    """Schema for book with reviews"""
    reviews: List['ReviewInBook'] = []
    average_rating: Optional[float] = None
    total_reviews: int = 0
    
    class Config:
        from_attributes = True

class ReviewInBook(BaseModel):
    """Minimal review info for book listing"""
    id: int
    user_id: int
    rating: float
    review_text: str
    
    class Config:
        from_attributes = True