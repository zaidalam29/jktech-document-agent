# app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.database.models import Book, Review, AuthToken
from app.llm.llama3 import generate_summary, generate_summary_llama3
from app.core.auth import get_current_user, verify_admin
from app.services.recommendations import recommend_books
from app.database.schemas import BookCreate, BookResponse, BookUpdate
from app.database.schemas import ReviewCreate, ReviewResponse, GenerateSummaryRequest, GenerateSummaryResponse
from typing import List, Dict, Any, Optional  
from app.routes import auth, users, documents, ingestion
from fastapi.middleware.cors import CORSMiddleware
from app.services.retriever_pipeline import rag_pipeline
import traceback
from app.database.init_db import init_db
from datetime import datetime

app = FastAPI(title="Documents Q&A For JkTech")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers include
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(ingestion.router)

# >>>>>>>>>>>>>>>> BOOKS ENDPOINTS >>>>>>>>>>>>>>>>

@app.post("/books", response_model=BookResponse)
async def add_book(
    book: BookCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Add user_id to book data
    book_data = book.dict()
    book_data["user_id"] = current_user.id
    
    db_book = Book(**book_data)
    db.add(db_book)
    await db.commit()
    await db.refresh(db_book)
    
    # Index book for RAG
    await rag_pipeline.index_book(db, db_book.id)
    
    return db_book

@app.get("/books", response_model=List[BookResponse])
async def get_books(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only get current user's books
    result = await db.execute(
        select(Book).where(Book.user_id == current_user.id)
    )
    return result.scalars().all()

@app.get("/books/{book_id}", response_model=BookResponse)
async def get_book_by_id(
    book_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only if book belongs to current user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )
    return book

@app.put("/books/{book_id}", response_model=BookResponse)
async def update_book_by_id(
    book_id: int, 
    book_update: BookUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only if book belongs to current user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )

    update_data = book_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(book, key, value)

    await db.commit()
    await db.refresh(book)
    
    # Reindex book for RAG
    await rag_pipeline.index_book(db, book.id)

    return book

@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book_by_id(
    book_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Only if book belongs to current user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )
    
    await db.delete(book)
    await db.commit()

# >>>>>>>>>>>>>>>> REVIEWS ENDPOINTS >>>>>>>>>>>>>>>>

@app.post(
    "/books/{book_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_review_for_book(
    book_id: int,
    review: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # First check if book exists and belongs to user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )

    db_review = Review(
        book_id=book_id,
        user_id=current_user.id,
        review_text=review.review_text,
        rating=review.rating,
    )

    db.add(db_review)
    await db.commit()
    await db.refresh(db_review)
    
    # Reindex book to include new review
    await rag_pipeline.index_book(db, book_id)

    return db_review

@app.get(
    "/books/{book_id}/reviews",
    response_model=List[ReviewResponse]
)
async def get_reviews_for_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # First check if book belongs to user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )

    result = await db.execute(
        select(Review).where(Review.book_id == book_id)
    )
    reviews = result.scalars().all()

    return reviews

# >>>>>>>>>>>>>>>> SUMMARY ENDPOINTS >>>>>>>>>>>>>>>>

@app.get("/books/{id}/summary")
async def book_summary(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if book belongs to user
    result = await db.execute(
        select(Book).where(
            Book.id == id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )
    
    result = await db.execute(select(Review).where(Review.book_id == id))
    reviews = result.scalars().all()
    if reviews:
        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        summary = await generate_summary(" ".join(r.review_text for r in reviews))
        return {"rating": avg_rating, "review_summary": summary}
    else:
        return {"rating": 0, "review_summary": "No reviews yet"}

@app.post(
    "/books/{book_id}/generate-summary",
    response_model=dict,
)
async def generate_and_save_book_summary(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if book belongs to user
    result = await db.execute(
        select(Book).where(
            Book.id == book_id,
            Book.user_id == current_user.id
        )
    )
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or access denied"
        )

    prompt = (
        f"Generate a concise summary for the book:\n"
        f"Title: {book.title}\n"
        f"Author: {book.author}\n"
        f"Genre: {book.genre}\n"
        f"Year Published: {book.year_published}\n"
    )

    summary = await generate_summary_llama3(prompt)

    book.summary = summary
    await db.commit()
    await db.refresh(book)

    return {
        "book_id": book.id,
        "summary": book.summary
    }

@app.post(
    "/generate-summary",
    response_model=GenerateSummaryResponse,
)
async def generate_summary_from_content(
    payload: GenerateSummaryRequest,
    current_user = Depends(get_current_user)
):
    summary = await generate_summary_llama3(
        f"Summarize the following book content:\n{payload.content}"
    )
    return GenerateSummaryResponse(summary=summary)

# >>>>>>>>>>>>>>>> SEARCH & RECOMMENDATIONS >>>>>>>>>>>>>>>>

@app.get("/recommendations")
async def recommendations(
    genre: str, 
    db: AsyncSession = Depends(get_db)
):
    # Only recommend from user's own books
    return await recommend_books(db, genre)

# Common search function
async def perform_search(
    query: str,
    limit: int = 5,
    search_mode: str = "hybrid",
    min_score: float = 0.3,
    db: Optional[AsyncSession] = None,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """Common search logic for both GET and POST endpoints"""
    
    # If db not provided (for testing/mocking), use default
    if db is None:
        db = next(get_db())
    
    results = []
    search_source = ""
    
    if search_mode in ["semantic", "hybrid"]:
        # SEMANTIC SEARCH (RAG)
        try:
            semantic_results = await rag_pipeline.search_similar_books(
                query, 
                n_results=limit * 2,
                min_score=min_score,
                user_id=user_id
            )
            
            if semantic_results:
                for result in semantic_results:
                    result["source"] = "semantic_rag"
                    result["search_type"] = "content_similarity"
                results.extend(semantic_results)
                search_source = "semantic"
        except Exception as e:
            print(f"Semantic search error: {e}")
            # Continue with keyword search
    
    if search_mode in ["keyword", "hybrid"] or (search_mode == "hybrid" and len(results) < limit):
        # KEYWORD SEARCH (Database)
        keyword_results = []
        
        try:
            # Search in books metadata and summary - filtered by user_id
            books_result = await db.execute(
                select(Book).where(
                    Book.user_id == user_id,
                    (
                        Book.title.ilike(f"%{query}%") | 
                        Book.author.ilike(f"%{query}%") |
                        Book.genre.ilike(f"%{query}%") |
                        (Book.summary.ilike(f"%{query}%") if hasattr(Book, 'summary') else False)
                    )
                ).limit(limit * 2)
            )
            books = books_result.scalars().all()
            
            # Search in reviews
            reviews_result = await db.execute(
                select(Review.book_id).distinct()
                .where(Review.review_text.ilike(f"%{query}%"))
                .limit(limit * 2)
            )
            book_ids_from_reviews = reviews_result.scalars().all()
            
            # Fetch books that have matching reviews
            if book_ids_from_reviews:
                books_from_reviews = await db.execute(
                    select(Book).where(
                        Book.id.in_(book_ids_from_reviews),
                        Book.user_id == user_id
                    )
                )
                books.extend(books_from_reviews.scalars().all())
            
            # Remove duplicates
            unique_books = {}
            for book in books:
                unique_books[book.id] = book
            
            # Calculate relevance for each book
            for book in unique_books.values():
                relevance_score = calculate_keyword_relevance(query, book)
                
                if relevance_score > 0.1:
                    # Get reviews for this book
                    book_reviews = await db.execute(
                        select(Review.review_text)
                        .where(Review.book_id == book.id)
                        .limit(3)
                    )
                    reviews = book_reviews.scalars().all()
                    
                    # Prepare content preview
                    content_parts = [
                        f"Title: {book.title}",
                        f"Author: {book.author}",
                        f"Genre: {book.genre}"
                    ]
                    
                    if hasattr(book, 'summary') and book.summary:
                        content_parts.append(f"Summary: {book.summary[:200]}...")
                    
                    if reviews:
                        content_parts.append(f"Reviews: {' '.join([r[:100] for r in reviews])}...")
                    
                    keyword_results.append({
                        "book_id": book.id,
                        "similarity_score": relevance_score,
                        "metadata": {
                            "book_id": book.id,
                            "title": book.title,
                            "author": book.author,
                            "genre": book.genre,
                            "year_published": getattr(book, 'year_published', None)
                        },
                        "content": "\n".join(content_parts),
                        "source": "keyword_search",
                        "search_type": "keyword_match"
                    })
            
            # Sort keyword results
            keyword_results.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            if search_mode == "hybrid":
                # Combine with semantic results
                all_results = combine_results(results, keyword_results)
                results = all_results[:limit]
                search_source = "hybrid"
            else:
                results = keyword_results[:limit]
                search_source = "keyword"
                
        except Exception as e:
            print(f"Keyword search error: {e}")
            # Return whatever results we have
    
    # Fallback if no results
    if not results and len(query.split()) > 1:
        # Try individual words
        words = query.split()
        for word in words:
            if len(word) > 3:
                try:
                    word_results = await perform_search(
                        word, limit=2, 
                        search_mode="hybrid", 
                        min_score=0.2,
                        db=db,
                        user_id=user_id
                    )
                    if word_results and "results" in word_results:
                        results.extend(word_results["results"][:2])
                except:
                    continue
        
        # Remove duplicates
        seen_ids = set()
        unique_results = []
        for result in results:
            if result["book_id"] not in seen_ids:
                seen_ids.add(result["book_id"])
                unique_results.append(result)
        
        results = unique_results[:limit]
        search_source = "fallback_word_search"
    
    return {
        "query": query,
        "search_mode": search_mode,
        "total_results": len(results),
        "source": search_source,
        "min_score_used": min_score,
        "results": results
    }


def calculate_keyword_relevance(query: str, book: Book) -> float:
    """
    Calculate relevance score based on keyword matching
    """
    query_lower = query.lower()
    score = 0.0
    
    # Check in title (highest weight)
    if query_lower in book.title.lower():
        score += 0.8
    elif any(word in book.title.lower() for word in query_lower.split() if len(word) > 2):
        score += 0.4
    
    # Check in author
    if query_lower in book.author.lower():
        score += 0.6
    
    # Check in genre
    if query_lower in book.genre.lower():
        score += 0.5
    
    # Check in summary
    if hasattr(book, 'summary') and book.summary:
        summary_lower = book.summary.lower()
        if query_lower in summary_lower:
            score += 0.7
        elif any(word in summary_lower for word in query_lower.split() if len(word) > 2):
            score += 0.3
    
    # Partial matches
    query_words = set(query_lower.split())
    title_words = set(book.title.lower().split())
    
    common_words = query_words.intersection(title_words)
    if common_words:
        score += len(common_words) * 0.1
    
    return min(score, 1.0)


def combine_results(semantic_results, keyword_results):
    """
    Combine and re-rank semantic and keyword results
    """
    combined = {}
    
    # Add semantic results with weight
    for result in semantic_results:
        book_id = result["book_id"]
        combined[book_id] = {
            "result": result,
            "score": result["similarity_score"] * 1.2  # Semantic results get 20% boost
        }
    
    # Add keyword results
    for result in keyword_results:
        book_id = result["book_id"]
        if book_id in combined:
            # Average the scores if book appears in both
            combined[book_id]["score"] = (combined[book_id]["score"] + result["similarity_score"]) / 2
        else:
            combined[book_id] = {
                "result": result,
                "score": result["similarity_score"]
            }
    
    # Sort by combined score
    sorted_items = sorted(combined.items(), key=lambda x: x[1]["score"], reverse=True)
    
    # Return only the result objects
    return [item[1]["result"] for item in sorted_items]


# POST endpoint
@app.post("/search")
async def search_books(
    query: str, 
    limit: int = 5,
    search_mode: str = "hybrid",
    min_score: float = 0.3,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """POST version of search"""
    return await perform_search(query, limit, search_mode, min_score, db, current_user.id)


# GET endpoint
@app.get("/search")
async def search_books_get(
    query: str,
    limit: int = 5,
    search_mode: str = Query("hybrid", description="Search mode: semantic, keyword, or hybrid"),
    min_score: float = Query(0.3, description="Minimum similarity score (0.0 to 1.0)"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """GET version of search for UI compatibility"""
    return await perform_search(query, limit, search_mode, min_score, db, current_user.id)


# >>>>>>>>>>>>>>>> RAG ENDPOINTS >>>>>>>>>>>>>>>>

@app.post("/books/{book_id}/reindex")
async def reindex_book(
    book_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Manually reindex a book for RAG (only if user owns it)"""
    try:
        # Check if book exists AND belongs to user
        result = await db.execute(
            select(Book).where(
                Book.id == book_id,
                Book.user_id == current_user.id
            )
        )
        book = result.scalar_one_or_none()
        
        if not book:
            raise HTTPException(
                status_code=404,
                detail=f"Book with ID {book_id} not found or access denied"
            )
        
        # Check RAG pipeline
        if not hasattr(rag_pipeline, 'embedding_model') or rag_pipeline.embedding_model is None:
            raise HTTPException(
                status_code=500,
                detail="RAG pipeline not properly initialized. Embedding model missing."
            )
        
        await rag_pipeline.index_book(db, book_id)
        
        return {
            "message": f"Book {book_id} reindexed successfully",
            "book_title": book.title,
            "embeddings_store_size": len(rag_pipeline.embeddings_store)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error reindexing book {book_id}: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reindex book {book_id}: {str(e)}"
        )

@app.post("/reindex-all")
async def reindex_all_books(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Reindex all books for RAG (only user's own books)"""
    try:
        # Check RAG pipeline first
        if not hasattr(rag_pipeline, 'embedding_model') or rag_pipeline.embedding_model is None:
            raise HTTPException(
                status_code=500,
                detail="RAG pipeline not properly initialized"
            )
        
        # Only get current user's books
        result = await db.execute(
            select(Book).where(Book.user_id == current_user.id)
        )
        books = result.scalars().all()
        
        if not books:
            return {
                "message": "No books found for your account",
                "indexed_count": 0,
                "total_in_store": len(rag_pipeline.embeddings_store)
            }
        
        indexed_count = 0
        errors = []
        
        for book in books:
            try:
                await rag_pipeline.index_book(db, book.id)
                indexed_count += 1
                print(f"Successfully indexed book {book.id}: {book.title}")
            except Exception as e:
                error_msg = f"Failed to index book {book.id}: {str(e)}"
                print(error_msg)
                errors.append(error_msg)
        
        return {
            "message": f"Reindexed {indexed_count} out of {len(books)} books successfully",
            "total_books": len(books),
            "indexed_count": indexed_count,
            "failed_count": len(errors),
            "errors": errors[:5],  # Return first 5 errors only
            "total_in_store": len(rag_pipeline.embeddings_store)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reindex-all: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reindex all books: {str(e)}"
        )

@app.get("/debug/embeddings")
async def debug_embeddings(current_user = Depends(get_current_user)):
    """Debug endpoint to check embeddings store (only user's books)"""
    try:
        store_info = []
        for book_id, data in rag_pipeline.embeddings_store.items():
            # Check if book belongs to current user
            result = await rag_pipeline.db.execute(
                select(Book).where(
                    Book.id == book_id,
                    Book.user_id == current_user.id
                )
            )
            book = result.scalar_one_or_none()
            
            if book:  # Only include user's books
                store_info.append({
                    "book_id": book_id,
                    "title": data["metadata"]["title"],
                    "embedding_length": len(data["embedding"]),
                    "content_preview": data["content"][:100] + "..." if len(data["content"]) > 100 else data["content"]
                })
        
        return {
            "rag_pipeline_initialized": hasattr(rag_pipeline, 'embedding_model') and rag_pipeline.embedding_model is not None,
            "total_books_indexed": len(store_info),
            "user_books_indexed": store_info[:10]  # First 10 books only
        }
    except Exception as e:
        return {
            "error": str(e),
            "rag_pipeline_initialized": hasattr(rag_pipeline, 'embedding_model') and rag_pipeline.embedding_model is not None,
            "embeddings_store_type": type(rag_pipeline.embeddings_store).__name__ if hasattr(rag_pipeline, 'embeddings_store') else "No store"
        }

# >>>>>>>>>>>>>>>> LOGOUT ENDPOINT >>>>>>>>>>>>>>>>

@app.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Logout by revoking the current token"""
    
    # Get token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split(" ")[1]
    
    # Find and revoke the token
    result = await db.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.user_id == current_user.id,
            AuthToken.is_revoked == False
        )
    )
    auth_token = result.scalar_one_or_none()
    
    if auth_token:
        # Mark as revoked
        auth_token.is_revoked = True
        await db.commit()
        return {
            "message": "Logged out successfully",
            "token_id": auth_token.id,
            "user_id": current_user.id
        }
    else:
        # Token already revoked or not found
        return {
            "message": "Token already revoked or not found",
            "user_id": current_user.id
        }

# >>>>>>>>>>>>>>>> ADMIN ENDPOINTS (All books view) >>>>>>>>>>>>>>>>

@app.get("/admin/books", dependencies=[Depends(verify_admin)])
async def admin_get_all_books(db: AsyncSession = Depends(get_db)):
    """Admin only: Get all books from all users"""
    result = await db.execute(select(Book))
    return result.scalars().all()

@app.get("/admin/books/{book_id}", dependencies=[Depends(verify_admin)])
async def admin_get_book_by_id(book_id: int, db: AsyncSession = Depends(get_db)):
    """Admin only: Get any book by ID"""
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    return book

# >>>>>>>>>>>>>>>> ROOT ENDPOINT >>>>>>>>>>>>>>>>
@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/")
async def root():
    return {"message": "JK Tech Documents Q&A API", "status": "running"}