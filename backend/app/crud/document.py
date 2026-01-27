# app/crud/document.py (simplified version)
from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.document import Document

def get_document(db: Session, document_id: int) -> Optional[Document]:
    """Get document by ID"""
    return db.query(Document).filter(Document.id == document_id).first()

def get_documents(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    user_id: Optional[int] = None,
    file_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Document]:
    """Get multiple documents with filters"""
    query = db.query(Document)
    
    if user_id:
        query = query.filter(Document.user_id == user_id)
    
    if file_type:
        query = query.filter(Document.file_type == file_type)
    
    if status:
        query = query.filter(Document.status == status)
    
    return query.order_by(Document.uploaded_at.desc()).offset(skip).limit(limit).all()