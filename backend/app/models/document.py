# app/models/document.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(20))  # 'pdf' or 'text'
    local_path = Column(String(500), nullable=True)
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Status
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    
    # Content (for text files, extracted text for PDFs)
    content = Column(Text, nullable=True)  # For text files
    extracted_text = Column(Text, nullable=True)  # For PDFs after extraction
    
    # Ingestion status
    is_ingested = Column(Boolean, default=False)
    ingestion_started_at = Column(DateTime(timezone=True), nullable=True)
    ingestion_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Processing metrics
    pages_count = Column(Integer, nullable=True)  # For PDFs
    word_count = Column(Integer, nullable=True)
    
    # Vector store reference
    vector_ids = Column(JSON, nullable=True)  # List of vector IDs in Chroma
    
    # Visibility and metadata
    is_public = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="documents")
    jobs = relationship("IngestionJob", back_populates="document", cascade="all, delete-orphan")