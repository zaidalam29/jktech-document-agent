import os
import httpx
import json
from typing import List, Dict, Any
import numpy as np
from dotenv import load_dotenv

load_dotenv()

class OpenRouterEmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_BASE_URL")
        self.frontend_url = os.getenv("FRONTEND_URL")
        
        if not self.api_key:
            print("[WARNING] OPENROUTER_API_KEY not found. Using dummy embeddings.")
            self.use_dummy = True
        else:
            self.use_dummy = False
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": {self.frontend_url},
                "X-Title": "Book Management System"
            }
        
        # OpenRouter supported embedding models
        self.embedding_model = "text-embedding-ada-002"  # Can use any OpenRouter supported model
        print(f"[Embedding] Service initialized. Using {'OpenRouter' if not self.use_dummy else 'Dummy'} embeddings")
    
    def embed_text(self, text: str) -> List[float]:
        """Create embedding for text using OpenRouter"""
        if self.use_dummy:
            # Fallback to dummy embeddings
            return self._create_dummy_embedding(text)
        
        try:
            # Prepare request
            response = httpx.post(
                f"{self.base_url}/embeddings",
                headers=self.headers,
                json={
                    "model": self.embedding_model,
                    "input": text
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                embedding = result["data"][0]["embedding"]
                print(f"[Embedding] Created embedding of dimension: {len(embedding)}")
                return embedding
            else:
                print(f"[Embedding] API error {response.status_code}: {response.text}")
                # Fallback to dummy
                return self._create_dummy_embedding(text)
                
        except Exception as e:
            print(f"[Embedding] Error: {e}")
            return self._create_dummy_embedding(text)
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Create embeddings for batch of texts"""
        embeddings = []
        for text in texts:
            embeddings.append(self.embed_text(text))
        return embeddings
    
    def _create_dummy_embedding(self, text: str) -> List[float]:
        """Create simple deterministic embedding"""
        import hashlib
        
        # Create deterministic embedding based on text hash
        text_hash = hashlib.md5(text.encode()).hexdigest()
        
        # Convert hash to 384-dimensional vector
        embedding = []
        for i in range(0, min(384, len(text_hash)), 2):
            hex_pair = text_hash[i:i+2]
            if len(hex_pair) == 2:
                val = int(hex_pair, 16) / 255.0
                embedding.append(val)
        
        # Pad if needed
        while len(embedding) < 384:
            embedding.append(0.0)
        
        return embedding[:384]
    
    def get_embedding_dimension(self) -> int:
        """Get embedding dimension"""
        return 384  # Standard dimension for most embedding models

# Singleton instance
openrouter_embedding_service = OpenRouterEmbeddingService()