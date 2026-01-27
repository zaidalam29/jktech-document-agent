# app/services/rag_service.py
import os
import pickle
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
import re
from datetime import datetime

class DocumentRAGPipeline:
    def __init__(self):
        # Storage paths
        current_file = Path(__file__)
        self.base_dir = current_file.parent.parent
        self.embeddings_file = self.base_dir / "data" / "rag_embeddings.pkl"
        self.metadata_file = self.base_dir / "data" / "rag_metadata.json"
        
        # Create directories
        self.embeddings_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize storage
        self.embeddings = {}
        self.metadata = {}
        
        # Load existing data
        self._load_storage()
        
        print(f"[RAG] Storage initialized. Documents: {len(self.embeddings)}")
    
    def _load_storage(self):
        """Load existing storage files"""
        # Load embeddings
        if self.embeddings_file.exists() and self.embeddings_file.stat().st_size > 0:
            try:
                with open(self.embeddings_file, 'rb') as f:
                    self.embeddings = pickle.load(f)
                print(f"[RAG] Loaded {len(self.embeddings)} documents from embeddings file")
            except Exception as e:
                print(f"[RAG] Error loading embeddings: {e}")
                self.embeddings = {}
        else:
            print(f"[RAG] No embeddings file or empty. Creating new.")
            self.embeddings = {}
        
        # Load metadata
        if self.metadata_file.exists() and self.metadata_file.stat().st_size > 0:
            try:
                with open(self.metadata_file, 'r') as f:
                    self.metadata = json.load(f)
                print(f"[RAG] Loaded metadata for {len(self.metadata)} documents")
            except Exception as e:
                print(f"[RAG] Error loading metadata: {e}")
                self.metadata = {}
        else:
            print(f"[RAG] No metadata file or empty. Creating new.")
            self.metadata = {}
    
    def _save_embeddings(self):
        """Save embeddings to file"""
        try:
            with open(self.embeddings_file, 'wb') as f:
                pickle.dump(self.embeddings, f)
            print(f"[RAG] Saved {len(self.embeddings)} documents to embeddings file")
            print(f"[RAG] File size: {self.embeddings_file.stat().st_size} bytes")
        except Exception as e:
            print(f"[RAG] Error saving embeddings: {e}")
    
    def _save_metadata(self):
        """Save metadata to file"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2, default=str)
            print(f"[RAG] Saved metadata for {len(self.metadata)} documents")
        except Exception as e:
            print(f"[RAG] Error saving metadata: {e}")
    
    def index_document(self, document_id: int, chunks: List[Dict], metadata: Dict) -> bool:
        """Index document in RAG storage"""
        try:
            print(f"[RAG] Indexing document {document_id}...")
            
            # Validate chunks
            if not chunks:
                print(f"[RAG] No chunks to index for document {document_id}")
                return False
            
            print(f"[RAG] Processing {len(chunks)} chunks...")
            
            # Store embeddings
            self.embeddings[document_id] = chunks
            
            # Store metadata
            self.metadata[document_id] = {
                **metadata,
                "chunks_count": len(chunks),
                "indexed_at": datetime.now().isoformat(),
                "total_words": sum(chunk.get('metadata', {}).get('word_count', 0) for chunk in chunks)
            }
            
            # Save to files
            self._save_embeddings()
            self._save_metadata()
            
            # Verify save
            if self.embeddings_file.exists():
                file_size = self.embeddings_file.stat().st_size
                print(f"[RAG] ✓ Document {document_id} indexed successfully")
                print(f"[RAG] ✓ File created: {self.embeddings_file}")
                print(f"[RAG] ✓ File size: {file_size} bytes")
                return True
            else:
                print(f"[RAG] ✗ File not created after save!")
                return False
            
        except Exception as e:
            print(f"[RAG] ✗ Error indexing document {document_id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity"""
        if not vec1 or not vec2:
            return 0.0
        
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        # Ensure same shape
        if v1.shape != v2.shape:
            min_len = min(len(v1), len(v2))
            v1 = v1[:min_len]
            v2 = v2[:min_len]
        
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def get_document_chunks(self, document_id: int) -> List[Dict]:
        """Get chunks for a document"""
        return self.embeddings.get(document_id, [])
    
    def delete_document(self, document_id: int) -> bool:
        """Remove document from RAG"""
        if document_id in self.embeddings:
            del self.embeddings[document_id]
            if document_id in self.metadata:
                del self.metadata[document_id]
            
            self._save_embeddings()
            self._save_metadata()
            print(f"[RAG] Deleted document {document_id}")
            return True
        return False
    
    def get_stats(self) -> Dict:
        """Get RAG statistics"""
        total_chunks = sum(len(chunks) for chunks in self.embeddings.values())
        
        return {
            "total_documents": len(self.embeddings),
            "total_chunks": total_chunks,
            "storage": {
                "embeddings_file": str(self.embeddings_file),
                "metadata_file": str(self.metadata_file),
                "embeddings_exists": self.embeddings_file.exists(),
                "metadata_exists": self.metadata_file.exists(),
                "embeddings_size": self.embeddings_file.stat().st_size if self.embeddings_file.exists() else 0,
                "metadata_size": self.metadata_file.stat().st_size if self.metadata_file.exists() else 0
            },
            "document_ids": list(self.embeddings.keys())
        }


    def search_documents(self, query_embedding: List[float], document_ids: Optional[List[int]] = None, top_k: int = 5) -> List[Dict]:
        """Search for similar documents"""
        if not self.embeddings:
            print("[RAG] No documents indexed for search")
            return []
        
        results = []
        
        # Determine which documents to search
        if document_ids:
            documents_to_search = {doc_id: self.embeddings[doc_id] for doc_id in document_ids if doc_id in self.embeddings}
            print(f"[RAG] Searching in {len(documents_to_search)} specified documents")
        else:
            documents_to_search = self.embeddings
            print(f"[RAG] Searching in all {len(documents_to_search)} documents")
        
        # NEW: Preprocess query embedding for better matching
        query_norm = np.linalg.norm(query_embedding)
        if query_norm > 0:
            query_embedding = np.array(query_embedding) / query_norm
        
        for doc_id, chunks in documents_to_search.items():
            for chunk in chunks:
                chunk_embedding = chunk.get('embedding', [])
                if not chunk_embedding:
                    continue
                
                # Normalize chunk embedding
                chunk_norm = np.linalg.norm(chunk_embedding)
                if chunk_norm > 0:
                    chunk_embedding_norm = np.array(chunk_embedding) / chunk_norm
                else:
                    continue
                
                similarity = np.dot(query_embedding, chunk_embedding_norm)
                
                # LOWER THRESHOLD for better matching
                if similarity > 0.2:  # Reduced from 0.5 to 0.2
                    results.append({
                        'document_id': doc_id,
                        'chunk_id': chunk.get('chunk_id', ''),
                        'content': chunk.get('content', ''),
                        'similarity': float(similarity),
                        'metadata': self.metadata.get(doc_id, {})
                    })
        
        # Sort by similarity
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        print(f"[RAG] Found {len(results)} chunks with similarity > 0.2")
        
        return results[:top_k]       

# Create instance
rag_pipeline = DocumentRAGPipeline()