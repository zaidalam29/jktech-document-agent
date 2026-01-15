import httpx  # Async HTTP client library for making API requests
from app.core.config import settings  # Import settings from config module

async def generate_summary(content: str):
    """
    Function to generate book summary using OpenRouter AI API
    Uses meta-llama/llama-3-8b-instruct model
    """
    async with httpx.AsyncClient() as client:  # Create async HTTP client
        response = await client.post(  # Make POST request to OpenRouter API
            "https://openrouter.ai/api/v1/chat/completions",  # OpenRouter API endpoint
            headers={  # Request headers
                "Authorization": f"Bearer {settings.LLM_KEY}",  # API key for authentication
                "Content-Type": "application/json",  # Specify JSON content type
            },
            json={  # Request body in JSON format
                "model": "meta-llama/llama-3-8b-instruct",  # Specify which AI model to use
                "messages": [  # Conversation messages for the AI
                    {"role": "user", "content": f"Summarize this book:\n{content}"}  # User prompt with book content
                ]
            }
        )
    # Extract and return the AI-generated summary from response
    return response.json()["choices"][0]["message"]["content"]

async def generate_summary_llama3(prompt: str) -> str:
    """
    Improved function to generate book summary using OpenRouter AI API
    - Uses model from settings
    - Has system message for better context
    - Includes timeout for request
    - Better error handling (commented)
    """
    async with httpx.AsyncClient(timeout=60) as client:  # Create async client with 60 second timeout
        resp = await client.post(  # Make POST request
            "https://openrouter.ai/api/v1/chat/completions",  # Same API endpoint
            headers={  # Request headers
                "Authorization": f"Bearer {settings.LLM_KEY}",  # API key from settings
                "Content-Type": "application/json",  # JSON content type
            },
            json={  # Request body
                "model": settings.LLM_MODEL,  # Model name from settings (more flexible)
                "messages": [  # Messages array
                    {"role": "system", "content": "You are a helpful assistant that summarizes books."},  # System message to set AI behavior
                    {"role": "user", "content": prompt},  # User prompt (can be more customized)
                ],
            },
        )
        # resp.raise_for_status()  # Commented out - would raise HTTPError for bad responses
        # Extract AI response from JSON and return
        return resp.json()["choices"][0]["message"]["content"]