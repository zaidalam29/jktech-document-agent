# app/api/v1/endpoints/qa.py
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.api.deps import get_current_user
from app.services.qa_service import qa_service
from app.services.rag_service import rag_pipeline
from app.services.embedding_service import embedding_service

router = APIRouter()


class DocumentQAResponse(BaseModel):
    question: str
    answer: str
    source_document: Dict[str, Any]
    found: bool
    confidence: float

@router.post("/ask/{document_id}", response_model=DocumentQAResponse)
async def ask_document_specific(
    document_id: int,
    question: str = Body(..., embed=True, min_length=1, max_length=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ask a question specifically to one document
    
    - Question will be answered ONLY from the specified document
    - Returns detailed information about the source document
    """
    # Check document exists and user has access
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
    
    if not document.is_ingested:
        raise HTTPException(status_code=400, detail="Document not ingested. Please ingest it first.")
    
    # Get document-specific answer
    response = await qa_service.ask_document_specific(question, document_id)
    
    return DocumentQAResponse(
        question=response["question"],
        answer=response["answer"],
        source_document=response.get("source_document", {}),
        found=response["found"],
        confidence=response.get("source_document", {}).get("avg_similarity", 0.0)
    )

@router.delete("/document/{document_id}/rag")
async def remove_document_from_rag(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a document from RAG index
    
    - This only removes from RAG, not from database
    - Document can be re-ingested later
    """
    # Check document exists and user has access
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this document")
    
    # Remove from RAG
    success = rag_pipeline.delete_document(document_id)
    
    if success:
        # Update document status
        document.is_ingested = False
        document.ingestion_completed_at = None
        db.commit()
        
        return {
            "success": True,
            "message": f"Document {document_id} removed from RAG index",
            "document": {
                "id": document.id,
                "filename": document.original_filename,
                "is_ingested": document.is_ingested
            }
        }
    else:
        return {
            "success": False,
            "message": f"Document {document_id} not found in RAG index"
        }