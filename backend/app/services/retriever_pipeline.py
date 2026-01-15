import json
import numpy as np
import asyncio
import pickle
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.models import Book, Review

class RAGPipeline:
    def __init__(self, persist_path: str = "db/embeddings.pkl"):
        """
        Enhanced RAG Pipeline with persistent storage
        """
        self.persist_path = persist_path
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embeddings_store = {}
        
        # Load existing embeddings if any
        self._load_embeddings()
        
        # Configuration
        self.max_review_length = 1000  # chars per review
        self.max_total_reviews = 5  # max reviews to include
        self.chunk_size = 500  # character chunk size
    
    def _load_embeddings(self):
        """Load embeddings from persistent storage"""
        try:
            if os.path.exists(self.persist_path):
                with open(self.persist_path, 'rb') as f:
                    self.embeddings_store = pickle.load(f)
        except Exception as e:
            print(f"Error loading embeddings: {e}")
    
    def _save_embeddings(self):
        """Save embeddings to persistent storage"""
        try:
            os.makedirs(os.path.dirname(self.persist_path), exist_ok=True)
            with open(self.persist_path, 'wb') as f:
                pickle.dump(self.embeddings_store, f)
        except Exception as e:
            print(f"Error saving embeddings: {e}")
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for embedding"""
        if not text:
            return ""
        # Remove extra whitespace and truncate
        text = ' '.join(text.split())
        return text[:2000]  # Limit to 2000 chars
    
    def _chunk_content(self, content: str, chunk_type: str) -> List[str]:
        """
        Split content into manageable chunks
        Returns list of chunked content
        """
        if len(content) <= self.chunk_size:
            return [content]
        
        chunks = []
        words = content.split()
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_length = len(word) + 1  # +1 for space
            
            if current_length + word_length > self.chunk_size and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = word_length
            else:
                current_chunk.append(word)
                current_length += word_length
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    async def generate_embeddings_async(self, text: str) -> List[float]:
        """Generate embeddings asynchronously"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            lambda: self.embedding_model.encode(text).tolist()
        )
    
    async def index_book(self, db: AsyncSession, book_id: int):
        """
        Index a book's ALL content for better RAG retrieval
        """
        try:
            # Fetch book with all relevant data
            result = await db.execute(
                select(Book).where(Book.id == book_id)
            )
            book = result.scalar_one_or_none()
            
            if not book:
                print(f"Book {book_id} not found in database")
                return
            
            # Fetch reviews WITHOUT created_at ordering
            reviews_result = await db.execute(
                select(Review.review_text)
                .where(Review.book_id == book_id)
                .limit(self.max_total_reviews)  # Simple limit
            )
            reviews = reviews_result.scalars().all()
            
            print(f"Found {len(reviews)} reviews for book {book_id}")
            
            # Clean and prepare review content
            review_content = ""
            for i, review in enumerate(reviews):
                if review and review.strip():
                    cleaned_review = self._clean_text(review)
                    if len(cleaned_review) > self.max_review_length:
                        cleaned_review = cleaned_review[:self.max_review_length] + "..."
                    review_content += f"Review {i+1}: {cleaned_review}\n"
            
            # Create multiple content chunks for better retrieval
            chunks_data = []
            
            # Chunk 1: Basic metadata
            metadata_chunk = f"""
            Book Title: {book.title}
            Author: {book.author}
            Genre: {book.genre}
            Year Published: {book.year_published}
            """.strip()
            chunks_data.extend(self._chunk_content(metadata_chunk, "metadata"))
            
            # Chunk 2: Summary (if available)
            if book.summary:
                summary_chunk = f"Book Summary: {self._clean_text(book.summary)}"
                chunks_data.extend(self._chunk_content(summary_chunk, "summary"))
            
            # Chunk 3: Reviews
            if review_content:
                chunks_data.extend(self._chunk_content(review_content, "reviews"))
            
            print(f"Created {len(chunks_data)} chunks for book {book_id}")
            
            # Generate embeddings for each chunk
            book_embeddings = []
            for i, chunk in enumerate(chunks_data):
                embedding = await self.generate_embeddings_async(chunk)
                book_embeddings.append({
                    "chunk_id": f"{book_id}_{i}",
                    "embedding": embedding,
                    "content": chunk,
                    "chunk_type": "metadata" if i == 0 else "summary" if "summary" in chunk.lower() else "reviews"
                })
            
            # Store in memory
            self.embeddings_store[book_id] = {
                "metadata": {
                    "book_id": book_id,
                    "title": book.title,
                    "author": book.author,
                    "genre": book.genre,
                    "year_published": book.year_published,
                    "chunk_count": len(book_embeddings)
                },
                "embeddings": book_embeddings,
                "full_content": metadata_chunk + "\n" + 
                               (f"Summary: {book.summary[:500]}..." if book.summary else "") + "\n" +
                               (f"Reviews: {review_content[:500]}..." if review_content else "")
            }
            
            # Save to disk
            self._save_embeddings()
            
            print(f"Successfully indexed book {book_id}: {book.title}")
            
        except Exception as e:
            print(f"Error indexing book {book_id}: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    async def search_similar_books(
        self, 
        query: str, 
        n_results: int = 5,
        min_score: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Search for books similar to query using ALL content
        """
        if not self.embeddings_store:
            print("No books indexed in RAG pipeline")
            return []
        
        print(f"Searching for: '{query}' in {len(self.embeddings_store)} indexed books")
        
        # Generate query embedding
        query_embedding = await self.generate_embeddings_async(query)
        query_embedding_np = np.array(query_embedding).reshape(1, -1)
        
        all_results = []
        
        for book_id, book_data in self.embeddings_store.items():
            best_chunk_score = 0
            best_chunk_content = ""
            matching_chunks = []
            
            # Check each chunk for similarity
            for chunk_data in book_data["embeddings"]:
                chunk_embedding = np.array(chunk_data["embedding"]).reshape(1, -1)
                similarity = cosine_similarity(query_embedding_np, chunk_embedding)[0][0]
                
                if similarity > best_chunk_score:
                    best_chunk_score = similarity
                    best_chunk_content = chunk_data["content"]
                
                if similarity >= min_score:
                    matching_chunks.append({
                        "content": chunk_data["content"][:200],
                        "similarity": float(similarity),
                        "type": chunk_data["chunk_type"]
                    })
            
            # Only include if similarity meets threshold
            if best_chunk_score >= min_score:
                all_results.append({
                    "book_id": book_id,
                    "similarity_score": float(best_chunk_score),
                    "metadata": book_data["metadata"],
                    "content": book_data["full_content"][:500] + "...",
                    "best_matching_chunk": best_chunk_content[:300] + "..." if len(best_chunk_content) > 300 else best_chunk_content,
                    "matching_chunks_count": len(matching_chunks),
                    "chunk_details": matching_chunks[:3]  # Top 3 chunks
                })
        
        print(f"Found {len(all_results)} matching books")
        
        # Sort by similarity score
        all_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return all_results[:n_results]
    
    async def get_book_context(self, book_id: int, max_length: int = 1000) -> str:
        """
        Get all indexed context for a book
        """
        if book_id not in self.embeddings_store:
            return ""
        
        book_data = self.embeddings_store[book_id]
        context = book_data["full_content"]
        
        if len(context) > max_length:
            return context[:max_length] + "..."
        return context
    
    def delete_book(self, book_id: int):
        """Remove book from RAG index"""
        if book_id in self.embeddings_store:
            del self.embeddings_store[book_id]
            self._save_embeddings()
            print(f"Deleted book {book_id} from RAG index")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG pipeline statistics"""
        total_books = len(self.embeddings_store)
        total_chunks = sum(len(data["embeddings"]) for data in self.embeddings_store.values())
        
        return {
            "total_books_indexed": total_books,
            "total_chunks": total_chunks,
            "average_chunks_per_book": total_chunks / total_books if total_books > 0 else 0,
            "book_ids": list(self.embeddings_store.keys())
        }
    
    def clear_all(self):
        """Clear all embeddings (for testing)"""
        self.embeddings_store.clear()
        if os.path.exists(self.persist_path):
            os.remove(self.persist_path)
        print("Cleared all embeddings")

# Global instance
rag_pipeline = RAGPipeline()