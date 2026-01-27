# app/core/vector_store.py
import chromadb
from chromadb.config import Settings
from typing import List, Optional
import os

class VectorStore:
    def __init__(self):
        # Local persistent storage
        self.persist_directory = "data/chroma_db"
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Create Chroma client
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Create or get collection
        self.collection_name = "documents_collection"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    
    def add_documents(self, documents: List[str], metadatas: List[dict], ids: List[str]):
        """Add documents to vector store"""
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    def search(self, query: str, n_results: int = 5) -> List[dict]:
        """Search similar documents"""
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        return {
            "documents": results["documents"][0] if results["documents"] else [],
            "metadatas": results["metadatas"][0] if results["metadatas"] else [],
            "distances": results["distances"][0] if results["distances"] else [],
            "ids": results["ids"][0] if results["ids"] else []
        }
    
    def delete_document(self, document_id: str):
        """Delete all chunks of a document"""
        # Get all chunks for this document
        results = self.collection.get(
            where={"document_id": document_id}
        )
        
        if results["ids"]:
            self.collection.delete(ids=results["ids"])
    
    def get_stats(self) -> dict:
        """Get collection statistics"""
        return {
            "count": self.collection.count(),
            "name": self.collection.name
        }

# Singleton instance
vector_store = VectorStore()