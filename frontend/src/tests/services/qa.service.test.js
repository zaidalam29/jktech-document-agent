// src/tests/services/qa.service.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../utils/token', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock global fetch
global.fetch = vi.fn();

// Setup localStorage mock properly
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: '',
    },
  },
  writable: true,
});

// Import service after mocks
import qaService from '../../services/qa.service';

describe('QAService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    
    // Reset window location
    window.location.href = '';
    
    // Mock successful fetch response
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiFetch', () => {
    it('should make API request with correct headers', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockResponse),
      });

      const result = await qaService.apiFetch('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 unauthorized - redirect to login', async () => {
      const mockResponse = { error: 'Unauthorized' };
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockResponse),
      });

      await expect(qaService.apiFetch('/test')).rejects.toThrow('Session expired. Please login again.');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(window.location.href).toBe('/login');
    });

    it('should handle 403 forbidden', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ error: 'Forbidden' }),
      });

      await expect(qaService.apiFetch('/test')).rejects.toThrow('You do not have permission to access this resource.');
    });

    it('should handle 404 not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ detail: 'Not found' }),
      });

      await expect(qaService.apiFetch('/test')).rejects.toThrow('Document not found.');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(qaService.apiFetch('/test')).rejects.toThrow('Network error. Please check your internet connection.');
    });
  });

  describe('askDocumentQuestion', () => {
    it('should ask question to document and return answer', async () => {
      const mockResponse = {
        answer: 'This is the answer',
        confidence: 0.85,
        source_document: {
          document_id: 101,
          chunks_found: 3,
          total_chunks: 5,
          avg_similarity: 0.92,
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockResponse),
      });

      const result = await qaService.askDocumentQuestion(101, 'What is this?');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/qa/ask/101'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ question: 'What is this?' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors when asking question', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(qaService.askDocumentQuestion(101, 'What is this?')).rejects.toThrow();
    });
  });

  describe('getIngestedDocuments', () => {
    it('should fetch only completed ingestion jobs', async () => {
      const mockJobs = [
        { id: 1, document_id: 101, status: 'completed', document: { name: 'doc1.pdf' } },
        { id: 2, document_id: 102, status: 'failed', document: { name: 'doc2.pdf' } },
        { id: 3, document_id: 103, status: 'completed', document: { name: 'doc3.pdf' } },
        { id: 4, document_id: 104, status: 'processing', document: { name: 'doc4.pdf' } },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockJobs),
      });

      const result = await qaService.getIngestedDocuments();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ingestion/ingestion-jobs'),
        expect.anything()
      );
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('completed');
    });

    it('should pass query params to API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve([]),
      });

      await qaService.getIngestedDocuments({ skip: 10, limit: 20, search: 'test' });

      const fetchUrl = fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('skip=10');
      expect(fetchUrl).toContain('limit=20');
      expect(fetchUrl).toContain('search=test');
    });
  });

  describe('getDocumentDetails', () => {
    it('should fetch document details successfully', async () => {
      const mockDocument = {
        id: 101,
        original_filename: 'test.pdf',
        file_type: 'pdf',
        description: 'Test document',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockDocument),
      });

      const result = await qaService.getDocumentDetails(101);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/101'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockDocument);
    });

    it('should throw error when document not found', async () => {
      const mockError = { success: false, error: { message: 'Document not found' } };
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockError),
      });

      await expect(qaService.getDocumentDetails(999)).rejects.toThrow('Document not found');
    });
  });

  describe('removeDocumentFromRAG', () => {
    it('should remove document from RAG index successfully', async () => {
      const mockResponse = { success: true, message: 'Document removed successfully' };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        json: () => Promise.resolve(mockResponse),
      });

      const result = await qaService.removeDocumentFromRAG(101);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/qa/document/101/rag'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual(mockResponse);
    });

  });
});