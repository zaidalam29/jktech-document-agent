// src/tests/pages/QAPage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sabse pehle SABHI mocks define karein - INSIDE factory functions
vi.mock('lucide-react', () => ({
  Brain: () => <span data-testid="brain-icon">Brain</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  MessageSquare: () => <span data-testid="message-icon">Message</span>,
  FileText: () => <span data-testid="file-icon">File</span>,
  Send: () => <span data-testid="send-icon">Send</span>,
  Bot: () => <span data-testid="bot-icon">Bot</span>,
  User: () => <span data-testid="user-icon">User</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  BookOpen: () => <span data-testid="book-icon">Book</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  ChevronDown: () => <span data-testid="chevron-icon">Chevron</span>,
  Copy: () => <span data-testid="copy-icon">Copy</span>,
  ThumbsUp: () => <span data-testid="thumbs-up-icon">ThumbsUp</span>,
  ThumbsDown: () => <span data-testid="thumbs-down-icon">ThumbsDown</span>,
  Loader2: () => <span data-testid="loader-icon">Loader</span>,
  Hash: () => <span data-testid="hash-icon">Hash</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  FileQuestion: () => <span data-testid="file-question-icon">FileQuestion</span>,
}));

// Utility mocks
vi.mock('../../utils/token', () => ({
  getToken: vi.fn(() => 'mock-token'),
}));

vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  }
}));

// Alerts mock - define INSIDE factory
vi.mock('../../utils/alerts', () => {
  const mockErrorAlert = vi.fn(() => Promise.resolve());
  const mockSuccessAlert = vi.fn(() => Promise.resolve());
  const mockConfirmAlert = vi.fn(() => Promise.resolve({ isConfirmed: true }));
  
  return {
    default: {
      error: mockErrorAlert,
      success: mockSuccessAlert,
      info: vi.fn(),
      warning: vi.fn(),
      confirm: mockConfirmAlert,
    }
  };
});

// Context mocks - define INSIDE factories
vi.mock('../../store/qa.context', () => {
  const mockUseQA = vi.fn();
  return {
    useQA: mockUseQA,
  };
});

vi.mock('../../store/document.context', () => {
  const mockUseDocuments = vi.fn();
  return {
    useDocuments: mockUseDocuments,
  };
});

vi.mock('../../store/ingestion.context', () => {
  const mockUseIngestion = vi.fn();
  return {
    useIngestion: mockUseIngestion,
  };
});

// Loader component mock
vi.mock('../../components/common/Loader', () => ({
  default: ({ text }) => (
    <div data-testid="loader">
      {text || 'Loading...'}
    </div>
  )
}));

// Import the component
import QAPage from '../../pages/qa/QAPage';

// Import mocked hooks AFTER vi.mock
import { useQA } from '../../store/qa.context';
import { useDocuments } from '../../store/document.context';
import { useIngestion } from '../../store/ingestion.context';
import alerts from '../../utils/alerts';

describe('QAPage', () => {
  // Default mock values
  const defaultQAMock = {
    documents: [],
    selectedDocument: null,
    loading: false,
    asking: false,
    answer: null,
    answerHistory: [],
    streamingAnswer: '',
    isStreaming: false,
    fetchIngestedDocuments: vi.fn(() => Promise.resolve([])),
    fetchDocumentDetails: vi.fn(() => Promise.resolve({})),
    askQuestion: vi.fn(() => Promise.resolve({ 
      answer: 'Mock answer from document', 
      confidence: 0.85 
    })),
    streamQuestion: vi.fn(),
    removeFromRAG: vi.fn(() => Promise.resolve({})),
    clearHistory: vi.fn(),
    setSelectedDocument: vi.fn(),
    clearAnswer: vi.fn(),
  };

  const defaultDocumentsMock = {
    documents: [
      {
        id: 1,
        original_filename: 'test.pdf',
        filename: 'test.pdf',
        file_type: 'pdf',
        file_size: 1024,
        created_at: '2024-01-01T10:00:00Z',
        description: 'Test document'
      },
      {
        id: 2,
        original_filename: 'document.docx',
        filename: 'document.docx',
        file_type: 'docx',
        file_size: 2048,
        created_at: '2024-01-02T11:00:00Z',
      }
    ],
    fetchAllDocuments: vi.fn(() => Promise.resolve([])),
  };

  const defaultIngestionMock = {
    ingestionJobs: [
      {
        id: 1,
        document_id: 1,
        status: 'completed',
        created_at: '2024-01-01T10:05:00Z'
      },
      {
        id: 2,
        document_id: 2,
        status: 'processing',
        created_at: '2024-01-02T11:05:00Z'
      }
    ],
    fetchAllIngestionJobs: vi.fn(() => Promise.resolve([])),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    useQA.mockReturnValue({ ...defaultQAMock });
    useDocuments.mockReturnValue({ ...defaultDocumentsMock });
    useIngestion.mockReturnValue({ ...defaultIngestionMock });
  });

  it('renders the page correctly', () => {
    render(<QAPage />);
    
    // Check for main elements
    expect(screen.getByRole('heading', { name: /Document Q&A \(RAG\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Ask questions to your ingested documents and get AI-powered answers/i)).toBeInTheDocument();
    
    // Check for left column sections
    expect(screen.getByText(/Select Document/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Questions/i)).toBeInTheDocument();
    
    // Check for right column sections
    expect(screen.getByPlaceholderText(/Select a document first to ask questions\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Quick Actions/i)).toBeInTheDocument();
  });

  it('shows select document dropdown', () => {
    render(<QAPage />);
    
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    expect(dropdownButton).toBeInTheDocument();
  });

  it('displays documents in dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(<QAPage />);
    
    // Click dropdown
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    await user.click(dropdownButton);
    
    // Wait for documents to appear
    await waitFor(() => {
      expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
    });
  });

  it('allows selecting a document from dropdown', async () => {
    const user = userEvent.setup();
    
    render(<QAPage />);
    
    // Open dropdown
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    await user.click(dropdownButton);
    
    // Click on a document
    const documentItem = screen.getByText(/test\.pdf/i);
    await user.click(documentItem);
    
    // Check if fetchDocumentDetails was called
    expect(useQA.mock.results[0].value.fetchDocumentDetails).toHaveBeenCalledWith(1);
  });


  it('shows question input when document is selected', async () => {
    // Mock selected document
    useQA.mockReturnValue({
      ...defaultQAMock,
      selectedDocument: {
        id: 1,
        original_filename: 'test.pdf',
      },
    });
    
    render(<QAPage />);
    
    // Check placeholder changes when document is selected
    expect(screen.getByPlaceholderText(/Ask a question about "test\.pdf"\.\.\./i)).toBeInTheDocument();
  });


  it('allows asking a question when document is selected', async () => {
    const user = userEvent.setup();
    
    // Mock selected document
    useQA.mockReturnValue({
      ...defaultQAMock,
      selectedDocument: {
        id: 1,
        original_filename: 'test.pdf',
      },
    });
    
    render(<QAPage />);
    
    // Type a question
    const questionInput = screen.getByPlaceholderText(/Ask a question about "test\.pdf"\.\.\./i);
    await user.type(questionInput, 'What is this document about?');
    
    // Click ask button
    const askButton = screen.getByRole('button', { name: /Ask Question/i });
    await user.click(askButton);
    
    // Check if askQuestion was called
    expect(useQA.mock.results[0].value.askQuestion).toHaveBeenCalledWith(1, 'What is this document about?');
  });


  it('displays answer history', () => {
    // Mock answer history
    useQA.mockReturnValue({
      ...defaultQAMock,
      answerHistory: [
        {
          id: '1',
          question: 'What is the main topic?',
          documentId: 1,
          timestamp: '2024-01-01T10:30:00Z'
        },
        {
          id: '2',
          question: 'Who is the author?',
          documentId: 1,
          timestamp: '2024-01-01T10:35:00Z'
        }
      ],
    });
    
    render(<QAPage />);
    
    // Check history items
    expect(screen.getByText(/What is the main topic\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Who is the author\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear All/i)).toBeInTheDocument();
  });

  it('allows clearing answer history', async () => {
    const user = userEvent.setup();
    
    // Mock answer history
    useQA.mockReturnValue({
      ...defaultQAMock,
      answerHistory: [
        {
          id: '1',
          question: 'What is the main topic?',
          documentId: 1,
          timestamp: '2024-01-01T10:30:00Z'
        }
      ],
    });
    
    render(<QAPage />);
    
    // Click clear history button
    const clearButton = screen.getByRole('button', { name: /Clear All/i });
    await user.click(clearButton);
    
    // Check clearHistory was called
    expect(useQA.mock.results[0].value.clearHistory).toHaveBeenCalled();
  });


  it('shows empty state when no documents are available', () => {
    // Mock empty documents
    useDocuments.mockReturnValue({
      documents: [],
      fetchAllDocuments: vi.fn(),
    });
    
    useIngestion.mockReturnValue({
      ingestionJobs: [],
      fetchAllIngestionJobs: vi.fn(),
    });
    
    render(<QAPage />);
    
    // Open dropdown
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    fireEvent.click(dropdownButton);
    
    // Check empty state
    expect(screen.getByText(/No documents uploaded yet/i)).toBeInTheDocument();
  });

  it('shows only ingested documents in dropdown', async () => {
    const user = userEvent.setup();
    render(<QAPage />);
    
    // Open dropdown
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    await user.click(dropdownButton);
    
    // Wait for documents to appear
    await waitFor(() => {
      // Only document with id 1 should appear (completed ingestion)
      expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
      // Document with id 2 should NOT appear (processing ingestion)
      expect(screen.queryByText(/document\.docx/i)).not.toBeInTheDocument();
    });
  });

  it('allows searching documents in dropdown', async () => {
    const user = userEvent.setup();
    render(<QAPage />);
    
    // Open dropdown
    const dropdownButton = screen.getByRole('button', { name: /Select a document to query\.\.\./i });
    await user.click(dropdownButton);
    
    // Find search input
    const searchInput = screen.getByPlaceholderText(/Search documents\.\.\./i);
    
    // Type search query
    await user.type(searchInput, 'test');
    
    // Check if search works
    expect(searchInput).toHaveValue('test');
  });

  it('displays loading state', () => {
    // Mock loading state
    useQA.mockReturnValue({
      ...defaultQAMock,
      loading: true,
    });
    
    render(<QAPage />);
    
    // Check loading text in dropdown
    expect(screen.getByText(/Loading documents\.\.\./i)).toBeInTheDocument();
  });
});