import { getToken } from '../utils/token';
import logger from '../utils/logger';
import alerts from '../utils/alerts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class IngestionService {
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
      logger.debug('Ingestion API Request:', { 
        endpoint, 
        method: defaultOptions.method 
      });

      const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

      console.log('📡 Ingestion API Response Status:', response.status, 'URL:', endpoint);

      // Handle 204 No Content
      if (response.status === 204) {
        return { 
          success: true, 
          message: 'Operation completed successfully', 
          status: 204 
        };
      }

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

      logger.debug('✅ Ingestion API Success:', { endpoint, status: response.status });
      return data;

    } catch (error) {
      logger.error('❌ Ingestion API Fetch Error:', {
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
        error.message = 'Document or ingestion job not found.';
      } else if (error.message.includes('Failed to fetch')) {
        error.message = 'Network error. Please check your internet connection.';
      }

      throw error;
    }
  }

  /**
   * Start ingestion for a document
   */
  async startIngestion(documentId) {
    try {
      console.log('🚀 Starting ingestion for document ID:', documentId);
      const data = await this.apiFetch(`/ingestion/documents/${documentId}/ingest`, {
        method: 'POST',
      });

      console.log('✅ Ingestion started:', data);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to start ingestion');
      }

      return data;
    } catch (error) {
      logger.error('Start ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Get ingestion status for a document
   */
  async getIngestionStatus(documentId) {
    try {
      console.log('📊 Getting ingestion status for document ID:', documentId);
      const data = await this.apiFetch(`/ingestion/documents/${documentId}/ingestion-status`);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to get ingestion status');
      }

      return data;
    } catch (error) {
      logger.error('Get ingestion status failed:', error);
      throw error;
    }
  }

  /**
   * Get all ingestion jobs
   */
  async getAllIngestionJobs(params = {}) {
    try {
      const { skip = 0, limit = 50, status } = params;
      
      const queryParams = new URLSearchParams();
      queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      if (status) queryParams.append('status', status);

      console.log('📋 Fetching ingestion jobs with params:', params);
      const data = await this.apiFetch(`/ingestion/ingestion-jobs?${queryParams}`);
      
      // Handle array response
      if (Array.isArray(data)) {
        return data;
      }
      
      // Handle object response with data property
      if (data && data.data) {
        return data.data;
      }
      
      // Handle error response
      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to fetch ingestion jobs');
      }
      
      return data || [];
    } catch (error) {
      logger.error('Get all ingestion jobs failed:', error);
      throw error;
    }
  }

  /**
   * Poll ingestion status for a document (real-time updates)
   */
  async pollIngestionStatus(documentId, interval = 2000, maxAttempts = 60) {
    return new Promise(async (resolve, reject) => {
      let attempts = 0;
      
      const poll = async () => {
        try {
          attempts++;
          
          const status = await this.getIngestionStatus(documentId);
          console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}:`, status);
          
          // Check if ingestion is complete
          if (status.status === 'completed' || status.status === 'failed') {
            resolve(status);
            return;
          }
          
          // Check if max attempts reached
          if (attempts >= maxAttempts) {
            reject(new Error('Ingestion timeout - maximum polling attempts reached'));
            return;
          }
          
          // Continue polling
          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };
      
      // Start polling
      await poll();
    });
  }

  /**
   * Start ingestion with progress tracking
   */
  async startIngestionWithProgress(documentId, onProgress) {
    try {
      // Start ingestion
      const startResponse = await this.startIngestion(documentId);
      
      // Start polling for progress
      if (onProgress) {
        onProgress(10, 'Starting ingestion...');
        
        const status = await this.pollIngestionStatus(documentId, 3000, 120);
        
        // Update progress based on status
        if (status.status === 'completed') {
          onProgress(100, 'Ingestion completed successfully!');
        } else if (status.status === 'failed') {
          onProgress(0, 'Ingestion failed: ' + (status.error || 'Unknown error'));
          throw new Error('Ingestion failed: ' + (status.error || 'Unknown error'));
        } else {
          onProgress(50, 'Ingestion in progress...');
        }
        
        return status;
      }
      
      return startResponse;
    } catch (error) {
      logger.error('Start ingestion with progress failed:', error);
      throw error;
    }
  }

  /**
   * Batch ingest multiple documents
   */
  async batchIngestDocuments(documentIds, onProgress) {
    try {
      const results = [];
      const total = documentIds.length;
      
      for (let i = 0; i < documentIds.length; i++) {
        const documentId = documentIds[i];
        
        if (onProgress) {
          const progress = Math.round((i / total) * 100);
          onProgress(progress, `Processing document ${i + 1} of ${total}...`);
        }
        
        try {
          const result = await this.startIngestionWithProgress(documentId, (docProgress, message) => {
            // Combine overall progress with individual document progress
            const overallProgress = Math.round((i / total) * 100 + (docProgress / total));
            if (onProgress) {
              onProgress(overallProgress, message);
            }
          });
          
          results.push({
            documentId,
            success: true,
            data: result
          });
          
        } catch (error) {
          results.push({
            documentId,
            success: false,
            error: error.message
          });
        }
      }
      
      if (onProgress) {
        onProgress(100, 'Batch ingestion completed!');
      }
      
      return results;
    } catch (error) {
      logger.error('Batch ingest documents failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const ingestionService = new IngestionService();

export { IngestionService };
export default ingestionService;