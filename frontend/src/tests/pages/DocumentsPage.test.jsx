import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DocumentsPage from '../../pages/documents/DocumentsPage';
import { MemoryRouter } from 'react-router-dom';

// =======================
// MOCKS
// =======================

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Upload: (props) => <div {...props}>UploadIcon</div>,
    FileText: (props) => <div {...props}>FileTextIcon</div>,
    Download: (props) => <div {...props}>DownloadIcon</div>,
    Trash2: (props) => <div {...props}>TrashIcon</div>,
    Search: (props) => <div {...props}>SearchIcon</div>,
    RefreshCw: (props) => <div {...props}>RefreshIcon</div>,
    CheckCircle: (props) => <div {...props}>CheckCircleIcon</div>,
    XCircle: (props) => <div {...props}>XCircleIcon</div>,
    Clock: (props) => <div {...props}>ClockIcon</div>,
    FileUp: (props) => <div {...props}>FileUpIcon</div>,
    Filter: (props) => <div {...props}>FilterIcon</div>,
}));

// Mock Loader
vi.mock('../../components/common/Loader', () => ({
    default: ({ text }) => <div>{text || 'Loading...'}</div>,
}));

// Mock alerts
vi.mock('../../utils/alerts', () => ({
    default: {
        error: vi.fn(),
        confirm: vi.fn().mockResolvedValue({ isConfirmed: true }),
    },
}));

// Mock document context
const mockUploadDocument = vi.fn();
const mockDeleteDocument = vi.fn();
const mockDownloadDocument = vi.fn();
const mockFetchAllDocuments = vi.fn();
const mockSearchDocuments = vi.fn();

vi.mock('../../store/document.context', () => ({
    useDocuments: () => ({
        documents: [
            { id: 1, original_filename: 'test.pdf', file_type: 'pdf', file_size: 1024, status: 'completed' },
            { id: 2, original_filename: 'notes.txt', file_type: 'text', file_size: 2048, status: 'processing' },
        ],
        loading: false,
        uploadProgress: 0,
        fetchAllDocuments: mockFetchAllDocuments,
        uploadDocument: mockUploadDocument,
        deleteDocument: mockDeleteDocument,
        downloadDocument: mockDownloadDocument,
        searchDocuments: mockSearchDocuments,
    }),
}));

// =======================
// TESTS
// =======================

describe('DocumentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the documents table', () => {
        render(<DocumentsPage />, { wrapper: MemoryRouter });

        // Check that document names are rendered
        expect(screen.getByText('test.pdf')).toBeDefined();
        expect(screen.getByText('notes.txt')).toBeDefined();
    });

    it('shows error if invalid file type is uploaded', async () => {
        const { default: alerts } = await import('../../utils/alerts');

        render(<DocumentsPage />, { wrapper: MemoryRouter });

        const fileInput = screen.getByTestId('file-input');

        // Simulate uploading a .jpg file
        const file = new File(['dummy content'], 'image.jpg', { type: 'image/jpeg' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(alerts.error).toHaveBeenCalledWith('Invalid File', 'Only PDF and TXT files are allowed.');
    });

    it('allows uploading .pdf or .txt files', async () => {
        render(<DocumentsPage />, { wrapper: MemoryRouter });

        const fileInput = screen.getByTestId('file-input');

        const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const uploadButton = screen.getByTestId('upload-button');
        fireEvent.click(uploadButton);


        await waitFor(() => {
            expect(mockUploadDocument).toHaveBeenCalled();
        });
    });

    it('calls deleteDocument when delete button is clicked', async () => {
        render(<DocumentsPage />, { wrapper: MemoryRouter });

        const deleteButtons = screen.getAllByTitle('Delete');
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockDeleteDocument).toHaveBeenCalledWith(1);
        });
    });

    it('calls downloadDocument when download button is clicked', async () => {
        render(<DocumentsPage />, { wrapper: MemoryRouter });

        const downloadButtons = screen.getAllByTitle('Download');
        fireEvent.click(downloadButtons[0]);

        await waitFor(() => {
            expect(mockDownloadDocument).toHaveBeenCalledWith(1);
        });
    });

    it('calls searchDocuments when search form is submitted', async () => {
        render(<DocumentsPage />, { wrapper: MemoryRouter });

        const searchInput = screen.getByPlaceholderText(/Search documents/i);
        fireEvent.change(searchInput, { target: { value: 'test' } });

        fireEvent.submit(searchInput.closest('form'));

        await waitFor(() => {
            expect(mockSearchDocuments).toHaveBeenCalledWith('test', expect.any(Object));
        });
    });
});
