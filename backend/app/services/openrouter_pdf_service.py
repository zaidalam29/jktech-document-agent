import os
import httpx
import base64
from typing import Tuple, Optional, Dict
from dotenv import load_dotenv

load_dotenv()

class OpenRouterPDFService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv("OPENROUTER_BASE_URL")
        self.frontend_url = os.getenv("FRONTEND_URL")
        self.ai_model = os.getenv("AI_MODEL")
        
        if not self.api_key:
            print("[PDF] OPENROUTER_API_KEY not found. Using basic PDF extraction.")
            self.use_openrouter = False
        else:
            self.use_openrouter = True
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": {self.frontend_url},
                "X-Title": "Book Management System"
            }
    
    def extract_text(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """
        Extract text from PDF using OpenRouter vision models
        or fallback to local extraction
        """
        if not os.path.exists(pdf_path):
            print(f"[PDF] File not found: {pdf_path}")
            return None, None
        
        filename = os.path.basename(pdf_path)
        print(f"[PDF] Processing: {filename}")
        
        # Try OpenRouter vision model first
        if self.use_openrouter:
            text = self._extract_with_openrouter(pdf_path)
            if text and len(text.strip()) > 100:
                # Estimate pages based on file size
                file_size = os.path.getsize(pdf_path)
                pages = max(1, file_size // 50000)
                print(f"[PDF] OpenRouter extraction successful: {len(text)} chars")
                return text, pages
        
        # Fallback to local extraction
        return self._extract_locally(pdf_path)
    
    def _extract_with_openrouter(self, pdf_path: str) -> Optional[str]:
        """Extract text using OpenRouter vision model"""
        try:
            # Convert PDF to base64
            with open(pdf_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # For now, we'll use text models. For vision, you might need OCR.
            # OpenRouter doesn't directly process PDFs, so we need alternative
            
            # Instead, let's use LLM to summarize/process extracted text
            # First extract using local method
            text, _ = self._extract_locally(pdf_path)
            
            if not text or "placeholder" in text.lower():
                return None
            
            # Use LLM to clean and structure the extracted text
            return self._clean_with_llm(text)
            
        except Exception as e:
            print(f"[PDF] OpenRouter extraction error: {e}")
            return None
    
    def _extract_locally(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """Extract text using local libraries"""
        try:
            # Try PyMuPDF first
            import fitz
            
            text = ""
            doc = fitz.open(pdf_path)
            pages = len(doc)
            
            for page_num in range(pages):
                page = doc[page_num]
                page_text = page.get_text()
                
                if not page_text or len(page_text.strip()) < 10:
                    # Try alternative extraction
                    text_dict = page.get_text("dict")
                    blocks_text = ""
                    for block in text_dict.get("blocks", []):
                        if "lines" in block:
                            for line in block["lines"]:
                                for span in line.get("spans", []):
                                    blocks_text += span.get("text", "") + " "
                    page_text = blocks_text
                
                if page_text:
                    text += page_text + "\n\n"
            
            doc.close()
            
            if text:
                text = self._clean_text(text)
                print(f"[PDF] Local extraction: {pages} pages, {len(text)} chars")
                return text, pages
            else:
                return self._create_fallback_text(pdf_path), 1
                
        except ImportError:
            print("[PDF] PyMuPDF not installed")
            return self._create_fallback_text(pdf_path), 1
        except Exception as e:
            print(f"[PDF] Local extraction error: {e}")
            return self._create_fallback_text(pdf_path), 1
    
    def _clean_with_llm(self, text: str) -> str:
        """Clean extracted text using LLM"""
        try:
            # Truncate if too long
            if len(text) > 4000:
                text = text[:4000] + "... [truncated]"
            
            prompt = f"""Please clean and structure the following extracted PDF text. 
            Remove any garbage characters, fix formatting issues, and make it readable.
            
            Extracted text:
            {text}
            
            Cleaned text:"""
            
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json={
                    "model": {self.ai_model},
                    "messages": [
                        {"role": "system", "content": "You are a text cleaning assistant. Clean and structure the provided text."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"]
            else:
                return text
                
        except Exception as e:
            print(f"[PDF] LLM cleaning error: {e}")
            return text
    
    def _clean_text(self, text: str) -> str:
        """Basic text cleaning"""
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common PDF issues
        text = text.replace('-\n', '')
        text = text.replace('\n', ' ')
        
        return text.strip()
    
    def _create_fallback_text(self, pdf_path: str) -> str:
        """Create fallback text"""
        filename = os.path.basename(pdf_path)
        return f"PDF Document: {filename}\n\nPlease install PyMuPDF for proper text extraction: pip install PyMuPDF"

# Singleton instance
openrouter_pdf_service = OpenRouterPDFService()