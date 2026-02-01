// src/tests/pages/IngestionPage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sabse pehle SABHI mocks define karein - WITHOUT top-level variables
vi.mock('lucide-react', () => ({
  Database: () => <span data-testid="database-icon">Database</span>,
  Play: () => <span data-testid="play-icon">Play</span>,
  StopCircle: () => <span data-testid="stop-icon">Stop</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  RefreshCw: () => <span data-testid="refresh-icon">Refresh</span>,
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  XCircle: () => <span data-testid="x-icon">X</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  FileText: () => <span data-testid="file-icon">File</span>,
  Loader2: () => <span data-testid="loader-icon">Loader</span>,
  ChevronDown: () => <span data-testid="chevron-icon">Chevron</span>,
  Server: () => <span data-testid="server-icon">Server</span>,
  ListOrdered: () => <span data-testid="list-icon">List</span>,
}));

// Token utility mock
vi.mock('../../utils/token', () => ({
  getToken: vi.fn(() => 'mock-token-123'),
}));

// Logger mock
vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
  }
}));

// Alerts mock - define INSIDE factory function
vi.mock('../../utils/alerts', () => {
  const mockErrorAlert = vi.fn(() => Promise.resolve());
  return {
    default: {
      error: mockErrorAlert,
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }
  };
});

// Context mocks - define INSIDE factory functions
vi.mock('../../store/ingestion.context', () => {
  const mockUseIngestion = vi.fn();
  return {
    useIngestion: mockUseIngestion,
  };
});

vi.mock('../../store/document.context', () => {
  const mockUseDocuments = vi.fn();
  return {
    useDocuments: mockUseDocuments,
  };
});

vi.mock('../../store/app.context', () => {
  const mockUseApp = vi.fn();
  return {
    useApp: mockUseApp,
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
import IngestionPage from '../../pages/ingestion/IngestionPage';

// Import the mocked hooks AFTER vi.mock
import { useIngestion } from '../../store/ingestion.context';
import { useDocuments } from '../../store/document.context';
import { useApp } from '../../store/app.context';

// Import alerts to get the mock
import alerts from '../../utils/alerts';

describe('IngestionPage', () => {
  let mockStartIngestion;
  let mockBatchIngestDocuments;
  let mockFetchAllIngestionJobs;
  let mockCancelIngestion;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStartIngestion = vi.fn(() => Promise.resolve({ status: 'completed' }));
    mockBatchIngestDocuments = vi.fn(() => Promise.resolve([]));
    mockFetchAllIngestionJobs = vi.fn(() => Promise.resolve([]));
    mockCancelIngestion = vi.fn(() => Promise.resolve());
    
    // Setup default mock values
    useIngestion.mockReturnValue({
      ingestionJobs: [],
      loading: false,
      ingestionProgress: 0,
      ingestionStatus: '',
      activeIngestions: new Set(),
      ingestionStats: { 
        total: 0, 
        completed: 0, 
        processing: 0, 
        failed: 0 
      },
      fetchAllIngestionJobs: mockFetchAllIngestionJobs,
      startIngestion: mockStartIngestion,
      batchIngestDocuments: mockBatchIngestDocuments,
      isDocumentIngesting: vi.fn(() => false),
      cancelIngestion: mockCancelIngestion,
    });
    
    useDocuments.mockReturnValue({
      documents: [],
      fetchAllDocuments: vi.fn(() => Promise.resolve([])),
    });
    
    useApp.mockReturnValue({
      addNotification: vi.fn(),
    });
  });

  it('renders the page correctly', () => {
    render(<IngestionPage />);
    
    // Check for main elements
    expect(screen.getByRole('heading', { name: /Document Ingestion/i })).toBeInTheDocument();
    expect(screen.getByText(/Ingest documents for processing and analysis/i)).toBeInTheDocument();
    
    // Check for Start Ingestion section
    expect(screen.getByText(/Start Ingestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Documents to Ingest/i)).toBeInTheDocument();
    
    // Check for Ingestion Statistics section
    expect(screen.getByText(/Ingestion Statistics/i)).toBeInTheDocument();
    
    // Check for all statistics
    const completedElements = screen.getAllByText(/Completed/i);
    expect(completedElements.length).toBeGreaterThan(0);
    
    const processingElements = screen.getAllByText(/Processing/i);
    expect(processingElements.length).toBeGreaterThan(0);
    
    const failedElements = screen.getAllByText(/Failed/i);
    expect(failedElements.length).toBeGreaterThan(0);
    
    const totalElements = screen.getAllByText(/Total/i);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    useIngestion.mockReturnValue({
      ingestionJobs: [],
      loading: true,
      ingestionProgress: 0,
      ingestionStatus: '',
      activeIngestions: new Set(),
      ingestionStats: { total: 0, completed: 0, processing: 0, failed: 0 },
      fetchAllIngestionJobs: mockFetchAllIngestionJobs,
      startIngestion: mockStartIngestion,
      batchIngestDocuments: mockBatchIngestDocuments,
      isDocumentIngesting: vi.fn(() => false),
      cancelIngestion: mockCancelIngestion,
    });
    
    render(<IngestionPage />);
    
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('displays ingestion jobs when available', () => {
    const mockJobs = [
      {
        id: 1,
        document_id: 101,
        status: 'completed',
        started_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        created_at: '2024-01-01T10:00:00Z',
        document: {
          id: 101,
          original_filename: 'test.pdf',
          file_type: 'pdf',
          description: 'Test document'
        }
      }
    ];
    
    useIngestion.mockReturnValue({
      ingestionJobs: mockJobs,
      loading: false,
      ingestionProgress: 0,
      ingestionStatus: '',
      activeIngestions: new Set(),
      ingestionStats: { total: 1, completed: 1, processing: 0, failed: 0 },
      fetchAllIngestionJobs: mockFetchAllIngestionJobs,
      startIngestion: mockStartIngestion,
      batchIngestDocuments: mockBatchIngestDocuments,
      isDocumentIngesting: vi.fn(() => false),
      cancelIngestion: mockCancelIngestion,
    });
    
    render(<IngestionPage />);
    
    // Check if job is displayed
    expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument();
    
    // Check for status
    const completedElements = screen.getAllByText(/completed/i);
    expect(completedElements.length).toBeGreaterThan(0);
  });

  it('displays active ingestion progress', () => {
    useIngestion.mockReturnValue({
      ingestionJobs: [],
      loading: false,
      ingestionProgress: 75,
      ingestionStatus: 'Processing...',
      activeIngestions: new Set([101, 102]),
      ingestionStats: { total: 0, completed: 0, processing: 2, failed: 0 },
      fetchAllIngestionJobs: mockFetchAllIngestionJobs,
      startIngestion: mockStartIngestion,
      batchIngestDocuments: mockBatchIngestDocuments,
      isDocumentIngesting: vi.fn((id) => [101, 102].includes(id)),
      cancelIngestion: mockCancelIngestion,
    });
    
    render(<IngestionPage />);
    
    // Check for progress display
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Active documents: 2')).toBeInTheDocument();
  });

  it('calls refresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<IngestionPage />);
    
    // Find and click refresh button
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await user.click(refreshButton);
    
    // Check fetch was called
    expect(mockFetchAllIngestionJobs).toHaveBeenCalled();
  });

  it('handles search input', async () => {
    const user = userEvent.setup();
    render(<IngestionPage />);
    
    // Find search input
    const searchInput = screen.getByPlaceholderText(/Search ingestion jobs\.\.\./i);
    
    // Type in search
    await user.type(searchInput, 'test search');
    
    // Check if search value is set
    expect(searchInput).toHaveValue('test search');
  });

  it('displays correct statistics', () => {
    useIngestion.mockReturnValue({
      ingestionJobs: [],
      loading: false,
      ingestionProgress: 0,
      ingestionStatus: '',
      activeIngestions: new Set(),
      ingestionStats: { 
        total: 10, 
        completed: 5, 
        processing: 3, 
        failed: 2 
      },
      fetchAllIngestionJobs: mockFetchAllIngestionJobs,
      startIngestion: mockStartIngestion,
      batchIngestDocuments: mockBatchIngestDocuments,
      isDocumentIngesting: vi.fn(() => false),
      cancelIngestion: mockCancelIngestion,
    });
    
    render(<IngestionPage />);
    
    // Check all stat values are displayed
    const statValues = screen.getAllByText(/\d+/);
    expect(statValues.length).toBeGreaterThanOrEqual(4);
    
    // Check for specific numbers in stats
    expect(screen.getByText('10')).toBeInTheDocument(); // Total
    expect(screen.getByText('5')).toBeInTheDocument();  // Completed
    expect(screen.getByText('3')).toBeInTheDocument();  // Processing
    expect(screen.getByText('2')).toBeInTheDocument();  // Failed
  });

  // Additional tests that might be useful
  it('button is disabled when no documents are selected', () => {
    render(<IngestionPage />);
    
    const ingestButton = screen.getByRole('button', { name: /Ingest 0 Documents/i });
    expect(ingestButton).toBeDisabled();
  });

  it('shows select documents dropdown button', () => {
    render(<IngestionPage />);
    
    const dropdownButton = screen.getByRole('button', { name: /Select documents\.\.\./i });
    expect(dropdownButton).toBeInTheDocument();
  });

  it('shows deselect all button', () => {
    render(<IngestionPage />);
    
    const deselectButton = screen.getByRole('button', { name: /Deselect All/i });
    expect(deselectButton).toBeInTheDocument();
  });
});