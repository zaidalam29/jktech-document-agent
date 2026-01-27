import os
from typing import Optional, Tuple, Dict
import re
from datetime import datetime

class PDFService:
    def __init__(self):
        self.extraction_methods = ['pymupdf', 'pdfplumber', 'pypdf2']
        self._check_dependencies()
    
    def _check_dependencies(self):
        """Check which PDF libraries are available"""
        self.available_methods = []
        
        # Check PyMuPDF
        try:
            import fitz
            self.available_methods.append('pymupdf')
            print("[PDF] PyMuPDF available")
        except ImportError:
            print("[PDF] PyMuPDF not installed")
        
        # Check pdfplumber
        try:
            import pdfplumber
            self.available_methods.append('pdfplumber')
            print("[PDF] pdfplumber available")
        except ImportError:
            print("[PDF] pdfplumber not installed")
        
        # Check PyPDF2
        try:
            import PyPDF2
            self.available_methods.append('pypdf2')
            print("[PDF] PyPDF2 available")
        except ImportError:
            print("[PDF] PyPDF2 not installed")
        
        print(f"[PDF] Available extraction methods: {self.available_methods}")
    
    def extract_text(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """
        Extract text from PDF using best available method
        """
        if not os.path.exists(pdf_path):
            print(f"[PDF] File not found: {pdf_path}")
            return None, None
        
        print(f"[PDF] Extracting text from: {os.path.basename(pdf_path)}")
        
        # Try different methods in order of preference
        text, pages = None, None
        
        # Method 1: PyMuPDF (best for most PDFs)
        if 'pymupdf' in self.available_methods:
            text, pages = self._extract_with_pymupdf(pdf_path)
            if text and len(text.strip()) > 100:  # Good extraction
                return text, pages
        
        # Method 2: pdfplumber
        if not text and 'pdfplumber' in self.available_methods:
            text, pages = self._extract_with_pdfplumber(pdf_path)
        
        # Method 3: PyPDF2
        if not text and 'pypdf2' in self.available_methods:
            text, pages = self._extract_with_pypdf2(pdf_path)
        
        # Fallback: Return metadata if no text extracted
        if not text:
            text = self._create_fallback_text(pdf_path)
            pages = 1
        
        # Clean the extracted text
        if text:
            text = self._clean_text(text)
        
        return text, pages
    
    def _extract_with_pymupdf(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """Extract using PyMuPDF (fitz) - Best method"""
        try:
            import fitz
            
            text = ""
            doc = fitz.open(pdf_path)
            pages = len(doc)
            
            for page_num in range(pages):
                page = doc[page_num]
                
                # Try different text extraction methods
                page_text = page.get_text()
                
                # If standard method fails, try alternative
                if not page_text or len(page_text.strip()) < 10:
                    # Get text as dictionary
                    text_dict = page.get_text("dict")
                    
                    # Extract from text blocks
                    blocks_text = ""
                    for block in text_dict.get("blocks", []):
                        if "lines" in block:
                            for line in block["lines"]:
                                for span in line.get("spans", []):
                                    blocks_text += span.get("text", "") + " "
                    
                    page_text = blocks_text
                
                # If still no text, try textpage
                if not page_text or len(page_text.strip()) < 10:
                    textpage = page.get_textpage()
                    page_text = textpage.extractText()
                
                text += page_text + "\n\n"
            
            doc.close()
            
            print(f"[PDF] PyMuPDF extracted {pages} pages, {len(text)} characters")
            return text, pages
            
        except Exception as e:
            print(f"[PDF] PyMuPDF error: {e}")
            return None, None
    
    def _extract_with_pdfplumber(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """Extract using pdfplumber"""
        try:
            import pdfplumber
            
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                pages = len(pdf.pages)
                
                for page in pdf.pages:
                    page_text = page.extract_text()
                    
                    # If standard extraction fails, try alternative
                    if not page_text:
                        # Extract tables
                        tables = page.extract_tables()
                        for table in tables:
                            for row in table:
                                text += " ".join([str(cell) for cell in row if cell]) + "\n"
                        
                        # Extract words
                        words = page.extract_words()
                        if words:
                            text += " ".join([word['text'] for word in words])
                    
                    text += page_text + "\n\n" if page_text else ""
            
            print(f"[PDF] pdfplumber extracted {pages} pages, {len(text)} characters")
            return text, pages
            
        except Exception as e:
            print(f"[PDF] pdfplumber error: {e}")
            return None, None
    
    def _extract_with_pypdf2(self, pdf_path: str) -> Tuple[Optional[str], Optional[int]]:
        """Extract using PyPDF2"""
        try:
            import PyPDF2
            
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                pages = len(pdf_reader.pages)
                
                for page_num in range(pages):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    text += page_text + "\n\n" if page_text else ""
            
            print(f"[PDF] PyPDF2 extracted {pages} pages, {len(text)} characters")
            return text, pages
            
        except Exception as e:
            print(f"[PDF] PyPDF2 error: {e}")
            return None, None
    
    def _create_fallback_text(self, pdf_path: str) -> str:
        """Create fallback text when extraction fails"""
        filename = os.path.basename(pdf_path)
        file_size = os.path.getsize(pdf_path)
        
        text = f"""PDF Document: {filename}

IMPORTANT: PDF text extraction failed or returned insufficient text.

File Information:
- Filename: {filename}
- Size: {file_size:,} bytes
- Last modified: {datetime.fromtimestamp(os.path.getmtime(pdf_path)).isoformat()}

Possible reasons:
1. PDF is scanned/image-based (requires OCR)
2. PDF is encrypted/protected
3. PDF extraction libraries not properly installed

To fix this:
1. Install required libraries: pip install PyMuPDF pdfplumber PyPDF2
2. For scanned PDFs, use OCR software
3. Convert PDF to text format manually

Content placeholder: This document discusses various topics. Please ensure proper PDF extraction for accurate Q&A.
"""
        return text
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace and line breaks
        text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces
        text = re.sub(r'\n+', '\n', text)  # Replace multiple newlines
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:\-()\[\]{}"\']', ' ', text)
        
        # Fix hyphenated words
        text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
        
        return text.strip()
    
    def extract_metadata(self, pdf_path: str) -> Dict:
        """Extract PDF metadata"""
        try:
            import fitz
            
            metadata = {
                "filename": os.path.basename(pdf_path),
                "size_bytes": os.path.getsize(pdf_path),
                "modified_at": datetime.fromtimestamp(os.path.getmtime(pdf_path)).isoformat(),
                "file_type": "pdf"
            }
            
            # Try to get PDF-specific metadata
            try:
                doc = fitz.open(pdf_path)
                pdf_metadata = doc.metadata
                doc.close()
                
                metadata.update({
                    "title": pdf_metadata.get('title', ''),
                    "author": pdf_metadata.get('author', ''),
                    "subject": pdf_metadata.get('subject', ''),
                    "keywords": pdf_metadata.get('keywords', ''),
                    "creator": pdf_metadata.get('creator', ''),
                    "producer": pdf_metadata.get('producer', ''),
                    "creation_date": pdf_metadata.get('creationDate', ''),
                    "modification_date": pdf_metadata.get('modDate', '')
                })
            except:
                pass
            
            return metadata
            
        except Exception as e:
            print(f"[PDF] Metadata extraction error: {e}")
            return {
                "filename": os.path.basename(pdf_path),
                "size_bytes": os.path.getsize(pdf_path),
                "file_type": "pdf"
            }
    
    def is_scanned_pdf(self, pdf_path: str) -> bool:
        """Check if PDF is scanned/image-based"""
        try:
            import fitz
            
            doc = fitz.open(pdf_path)
            page = doc[0]
            
            # Get text
            text = page.get_text()
            
            # If little or no text, likely scanned
            if not text or len(text.strip()) < 50:
                # Check for images
                image_list = page.get_images()
                if image_list:
                    return True
            
            doc.close()
            return False
            
        except:
            return False

# Singleton instance
pdf_service = PDFService()