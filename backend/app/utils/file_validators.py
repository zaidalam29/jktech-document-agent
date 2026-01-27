import os
from fastapi import HTTPException, UploadFile
from app.core.config import settings

def validate_file(file: UploadFile) -> tuple:
    """
    Validate uploaded file - ONLY PDF/TXT allowed
    Returns: (is_valid, error_message)
    """
    # Check file extension
    filename = file.filename.lower()
    valid_extensions = settings.ALLOWED_EXTENSIONS
    
    # Get file extension
    _, ext = os.path.splitext(filename)
    
    if ext not in valid_extensions:
        return False, f"Only {', '.join(valid_extensions)} files are allowed"
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset pointer
    
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        return False, f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit"
    
    # Check if file is empty
    if file_size == 0:
        return False, "File is empty"
    
    return True, ""

def get_file_type(filename: str) -> str:
    """Get file type from extension"""
    _, ext = os.path.splitext(filename.lower())
    if ext == '.pdf':
        return 'pdf'
    elif ext == '.txt':
        return 'text'
    else:
        return 'document'