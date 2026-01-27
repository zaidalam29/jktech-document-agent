// src/pages/ingestion/IngestionPage.jsx - UPDATED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { 
  Database,
  Play,
  StopCircle,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ChevronDown,
  Server,
  ListOrdered
} from 'lucide-react';
import { useIngestion } from '../../store/ingestion.context';
import { useDocuments } from '../../store/document.context';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './IngestionPage.css';

function IngestionPage() {
  const documentsDropdownRef = useRef(null);
  const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false);
  
  // Get context values
  const { 
    ingestionJobs, 
    loading, 
    ingestionProgress,
    ingestionStatus,
    activeIngestions,
    ingestionStats,
    fetchAllIngestionJobs, 
    startIngestion,
    batchIngestDocuments,
    isDocumentIngesting,
    cancelIngestion
  } = useIngestion();

  const { 
    documents,
    fetchAllDocuments
  } = useDocuments();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: ''
  });
  
  // Selected documents for batch ingestion
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [batchIngesting, setBatchIngesting] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchAllIngestionJobs(filters);
    fetchAllDocuments();
  }, [fetchAllIngestionJobs, fetchAllDocuments, filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (documentsDropdownRef.current && !documentsDropdownRef.current.contains(event.target)) {
        setShowDocumentsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle document selection
  const toggleDocumentSelection = (document) => {
    if (selectedDocuments.some(doc => doc.id === document.id)) {
      // Remove if already selected
      setSelectedDocuments(prev => prev.filter(doc => doc.id !== document.id));
    } else {
      // Add if not selected
      setSelectedDocuments(prev => [...prev, document]);
    }
  };

  // Handle select all documents
  const selectAllDocuments = () => {
    if (selectedDocuments.length === getAvailableDocuments().length) {
      // Deselect all
      setSelectedDocuments([]);
    } else {
      // Select all available documents
      setSelectedDocuments([...getAvailableDocuments()]);
    }
  };

  // Start ingestion for selected documents
  const handleStartIngestion = async () => {
    if (selectedDocuments.length === 0) {
      await alerts.error('Error', 'Please select at least one document to ingest.');
      return;
    }

    try {
      const documentIds = selectedDocuments.map(doc => doc.id);
      
      if (documentIds.length === 1) {
        // Single document ingestion
        await startIngestion(documentIds[0]);
      } else {
        // Batch ingestion
        setBatchIngesting(true);
        await batchIngestDocuments(documentIds);
      }
      
      // Clear selection after successful ingestion
      setSelectedDocuments([]);
    } catch (error) {
      console.error('Ingestion error:', error);
    } finally {
      setBatchIngesting(false);
    }
  };

  // Start ingestion for a specific document
  const handleSingleIngestion = async (documentId) => {
    try {
      await startIngestion(documentId);
    } catch (error) {
      console.error('Single ingestion error:', error);
    }
  };

  // Cancel ingestion
  const handleCancelIngestion = async (documentId) => {
    try {
      await cancelIngestion(documentId);
      await fetchAllIngestionJobs(); // Refresh list after cancellation
    } catch (error) {
      console.error('Cancel ingestion error:', error);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllIngestionJobs(filters);
      return;
    }
    
    // Client-side search
    const filtered = ingestionJobs.filter(job => 
      job.document?.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.document?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Note: You can implement server-side search if your API supports it
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="job-status-icon text-green-500" size={16} />;
      case 'failed':
        return <XCircle className="job-status-icon text-red-500" size={16} />;
      case 'processing':
      case 'pending':
        return <Loader2 className="job-status-icon text-yellow-500 animate-spin" size={16} />;
      default:
        return <Clock className="job-status-icon text-gray-400" size={16} />;
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'job-status-completed';
      case 'failed':
        return 'job-status-failed';
      case 'processing':
        return 'job-status-processing';
      case 'pending':
        return 'job-status-pending';
      default:
        return 'job-status-unknown';
    }
  };

  // Get progress bar color
  const getProgressColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'processing':
      case 'pending':
        return 'processing';
      default:
        return 'processing';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Format duration
  const formatDuration = (startTime, endTime) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      if (diffMins > 0) {
        return `${diffMins}m ${diffSecs}s`;
      }
      return `${diffSecs}s`;
    } catch {
      return 'N/A';
    }
  };

  // Get progress percentage for a job
  const getJobProgress = (job) => {
    if (job.status === 'completed') return 100;
    if (job.status === 'failed') return 0;
    if (job.status === 'processing' || job.status === 'pending') {
      // Calculate progress based on time elapsed (simulated)
      const startTime = new Date(job.started_at || job.created_at);
      const now = new Date();
      const elapsed = now - startTime;
      const minutesElapsed = elapsed / 60000;
      
      // Simulate progress: 50% after 1 minute, 80% after 2 minutes
      if (minutesElapsed < 1) return 30;
      if (minutesElapsed < 2) return 60;
      return 80;
    }
    return 0;
  };

  // Filter documents that are not already ingested
  const getAvailableDocuments = () => {
    return documents.filter(doc => {
      // Check if document is already ingested
      const alreadyIngested = ingestionJobs.some(job => 
        job.document_id === doc.id && job.status === 'completed'
      );
      
      // Check if document is currently being ingested
      const currentlyIngesting = isDocumentIngesting(doc.id);
      
      return !alreadyIngested && !currentlyIngesting;
    });
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return <FileText className="job-document-icon text-red-500" size={20} />;
      case 'text':
        return <FileText className="job-document-icon text-blue-500" size={20} />;
      default:
        return <FileText className="job-document-icon text-gray-500" size={20} />;
    }
  };

  

  return (
    <div className="ingestion-container">
      <div className="ingestion-wrapper">
        
        {/* Header Section */}
        <div className="ingestion-header">
          <h1 className="ingestion-title">Document Ingestion</h1>
          <p className="ingestion-subtitle">Ingest documents for processing and analysis</p>
        </div>

        <div className="ingestion-grid">
          
          {/* Left Column - Controls Section */}
          <div className="controls-section">
            <h2 className="controls-title">
              <Database size={24} />
              Start Ingestion
            </h2>

            {/* Active Ingestion Progress */}
            {(ingestionProgress > 0 || activeIngestions.size > 0) && (
              <div className="active-ingestion">
                <div className="active-ingestion-header">
                  <span className="active-ingestion-label">
                    {activeIngestions.size > 1 ? 'Batch Ingestion' : 'Ingestion'} in Progress
                  </span>
                  <span className="active-ingestion-percentage">
                    {ingestionProgress}%
                  </span>
                </div>
                <div className="active-ingestion-bar">
                  <div 
                    className="active-ingestion-fill"
                    style={{ width: `${ingestionProgress}%` }}
                  />
                </div>
                <p className="active-ingestion-status">
                  {ingestionStatus || 'Processing...'}
                </p>
                
                {activeIngestions.size > 0 && (
                  <div className="active-documents">
                    <p className="active-documents-label">
                      Active documents: {activeIngestions.size}
                    </p>
                    <div className="active-documents-list">
                      {Array.from(activeIngestions).slice(0, 5).map(docId => (
                        <span key={docId} className="active-document-tag">
                          Doc #{docId}
                        </span>
                      ))}
                      {activeIngestions.size > 5 && (
                        <span className="active-document-tag">
                          +{activeIngestions.size - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Selection */}
            <div className="documents-selection">
              <div className="selection-header">
                <span className="selection-label">Select Documents to Ingest</span>
                <button
                  type="button"
                  onClick={selectAllDocuments}
                  className="selection-toggle"
                >
                  {selectedDocuments.length === getAvailableDocuments().length 
                    ? 'Deselect All' 
                    : 'Select All'}
                </button>
              </div>

              {/* Documents Dropdown */}
              <div className="documents-dropdown" ref={documentsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDocumentsDropdown(!showDocumentsDropdown)}
                  className={`dropdown-button ${showDocumentsDropdown ? 'open' : ''}`}
                >
                  <span className="dropdown-button-text">
                    {selectedDocuments.length === 0
                      ? 'Select documents...'
                      : `${selectedDocuments.length} document(s) selected`}
                  </span>
                  <ChevronDown size={20} />
                </button>

                {showDocumentsDropdown && (
                  <div className="dropdown-menu">
                    {getAvailableDocuments().length === 0 ? (
                      <div className="dropdown-empty">
                        No documents available for ingestion
                      </div>
                    ) : (
                      <div className="dropdown-list">
                        {getAvailableDocuments().map(doc => (
                          <div
                            key={doc.id}
                            className={`dropdown-item ${selectedDocuments.some(d => d.id === doc.id) ? 'selected' : ''}`}
                            onClick={() => toggleDocumentSelection(doc)}
                          >
                            <div className={`dropdown-checkbox ${selectedDocuments.some(d => d.id === doc.id) ? 'checked' : ''}`} />
                            <div className="dropdown-file-info">
                              <div className="dropdown-file-name">
                                {doc.original_filename || 'Untitled'}
                              </div>
                              <div className="dropdown-file-details">
                                {doc.file_type?.toUpperCase()} • {doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                              </div>
                            </div>
                            {isDocumentIngesting(doc.id) && (
                              <div className="dropdown-file-status">
                                <Loader2 size={14} className="text-yellow-500 animate-spin" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Documents List */}
              {selectedDocuments.length > 0 && (
                <div className="selected-documents">
                  <p className="selected-documents-header">
                    Selected Documents ({selectedDocuments.length})
                  </p>
                  <div className="selected-documents-list">
                    {selectedDocuments.slice(0, 5).map(doc => (
                      <div key={doc.id} className="selected-document">
                        <div className="selected-document-info">
                          <FileText size={14} className="text-gray-400" />
                          <span className="selected-document-name">
                            {doc.original_filename}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleDocumentSelection(doc)}
                          className="remove-document"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {selectedDocuments.length > 5 && (
                      <div className="selected-document">
                        <div className="selected-document-info">
                          <FileText size={14} className="text-gray-400" />
                          <span className="selected-document-name">
                            ...and {selectedDocuments.length - 5} more
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ingestion Stats */}
            <div className="ingestion-stats">
              <h3 className="stats-title">Ingestion Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card completed">
                  <div className="stat-header">
                    <span className="stat-label">Completed</span>
                    <CheckCircle className="stat-icon" size={16} />
                  </div>
                  <p className="stat-value">{ingestionStats.completed}</p>
                </div>
                
                <div className="stat-card processing">
                  <div className="stat-header">
                    <span className="stat-label">Processing</span>
                    <Loader2 className="stat-icon animate-spin" size={16} />
                  </div>
                  <p className="stat-value">{ingestionStats.processing}</p>
                </div>
                
                <div className="stat-card failed">
                  <div className="stat-header">
                    <span className="stat-label">Failed</span>
                    <XCircle className="stat-icon" size={16} />
                  </div>
                  <p className="stat-value">{ingestionStats.failed}</p>
                </div>
                
                <div className="stat-card total">
                  <div className="stat-header">
                    <span className="stat-label">Total</span>
                    <ListOrdered className="stat-icon" size={16} />
                  </div>
                  <p className="stat-value">{ingestionStats.total}</p>
                </div>
              </div>
            </div>

            {/* Start Ingestion Button */}
            <button
              type="button"
              onClick={handleStartIngestion}
              disabled={loading || selectedDocuments.length === 0 || batchIngesting}
              className="ingestion-button"
            >
              {batchIngesting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Ingesting {selectedDocuments.length} Documents...
                </>
              ) : (
                <>
                  <Play size={20} />
                  {selectedDocuments.length === 1
                    ? 'Start Ingestion'
                    : `Ingest ${selectedDocuments.length} Documents`}
                </>
              )}
            </button>

            {/* Tips Section */}
            <div className="tips-section">
              <h4 className="tips-header">
                <AlertCircle size={16} />
                Quick Tips
              </h4>
              <ul className="tips-list">
                <li className="tip-item">Select documents from the dropdown to ingest</li>
                <li className="tip-item">Ingestion may take a few minutes depending on file size</li>
                <li className="tip-item">You can ingest multiple documents at once</li>
                <li className="tip-item">Check the table below for ingestion status</li>
                <li className="tip-item">Progress bar updates automatically when ingestion completes</li>
              </ul>
            </div>
          </div>

          {/* Right Column - Jobs List Section */}
          <div className="jobs-section">
            
            {/* Search and Filters */}
            <div className="jobs-search-filters">
              <div className="jobs-search-container">
                <form onSubmit={handleSearch}>
                  <div className="jobs-search-wrapper">
                    <input
                      type="text"
                      placeholder="Search ingestion jobs..."
                      className="jobs-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="jobs-search-icon" size={20} />
                  </div>
                </form>
              </div>
              
              <div className="jobs-filters-container">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="jobs-filter-select"
                  disabled={loading}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
                
                <button
                  onClick={() => fetchAllIngestionJobs(filters)}
                  disabled={loading}
                  className="jobs-refresh-button"
                >
                  <RefreshCw size={20} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Ingestion Jobs Table */}
            {loading && !ingestionJobs.length ? (
              <div className="jobs-loading-state">
                <Loader text="Loading ingestion jobs..." />
              </div>
            ) : ingestionJobs.length === 0 ? (
              <div className="jobs-empty-state">
                <Server size={64} className="jobs-empty-icon" />
                <h3 className="jobs-empty-title">No ingestion jobs found</h3>
                <p className="jobs-empty-description">Start your first ingestion using the controls on the left</p>
              </div>
            ) : (
              <>
                <div className="jobs-table-container">
                  <table className="jobs-table">
                    <thead>
                      <tr className="jobs-table-header">
                        <th>Document</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Started</th>
                        <th>Duration</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingestionJobs.map((job) => (
                        <tr key={job.id} className="jobs-table-row">
                          <td className="jobs-table-cell job-document-cell">
                            <div className="job-document-info">
                              {getFileIcon(job.document?.file_type)}
                              <div className="job-document-details">
                                <div className="job-document-name">
                                  {job.document?.original_filename || `Document #${job.document_id}`}
                                </div>
                                {job.document?.description && (
                                  <div className="job-document-description">
                                    {job.document.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="jobs-table-cell">
                            <div className="job-status-cell">
                              {getStatusIcon(job.status)}
                              <span className={`job-status-badge ${getStatusClass(job.status)}`}>
                                {job.status || 'unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="jobs-table-cell job-progress-cell">
                            <div className="job-progress">
                              <div className="job-progress-bar">
                                <div 
                                  className={`job-progress-fill ${getProgressColor(job.status)}`}
                                  style={{ width: `${getJobProgress(job)}%` }}
                                />
                              </div>
                              <span className="job-progress-percentage">
                                {getJobProgress(job)}%
                              </span>
                            </div>
                          </td>
                          <td className="jobs-table-cell job-date-cell">
                            {formatDate(job.started_at || job.created_at)}
                          </td>
                          <td className="jobs-table-cell job-duration-cell">
                            {job.started_at && job.completed_at 
                              ? formatDuration(job.started_at, job.completed_at)
                              : 'In progress'}
                          </td>
                          <td className="jobs-table-cell job-actions-cell">
                            <div className="job-action-buttons">
                              {job.status === 'processing' || job.status === 'pending' ? (
                                <button
                                  onClick={() => handleCancelIngestion(job.document_id)}
                                  className="job-action-button job-cancel-button"
                                  title="Cancel"
                                  disabled={!isDocumentIngesting(job.document_id)}
                                >
                                  <StopCircle size={18} />
                                </button>
                              ) : job.status === 'failed' ? (
                                <button
                                  onClick={() => handleSingleIngestion(job.document_id)}
                                  className="job-action-button job-retry-button"
                                  title="Retry"
                                  disabled={isDocumentIngesting(job.document_id)}
                                >
                                  <RefreshCw size={18} />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Stats Footer */}
                <div className="jobs-stats-footer">
                  <div className="jobs-stats-text">
                    Showing {ingestionJobs.length} job{ingestionJobs.length !== 1 ? 's' : ''}
                  </div>
                  <div className="jobs-stats-text">
                    {ingestionStats.processing > 0 && (
                      <span className="jobs-stats-highlight processing">
                        {ingestionStats.processing} processing
                      </span>
                    )}
                    {ingestionStats.processing > 0 && ingestionStats.completed > 0 && ' • '}
                    {ingestionStats.completed > 0 && (
                      <span className="jobs-stats-highlight completed">
                        {ingestionStats.completed} completed
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IngestionPage;