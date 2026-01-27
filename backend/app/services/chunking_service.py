# app/services/chunking_service.py - IMPROVED
from typing import List, Dict, Any
import re

class ChunkingService:
    def __init__(self):
        print("[Chunking] Service initialized with Q&A optimized chunking")
    
    def chunk_for_qa(self, content: str, max_chunk_size: int = 200) -> List[Dict]:
        """
        Create chunks optimized for Q&A
        - Small chunks for precise answers
        - Split by questions/answers pattern
        """
        if not content:
            return []
        
        # Clean content
        content = re.sub(r'\s+', ' ', content).strip()
        
        # Try to split by question patterns
        chunks = []
        
        # Pattern for Q&A format: "What is...? Answer"
        pattern = r'([^.?]+[.?])\s*([^.?]+[.?])?'
        
        # First try to split by lines
        lines = content.split('\n')
        if len(lines) > 1:
            for line in lines:
                line = line.strip()
                if line:
                    # Try to split question and answer
                    qa_parts = self._split_question_answer(line)
                    for part in qa_parts:
                        if part and len(part) > 10:  # Minimum length
                            chunks.append({
                                'text': part,
                                'metadata': {'type': 'qa_line'}
                            })
        
        # If no lines or still need chunking
        if not chunks:
            # Split by sentences
            sentences = re.split(r'(?<=[.!?])\s+', content)
            current_chunk = []
            current_length = 0
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                sentence_length = len(sentence.split())
                
                if current_length + sentence_length > max_chunk_size and current_chunk:
                    # Save current chunk
                    chunk_text = ' '.join(current_chunk)
                    chunks.append({
                        'text': chunk_text,
                        'metadata': {'type': 'sentence_chunk'}
                    })
                    
                    current_chunk = [sentence]
                    current_length = sentence_length
                else:
                    current_chunk.append(sentence)
                    current_length += sentence_length
            
            # Add last chunk
            if current_chunk:
                chunk_text = ' '.join(current_chunk)
                chunks.append({
                    'text': chunk_text,
                    'metadata': {'type': 'sentence_chunk'}
                })
        
        print(f"[Chunking] Created {len(chunks)} chunks for Q&A")
        return chunks
    
    def _split_question_answer(self, text: str) -> List[str]:
        """Split Q&A text into question and answer"""
        parts = []
        
        # Pattern for "Question? Answer" format
        qa_match = re.match(r'(.+\?)\s*(.+)', text)
        if qa_match:
            question = qa_match.group(1).strip()
            answer = qa_match.group(2).strip()
            
            # Add question and answer as separate chunks
            parts.append(f"{question}")
            parts.append(f"Answer: {answer}")
        else:
            # Keep as is
            parts.append(text)
        
        return parts
    
    def chunk_document(self, content: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Main chunking method"""
        chunks_data = self.chunk_for_qa(content)
        
        result = []
        for i, chunk in enumerate(chunks_data):
            chunk_metadata = metadata.copy()
            chunk_metadata.update({
                "chunk_index": i,
                "chunk_count": len(chunks_data),
                "char_length": len(chunk['text']),
                "word_count": len(chunk['text'].split()),
                "chunk_type": chunk['metadata'].get('type', 'general')
            })
            
            result.append({
                "text": chunk['text'],
                "metadata": chunk_metadata
            })
        
        return result

chunking_service = ChunkingService()