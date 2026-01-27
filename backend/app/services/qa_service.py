import asyncio
from typing import List, Dict, Any, Optional
import numpy as np
from datetime import datetime

from app.services.rag_service import rag_pipeline
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service

class QAService:
    def __init__(self):
        print("[QAService] Initialized with LLM integration")
    
    async def ask_question(self, question: str, document_ids: Optional[List[int]] = None, require_single_document: bool = False) -> Dict[str, Any]:
        """
        Main Q&A method with LLM integration
        """
        print(f"[QAService] Processing question: {question}")
        
        # Create question embedding
        question_embedding = embedding_service.embed_text(question)
        print(f"[QAService] Created embedding of dimension: {len(question_embedding)}")
        
        # FIX: Use search_documents instead of search
        results = rag_pipeline.search_documents(
            query_embedding=question_embedding,
            document_ids=document_ids,
            top_k=10
        )
        
        if not results:
            print(f"[QAService] No results found for question")
            return {
                "question": question,
                "answer": "I couldn't find any relevant information in the documents to answer this question.",
                "found": False,
                "total_chunks_found": 0,
                "source_documents": []
            }
        
        print(f"[QAService] Found {len(results)} relevant chunks")
        
        # Prepare context for LLM
        context_chunks = []
        source_documents = []
        
        for result in results:
            context_chunks.append(result['content'])
            
            source_doc = {
                "document_id": result['document_id'],
                "content": result['content'][:200] + "..." if len(result['content']) > 200 else result['content'],
                "similarity_score": float(result['similarity']),
                "chunk_id": result.get('chunk_id', 'unknown'),
                "metadata": result.get('metadata', {})
            }
            source_documents.append(source_doc)
        
        # Combine context
        context = "\n\n".join(context_chunks[:5])  # Use top 5 chunks
        
        # Generate answer using LLM
        print(f"[QAService] Generating answer with LLM...")
        answer = await llm_service.generate_with_context(context, question)
        
        return {
            "question": question,
            "answer": answer,
            "found": True,
            "total_chunks_found": len(results),
            "source_documents": source_documents,
            "context_preview": context[:500] + "..." if len(context) > 500 else context
        }
    
    async def ask_document_specific(self, question: str, document_id: int) -> Dict[str, Any]:
        """
        Ask question specifically to one document
        """
        print(f"[QAService] Document-specific question for doc {document_id}: {question}")
        
        # Create question embedding
        question_embedding = embedding_service.embed_text(question)
        
        # FIX: Use search_documents instead of search
        results = rag_pipeline.search_documents(
            query_embedding=question_embedding,
            document_ids=[document_id],
            top_k=5
        )
        
        if not results:
            print(f"[QAService] No results found in document {document_id}")
            return {
                "question": question,
                "answer": "I couldn't find relevant information in this specific document to answer your question.",
                "found": False,
                "source_document": {
                    "document_id": document_id,
                    "available_chunks": len(rag_pipeline.embeddings.get(document_id, [])),
                    "chunks_searched": 0
                }
            }
        
        print(f"[QAService] Found {len(results)} chunks in document {document_id}")
        
        # Prepare context
        context_chunks = []
        total_similarity = 0
        
        for result in results:
            context_chunks.append(result['content'])
            total_similarity += result['similarity']
        
        context = "\n\n".join(context_chunks)
        avg_similarity = total_similarity / len(results) if results else 0
        
        # Generate answer
        answer = await llm_service.generate_with_context(context, question)
        
        # Get document metadata
        metadata = rag_pipeline.metadata.get(document_id, {})
        
        return {
            "question": question,
            "answer": answer,
            "found": True,
            "source_document": {
                "document_id": document_id,
                "filename": metadata.get("filename", f"Document {document_id}"),
                "avg_similarity": avg_similarity,
                "chunks_found": len(results),
                "total_chunks": len(rag_pipeline.embeddings.get(document_id, [])),
                "metadata": metadata
            }
        }
    
    async def summarize_document(self, document_id: int) -> str:
        """
        Generate document summary using LLM
        """
        if document_id not in rag_pipeline.embeddings:
            return "Document not found in RAG system."
        
        chunks = rag_pipeline.embeddings[document_id]
        
        if not chunks:
            return "No content available for summarization."
        
        # Combine first 10 chunks for summary
        combined_text = "\n\n".join([chunk.get('content', '') for chunk in chunks[:10]])
        
        # Generate summary
        summary = await llm_service.summarize_text(combined_text, max_length=150)
        
        return summary
    
    async def chat_conversation(self, messages: List[Dict], context_documents: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Chat conversation with document context
        """
        if not messages:
            return {
                "response": "Please provide a message to start the conversation.",
                "sources": []
            }
        
        last_message = messages[-1]['content']
        
        # Search for relevant context
        query_embedding = embedding_service.embed_text(last_message)
        results = rag_pipeline.search_documents(
            query_embedding=query_embedding,
            document_ids=context_documents,
            top_k=5
        )
        
        # Prepare context if found
        context = ""
        sources = []
        
        if results:
            context_chunks = []
            for result in results:
                context_chunks.append(result['content'])
                sources.append({
                    "document_id": result['document_id'],
                    "content_preview": result['content'][:150],
                    "similarity": float(result['similarity'])
                })
            
            context = "\n\n".join(context_chunks)
        
        # Prepare conversation history
        conversation_history = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages[:-1]])
        
        # Create prompt
        if context:
            prompt = f"""Conversation History:
{conversation_history}

Relevant Document Context:
{context}

User's latest message: {last_message}

Based on the conversation history AND the document context above, provide a helpful response.

Assistant:"""
        else:
            prompt = f"""Conversation History:
{conversation_history}

User's latest message: {last_message}

Provide a helpful response.

Assistant:"""
        
        # Generate response
        response = await llm_service.generate_response(prompt, temperature=0.7, max_tokens=500)
        
        return {
            "response": response,
            "sources": sources,
            "has_context": bool(context)
        }

# Singleton instance
qa_service = QAService()