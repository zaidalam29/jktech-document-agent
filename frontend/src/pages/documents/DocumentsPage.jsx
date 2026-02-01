// src/pages/documents/DocumentsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FileUp,
  Filter
} from 'lucide-react';
import { useDocuments } from '../../store/document.context';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './DocumentsPage.css';

function DocumentsPage() {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Get context values
  const {
    documents,
    loading,
    uploadProgress,
    fetchAllDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    searchDocuments
  } = useDocuments();

  // Local state
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    file_type: '',
    status: ''
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    description: '',
    tags: '',
    is_public: true
  });

  // Initial fetch
  useEffect(() => {
    fetchAllDocuments(filters);
  }, [fetchAllDocuments, filters]);

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileValidation(file);
    }
  };

  // Handle file validation
  const handleFileValidation = (file) => {
    const validTypes = ['application/pdf', 'text/plain'];
    const validExtensions = ['.pdf', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) &&
      !validExtensions.includes(fileExtension)) {
      alerts.error('Invalid File', 'Only PDF and TXT files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alerts.error('File Too Large', 'File size must be less than 10MB.');
      return;
    }

    setUploadForm(prev => ({
      ...prev,
      file: file
    }));
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileValidation(selectedFile);
    }
  };

  // Handle upload
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      await alerts.error('Error', 'Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);

      const metadata = {
        description: uploadForm.description,
        tags: uploadForm.tags,
        is_public: uploadForm.is_public
      };

      await uploadDocument(uploadForm.file, metadata);

      // Reset form
      setUploadForm({
        file: null,
        description: '',
        tags: '',
        is_public: true
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllDocuments(filters);
      return;
    }

    try {
      await searchDocuments(searchQuery, filters);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (documentId) => {
    try {
      const result = await alerts.confirm(
        'Delete Document',
        'Are you sure you want to delete this document? This action cannot be undone.',
        'Delete',
        'Cancel'
      );

      if (!result.isConfirmed) {
        return;
      }

      await deleteDocument(documentId);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'failed':
        return <XCircle className="text-red-500" size={16} />;
      case 'processing':
        return <Clock className="text-yellow-500" size={16} />;
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'processing':
        return 'status-processing';
      default:
        return 'status-unknown';
    }
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText className="text-red-500 file-icon" size={24} />;
      case 'text':
        return <FileText className="text-blue-500 file-icon" size={24} />;
      case 'html':
        return <FileText className="text-green-500 file-icon" size={24} />;
      default:
        return <FileText className="text-gray-500 file-icon" size={24} />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="documents-page container mx-auto px-4 py-8">
      {/* Header */}
      <div className="documents-header mb-8">
        <h1 className="text-3xl font-bold">Document Management</h1>
        <p className="text-gray-600 mt-2">Upload and manage your documents in one place</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Upload Form */}
        <div className="lg:col-span-1">
          <div className="upload-form-container">
            <h2 className="text-xl font-semibold mb-6">
              <Upload size={24} />
              Upload Document
            </h2>

            <form onSubmit={handleUpload}>
              {/* File Upload */}
              <div className="form-group">
                <label className="block text-sm font-medium mb-2">
                  Select File
                </label>
                <div
                  className={`file-upload-area ${dragOver ? 'dragover' : ''} ${uploadForm.file ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.txt,application/pdf,text/plain"
                    data-testid="file-input"
                  />

                  {uploadForm.file ? (
                    <div className="file-preview">
                      <FileUp className="file-preview-icon text-blue-500" size={32} />
                      <div className="file-info">
                        <p className="file-name">{uploadForm.file.name}</p>
                        <p className="file-size">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-600 mb-1">
                        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">PDF, TXT (Max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(uploading || uploadProgress > 0) && (
                <div className="upload-progress mb-6">
                  <div className="progress-info">
                    <span className="progress-label">Uploading...</span>
                    <span className="progress-percentage">{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  rows="2"
                  placeholder="Brief description..."
                  disabled={uploading}
                />
              </div>

              {/* Tags */}
              <div className="form-group mb-4">
                <label className="block text-sm font-medium mb-1">
                  Tags (Optional)
                </label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="form-input"
                  placeholder="report,research,notes"
                  disabled={uploading}
                />
              </div>

              {/* Visibility */}
              <div className="checkbox-container mb-6">
                <div className={`custom-checkbox ${uploadForm.is_public ? 'checked' : ''}`}>
                  {uploadForm.is_public && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadForm.is_public}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="isPublic" className="checkbox-label">
                  Make this document public
                </label>
              </div>

              {/* Upload Button */}
              <button
                type="submit"
                disabled={uploading || !uploadForm.file}
                className="upload-button"
                data-testid="upload-button"
              >
                {uploading ? (
                  <>
                    <Loader size="small" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload Document
                  </>
                )}
              </button>
            </form>
          </div>
        </div><br></br>

        {/* Right Column - Documents List */}
        <div className="lg:col-span-2">
          {/* Search and Filters */}
          <div className="search-filters-container">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="search-box flex-1">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="search-icon" size={20} />
                </form>
              </div>

              <div className="filters-container">
                <select
                  value={filters.file_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, file_type: e.target.value }))}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="text">Text</option>
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>

                <button
                  onClick={() => fetchAllDocuments(filters)}
                  disabled={loading}
                  className="refresh-button"
                >
                  <RefreshCw size={20} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Documents Table */}
          <div className="documents-table-container">
            {loading && !documents.length ? (
              <div className="loading-container">
                <Loader text="Loading documents..." />
              </div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <FileText size={64} className="empty-icon mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No documents found</h3>
                <p className="text-gray-500">Upload your first document using the form on the left</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="documents-table">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left py-3 px-4">Document</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Size</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="table-row">
                        <td className="table-cell document-cell">
                          <div className="document-info">
                            {getFileIcon(doc.file_type)}
                            <div className="document-details">
                              <div className="document-name">
                                {doc.original_filename || 'Untitled'}
                              </div>
                              {doc.description && (
                                <div className="document-description">
                                  {doc.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="file-type-badge">
                            {doc.file_type?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="table-cell file-size-cell">
                          {formatFileSize(doc.file_size)}
                        </td>
                        <td className="table-cell">
                          <div className="status-cell">
                            {getStatusIcon(doc.status)}
                            <span className={`status-badge ${getStatusClass(doc.status)}`}>
                              {doc.status || 'unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="table-cell actions-cell">
                          <div className="action-buttons">
                            <button
                              onClick={() => downloadDocument(doc.id)}
                              className="action-button download-button"
                              title="Download"
                              disabled={loading}
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="action-button delete-button"
                              title="Delete"
                              disabled={loading}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats */}
            {documents.length > 0 && (
              <div className="stats-footer">
                <div className="stats-text">
                  Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
                </div>
                <div className="stats-text">
                  Total Size: {formatFileSize(
                    documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;