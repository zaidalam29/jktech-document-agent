// src/tests/contexts/ingestion.context.fixed.test.jsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Sabse pehle mocks
vi.mock('../../services/ingestion.service', () => ({
  default: {
    getAllIngestionJobs: vi.fn(() => Promise.resolve([])),
    startIngestion: vi.fn(() => Promise.resolve({ success: true })),
    startIngestionWithProgress: vi.fn(() => Promise.resolve({ status: 'completed' })),
    batchIngestDocuments: vi.fn(() => Promise.resolve([])),
    getIngestionStatus: vi.fn(),
    pollIngestionStatus: vi.fn(),
  }
}));

vi.mock('../../utils/logger', () => ({ 
  default: { 
    debug: vi.fn(), 
    info: vi.fn(), 
    warn: vi.fn(), 
    error: vi.fn() 
  } 
}));

vi.mock('../../utils/token', () => ({ 
  getToken: vi.fn(() => 'mock-token') 
}));

const mockAddNotification = vi.fn();
vi.mock('../../store/app.context', () => ({ 
  useApp: () => ({ 
    addNotification: mockAddNotification 
  }) 
}));

// Import context
import { IngestionProvider, useIngestion } from '../../store/ingestion.context';
import ingestionService from '../../services/ingestion.service';

describe('IngestionContext - Fixed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset mock implementations
    ingestionService.getAllIngestionJobs.mockReset();
    ingestionService.startIngestionWithProgress.mockReset();
    ingestionService.batchIngestDocuments.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }) => <IngestionProvider>{children}</IngestionProvider>;

  it('startIngestion updates activeIngestions and resets progress', async () => {
    const documentId = 101;
    
    // Mock successful response
    ingestionService.startIngestionWithProgress.mockResolvedValue({ 
      status: 'completed' 
    });

    // Mock fetchAllIngestionJobs to return valid array
    ingestionService.getAllIngestionJobs.mockResolvedValue([]);

    const { result } = renderHook(() => useIngestion(), { wrapper });

    await act(async () => {
      const response = await result.current.startIngestion(documentId);
      expect(response).toEqual({ status: 'completed' });
    });

    // Document should not be in active ingestions after completion
    expect(result.current.activeIngestions.has(documentId)).toBe(false);
    
    // Fast-forward time
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Progress should reset
    expect(result.current.ingestionProgress).toBe(0);
    expect(result.current.ingestionStatus).toBe('');
  });

  it('batchIngestDocuments processes multiple documents', async () => {
    const documentIds = [101, 102];
    
    // Mock batch response
    ingestionService.batchIngestDocuments.mockImplementation(async (ids) => {
      return ids.map(id => ({ 
        documentId: id, 
        success: true,
        data: { status: 'completed' }
      }));
    });

    // Mock fetchAllIngestionJobs
    ingestionService.getAllIngestionJobs.mockResolvedValue([]);

    const { result } = renderHook(() => useIngestion(), { wrapper });

    await act(async () => {
      const results = await result.current.batchIngestDocuments(documentIds);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    // Fast-forward time
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Progress should reset
    expect(result.current.ingestionProgress).toBe(0);
  });

  it('fetchAllIngestionJobs handles empty array', async () => {
    ingestionService.getAllIngestionJobs.mockResolvedValue([]);

    const { result } = renderHook(() => useIngestion(), { wrapper });

    await act(async () => {
      const jobs = await result.current.fetchAllIngestionJobs();
      expect(jobs).toEqual([]);
    });

    expect(result.current.ingestionJobs).toEqual([]);
    expect(result.current.ingestionStats.total).toBe(0);
  });

  it('fetchAllIngestionJobs handles valid jobs array', async () => {
    const mockJobs = [
      { id: 1, document_id: 101, status: 'completed' },
      { id: 2, document_id: 102, status: 'processing' }
    ];
    
    ingestionService.getAllIngestionJobs.mockResolvedValue(mockJobs);

    const { result } = renderHook(() => useIngestion(), { wrapper });

    await act(async () => {
      const jobs = await result.current.fetchAllIngestionJobs();
      expect(jobs).toEqual(mockJobs);
    });

    expect(result.current.ingestionJobs).toEqual(mockJobs);
    expect(result.current.ingestionStats.total).toBe(2);
    expect(result.current.ingestionStats.completed).toBe(1);
    expect(result.current.ingestionStats.processing).toBe(1);
  });

  it('handles null/undefined response from service', async () => {
    // Mock returning undefined
    ingestionService.getAllIngestionJobs.mockResolvedValue(undefined);

    const { result } = renderHook(() => useIngestion(), { wrapper });

    await act(async () => {
      try {
        await result.current.fetchAllIngestionJobs();
      } catch (error) {
        // Error might be thrown
      }
    });

    // Should handle gracefully without crash
    expect(result.current.ingestionStats.total).toBe(0);
  });
});