// src/services/document.service.js
import { getToken } from '../utils/token';
import logger from '../utils/logger';
import alerts from '../utils/alerts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class DocumentService {
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
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'omit',
    };

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
      defaultOptions.headers['Content-Type'] = 'application/json';
    }

    if (options.body) {
      defaultOptions.body = options.body instanceof FormData 
        ? options.body 
        : JSON.stringify(options.body);
    }

    try {
      logger.debug('Document API Request:', { 
        endpoint, 
        method: defaultOptions.method 
      });

      const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

      console.log('📡 API Response Status:', response.status, 'URL:', endpoint);

      // Handle 204 No Content
      if (response.status === 204) {
        return { 
          success: true, 
          message: 'Operation completed successfully', 
          status: 204 
        };
      }

      // Handle file download
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/octet-stream') ||
          response.headers.get('content-disposition')?.includes('attachment')) {
        const blob = await response.blob();
        const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'document.pdf';
        
        return {
          blob,
          filename,
          success: response.ok
        };
      }

      let data;
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

      logger.debug('Document API Success:', { endpoint, status: response.status });
      return data;

    } catch (error) {
      logger.error('Document API Fetch Error:', {
        endpoint,
        error: error.message,
        status: error.status
      });

      // Handle specific errors
      if (error.status === 401) {
        error.message = 'Session expired. Please login again.';
        // Clear token and redirect
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
   * Get all documents
   */
  async getAllDocuments(params = {}) {
    try {
      const { skip = 0, limit = 100, file_type, status } = params;
      
      const queryParams = new URLSearchParams();
      queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      if (file_type) queryParams.append('file_type', file_type);
      if (status) queryParams.append('status', status);

      console.log('📋 Fetching documents with params:', params);
      const data = await this.apiFetch(`/documents/?${queryParams}`);
      
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
        throw new Error(data?.error?.message || 'Failed to fetch documents');
      }
      
      return data || [];
    } catch (error) {
      logger.error('Get all documents failed:', error);
      throw error;
    }
  }

  /**
   * Get my documents (user's documents)
   */
  async getMyDocuments(params = {}) {
    try {
      const { skip = 0, limit = 50, file_type, status } = params;
      
      const queryParams = new URLSearchParams();
      queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      if (file_type) queryParams.append('file_type', file_type);
      if (status) queryParams.append('status', status);

      console.log('📋 Fetching my documents with params:', params);
      const data = await this.apiFetch(`/documents/my-documents?${queryParams}`);
      
      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && data.data) {
        return data.data;
      }
      
      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to fetch your documents');
      }
      
      return data || [];
    } catch (error) {
      logger.error('Get my documents failed:', error);
      throw error;
    }
  }

  /**
   * Get document details
   */
  async getDocument(documentId) {
    try {
      console.log('📄 Fetching document details for ID:', documentId);
      const data = await this.apiFetch(`/documents/${documentId}`);
      
      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Document not found');
      }
      
      return data;
    } catch (error) {
      logger.error('Get document failed:', error);
      throw error;
    }
  }

  /**
   * Upload document with progress tracking
   */
  async uploadDocument(file, metadata = {}) {
    try {
      // Validate file
      const validTypes = ['application/pdf', 'text/plain'];
      const validExtensions = ['.pdf', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validTypes.includes(file.type) && 
          !validExtensions.includes(fileExtension)) {
        throw new Error('Only PDF, TXT, MD, and HTML files are allowed.');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB.');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const queryParams = new URLSearchParams();
      if (metadata.description) queryParams.append('description', metadata.description);
      if (metadata.tags) queryParams.append('tags', metadata.tags);
      if (metadata.is_public !== undefined) queryParams.append('is_public', metadata.is_public);

      const endpoint = `/documents/upload?${queryParams}`;
      
      console.log('📤 Uploading document:', file.name, 'Metadata:', metadata);
      
      const data = await this.apiFetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      console.log('Upload successful:', data);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to upload document');
      }

      return data;
    } catch (error) {
      logger.error('Upload document failed:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    try {
      console.log('🗑️ Deleting document ID:', documentId);
      const data = await this.apiFetch(`/documents/${documentId}`, {
        method: 'DELETE'
      });

      console.log('Delete response:', data);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to delete document');
      }

      return { 
        success: true, 
        message: 'Document deleted successfully',
        documentId 
      };
    } catch (error) {
      logger.error('Delete document failed:', error);
      throw error;
    }
  }

  /**
   * Download document
   */
  async downloadDocument(documentId) {
    try {
      console.log('⬇️ Downloading document ID:', documentId);
      const result = await this.apiFetch(`/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream',
        },
      });

      if (!result.success) {
        throw new Error('Failed to download document');
      }

      // Create download link
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (error) {
      logger.error('Download document failed:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query, params = {}) {
    try {
      const { skip = 0, limit = 50 } = params;
      
      const data = await this.apiFetch(`/documents/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`);

      if (Array.isArray(data)) {
        return data;
      }
      
      if (data && data.data) {
        return data.data;
      }
      
      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Search failed');
      }
      
      return data || [];
    } catch (error) {
      logger.error('Search documents failed:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats() {
    try {
      const data = await this.apiFetch('/documents/stats');

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to get document statistics');
      }

      return data || {
        total: 0,
        by_type: {},
        by_status: {},
        total_size: 0
      };
    } catch (error) {
      logger.error('Get document stats failed:', error);
      return {
        total: 0,
        by_type: {},
        by_status: {},
        total_size: 0
      };
    }
  }
}

// Create singleton instance
const documentService = new DocumentService();

export { DocumentService };
export default documentService;