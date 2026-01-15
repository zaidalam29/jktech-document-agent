# app/utils/local_storage.py
import os
import uuid
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException, status
import shutil

class LocalStorage:
    def __init__(self):
        self.base_dir = Path("uploads")
        self.documents_dir = self.base_dir / "documents"
        self.books_dir = self.base_dir / "books"
        self.temp_dir = self.base_dir / "temp"
        self.images_dir = self.base_dir / "images"
        
        # Create all directories automatically
        self._create_directories()
    
    def _create_directories(self):
        """Create all necessary directories if they don't exist"""
        directories = [
            self.base_dir,
            self.documents_dir,
            self.books_dir,
            self.temp_dir,
            self.images_dir
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"📁 Directory ensured: {directory}")
    
    def save_file(self, file_content: bytes, filename: str, file_type: str = "documents") -> str:
        """
        Save file to local storage in appropriate folder
        file_type: 'documents', 'books', 'images', 'temp'
        Returns: Relative file path
        """
        try:
            # Select target directory based on file type
            if file_type == "documents":
                target_dir = self.documents_dir
            elif file_type == "books":
                target_dir = self.books_dir
            elif file_type == "images":
                target_dir = self.images_dir
            elif file_type == "temp":
                target_dir = self.temp_dir
            else:
                target_dir = self.documents_dir
            
            # Ensure directory exists
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename to avoid conflicts
            file_ext = Path(filename).suffix
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = uuid.uuid4().hex[:8]
            # Remove special characters from original filename
            safe_filename = "".join(c for c in filename if c.isalnum() or c in ['.', '-', '_']).rstrip()
            unique_filename = f"{timestamp}_{unique_id}_{safe_filename}"
            
            # Full file path
            file_path = target_dir / unique_filename
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Return relative path
            return str(file_path)
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file locally: {str(e)}"
            )
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from local storage"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"❌ Error deleting file {file_path}: {e}")
            return False
    
    def get_file(self, file_path: str) -> bytes:
        """Read file from local storage"""
        try:
            path = Path(file_path)
            if path.exists() and path.is_file():
                with open(path, 'rb') as f:
                    return f.read()
            raise FileNotFoundError(f"File not found: {file_path}")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read file: {str(e)}"
            )
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists"""
        path = Path(file_path)
        return path.exists() and path.is_file()
    
    def get_file_info(self, file_path: str) -> dict:
        """Get file information"""
        path = Path(file_path)
        if path.exists() and path.is_file():
            return {
                "path": str(path),
                "size": path.stat().st_size,
                "modified": datetime.fromtimestamp(path.stat().st_mtime),
                "created": datetime.fromtimestamp(path.stat().st_ctime)
            }
        return None

# Create global instance
local_storage = LocalStorage()