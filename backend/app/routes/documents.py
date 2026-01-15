# app/routes/documents.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.database.models import Document
from app.core.auth import verify_user
from app.core.config import settings
from app.utils.local_storage import local_storage
import io
import os
from pathlib import Path
import mimetypes

router = APIRouter(prefix="/documents", tags=["Documents"])
ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md", ".jpg", ".png", ".jpeg", ".mp4", ".avi", ".mov"]

# Helper function to determine file type based on extension
def get_file_type(filename: str) -> str:
    """Determine file type based on extension"""
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
    db: AsyncSession = Depends(get_db)
):
    try:
        # Read file content
        file_content = await file.read()
        
        # Check file size
        if len(file_content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
            )
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Determine file type and save to appropriate folder
        file_type = get_file_type(file.filename)
        file_path = local_storage.save_file(file_content, file.filename, file_type)
        
        # Save document record to database
        doc = Document(
            filename=file.filename,
            file_size=len(file_content),
            local_path=file_path,
            file_type=file_type  # Store file type for reference
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        response = {
            "message": "Document uploaded successfully",
            "document_id": doc.id,
            "filename": file.filename,
            "file_size": len(file_content),
            "local_path": file_path,
            "file_type": file_type,
            "storage_location": "local"
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document))
    documents = result.scalars().all()
    
    response = []
    for doc in documents:
        # Check if file exists locally
        file_exists = False
        file_info = None
        if hasattr(doc, 'local_path') and doc.local_path:
            file_exists = local_storage.file_exists(doc.local_path)
            if file_exists:
                file_info = local_storage.get_file_info(doc.local_path)
        
        doc_data = {
            "id": doc.id,
            "filename": doc.filename,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "status": doc.status,
            "file_size": doc.file_size or 0,
            "uploaded_by": doc.uploaded_by,
            "file_type": getattr(doc, 'file_type', 'document'),
            "local_path": getattr(doc, 'local_path', None),
            "file_exists": file_exists,
            "download_url": f"/documents/{doc.id}/download",
            "direct_url": f"/documents/local/{doc.id}" if doc.local_path else None
        }
        
        # Add file info if exists
        if file_info:
            doc_data["file_info"] = {
                "size_bytes": file_info["size"],
                "modified": file_info["modified"].isoformat(),
                "created": file_info["created"].isoformat()
            }
        
        response.append(doc_data)
    
    return response

@router.get("/{document_id}/download")
async def download_document(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    # Check if file exists locally
    if not hasattr(document, 'local_path') or not document.local_path:
        raise HTTPException(status_code=404, detail="File path not found in database")
    
    try:
        # Get file from local storage
        file_content = local_storage.get_file(document.local_path)
        
        # Get content type
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

# @router.get("/local/{document_id}")
# async def serve_document_direct(document_id: int, db: AsyncSession = Depends(get_db)):
#     """
#     Serve document directly (for viewing in browser)
#     """
#     result = await db.execute(select(Document).where(Document.id == document_id))
#     document = result.scalar_one_or_none()
    
#     if not document:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
#     if not hasattr(document, 'local_path') or not document.local_path:
#         raise HTTPException(status_code=404, detail="File not available")
    
#     # Check if file exists
#     if not local_storage.file_exists(document.local_path):
#         raise HTTPException(status_code=404, detail="File not found on server")
    
#     try:
#         # Get content type
#         content_type, _ = mimetypes.guise_type(document.filename)
#         if not content_type:
#             content_type = "application/octet-stream"
        
#         # For images, PDFs, etc., serve directly
#         return FileResponse(
#             path=document.local_path,
#             filename=document.filename,
#             media_type=content_type
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.get("/local/{file_path:path}")
# async def serve_local_file(file_path: str):
#     """
#     Serve files from local storage directly using path
#     Security: Only allow files from uploads directory
#     """
#     try:
#         # Security check: prevent directory traversal
#         clean_path = Path(file_path)
        
#         # Only allow access to files in uploads directory
#         full_path = Path("uploads") / clean_path
#         normalized_path = full_path.resolve()
        
#         # Check if path is within uploads directory
#         uploads_path = Path("uploads").resolve()
#         if not str(normalized_path).startswith(str(uploads_path)):
#             raise HTTPException(status_code=403, detail="Access denied")
        
#         if not full_path.exists() or not full_path.is_file():
#             raise HTTPException(status_code=404, detail="File not found")
        
#         # Get content type
#         content_type, _ = mimetypes.guess_type(file_path)
#         if not content_type:
#             content_type = "application/octet-stream"
        
#         return FileResponse(
#             path=full_path,
#             filename=clean_path.name,
#             media_type=content_type
#         )
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

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

@router.delete("/{document_id}")
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    # Delete file from local storage if path exists
    if hasattr(document, 'local_path') and document.local_path:
        local_storage.delete_file(document.local_path)
    
    # Delete from database
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}

# @router.get("/check-storage")
# async def check_storage():
    """Check local storage status"""
    try:
        # Get all files in uploads directory
        all_files = []
        for root, dirs, files in os.walk("uploads"):
            for file in files:
                file_path = Path(root) / file
                all_files.append({
                    "path": str(file_path),
                    "size": file_path.stat().st_size,
                    "type": "file"
                })
        
        # Get directory sizes
        dir_sizes = {}
        for folder in ["documents", "books", "images", "temp"]:
            folder_path = Path("uploads") / folder
            if folder_path.exists():
                total_size = sum(f.stat().st_size for f in folder_path.rglob('*') if f.is_file())
                dir_sizes[folder] = {
                    "files_count": len(list(folder_path.rglob('*.*'))),
                    "total_size": total_size,
                    "total_size_mb": total_size / (1024*1024)
                }
        
        return {
            "storage_type": "local",
            "base_directory": str(local_storage.base_dir),
            "directories": {
                "documents": str(local_storage.documents_dir),
                "books": str(local_storage.books_dir),
                "images": str(local_storage.images_dir),
                "temp": str(local_storage.temp_dir)
            },
            "directory_stats": dir_sizes,
            "total_files": len(all_files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))