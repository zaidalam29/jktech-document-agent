# app/api/v1/endpoints/documents.py
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.schemas.document import DocumentOut  # Only import DocumentOut
from app.api.deps import get_current_user
from app.utils.file_upload import validate_file, save_file_locally, delete_file

router = APIRouter()

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = None,
    tags: Optional[str] = None,
    is_public: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document (PDF/TXT only)
    """
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Save file to local storage
    file_info = save_file_locally(file)
    
    # For text files, read content
    content = None
    if file_info["file_type"] == "text":
        try:
            with open(file_info["saved_path"], "r", encoding="utf-8") as f:
                content = f.read()
        except:
            try:
                with open(file_info["saved_path"], "r", encoding="latin-1") as f:
                    content = f.read()
            except:
                content = "Unable to read file content"
    
    # Create document record
    document_data = {
        "filename": file_info["unique_filename"],
        "original_filename": file_info["original_filename"],
        "file_size": file_info["file_size"],
        "file_type": file_info["file_type"],
        "local_path": file_info["saved_path"],
        "uploaded_by": current_user.id,
        "user_id": current_user.id,
        "status": DocumentStatus.UPLOADED,
        "content": content,
        "is_public": is_public,
        "description": description,
        "tags": tags
    }
    
    document = Document(**document_data)
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return document

@router.get("/", response_model=List[DocumentOut])
def get_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    file_type: Optional[str] = Query(None, regex="^(pdf|text)$"),
    status: Optional[str] = Query(None, regex="^(uploaded|processing|completed|failed)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all documents
    - Public documents are visible to all
    - Private documents only visible to owner
    """
    query = db.query(Document)
    
    # Filter based on visibility
    query = query.filter(
        (Document.is_public == True) | 
        (Document.user_id == current_user.id)
    )
    
    if file_type:
        query = query.filter(Document.file_type == file_type)
    
    if status:
        query = query.filter(Document.status == status)
    
    documents = query.order_by(Document.uploaded_at.desc())\
        .offset(skip).limit(limit).all()
    
    return documents

@router.get("/my-documents", response_model=List[DocumentOut])
def get_my_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    file_type: Optional[str] = Query(None, regex="^(pdf|text)$"),
    status: Optional[str] = Query(None, regex="^(uploaded|processing|completed|failed)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get documents uploaded by current user
    """
    query = db.query(Document)\
        .filter(Document.user_id == current_user.id)
    
    if file_type:
        query = query.filter(Document.file_type == file_type)
    
    if status:
        query = query.filter(Document.status == status)
    
    documents = query.order_by(Document.uploaded_at.desc())\
        .offset(skip).limit(limit).all()
    
    return documents

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get specific document by ID
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this document"
        )
    
    return document

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete document (and its file)
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check ownership
    if document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this document"
        )
    
    try:
        # Delete file from storage
        if document.local_path and os.path.exists(document.local_path):
            os.remove(document.local_path)
        
        # Delete from database
        db.delete(document)
        db.commit()
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download document file
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this document"
        )
    
    # Check file exists
    if not document.local_path or not os.path.exists(document.local_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    from fastapi.responses import FileResponse
    
    return FileResponse(
        path=document.local_path,
        filename=document.original_filename,
        media_type="application/octet-stream"
    )