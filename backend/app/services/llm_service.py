import os
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

class OpenRouterLLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_BASE_URL")
        self.model = os.getenv("AI_MODEL")
        self.frontend_url = os.getenv("FRONTEND_URL")
        
        if not self.api_key:
            print("[LLM] OPENROUTER_API_KEY not found. Using dummy responses.")
            self.use_real_llm = False
        else:
            self.use_real_llm = True
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": {self.frontend_url},
                "X-Title": "Book Management System"
            }
    
    async def generate_response(self, prompt: str, **kwargs) -> str:
        """Generate response from LLM"""
        if not self.use_real_llm:
            return self._dummy_response(prompt)
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json={
                        "model": kwargs.get("model", self.model),
                        "messages": [
                            {"role": "system", "content": "You are a helpful AI assistant."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": kwargs.get("temperature", 0.7),
                        "max_tokens": kwargs.get("max_tokens", 1000),
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    print(f"[LLM] API error {response.status_code}: {response.text}")
                    return f"[API Error {response.status_code}]"
                    
        except Exception as e:
            print(f"[LLM] Error: {e}")
            return f"[Error generating response]"
    
    async def generate_with_context(self, context: str, question: str) -> str:
        """Generate answer based on provided context"""
        prompt = self._create_rag_prompt(context, question)
        return await self.generate_response(prompt, temperature=0.3, max_tokens=500)
    
    def _create_rag_prompt(self, context: str, question: str) -> str:
        """Create RAG prompt"""
        return f"""Based on the following context, answer the question accurately.

CONTEXT:
{context}

QUESTION: {question}

INSTRUCTIONS:
1. Answer STRICTLY based on the context provided
2. If context doesn't have enough information, say "I cannot answer based on the provided context"
3. Be precise and concise
4. Do not make up information
5. If context is unclear, say so

ANSWER:"""
    
    async def process_pdf_content(self, pdf_content: str) -> Dict[str, Any]:
        """Process PDF content using LLM"""
        prompt = f"""Analyze this PDF content and provide:
        1. Main topic/subject
        2. Key points
        3. Summary
        4. Important facts
        
        PDF Content:
        {pdf_content[:3000]}
        
        Analysis:"""
        
        response = await self.generate_response(prompt)
        return {"analysis": response, "content_preview": pdf_content[:500]}
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract entities from text"""
        prompt = f"""Extract the following from the text:
        1. Names of people
        2. Dates
        3. Important places
        4. Key concepts/terms
        
        Text:
        {text[:2000]}
        
        Provide in JSON format:"""
        
        response = await self.generate_response(prompt, temperature=0.1)
        try:
            import json
            return json.loads(response)
        except:
            return {"entities": response}
    
    def _dummy_response(self, prompt: str) -> str:
        """Dummy response for development"""
        return """This is a dummy response. To enable real AI responses:

1. Get API key from https://openrouter.ai
2. Add to .env: OPENROUTER_API_KEY=your_key_here
3. Restart server

The system will then use Llama 3 via OpenRouter for:
- PDF text processing
- Embedding generation
- Q&A responses
- Document summarization

Example response based on typical content: The document discusses important topics with relevant information that can be queried."""
    
    async def summarize_document(self, content: str, max_length: int = 200) -> str:
        """Summarize document"""
        prompt = f"Summarize this document in about {max_length} words:\n\n{content[:3000]}"
        return await self.generate_response(prompt, temperature=0.3, max_tokens=300)

# Singleton instance
llm_service = OpenRouterLLMService()