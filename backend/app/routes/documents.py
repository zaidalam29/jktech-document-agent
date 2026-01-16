# app/routes/documents.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.database.models import Document
from app.core.auth import get_current_user  # ✅ Import get_current_user
from app.core.config import settings
from app.utils.local_storage import local_storage
import io
from pathlib import Path
import mimetypes

router = APIRouter(prefix="/documents", tags=["Documents"])
ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md", ".jpg", ".png", ".jpeg", ".mp4", ".avi", ".mov"]

def get_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']:
        return "images"
    elif ext in ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt']:
        return "documents"
    elif ext in ['.epub', '.mobi', '.azw', '.azw3']:
        return "books"
    else:
        return "documents"

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ This gives User object
):
    try:
        file_content = await file.read()
        
        if len(file_content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
            )
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        file_type = get_file_type(file.filename)
        file_path = local_storage.save_file(file_content, file.filename, file_type)
        
        # ✅ Save with user_id from current_user object
        doc = Document(
            filename=file.filename,
            file_size=len(file_content),
            local_path=file_path,
            file_type=file_type,
            user_id=current_user.id,  # ✅ current_user.id from User object
            uploaded_by=current_user.id
        )
        
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        return {
            "message": "Document uploaded successfully",
            "document_id": doc.id,
            "filename": file.filename,
            "file_size": len(file_content),
            "user_id": current_user.id,
            "username": current_user.username  # ✅ Also return username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ Get User object
):
    # ✅ Only current user's documents
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id)
    )
    documents = result.scalars().all()
    
    response = []
    for doc in documents:
        file_exists = False
        if doc.local_path:
            file_exists = local_storage.file_exists(doc.local_path)
        
        doc_data = {
            "id": doc.id,
            "filename": doc.filename,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "status": doc.status,
            "file_size": doc.file_size or 0,
            "user_id": doc.user_id,
            "uploaded_by": doc.uploaded_by,
            "file_type": doc.file_type,
            "file_exists": file_exists,
            "download_url": f"/documents/{doc.id}/download"
        }
        response.append(doc_data)
    
    return response

@router.get("/{document_id}/download")
async def download_document(
    document_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ Check ownership
):
    # ✅ Only if document belongs to current user
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Document not found or access denied"
        )
    
    if not document.local_path:
        raise HTTPException(status_code=404, detail="File path not found")
    
    try:
        file_content = local_storage.get_file(document.local_path)
        content_type, _ = mimetypes.guess_type(document.filename)
        if not content_type:
            content_type = "application/octet-stream"
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{document.filename}\"",
                "Content-Length": str(len(file_content))
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found on server")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    document_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ Check ownership
):
    # ✅ Only if document belongs to current user
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Document not found or access denied"
        )
    
    # Delete file from storage
    if document.local_path:
        local_storage.delete_file(document.local_path)
    
    # Delete from database
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}

@router.get("/{document_id}")
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get specific document (only if owned by user)"""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )
    
    file_exists = False
    if document.local_path:
        file_exists = local_storage.file_exists(document.local_path)
    
    return {
        "id": document.id,
        "filename": document.filename,
        "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
        "status": document.status,
        "file_size": document.file_size or 0,
        "user_id": document.user_id,
        "uploaded_by": document.uploaded_by,
        "file_type": document.file_type,
        "file_exists": file_exists,
        "content": document.content
    }
    
@router.post("/{document_id}/summary")
async def generate_document_summary(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    try:
        from app.llm.llama3 import generate_summary_llama3
        
        # Try to read file content for summary if it's a text file
        content = f"Document: {document.filename}\nSize: {document.file_size} bytes\nType: {getattr(document, 'file_type', 'unknown')}"
        
        # Check if it's a text-based document
        text_extensions = ['.txt', '.md', '.pdf', '.doc', '.docx']
        file_ext = Path(document.filename).suffix.lower()
        
        if file_ext in text_extensions and hasattr(document, 'local_path') and document.local_path:
            try:
                file_content = local_storage.get_file(document.local_path)
                text_content = file_content.decode('utf-8', errors='ignore')[:2000]
                content = f"Document content preview:\n{text_content}"
            except:
                pass
        
        summary = await generate_summary_llama3(f"Summarize this document information: {content}")
        
        return {
            "document_id": document.id,
            "filename": document.filename,
            "summary": summary
        }
    except ImportError:
        # If llama3 is not available, return basic info
        return {
            "document_id": document.id,
            "filename": document.filename,
            "summary": f"Document: {document.filename} ({document.file_size} bytes). Summary generation module not available."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")    