# app/utils/file_upload.py
import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".txt"}

def validate_file(file: UploadFile) -> tuple:
    """Validate uploaded file"""
    # Check extension
    filename = file.filename.lower()
    ext = os.path.splitext(filename)[1]
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Only PDF and TXT files are allowed"
    
    # Check size (max 50MB)
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    
    # Get file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > max_size:
        return False, f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB"
    
    if file_size == 0:
        return False, "File is empty"
    
    return True, ""

def save_file_locally(file: UploadFile) -> dict:
    """
    Save file to local storage
    Returns: {
        "saved_path": str,
        "unique_filename": str,
        "original_filename": str,
        "file_size": int,
        "file_type": str
    }
    """
    # Create upload directory using settings method
    upload_dir = settings.get_upload_path()  # Changed here
    
    # Generate unique filename
    original_filename = file.filename
    ext = os.path.splitext(original_filename)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    
    # Determine file type
    file_type = "pdf" if ext == ".pdf" else "text"
    
    # Save file
    saved_path = upload_dir / unique_filename
    
    try:
        # Read file content
        contents = file.file.read()
        file_size = len(contents)
        
        # Write to disk
        with open(saved_path, "wb") as f:
            f.write(contents)
        
        return {
            "saved_path": str(saved_path),
            "unique_filename": unique_filename,
            "original_filename": original_filename,
            "file_size": file_size,
            "file_type": file_type
        }
        
    except Exception as e:
        # Cleanup if error
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

def delete_file(file_path: str) -> bool:
    """Delete file from storage"""
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            return True
    except:
        pass
    return False