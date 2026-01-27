from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class IngestionStatus(str, enum.Enum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    STORING = "storing"
    COMPLETED = "completed"
    FAILED = "failed"

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Status
    status = Column(String(50), default=IngestionStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Processing metrics
    total_chunks = Column(Integer, default=0)
    processed_chunks = Column(Integer, default=0)
    total_pages = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    
    # Vector store info
    vector_ids = Column(JSON, nullable=True)  # List of vector IDs
    
    # Relationships
    document = relationship("Document", back_populates="jobs")