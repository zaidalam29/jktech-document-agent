import asyncio
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from sqlalchemy.orm import Session
import redis
import pickle
from concurrent.futures import ThreadPoolExecutor
import traceback

from app.core.config import settings
from app.core.logger import StructuredLogger
from app.models.book import Book
from app.models.review import Review
from app.models.user import User
from app.services.llm_service import llm_service
from app.core.error_handlers import (
    AppError,
    NotFoundError,
    ServiceUnavailableError,
    DatabaseError,
    retry_with_backoff
)

class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.redis_client = None
        self._init_redis()
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.circuit_breaker = CircuitBreaker()
        StructuredLogger.info("Recommendation Service initialized")
    
    def _init_redis(self):
        """Initialize Redis connection with error handling"""
        try:
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.redis_client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=False,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    socket_keepalive=True
                )
                # Test connection
                self.redis_client.ping()
                StructuredLogger.info("Redis connection successful for recommendations")
            else:
                StructuredLogger.warning("Redis not configured, caching disabled")
                self.redis_client = None
        except Exception as e:
            StructuredLogger.error("Redis connection failed", error=e)
            self.redis_client = None
    
    def _get_cache_key(self, user_id: int, recommendation_type: str, filters: Dict = None) -> str:
        """Generate cache key with filters"""
        base_key = f"rec:{user_id}:{recommendation_type}"
        if filters:
            filter_str = json.dumps(filters, sort_keys=True)
            import hashlib
            filter_hash = hashlib.md5(filter_str.encode()).hexdigest()[:8]
            base_key = f"{base_key}:{filter_hash}"
        return base_key
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    async def get_recommendations(
    self, 
    user_id: int, 
    limit: int = 10,
    filters: Dict = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
        """
        Main recommendation method with caching and error handling
        """
        request_id = get_request_id()
        StructuredLogger.info(
            "Getting recommendations",
            user_id=user_id,
            limit=limit,
            filters=filters,
            force_refresh=force_refresh,
            request_id=request_id
        )
        
        try:
            # Validate input
            if limit < 1 or limit > 50:
                raise ValidationError("Limit must be between 1 and 50")
            
            # Try cache first (unless force refresh)
            if not force_refresh:
                cached_result = await self._get_from_cache(user_id, filters)
                if cached_result:
                    cached_result["source"] = "cache"
                    StructuredLogger.info(
                        "Cache hit for recommendations",
                        user_id=user_id,
                        cache_key=cached_result.get("cache_key")
                    )
                    return cached_result
            
            # Generate fresh recommendations
            return await self._generate_fresh_recommendations(
                user_id, limit, filters, request_id
            )
            
        except AppError:
            raise  # Re-raise custom errors
        except Exception as e:
            StructuredLogger.error(
                "Error getting recommendations",
                error=e,
                user_id=user_id,
                request_id=request_id
            )
            # Fallback to basic recommendations
            return await self._get_fallback_recommendations(limit)
    
    async def _generate_fresh_recommendations(
    self, 
    user_id: int, 
    limit: int,
    filters: Dict,
    request_id: str
) -> Dict[str, Any]:
        """Generate fresh recommendations with circuit breaker"""
        try:
            # Get user data with error handling
            user = self._get_user_safe(user_id)
            
            # Get user's reading history
            user_reviews = self._get_user_reviews_safe(user_id)
            
            # Get all books with filtering
            all_books = self._get_filtered_books(filters)
            
            if not all_books:
                # Return proper response structure when no books
                return {
                    "success": True,
                    "user_id": user_id,
                    "recommendations": [],
                    "total_generated": 0,
                    "source": "fresh",
                    "generated_at": datetime.now().isoformat(),
                    "message": "No books available for recommendations",
                    "metadata": {
                        "total_books_considered": 0,
                        "user_reviews_count": len(user_reviews),
                    }
                }
            
            # Use circuit breaker for parallel strategies
            recommendations = await self.circuit_breaker.execute(
                self._generate_recommendations_parallel,
                user, user_reviews, all_books, limit
            )
            
            # Prepare response with ALL required fields
            result = {
                "success": True,
                "user_id": user_id,
                "recommendations": recommendations[:limit],
                "total_generated": len(recommendations),
                "source": "fresh",
                "generated_at": datetime.now().isoformat(),
                "request_id": request_id,
                "metadata": {
                    "total_books_considered": len(all_books),
                    "user_reviews_count": len(user_reviews),
                    "strategies_used": self._get_active_strategies_count()
                }
            }
            
            # Cache the result (async, don't wait)
            if self.redis_client:
                asyncio.create_task(
                    self._cache_recommendations(user_id, filters, result)
                )
            
            StructuredLogger.info(
                "Generated fresh recommendations",
                user_id=user_id,
                count=len(recommendations),
                request_id=request_id
            )
            
            return result
            
        except Exception as e:
            StructuredLogger.error(
                "Error generating fresh recommendations",
                error=e,
                user_id=user_id,
                request_id=request_id
            )
            # Return error response instead of raising
            return {
                "success": False,
                "user_id": user_id,
                "recommendations": [],
                "total_generated": 0,
                "source": "error",
                "generated_at": datetime.now().isoformat(),
                "message": "Recommendation service temporarily unavailable",
                "error_code": "SERVICE_UNAVAILABLE"
            }
    
    def _get_user_safe(self, user_id: int) -> User:
        """Get user with error handling"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise NotFoundError("User", user_id)
            return user
        except Exception as e:
            StructuredLogger.error("Error getting user", error=e, user_id=user_id)
            raise DatabaseError("Failed to fetch user data")
    
    def _get_user_reviews_safe(self, user_id: int) -> List[Review]:
        """Get user reviews with error handling"""
        try:
            return self.db.query(Review).filter(Review.user_id == user_id).all()
        except Exception as e:
            StructuredLogger.error("Error getting user reviews", error=e, user_id=user_id)
            return []  # Return empty list instead of failing
    
    
    def _get_filtered_books(self, filters: Dict = None) -> List[Book]:
        """Get books with optional filtering"""
        try:
            # Start with base query - NO is_active filter (field doesn't exist)
            query = self.db.query(Book)
            
            if filters:
                # Apply filters according to your schema
                if 'genre' in filters and filters['genre']:
                    query = query.filter(Book.genre.ilike(f"%{filters['genre']}%"))
                
                if 'author' in filters and filters['author']:
                    query = query.filter(Book.author.ilike(f"%{filters['author']}%"))
                
                if 'year_from' in filters:
                    query = query.filter(Book.year_published >= filters['year_from'])
                
                if 'year_to' in filters:
                    query = query.filter(Book.year_published <= filters['year_to'])
                
                # Note: Your Book model doesn't have avg_rating field
                # So we can't filter by min_rating
            
            return query.all()
            
        except Exception as e:
            StructuredLogger.error("Error filtering books", error=e, filters=filters)
            # Fallback to all books
            return self.db.query(Book).all()
    
    async def _generate_recommendations_parallel(
        self, 
        user: User, 
        user_reviews: List[Review], 
        all_books: List[Book], 
        limit: int
    ) -> List[Dict]:
        """Generate recommendations using multiple parallel strategies"""
        strategies = [
            ("history", lambda: self._strategy_based_on_history(user_reviews, all_books)),
            ("genre", lambda: self._strategy_based_on_genre(user_reviews, all_books)),
            ("popular", lambda: self._strategy_popular_books(all_books)),
            ("new", lambda: self._strategy_new_releases(all_books)),
            ("similar_users", lambda: self._strategy_similar_users(user.id, all_books)),
        ]
        
        # Add AI strategy only if user has reviews
        if len(user_reviews) >= 3:
            strategies.append(
                ("ai", lambda: self._strategy_llm_based(user, user_reviews, all_books))
            )
        
        # Execute strategies in parallel
        tasks = []
        for name, strategy_func in strategies:
            tasks.append(
                asyncio.to_thread(self._execute_strategy_safe, name, strategy_func)
            )
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results
        all_recommendations = []
        seen_books = set()
        
        for result in results:
            if isinstance(result, Exception):
                StructuredLogger.warning("Strategy failed", error=result)
                continue
            
            strategy_name, recommendations = result
            for rec in recommendations:
                book_id = rec.get("book_id")
                if book_id and book_id not in seen_books:
                    seen_books.add(book_id)
                    rec["strategy"] = strategy_name
                    all_recommendations.append(rec)
        
        # Sort by score and apply diversity
        sorted_recommendations = self._apply_diversity(
            all_recommendations, 
            diversity_factor=0.3
        )
        
        return sorted_recommendations[:limit * 2]  # Get extra for filtering
    
    def _execute_strategy_safe(self, name: str, strategy_func) -> Tuple[str, List[Dict]]:
        """Execute strategy with error handling"""
        try:
            recommendations = strategy_func()
            return name, recommendations
        except Exception as e:
            StructuredLogger.error(f"Strategy {name} failed", error=e)
            return name, []
    
    def _strategy_based_on_history(self, user_reviews: List[Review], all_books: List[Book]) -> List[Dict]:
        """Recommend based on user's reading history"""
        try:
            if not user_reviews:
                return []
            
            # Get liked books (rating >= 4)
            liked_books = [r.book_id for r in user_reviews if r.rating >= 4]
            if not liked_books:
                return []
            
            recommendations = []
            liked_book_details = [b for b in all_books if b.id in liked_books]
            
            for book in all_books:
                if book.id in liked_books:
                    continue
                
                score = self._calculate_similarity_score(book, liked_book_details)
                
                if score > 0.2:  # Threshold
                    recommendations.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "genre": book.genre,
                        "year": book.year,
                        "score": round(score, 3),
                        "reason": "Similar to books you liked"
                    })
            
            return recommendations[:20]
            
        except Exception as e:
            StructuredLogger.error("History-based strategy failed", error=e)
            return []
    
    
    def _strategy_based_on_genre(self, user_reviews: List[Review], all_books: List[Book]) -> List[Dict]:
        """Recommend based on favorite genres"""
        try:
            # Analyze user's genre preferences
            genre_scores = {}
            for review in user_reviews:
                book = next((b for b in all_books if b.id == review.book_id), None)
                if book and book.genre:
                    genres = book.genre.split(',')
                    for genre in genres:
                        genre = genre.strip()
                        if genre:
                            genre_scores[genre] = genre_scores.get(genre, 0) + review.rating
            
            if not genre_scores:
                return []
            
            # Get top genres
            top_genres = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)[:3]
            
            recommendations = []
            for book in all_books:
                if not book.genre:
                    continue
                
                # Check if user already reviewed this book
                user_reviewed = any(r.book_id == book.id for r in user_reviews)
                if user_reviewed:
                    continue
                
                book_genres = {g.strip() for g in book.genre.split(',')}
                
                # Calculate genre match score
                score = 0.0
                for genre, genre_score in top_genres:
                    if genre in book_genres:
                        score += genre_score / 10
                
                if score > 0:
                    matching_genres = book_genres.intersection({g for g, _ in top_genres})
                    recommendations.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "genre": book.genre,
                        "year": book.year,
                        "score": round(score, 3),
                        "reason": f"Matches your interest in: {', '.join(matching_genres)[:50]}"
                    })
            
            return recommendations[:20]
            
        except Exception as e:
            StructuredLogger.error("Genre-based strategy failed", error=e)
            return []
    
    def _strategy_popular_books(self, all_books: List[Book]) -> List[Dict]:
        """Recommend popular books"""
        try:
            recommendations = []
            
            # Since your Book model doesn't have avg_rating or review_count,
            # We need to calculate popularity differently
            
            # Option 1: Use reviews count from relationship
            for book in all_books:
                # Get review count from relationship
                review_count = len(book.reviews) if book.reviews else 0
                
                # Calculate average rating
                if review_count > 0:
                    total_rating = sum([r.rating for r in book.reviews])
                    avg_rating = total_rating / review_count
                else:
                    avg_rating = 0
                
                # Simple popularity score
                popularity = (avg_rating * 0.6) + (min(review_count, 100) / 100 * 0.4)
                
                if popularity > 2.5 or review_count >= 5:
                    recommendations.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "genre": book.genre,
                        "year": book.year_published,  # Note: Your field is year_published
                        "score": round(popularity, 3),
                        "reason": f"Popular book ({avg_rating:.1f}⭐, {review_count} reviews)"
                    })
            
            recommendations.sort(key=lambda x: x["score"], reverse=True)
            return recommendations[:15]
            
        except Exception as e:
            StructuredLogger.error("Popular books strategy failed", error=e)
            return []

    def _strategy_new_releases(self, all_books: List[Book]) -> List[Dict]:
        """Recommend new releases"""
        try:
            current_year = datetime.now().year
            recommendations = []
            
            for book in all_books:
                if not book.year_published:  # Note: Your field is year_published
                    continue
                
                # Books from last 3 years
                if book.year_published >= current_year - 3:
                    recency_score = (book.year_published - (current_year - 3)) / 3
                    recommendations.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "genre": book.genre,
                        "year": book.year_published,
                        "score": round(recency_score, 3),
                        "reason": f"New release ({book.year_published})"
                    })
            
            return recommendations[:15]
            
        except Exception as e:
            StructuredLogger.error("New releases strategy failed", error=e)
            return []
    
    def _strategy_similar_users(self, user_id: int, all_books: List[Book]) -> List[Dict]:
        """Recommend based on similar users (collaborative filtering)"""
        try:
            # Simplified collaborative filtering
            # In production, use proper ML model
            all_reviews = self.db.query(Review).all()
            
            # Find users with similar tastes
            user_reviews = {r.book_id: r.rating for r in self.db.query(Review)
                          .filter(Review.user_id == user_id).all()}
            
            similar_users = []
            for review in all_reviews:
                if review.user_id == user_id:
                    continue
                
                # Simple similarity check
                if review.book_id in user_reviews:
                    rating_diff = abs(user_reviews[review.book_id] - review.rating)
                    if rating_diff <= 1:  # Similar rating
                        similar_users.append(review.user_id)
            
            # Get books liked by similar users
            similar_user_books = {}
            for user in set(similar_users[:10]):  # Limit to 10 similar users
                user_revs = self.db.query(Review).filter(
                    Review.user_id == user,
                    Review.rating >= 4
                ).all()
                for rev in user_revs:
                    similar_user_books[rev.book_id] = similar_user_books.get(rev.book_id, 0) + 1
            
            # Create recommendations
            recommendations = []
            for book_id, count in sorted(similar_user_books.items(), key=lambda x: x[1], reverse=True)[:10]:
                book = next((b for b in all_books if b.id == book_id), None)
                if book and book_id not in user_reviews:
                    recommendations.append({
                        "book_id": book.id,
                        "title": book.title,
                        "author": book.author,
                        "genre": book.genre,
                        "year": book.year,
                        "score": round(count / 10, 3),  # Normalize
                        "reason": f"Liked by {count} users with similar taste"
                    })
            
            return recommendations
            
        except Exception as e:
            StructuredLogger.error("Similar users strategy failed", error=e)
            return []
    
    async def _strategy_llm_based(self, user: User, user_reviews: List[Review], all_books: List[Book]) -> List[Dict]:
        """Use LLM for intelligent recommendations"""
        try:
            # Prepare user history
            history_text = ""
            for review in user_reviews[:5]:
                book = next((b for b in all_books if b.id == review.book_id), None)
                if book:
                    history_text += f"- {book.title} by {book.author}: {review.rating} stars\n"
            
            if not history_text:
                return []
            
            # Prepare book list
            books_text = "\n".join([
                f"{book.id}. {book.title} by {book.author} ({book.genre}, {book.year})"
                for book in all_books[:30]
            ])
            
            prompt = f"""Based on this user's reading history, recommend 5-10 books:

User's Reading History:
{history_text}

Available Books:
{books_text}

Please recommend books with:
1. Book ID
2. Brief reason
3. Similarity score (0.0 to 1.0)

Format as JSON:"""
            
            response = await llm_service.generate_response(prompt, temperature=0.7)
            
            # Parse response
            try:
                import re
                json_match = re.search(r'\[.*\]', response, re.DOTALL)
                if json_match:
                    llm_recommendations = json.loads(json_match.group())
                    
                    enriched = []
                    for rec in llm_recommendations:
                        book = next((b for b in all_books if b.id == rec["book_id"]), None)
                        if book:
                            enriched.append({
                                "book_id": book.id,
                                "title": book.title,
                                "author": book.author,
                                "genre": book.genre,
                                "year": book.year,
                                "score": rec.get("score", 0.5),
                                "reason": rec.get("reason", "AI recommendation")
                            })
                    
                    return enriched
            except Exception as e:
                StructuredLogger.error("Failed to parse LLM response", error=e)
                
        except Exception as e:
            StructuredLogger.error("LLM recommendation strategy failed", error=e)
        
        return []
    
    def _apply_diversity(self, recommendations: List[Dict], diversity_factor: float = 0.3) -> List[Dict]:
        """Apply diversity to recommendations"""
        if not recommendations:
            return []
        
        # Group by genre
        genre_groups = {}
        for rec in recommendations:
            genre = rec.get("genre", "Unknown").split(',')[0].strip()
            genre_groups.setdefault(genre, []).append(rec)
        
        # Take top from each genre
        diverse_recommendations = []
        max_per_genre = max(1, int(len(recommendations) * diversity_factor / len(genre_groups)))
        
        for genre, group in genre_groups.items():
            group.sort(key=lambda x: x["score"], reverse=True)
            diverse_recommendations.extend(group[:max_per_genre])
        
        # Sort overall by score
        diverse_recommendations.sort(key=lambda x: x["score"], reverse=True)
        return diverse_recommendations
    
    async def _get_from_cache(self, user_id: int, filters: Dict = None) -> Optional[Dict]:
        """Get recommendations from cache"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self._get_cache_key(user_id, "main", filters)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                result = pickle.loads(cached_data)
                # Check if cache is still valid (not older than 1 hour)
                cached_at = result.get("cached_at")
                if cached_at:
                    cache_time = datetime.fromisoformat(cached_at)
                    if datetime.now() - cache_time < timedelta(hours=1):
                        result["cache_key"] = cache_key
                        return result
                
                # Cache expired, delete it
                self.redis_client.delete(cache_key)
                
        except Exception as e:
            StructuredLogger.warning("Cache read error", error=e)
        
        return None
    
    async def _cache_recommendations(self, user_id: int, filters: Dict, data: Dict, ttl: int = 3600):
        """Cache recommendations"""
        if not self.redis_client:
            return
        
        try:
            cache_key = self._get_cache_key(user_id, "main", filters)
            data["cached_at"] = datetime.now().isoformat()
            data["cache_key"] = cache_key
            
            serialized = pickle.dumps(data)
            
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                lambda: self.redis_client.setex(cache_key, ttl, serialized)
            )
            
            StructuredLogger.debug("Cached recommendations", cache_key=cache_key, ttl=ttl)
            
        except Exception as e:
            StructuredLogger.warning("Cache write error", error=e)
    
    def _calculate_similarity_score(self, book: Book, liked_books: List[Book]) -> float:
        """Calculate similarity score between book and liked books"""
        score = 0.0
        
        # Genre similarity
        if book.genre and liked_books:
            book_genres = set(book.genre.split(','))
            total_genre_overlap = 0
            
            for liked_book in liked_books:
                if liked_book.genre:
                    liked_genres = set(liked_book.genre.split(','))
                    overlap = len(book_genres.intersection(liked_genres))
                    total_genre_overlap += overlap
            
            score += (total_genre_overlap / len(liked_books)) * 0.3
        
        # Author similarity
        if book.author:
            liked_authors = {b.author.lower() for b in liked_books if b.author}
            if book.author.lower() in liked_authors:
                score += 0.4
        
        # Year proximity
        if book.year_published:
            liked_years = [b.year_published for b in liked_books if b.year_published]
            if liked_years:
                avg_year = sum(liked_years) / len(liked_years)
                year_diff = abs(book.year_published - avg_year)
                if year_diff <= 2:
                    score += 0.2
                elif year_diff <= 5:
                    score += 0.1
        
        return score

    async def _get_fallback_recommendations(self, limit: int) -> Dict[str, Any]:
        """Fallback when primary methods fail"""
        try:
            # Get all books
            all_books = self.db.query(Book).all()
            
            # Calculate popularity for each book
            book_scores = []
            for book in all_books:
                review_count = len(book.reviews) if book.reviews else 0
                
                if review_count > 0:
                    total_rating = sum([r.rating for r in book.reviews])
                    avg_rating = total_rating / review_count
                else:
                    avg_rating = 3.5  # Default for books without reviews
                
                popularity = avg_rating * 0.7 + (min(review_count, 50) / 50 * 0.3)
                book_scores.append((book, popularity))
            
            # Sort by popularity
            book_scores.sort(key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for book, popularity in book_scores[:limit]:
                review_count = len(book.reviews) if book.reviews else 0
                avg_rating = popularity  # Approximate
                
                recommendations.append({
                    "book_id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "genre": book.genre,
                    "year": book.year_published,
                    "score": round(popularity, 3),
                    "reason": f"Popular book ({avg_rating:.1f}⭐, {review_count} reviews)",
                    "strategy": "fallback"
                })
            
            return {
                "success": True,
                "recommendations": recommendations,
                "source": "fallback",
                "generated_at": datetime.now().isoformat(),
                "note": "Using fallback popular books"
            }
            
        except Exception as e:
            StructuredLogger.error("Fallback recommendations failed", error=e)
            return {
                "success": False,
                "error": "Could not generate recommendations",
                "recommendations": [],
                "source": "error"
            }
    
    def _get_active_strategies_count(self) -> int:
        """Get count of active strategies"""
        return 5  # history, genre, popular, new, similar_users
    
    async def clear_user_cache(self, user_id: int):
        """Clear cached recommendations for a user"""
        if not self.redis_client:
            return
        
        try:
            pattern = f"rec:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                StructuredLogger.info(f"Cleared cache for user {user_id}", keys_count=len(keys))
        except Exception as e:
            StructuredLogger.error("Error clearing user cache", error=e, user_id=user_id)
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get recommendation service statistics"""
        stats = {
            "redis_connected": self.redis_client is not None,
            "circuit_breaker_state": self.circuit_breaker.get_state(),
            "executor_workers": self.executor._max_workers if hasattr(self.executor, '_max_workers') else 4
        }
        
        if self.redis_client:
            try:
                stats["redis_info"] = {
                    "keys": len(self.redis_client.keys("rec:*")),
                    "memory_used": self.redis_client.info("memory").get("used_memory_human", "N/A")
                }
            except:
                stats["redis_info"] = "unavailable"
        
        return stats
    
    def cleanup(self):
        """Cleanup resources"""
        if self.executor:
            self.executor.shutdown(wait=False)
        
        if self.redis_client:
            self.redis_client.close()

# Circuit Breaker Implementation
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, reset_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"
    
    async def execute(self, func, *args, **kwargs):
        current_time = datetime.now().timestamp()
        
        if self.state == "OPEN":
            if self.last_failure_time and (current_time - self.last_failure_time) > self.reset_timeout:
                self.state = "HALF_OPEN"
                StructuredLogger.info("Circuit breaker: HALF_OPEN")
            else:
                raise ServiceUnavailableError("Service temporarily unavailable")
        
        try:
            result = await func(*args, **kwargs)
            
            if self.state == "HALF_OPEN":
                self.reset()
            
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = current_time
            
            StructuredLogger.warning(
                f"Circuit breaker failure: {self.failure_count}/{self.failure_threshold}",
                error=e
            )
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                StructuredLogger.error("Circuit breaker: OPEN")
            
            raise
    
    def reset(self):
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"
        StructuredLogger.info("Circuit breaker: CLOSED")
    
    def get_state(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "threshold": self.failure_threshold,
            "reset_timeout": self.reset_timeout
        }

# Helper function (assuming it's imported from error_handlers)
from app.core.error_handlers import get_request_id