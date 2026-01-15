import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Book, Review

class SimpleRAGPipeline:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embeddings_store = {}
    
    def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings for given text"""
        return self.embedding_model.encode(text).tolist()
    
    async def index_book(self, db: AsyncSession, book_id: int):
        """Simple indexing without created_at"""
        try:
            # Fetch book
            result = await db.execute(select(Book).where(Book.id == book_id))
            book = result.scalar_one_or_none()
            
            if not book:
                return
            
            # Fetch reviews (simple, no ordering)
            reviews_result = await db.execute(
                select(Review.review_text)
                .where(Review.book_id == book_id)
                .limit(5)
            )
            reviews = reviews_result.scalars().all()
            
            # Create content
            content_parts = [
                f"Title: {book.title}",
                f"Author: {book.author}",
                f"Genre: {book.genre}",
            ]
            
            if book.summary:
                content_parts.append(f"Summary: {book.summary[:500]}")
            
            if reviews:
                review_texts = []
                for i, review in enumerate(reviews):
                    if review:
                        review_texts.append(f"Review {i+1}: {review[:200]}")
                if review_texts:
                    content_parts.append(f"Reviews: {' '.join(review_texts)}")
            
            content = " ".join(content_parts)
            
            # Generate embedding
            embedding = self.generate_embeddings(content)
            
            # Store
            self.embeddings_store[book_id] = {
                "embedding": embedding,
                "metadata": {
                    "book_id": book_id,
                    "title": book.title,
                    "author": book.author,
                    "genre": book.genre
                },
                "content": content
            }
            
        except Exception as e:
            print(f"Error indexing book {book_id}: {e}")
            raise
    
    def search_similar_books(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Simple search"""
        if not self.embeddings_store:
            return []
        
        query_embedding = np.array(self.generate_embeddings(query)).reshape(1, -1)
        
        results = []
        for book_id, data in self.embeddings_store.items():
            book_embedding = np.array(data["embedding"]).reshape(1, -1)
            similarity = cosine_similarity(query_embedding, book_embedding)[0][0]
            
            results.append({
                "book_id": book_id,
                "similarity_score": float(similarity),
                "metadata": data["metadata"],
                "content": data["content"]
            })
        
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:n_results]

# Use this if you want simple version
# rag_pipeline = SimpleRAGPipeline()