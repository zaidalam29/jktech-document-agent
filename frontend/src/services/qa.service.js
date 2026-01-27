// src/services/qa.service.js
import { getToken } from '../utils/token';
import logger from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class QAService {
  /**
   * Generic API fetch with auth token
   */
  async apiFetch(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const defaultOptions = {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'omit',
    };

    if (options.body) {
      defaultOptions.body = JSON.stringify(options.body);
    }

    try {
      logger.debug('QA API Request:', {
        endpoint,
        method: defaultOptions.method
      });

      const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

      console.log('📡 QA API Response Status:', response.status, 'URL:', endpoint);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType && contentType.includes('text/')) {
        data = await response.text();
      } else {
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }
      }

      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.detail || data?.message || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.data = data;
        error.status = response.status;
        throw error;
      }

      logger.debug('✅ QA API Success:', { endpoint, status: response.status });
      return data;

    } catch (error) {
      logger.error('❌ QA API Fetch Error:', {
        endpoint,
        error: error.message,
        status: error.status
      });

      // Handle specific errors
      if (error.status === 401) {
        error.message = 'Session expired. Please login again.';
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.status === 403) {
        error.message = 'You do not have permission to access this resource.';
      } else if (error.status === 404) {
        error.message = 'Document not found.';
      } else if (error.message.includes('Failed to fetch')) {
        error.message = 'Network error. Please check your internet connection.';
      }

      throw error;
    }
  }

  /**
   * Ask a question to a specific document
   */
  async askDocumentQuestion(documentId, question) {
    try {
      console.log('📝 Asking question:', {
        documentId,
        question,
        endpoint: `/qa/ask/${documentId}`
      });

      const data = await this.apiFetch(`/qa/ask/${documentId}`, {
        method: 'POST',
        body: { question }
      });

      console.log('✅ Question response:', data);

      // Check if document has chunks
      if (data.source_document) {
        console.log('📊 Document chunks info:', {
          documentId: data.source_document.document_id,
          chunksFound: data.source_document.chunks_found,
          totalChunks: data.source_document.total_chunks,
          avgSimilarity: data.source_document.avg_similarity,
          found: data.found
        });
      }

      return data;
    } catch (error) {
      console.error('❌ Error asking question:', error);
      throw error;
    }
  }

  /**
   * Stream answer for better UX (if API supports streaming)
   */
  async streamDocumentQuestion(documentId, question, onChunk) {
    try {
      console.log(`🌊 Streaming answer for document ${documentId}`);

      const response = await fetch(`${API_BASE}/qa/ask/${documentId}`, { // ✅ Correct endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stream response error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream complete');
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value);
        console.log(`📦 Chunk ${chunkCount} (raw):`, chunk);

        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          console.log(`📄 Line: "${line}"`);
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log('🏁 Stream DONE signal received');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              console.log(`🎯 Parsed JSON:`, parsed);
              
              // Try multiple possible fields
              if (parsed.content) {
                fullAnswer += parsed.content;
                console.log(`✍️ Added content: "${parsed.content}"`);
                if (onChunk) onChunk(parsed.content, fullAnswer);
              }
              else if (parsed.answer) {
                fullAnswer += parsed.answer;
                console.log(`✍️ Added answer: "${parsed.answer}"`);
                if (onChunk) onChunk(parsed.answer, fullAnswer);
              }
              else if (parsed.message) {
                fullAnswer += parsed.message;
                console.log(`✍️ Added message: "${parsed.message}"`);
                if (onChunk) onChunk(parsed.message, fullAnswer);
              }
              else if (parsed.text) {
                fullAnswer += parsed.text;
                console.log(`✍️ Added text: "${parsed.text}"`);
                if (onChunk) onChunk(parsed.text, fullAnswer);
              }
              else if (typeof parsed === 'string') {
                fullAnswer += parsed;
                console.log(`✍️ Added string: "${parsed}"`);
                if (onChunk) onChunk(parsed, fullAnswer);
              }
              
            } catch (e) {
              console.log('❌ JSON parse failed for:', data);
              console.log('Error:', e.message);
              
              // If not JSON, try as plain text
              if (data.trim() && !data.includes('[DONE]')) {
                fullAnswer += data;
                console.log(`✍️ Added raw data: "${data}"`);
                if (onChunk) onChunk(data, fullAnswer);
              }
            }
          }
          // Check for non-SSE format (direct JSON response)
          else if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
            try {
              const parsed = JSON.parse(line.trim());
              console.log('📄 Direct JSON response:', parsed);
              
              if (parsed.answer) {
                fullAnswer = parsed.answer;
                console.log(`🎯 Direct answer: "${parsed.answer}"`);
                if (onChunk) onChunk(parsed.answer, parsed.answer);
              }
            } catch (e) {
              console.log('Direct JSON parse failed:', e);
            }
          }
        }
      }

      console.log('✅ Final answer:', fullAnswer);
      console.log('📊 Total chunks:', chunkCount);
      
      return fullAnswer;
    } catch (error) {
      logger.error('Stream document question failed:', error);
      throw error;
    }
  }

  /**
   * Remove document from RAG index
   */
  async removeDocumentFromRAG(documentId) {
    try {
      console.log(`🗑️ Removing document ${documentId} from RAG index`);

      const data = await this.apiFetch(`/qa/document/${documentId}/rag`, {
        method: 'DELETE'
      });

      console.log('✅ Document removed from RAG:', data);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to remove document from RAG');
      }

      return data;
    } catch (error) {
      logger.error('Remove document from RAG failed:', error);
      throw error;
    }
  }

  /**
   * Get all ingested documents (for dropdown)
   */
  async getIngestedDocuments(params = {}) {
    try {
      const { skip = 0, limit = 100, search } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      if (search) queryParams.append('search', search);

      console.log('📋 Fetching ingested documents for Q&A');

      // We'll use the ingestion jobs endpoint to get documents that have been ingested
      const data = await this.apiFetch(`/ingestion/ingestion-jobs?${queryParams}`);

      // Filter only completed ingestion jobs
      const ingestedDocs = data.filter(job => job.status === 'completed');

      console.log('✅ Ingested documents:', ingestedDocs.length);

      return ingestedDocs;
    } catch (error) {
      logger.error('Get ingested documents failed:', error);
      throw error;
    }
  }

  /**
   * Get document details for a specific document
   */
  async getDocumentDetails(documentId) {
    try {
      console.log(`📄 Getting details for document ${documentId}`);

      const data = await this.apiFetch(`/documents/${documentId}`);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Document not found');
      }

      return data;
    } catch (error) {
      logger.error('Get document details failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const qaService = new QAService();

export { QAService };
export default qaService;