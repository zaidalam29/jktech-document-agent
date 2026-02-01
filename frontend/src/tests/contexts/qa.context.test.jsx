// src/tests/contexts/qa.context.simple.test.jsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simple mocks inside factories
vi.mock('../../store/app.context', () => ({
  useApp: () => ({ addNotification: vi.fn() }),
}));

vi.mock('../../utils/logger', () => ({ 
  default: { error: vi.fn() } 
}));

vi.mock('../../services/qa.service', () => ({
  default: {
    getIngestedDocuments: vi.fn(() => Promise.resolve([])),
    getDocumentDetails: vi.fn(() => Promise.resolve({})),
    askDocumentQuestion: vi.fn(() => Promise.resolve({ answer: 'Test answer' })),
    streamDocumentQuestion: vi.fn(),
    removeDocumentFromRAG: vi.fn(() => Promise.resolve({})),
  }
}));

import { QAProvider, useQA } from '../../store/qa.context';

describe('QAContext - Simple', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => <QAProvider>{children}</QAProvider>;

  it('should have initial state', () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(result.current.documents).toEqual([]);
    expect(result.current.selectedDocument).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.asking).toBe(false);
    expect(result.current.answer).toBeNull();
  });

  it('should fetch documents', async () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    await act(async () => {
      await result.current.fetchIngestedDocuments();
    });
    
    expect(result.current.documents).toEqual([]);
  });

  it('should fetch document details', async () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    await act(async () => {
      await result.current.fetchDocumentDetails(1);
    });
    
    expect(result.current.selectedDocument).toEqual({});
  });

  it('should ask questions', async () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    await act(async () => {
      await result.current.askQuestion(1, 'Test question');
    });
    
    expect(result.current.answer).toBeTruthy();
  });

  it('should set selected document', () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    const testDoc = { id: 1, name: 'test.pdf' };
    
    act(() => {
      result.current.setSelectedDocument(testDoc);
    });
    
    expect(result.current.selectedDocument).toEqual(testDoc);
  });

  it('should have clear functions', () => {
    const { result } = renderHook(() => useQA(), { wrapper });
    
    expect(typeof result.current.clearAnswer).toBe('function');
    expect(typeof result.current.clearHistory).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    
    // Call them to ensure they don't throw
    act(() => {
      result.current.clearAnswer();
      result.current.clearHistory();
      result.current.clearError();
    });
  });
});