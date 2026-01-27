# app/schemas/document.py
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentBase(BaseModel):
    description: Optional[str] = None
    tags: Optional[str] = None
    is_public: bool = True

class DocumentOut(DocumentBase):
    id: int
    original_filename: str
    filename: str
    file_size: Optional[int]
    file_type: str
    status: DocumentStatus
    uploaded_at: datetime
    uploaded_by: Optional[int]
    user_id: Optional[int]
    local_path: Optional[str]
    content: Optional[str]
    
    class Config:
        from_attributes = True

# DocumentCreate schema agar chahiye
class DocumentCreate(BaseModel):
    description: Optional[str] = None
    tags: Optional[str] = None
    is_public: bool = True