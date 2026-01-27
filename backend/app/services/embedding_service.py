from typing import List
import numpy as np
from app.services.openrouter_embedding_service import openrouter_embedding_service

class EmbeddingService:
    def __init__(self):
        self.use_real_embeddings = not openrouter_embedding_service.use_dummy
        print(f"[Embedding] Using {'OpenRouter' if self.use_real_embeddings else 'Dummy'} embeddings")
    
    def embed_text(self, text: str) -> List[float]:
        """Create embedding for text"""
        return openrouter_embedding_service.embed_text(text)
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for batch"""
        return openrouter_embedding_service.embed_batch(texts)
    
    def get_dimension(self) -> int:
        """Get embedding dimension"""
        return openrouter_embedding_service.get_embedding_dimension()

# Singleton instance
embedding_service = EmbeddingService()