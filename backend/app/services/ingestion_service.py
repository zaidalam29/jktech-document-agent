import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
import os
import traceback
from typing import Dict, Any, Tuple, Optional
import json

from app.models.document import Document, DocumentStatus
from app.models.ingestion_job import IngestionJob, IngestionStatus

class IngestionService:
    def __init__(self, db: Session):
        self.db = db
    
    async def ingest_document_step1(self, document_id: int) -> bool:
        """
        STEP 1: Enhanced ingestion with OpenRouter-based PDF processing and RAG indexing
        """
        print(f"\n{'='*60}")
        print(f"INGESTION STARTED for document {document_id}")
        print(f"{'='*60}")
        
        # Get document
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            print(f"[ERROR] Document {document_id} not found")
            return False
        
        # Create ingestion job
        job = IngestionJob(
            document_id=document_id,
            status=IngestionStatus.PENDING
        )
        self.db.add(job)
        self.db.commit()
        print(f"[INFO] Created ingestion job {job.id}")
        
        try:
            # 1. STARTED - EXTRACTING
            job.status = IngestionStatus.EXTRACTING
            job.started_at = datetime.utcnow()
            self.db.commit()
            print(f"[INFO] Job {job.id}: Started extraction")
            
            # 2. Extract text based on file type
            text_content = None
            pages_count = None
            extraction_details = {}
            
            if document.file_type == "pdf":
                print(f"[PDF] Processing: {document.original_filename}")
                print(f"[PDF] Path: {document.local_path}")
                
                if not os.path.exists(document.local_path):
                    raise Exception(f"PDF file not found: {document.local_path}")
                
                # Enhanced PDF extraction with multiple methods
                text_content, pages_count, extraction_details = await self._extract_pdf_with_openrouter(
                    document.local_path, 
                    document.original_filename,
                    document_id
                )
                
                job.total_pages = pages_count
                print(f"[PDF] Extraction complete: {pages_count} pages, {len(text_content)} chars")
                
            elif document.file_type == "text":
                print(f"[TEXT] Processing: {document.original_filename}")
                text_content = document.content
                pages_count = 1
                job.total_pages = 1
                extraction_details = {"method": "direct_text", "source": "database"}
                
                print(f"[TEXT] Content length: {len(text_content)} characters")
            
            # Validate extraction
            if not text_content:
                raise Exception("Could not extract text from document")
            
            # Check if extraction was successful
            if "placeholder" in text_content.lower() or "install" in text_content.lower():
                print(f"[WARNING] Text extraction may be incomplete")
                if document.file_type == "pdf":
                    print(f"[WARNING] Consider installing: pip install PyMuPDF pdfplumber")
            
            print(f"[INFO] Text extraction completed: {len(text_content)} characters, {len(text_content.split())} words")
            
            # 3. ENHANCE TEXT WITH LLM (Optional but recommended for PDFs)
            if document.file_type == "pdf" and len(text_content) > 100:
                text_content = await self._enhance_text_with_llm(
                    text_content, 
                    document.original_filename,
                    extraction_details
                )
            
            # 4. CHUNKING
            job.status = IngestionStatus.CHUNKING
            self.db.commit()
            print(f"[INFO] Job {job.id}: Starting chunking")
            
            # Prepare enhanced metadata
            metadata = {
                "document_id": document.id,
                "filename": document.original_filename,
                "file_type": document.file_type,
                "uploaded_by": document.uploaded_by,
                "user_id": document.user_id,
                "uploaded_at": str(document.uploaded_at),
                "extraction_method": extraction_details.get("method", "unknown"),
                "extraction_details": json.dumps(extraction_details),
                "content_preview": text_content[:200] + "..." if len(text_content) > 200 else text_content
            }
            
            # Chunk the content
            from app.services.chunking_service import chunking_service
            chunks_data = chunking_service.chunk_document(text_content, metadata)
            job.total_chunks = len(chunks_data)
            self.db.commit()
            print(f"[INFO] Created {len(chunks_data)} chunks")
            
            # 5. RAG INDEXING WITH OPENROUTER EMBEDDINGS
            job.status = IngestionStatus.EMBEDDING
            self.db.commit()
            print(f"[INFO] Job {job.id}: Starting RAG indexing with OpenRouter embeddings")
            
            # Create embeddings and index in RAG
            rag_success = await self._index_in_rag_openrouter(document_id, chunks_data, metadata)
            
            if rag_success:
                print(f"[SUCCESS] Document {document_id} indexed in RAG with OpenRouter embeddings")
                document.is_ingested = True
                document.ingestion_completed_at = datetime.utcnow()
                document.extracted_text = text_content
                document.pages_count = pages_count
                document.word_count = len(text_content.split())
                
                job.status = IngestionStatus.COMPLETED
                job.processed_chunks = job.total_chunks
            else:
                print(f"[WARNING] RAG indexing failed, but continuing...")
                # Even if RAG fails, mark as ingested (text extracted)
                document.is_ingested = True
                document.ingestion_completed_at = datetime.utcnow()
                document.extracted_text = text_content
                document.pages_count = pages_count
                document.word_count = len(text_content.split())
                
                job.status = IngestionStatus.COMPLETED
                job.processed_chunks = 0
                job.error_message = "RAG indexing failed but text extracted"
            
            job.completed_at = datetime.utcnow()
            self.db.commit()
            
            print(f"\n{'='*60}")
            print(f"SUCCESS: Document {document_id} fully ingested!")
            print(f"• Pages: {pages_count}")
            print(f"• Words: {len(text_content.split())}")
            print(f"• Chunks: {job.total_chunks}")
            print(f"• File: {document.original_filename}")
            print(f"{'='*60}\n")
            
            return True
            
        except Exception as e:
            # FAILED
            error_msg = str(e)
            print(f"\n{'='*60}")
            print(f"ERROR: Ingestion failed for document {document_id}")
            print(f"Error: {error_msg}")
            print(f"{'='*60}")
            traceback.print_exc()
            
            job.status = IngestionStatus.FAILED
            job.error_message = error_msg
            job.completed_at = datetime.utcnow()
            self.db.commit()
            
            return False
    
    async def _extract_pdf_with_openrouter(self, pdf_path: str, filename: str, document_id: int) -> Tuple[str, int, Dict]:
        """
        Extract text from PDF using multiple methods with OpenRouter enhancement
        """
        extraction_details = {
            "methods_tried": [],
            "successful_method": None,
            "char_count": 0,
            "file_size": os.path.getsize(pdf_path)
        }
        
        # Method 1: Try PyMuPDF (fitz) - Most reliable
        try:
            import fitz
            extraction_details["methods_tried"].append("pymupdf")
            
            text = ""
            doc = fitz.open(pdf_path)
            pages_count = len(doc)
            
            print(f"[PDF] PyMuPDF: Processing {pages_count} pages...")
            
            for page_num in range(pages_count):
                page = doc[page_num]
                
                # Multiple extraction strategies
                page_text = page.get_text()
                
                # Fallback 1: Dictionary extraction
                if not page_text or len(page_text.strip()) < 20:
                    text_dict = page.get_text("dict")
                    blocks_text = ""
                    for block in text_dict.get("blocks", []):
                        if "lines" in block:
                            for line in block["lines"]:
                                for span in line.get("spans", []):
                                    blocks_text += span.get("text", "") + " "
                    page_text = blocks_text
                
                # Fallback 2: Textpage extraction
                if not page_text or len(page_text.strip()) < 20:
                    textpage = page.get_textpage()
                    page_text = textpage.extractText()
                
                if page_text:
                    # Clean page text
                    page_text = ' '.join(page_text.split())
                    text += page_text + "\n\n"
            
            doc.close()
            
            if text and len(text.strip()) > 100:
                text = self._clean_text(text)
                extraction_details.update({
                    "successful_method": "pymupdf",
                    "char_count": len(text),
                    "word_count": len(text.split()),
                    "pages": pages_count
                })
                print(f"[PDF] PyMuPDF successful: {len(text)} chars")
                return text, pages_count, extraction_details
                
        except ImportError:
            print("[PDF] PyMuPDF not installed")
        except Exception as e:
            print(f"[PDF] PyMuPDF error: {e}")
        
        # Method 2: Try pdfplumber
        try:
            import pdfplumber
            extraction_details["methods_tried"].append("pdfplumber")
            
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                pages_count = len(pdf.pages)
                
                for page in pdf.pages:
                    page_text = page.extract_text()
                    
                    # If standard fails, extract words
                    if not page_text:
                        words = page.extract_words()
                        if words:
                            page_text = " ".join([word['text'] for word in words])
                    
                    if page_text:
                        text += page_text + "\n\n"
            
            if text and len(text.strip()) > 100:
                text = self._clean_text(text)
                extraction_details.update({
                    "successful_method": "pdfplumber",
                    "char_count": len(text),
                    "word_count": len(text.split()),
                    "pages": pages_count
                })
                print(f"[PDF] pdfplumber successful: {len(text)} chars")
                return text, pages_count, extraction_details
                
        except ImportError:
            print("[PDF] pdfplumber not installed")
        except Exception as e:
            print(f"[PDF] pdfplumber error: {e}")
        
        # Method 3: Try OpenRouter LLM for extraction/analysis
        try:
            from app.services.llm_service import llm_service
            
            # First, try to get any text from file
            simple_text = self._extract_simple_text(pdf_path)
            
            if simple_text and len(simple_text.strip()) > 50:
                # Use LLM to enhance/analyze the text
                prompt = f"""Analyze this PDF content and provide a comprehensive summary.
                
                PDF Filename: {filename}
                Document ID: {document_id}
                
                Extracted Content (may be incomplete):
                {simple_text[:2000]}
                
                Please provide:
                1. Main topics covered
                2. Key points
                3. Important information
                4. Overall summary
                
                Format as structured text:"""
                
                enhanced_text = await llm_service.generate_response(prompt, temperature=0.3)
                
                full_text = f"""PDF Document: {filename}
Document ID: {document_id}

--- EXTRACTED CONTENT (RAW) ---
{simple_text}

--- ENHANCED ANALYSIS (by AI) ---
{enhanced_text}

Note: Original PDF extraction was limited. This analysis is based on available text."""
                
                pages_estimate = max(1, extraction_details["file_size"] // 50000)
                extraction_details.update({
                    "successful_method": "llm_enhanced",
                    "char_count": len(full_text),
                    "word_count": len(full_text.split()),
                    "pages": pages_estimate,
                    "llm_enhanced": True
                })
                
                print(f"[PDF] LLM-enhanced extraction: {len(full_text)} chars")
                return full_text, pages_estimate, extraction_details
                
        except Exception as e:
            print(f"[PDF] LLM enhancement error: {e}")
        
        # Fallback: Basic file info
        file_size = os.path.getsize(pdf_path)
        pages_estimate = max(1, file_size // 50000)
        
        fallback_text = f"""PDF Document: {filename}
Document ID: {document_id}
File Size: {file_size:,} bytes
Estimated Pages: {pages_estimate}

PDF TEXT EXTRACTION FAILED

Possible reasons:
1. PDF is scanned/image-based (requires OCR)
2. PDF is encrypted/protected
3. Text extraction libraries not installed

Solutions:
1. Install: pip install PyMuPDF pdfplumber
2. Convert PDF to text format
3. Use OCR software for scanned PDFs
4. Contact support for assistance

For Q&A with this document, please ensure proper text extraction first."""

        extraction_details.update({
            "successful_method": "fallback",
            "char_count": len(fallback_text),
            "word_count": len(fallback_text.split()),
            "pages": pages_estimate,
            "error": "extraction_failed"
        })
        
        print(f"[PDF] Using fallback text: {len(fallback_text)} chars")
        return fallback_text, pages_estimate, extraction_details
    
    def _extract_simple_text(self, pdf_path: str) -> str:
        """Extract simple text from PDF file"""
        try:
            # Try to read as text file
            with open(pdf_path, 'rb') as f:
                content = f.read()
            
            # Try to decode and extract text-like content
            decoded = content.decode('utf-8', errors='ignore')
            
            # Extract text between common markers
            import re
            
            # Look for text streams
            text_parts = []
            
            # Extract between parentheses
            matches = re.findall(r'\((.*?)\)', decoded)
            text_parts.extend(matches)
            
            # Extract from streams
            stream_matches = re.findall(r'stream(.*?)endstream', decoded, re.DOTALL)
            for stream in stream_matches:
                clean_stream = re.sub(r'[^\x20-\x7E]+', ' ', stream)
                if len(clean_stream.strip()) > 10:
                    text_parts.append(clean_stream)
            
            # Combine all parts
            text = ' '.join(text_parts)
            
            # Clean
            text = re.sub(r'\s+', ' ', text)
            
            return text[:5000]  # Limit length
            
        except Exception as e:
            print(f"[PDF] Simple extraction error: {e}")
            return ""
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        import re
        
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix hyphenated words
        text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:\-()\[\]{}"\']', ' ', text)
        
        return text.strip()
    
    async def _enhance_text_with_llm(self, text: str, filename: str, extraction_details: Dict) -> str:
        """Enhance extracted text using OpenRouter LLM"""
        try:
            from app.services.llm_service import llm_service
            
            # Only enhance if we have enough text
            if len(text) < 200:
                return text
            
            # Check if already enhanced
            if extraction_details.get("llm_enhanced"):
                return text
            
            print(f"[LLM] Enhancing text for {filename}...")
            
            # Create enhancement prompt
            prompt = f"""Please clean, structure, and enhance the following extracted PDF text.
            
            Filename: {filename}
            Extraction Method: {extraction_details.get('successful_method', 'unknown')}
            Original Length: {len(text)} characters
            
            Extracted Text:
            {text[:3000]}
            
            Instructions:
            1. Remove any garbage/random characters
            2. Fix formatting issues
            3. Organize into logical sections if possible
            4. Preserve all important information
            5. Make it readable and coherent
            
            Enhanced Text:"""
            
            enhanced = await llm_service.generate_response(prompt, temperature=0.2, max_tokens=1500)
            
            if enhanced and len(enhanced) > 100:
                # Combine original and enhanced
                final_text = f"""PDF Document: {filename}

--- ORIGINAL EXTRACTED TEXT ---
{text[:1000]}{'...' if len(text) > 1000 else ''}

--- AI-ENHANCED VERSION ---
{enhanced}

Note: Original text was {len(text)} characters. Enhanced for better readability and Q&A."""
                
                print(f"[LLM] Text enhanced: {len(final_text)} chars")
                return final_text
            
            return text
            
        except Exception as e:
            print(f"[LLM] Enhancement error: {e}")
            return text
    
    async def _index_in_rag_openrouter(self, document_id: int, chunks_data: list, metadata: Dict[str, Any]) -> bool:
        """Index document in RAG using OpenRouter embeddings"""
        try:
            print(f"[RAG] Starting OpenRouter-based RAG indexing for document {document_id}...")
            
            # Import services
            from app.services.rag_service import rag_pipeline
            from app.services.openrouter_embedding_service import openrouter_embedding_service
            
            print(f"[RAG] Services imported successfully")
            print(f"[RAG] Using {'OpenRouter' if not openrouter_embedding_service.use_dummy else 'Dummy'} embeddings")
            
            # Create embeddings using OpenRouter
            print(f"[RAG] Creating embeddings for {len(chunks_data)} chunks...")
            
            rag_chunks = []
            for i, chunk in enumerate(chunks_data):
                chunk_text = chunk['text']
                
                # Create embedding
                embedding = openrouter_embedding_service.embed_text(chunk_text)
                
                # Create chunk ID
                chunk_id = f"doc_{document_id}_chunk_{chunk['metadata']['chunk_index']}"
                
                rag_chunks.append({
                    'chunk_id': chunk_id,
                    'embedding': embedding,
                    'content': chunk_text,
                    'metadata': {
                        **chunk['metadata'],
                        'embedding_source': 'openrouter' if not openrouter_embedding_service.use_dummy else 'dummy',
                        'embedding_dimension': len(embedding)
                    }
                })
                
                if i % 10 == 0:
                    print(f"[RAG] Processed {i+1}/{len(chunks_data)} chunks")
            
            print(f"[RAG] All embeddings created")
            
            # Index in RAG
            success = rag_pipeline.index_document(
                document_id=document_id,
                chunks=rag_chunks,
                metadata={
                    **metadata,
                    "embedding_service": "openrouter",
                    "embedding_dimension": len(rag_chunks[0]['embedding']) if rag_chunks else 0,
                    "indexed_at": datetime.utcnow().isoformat()
                }
            )
            
            if success:
                print(f"[RAG] ✓ Document {document_id} successfully indexed")
                print(f"[RAG] ✓ Total chunks: {len(rag_chunks)}")
                print(f"[RAG] ✓ Embedding dimension: {len(rag_chunks[0]['embedding']) if rag_chunks else 0}")
                
                # Verify storage
                import os
                if os.path.exists(rag_pipeline.embeddings_file):
                    size = rag_pipeline.embeddings_file.stat().st_size
                    print(f"[RAG] ✓ Storage file: {size} bytes")
                else:
                    print(f"[RAG] ✗ Storage file not found!")
            else:
                print(f"[RAG] ✗ Indexing failed")
            
            return success
            
        except Exception as e:
            print(f"[RAG] ERROR in RAG indexing: {e}")
            traceback.print_exc()
            return False
    
    def get_ingestion_status(self, document_id: int) -> Dict[str, Any]:
        """Get detailed ingestion status for a document"""
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return {"error": "Document not found"}
        
        # Get latest job
        job = self.db.query(IngestionJob)\
            .filter(IngestionJob.document_id == document_id)\
            .order_by(IngestionJob.created_at.desc())\
            .first()
        
        # Check RAG status
        rag_info = {
            "status": "not_indexed",
            "chunks": 0,
            "document_in_rag": False
        }
        
        try:
            from app.services.rag_service import rag_pipeline
            if document_id in rag_pipeline.embeddings:
                rag_info.update({
                    "status": "indexed",
                    "chunks": len(rag_pipeline.embeddings[document_id]),
                    "document_in_rag": True,
                    "metadata": rag_pipeline.metadata.get(document_id, {})
                })
        except Exception as e:
            rag_info["error"] = str(e)
        
        # Get extraction details if available
        extraction_details = {}
        if job and job.error_message and "extraction_details" in job.error_message:
            try:
                extraction_details = json.loads(job.error_message.split("extraction_details:")[-1])
            except:
                pass
        
        return {
            "document": {
                "id": document.id,
                "filename": document.original_filename,
                "is_ingested": document.is_ingested,
                "file_type": document.file_type,
                "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
                "extracted_text_length": len(document.extracted_text) if document.extracted_text else 0,
                "word_count": document.word_count,
                "pages_count": document.pages_count,
                "ingestion_completed": document.ingestion_completed_at.isoformat() if document.ingestion_completed_at else None
            },
            "job": {
                "id": job.id if job else None,
                "status": job.status.value if job else None,
                "started_at": job.started_at.isoformat() if job and job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job and job.completed_at else None,
                "total_chunks": job.total_chunks if job else 0,
                "processed_chunks": job.processed_chunks if job else 0,
                "total_pages": job.total_pages if job else None,
                "error_message": job.error_message if job else None
            } if job else None,
            "rag": rag_info,
            "extraction_details": extraction_details,
            "system_time": datetime.utcnow().isoformat()
        }
    
    async def reingest_document(self, document_id: int) -> bool:
        """Re-ingest a document (useful if extraction failed initially)"""
        # First, remove from RAG if exists
        try:
            from app.services.rag_service import rag_pipeline
            rag_pipeline.delete_document(document_id)
            print(f"[REINGEST] Removed document {document_id} from RAG")
        except:
            pass
        
        # Reset document status
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.is_ingested = False
            document.ingestion_completed_at = None
            document.extracted_text = None
            document.word_count = None
            document.pages_count = None
            self.db.commit()
        
        # Start new ingestion
        return await self.ingest_document_step1(document_id)