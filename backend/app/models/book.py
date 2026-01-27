from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean  # Boolean add करें
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False, index=True)
    genre = Column(String, nullable=True)
    year_published = Column(Integer, nullable=True)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)  # Soft delete
    is_public = Column(Boolean, default=True, nullable=False)  # Public/private book
    
    # Review statistics
    avg_rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="books")
    reviews = relationship("Review", back_populates="book", cascade="all, delete-orphan")