import httpx
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.logger import logger
from dotenv import load_dotenv
import os
load_dotenv()

class AIService:
    """AI service using OpenRouter API"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_BASE_URL")
        self.model = os.getenv("AI_MODEL")
        self.max_tokens = os.getenv("AI_MAX_TOKENS")
        self.temperature = os.getenv("AI_TEMPERATURE")
    
    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> Optional[str]:
        """Generate AI completion using OpenRouter"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            data = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
                response.raise_for_status()
                
                result = response.json()
                return result["choices"][0]["message"]["content"]
                
        except Exception as e:
            logger.error(f"AI generation error: {str(e)}")
            return None
    
    async def generate_summary(self, text: str) -> Optional[str]:
        """Generate book summary"""
        system_prompt = "You are a helpful assistant that creates concise and engaging book summaries."
        prompt = f"Please provide a brief summary of the following book content:\n\n{text[:2000]}"
        
        return await self.generate_completion(prompt, system_prompt)
    
    async def generate_recommendation(
        self,
        user_preferences: str,
        book_history: str
    ) -> Optional[str]:
        """Generate book recommendations"""
        system_prompt = "You are a book recommendation expert. Provide personalized book recommendations."
        prompt = f"""
        Based on the following user preferences and reading history, suggest 5 books:
        
        User Preferences: {user_preferences}
        Reading History: {book_history}
        
        Please provide recommendations with brief explanations.
        """
        
        return await self.generate_completion(prompt, system_prompt)
    
    async def analyze_review(self, review_text: str) -> Optional[Dict[str, Any]]:
        """Analyze book review sentiment and extract insights"""
        system_prompt = "You are a review analyzer. Analyze sentiment and extract key insights from book reviews."
        prompt = f"Analyze this book review and provide sentiment (positive/negative/neutral) and key insights:\n\n{review_text}"
        
        response = await self.generate_completion(prompt, system_prompt)
        
        if response:
            # Parse response into structured format
            return {
                "analysis": response,
                "raw_review": review_text
            }
        return None

async def generate_review_summary(
        self, 
        reviews: List[Dict[str, Any]],
        book_title: str,
        book_author: str
    ) -> Optional[Dict[str, Any]]:
        """Generate comprehensive review summary with sentiment analysis"""
        
        # Prepare reviews data for AI
        reviews_text = ""
        for i, review in enumerate(reviews[:20], 1):  # Limit to 20 reviews for token management
            review_text = review.get('review_text', '')
            rating = review.get('rating', 0)
            reviews_text += f"Review {i} (Rating: {rating}/5): {review_text[:500]}\n\n"
        
        system_prompt = """You are an expert book review analyst. Analyze the given reviews and provide:
        1. Overall sentiment (Positive/Negative/Neutral/Mixed)
        2. Key themes and topics mentioned
        3. Common praises (what readers liked)
        4. Common criticisms (what readers didn't like)
        5. Target audience recommendation
        6. A 2-3 paragraph comprehensive summary
        
        Format your response as JSON with these keys:
        - "sentiment": string
        - "sentiment_score": number between -1 and 1
        - "key_themes": array of strings
        - "common_praises": array of strings  
        - "common_criticisms": array of strings
        - "target_audience": string
        - "summary": string
        - "readers_enjoy_if": array of strings (what type of readers will enjoy)
        - "readers_avoid_if": array of strings (what type of readers should avoid)
        
        Be objective and data-driven in your analysis."""
        
        prompt = f"""Book: "{book_title}" by {book_author}

Analyze these {len(reviews)} reader reviews:

{reviews_text}

Please provide a comprehensive analysis in the specified JSON format."""

        try:
            response = await self.generate_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,  # Lower temperature for more consistent analysis
                max_tokens=1500
            )
            
            if response:
                # Try to parse JSON from response
                try:
                    # Sometimes LLM adds text before/after JSON
                    json_start = response.find('{')
                    json_end = response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = response[json_start:json_end]
                        analysis = json.loads(json_str)
                        
                        # Add metadata
                        analysis["total_reviews_analyzed"] = len(reviews)
                        analysis["book_title"] = book_title
                        analysis["book_author"] = book_author
                        analysis["analysis_timestamp"] = "auto_generated"
                        
                        return analysis
                    else:
                        # If JSON parsing fails, return raw analysis
                        return {
                            "analysis": response,
                            "total_reviews_analyzed": len(reviews),
                            "book_title": book_title,
                            "book_author": book_author,
                            "analysis_timestamp": "auto_generated",
                            "format": "text"
                        }
                except json.JSONDecodeError:
                    # Return as text analysis
                    return {
                        "analysis": response,
                        "total_reviews_analyzed": len(reviews),
                        "book_title": book_title,
                        "book_author": book_author,
                        "analysis_timestamp": "auto_generated",
                        "format": "text"
                    }
        
        except Exception as e:
            logger.error(f"Error generating review summary: {str(e)}")
        
        return None
    
async def generate_quick_summary_stats(
        self,
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate quick statistical summary without deep analysis"""
        if not reviews:
            return {
                "sentiment": "No reviews",
                "summary": "No reviews available for this book yet.",
                "total_reviews": 0
            }
        
        # Calculate basic stats
        ratings = [r.get('rating', 0) for r in reviews if r.get('rating')]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Simple sentiment analysis based on ratings
        if avg_rating >= 4:
            sentiment = "Very Positive"
        elif avg_rating >= 3:
            sentiment = "Positive"
        elif avg_rating >= 2:
            sentiment = "Mixed"
        else:
            sentiment = "Negative"
        
        # Count reviews with text
        reviews_with_text = sum(1 for r in reviews if r.get('review_text', '').strip())
        
        return {
            "sentiment": sentiment,
            "average_rating": round(avg_rating, 2),
            "total_reviews": len(reviews),
            "reviews_with_text": reviews_with_text,
            "rating_distribution": {
                "5_stars": sum(1 for r in ratings if r == 5),
                "4_stars": sum(1 for r in ratings if r == 4),
                "3_stars": sum(1 for r in ratings if r == 3),
                "2_stars": sum(1 for r in ratings if r == 2),
                "1_star": sum(1 for r in ratings if r == 1)
            },
            "summary_type": "statistical"
        }    

# Global AI service instance
ai_service = AIService()