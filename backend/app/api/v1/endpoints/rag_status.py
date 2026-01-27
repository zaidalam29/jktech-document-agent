# app/api/v1/endpoints/rag_status.py
from fastapi import APIRouter, Depends
from app.services.rag_service import rag_pipeline
import os

router = APIRouter()

@router.get("/status")
def get_rag_status():
    """Get RAG storage status"""
    stats = rag_pipeline.get_stats()
    
    # Add file info
    import pickle
    try:
        with open(rag_pipeline.embeddings_file, 'rb') as f:
            data = pickle.load(f)
        stats["loaded_documents"] = len(data)
        stats["sample_document"] = list(data.keys())[:3] if data else []
    except:
        stats["loaded_documents"] = "error"
    
    return stats

@router.get("/documents")
def get_rag_documents():
    """Get all documents in RAG"""
    documents = []
    
    for doc_id, chunks in rag_pipeline.embeddings.items():
        meta = rag_pipeline.metadata.get(doc_id, {})
        documents.append({
            "id": doc_id,
            "filename": meta.get("filename", "Unknown"),
            "file_type": meta.get("file_type", "Unknown"),
            "chunks": len(chunks),
            "indexed_at": meta.get("indexed_at"),
            "uploaded_by": meta.get("uploaded_by")
        })
    
    return {
        "count": len(documents),
        "documents": documents,
        "storage_location": str(rag_pipeline.embeddings_file)
    }