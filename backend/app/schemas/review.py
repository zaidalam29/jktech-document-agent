from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

# Review Schemas
class ReviewBase(BaseModel):
    review_text: str = Field(..., min_length=10, max_length=2000)
    rating: float = Field(..., ge=0.0, le=5.0)
    
    @validator('rating')
    def validate_rating(cls, v):
        if v < 0 or v > 5:
            raise ValueError('Rating must be between 0 and 5')
        # Round to 1 decimal place
        return round(v, 1)

class ReviewCreate(ReviewBase):
    """Schema for creating a review"""
    book_id: int = Field(..., gt=0)

class ReviewUpdate(BaseModel):
    """Schema for updating a review - all fields optional"""
    review_text: Optional[str] = Field(None, min_length=10, max_length=2000)
    rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    
    @validator('rating')
    def validate_rating(cls, v):
        if v is not None:
            if v < 0 or v > 5:
                raise ValueError('Rating must be between 0 and 5')
            return round(v, 1)
        return v

class Review(ReviewBase):
    """Schema for review response"""
    id: int
    book_id: int
    user_id: int
    
    class Config:
        from_attributes = True

class ReviewWithBook(Review):
    """Schema for review with book details"""
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    
    class Config:
        from_attributes = True