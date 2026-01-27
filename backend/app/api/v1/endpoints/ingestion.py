# app/api/v1/endpoints/ingestion.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.ingestion_job import IngestionJob, IngestionStatus
from app.api.deps import get_current_user
from app.services.ingestion_service import IngestionService

router = APIRouter()

@router.post("/documents/{document_id}/ingest")
async def start_ingestion(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start ingestion process for a document (STEP 1)"""
    # Check document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if user has access
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already ingested
    if document.is_ingested:
        raise HTTPException(status_code=400, detail="Document already ingested")
    
    # Check if already processing
    active_job = db.query(IngestionJob).filter(
        IngestionJob.document_id == document_id,
        IngestionJob.status.in_([
            IngestionStatus.PENDING, 
            IngestionStatus.EXTRACTING, 
            IngestionStatus.CHUNKING
        ])
    ).first()
    
    if active_job:
        raise HTTPException(status_code=400, detail="Document is already being processed")
    
    # Start ingestion in background
    background_tasks.add_task(
        run_ingestion_background,
        document_id=document_id,
        db=db
    )
    
    return {
        "message": "Ingestion started", 
        "document_id": document_id,
        "status": "processing"
    }

async def run_ingestion_background(document_id: int, db: Session):
    """Background task runner"""
    try:
        service = IngestionService(db)
        success = await service.ingest_document_step1(document_id)
        
        if not success:
            print(f"Background ingestion failed for document {document_id}")
    except Exception as e:
        print(f"Background task error: {e}")

@router.get("/documents/{document_id}/ingestion-status")
def get_ingestion_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ingestion status for a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if not document.is_public and document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get latest job
    job = db.query(IngestionJob)\
        .filter(IngestionJob.document_id == document_id)\
        .order_by(IngestionJob.created_at.desc())\
        .first()
    
    # Get all jobs for history
    all_jobs = db.query(IngestionJob)\
        .filter(IngestionJob.document_id == document_id)\
        .order_by(IngestionJob.created_at.desc())\
        .limit(10)\
        .all()
    
    return {
        "document": {
            "id": document.id,
            "filename": document.original_filename,
            "is_ingested": document.is_ingested,
            "ingestion_started": document.ingestion_started_at,
            "ingestion_completed": document.ingestion_completed_at,
            "word_count": document.word_count,
            "pages_count": document.pages_count
        },
        "current_job": {
            "id": job.id if job else None,
            "status": job.status if job else None,
            "started_at": job.started_at if job else None,
            "completed_at": job.completed_at if job else None,
            "total_chunks": job.total_chunks if job else 0,
            "error_message": job.error_message if job else None
        } if job else None,
        "job_history": [
            {
                "id": j.id,
                "status": j.status,
                "created_at": j.created_at,
                "completed_at": j.completed_at,
                "total_chunks": j.total_chunks
            }
            for j in all_jobs
        ]
    }

@router.get("/ingestion-jobs")
def get_all_ingestion_jobs(
    skip: int = 0,
    limit: int = 50,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all ingestion jobs (admin or own documents)"""
    query = db.query(IngestionJob)
    
    if status:
        query = query.filter(IngestionJob.status == status)
    
    # Filter by user's documents if not admin
    # You can add admin check later
    
    jobs = query.order_by(IngestionJob.created_at.desc())\
        .offset(skip).limit(limit).all()
    
    return [
        {
            "id": job.id,
            "document_id": job.document_id,
            "status": job.status,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "total_chunks": job.total_chunks,
            "processed_chunks": job.processed_chunks,
            "error_message": job.error_message
        }
        for job in jobs
    ]