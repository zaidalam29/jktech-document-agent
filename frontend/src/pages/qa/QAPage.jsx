// src/pages/qa/QAPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  FileText,
  Send,
  Bot,
  User,
  Clock,
  BookOpen,
  RefreshCw,
  Trash2,
  AlertCircle,
  ChevronDown,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Brain,
  Hash,
  Calendar,
  FileQuestion
} from 'lucide-react';
import { useQA } from '../../store/qa.context';
import { useDocuments } from '../../store/document.context';
import { useIngestion } from '../../store/ingestion.context';
import Loader from '../../components/common/Loader';
import alerts from '../../utils/alerts';
import './QAPage.css';

function QAPage() {
  const documentsDropdownRef = useRef(null);
  const answerContainerRef = useRef(null);
  const [showDocumentsDropdown, setShowDocumentsDropdown] = useState(false);
  const [question, setQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get all contexts
  const {
    documents: ingestedDocuments, // Ingested documents from QA context
    selectedDocument,
    loading: qaLoading,
    asking,
    answer,
    answerHistory,
    streamingAnswer,
    isStreaming,
    fetchIngestedDocuments,
    fetchDocumentDetails,
    askQuestion,
    streamQuestion,
    removeFromRAG,
    clearHistory,
    setSelectedDocument,
    clearAnswer
  } = useQA();

  const {
    documents: allDocuments, // All uploaded documents
    fetchAllDocuments
  } = useDocuments();

  const {
    ingestionJobs,
    fetchAllIngestionJobs
  } = useIngestion();

  // Helper functions
  const getDisplayFileType = (fileType) => {
    if (!fileType) return '.doc';

    const type = fileType.toLowerCase();

    const dotMap = {
      'pdf': '.pdf',
      'txt': '.txt',
      'doc': '.doc',
      'docx': '.doc',
      'xls': '.xls',
      'xlsx': '.xls',
      'csv': '.csv',
      'json': '.json'
    };

    return dotMap[type] || `.${type}`;
  };

  const getFileIconColor = (fileType) => {
    const type = (fileType || '').toLowerCase();
    switch (type) {
      case 'pdf': return 'text-red-500';
      case 'txt': return 'text-gray-500';
      case 'doc':
      case 'docx': return 'text-blue-500';
      case 'xls':
      case 'xlsx': return 'text-green-500';
      case 'csv': return 'text-teal-500';
      case 'json': return 'text-purple-500';
      default: return 'text-gray-400';
    }
  };

  const getFileTypeBadgeClass = (fileType) => {
    const type = (fileType || '').toLowerCase();
    switch (type) {
      case 'pdf': return 'bg-red-100 text-red-800 border border-red-200';
      case 'txt': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'doc':
      case 'docx': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'xls':
      case 'xlsx': return 'bg-green-100 text-green-800 border border-green-200';
      case 'csv': return 'bg-teal-100 text-teal-800 border border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Get documents that are ingested and ready for Q&A
  const getReadyDocuments = () => {
    // Get completed ingestion jobs
    const completedJobs = ingestionJobs?.filter(job => job.status === 'completed') || [];

    // Map completed jobs to their documents
    const readyDocumentIds = new Set(completedJobs.map(job => job.document_id));

    // Filter all documents to only include ingested ones
    return allDocuments.filter(doc => readyDocumentIds.has(doc.id));
  };

  // Get filtered documents for dropdown
  const getFilteredDocuments = () => {
    const readyDocs = getReadyDocuments();

    if (!searchQuery.trim()) return readyDocs;

    return readyDocs.filter(doc => {
      const docName = doc.original_filename || doc.filename || '';
      return docName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  // Debug logging
  useEffect(() => {
    console.log('=== Q&A PAGE DEBUG ===');
    console.log('All documents:', allDocuments);
    console.log('Ingested documents:', ingestedDocuments);
    console.log('Ingestion jobs:', ingestionJobs);
    console.log('Ready documents:', getReadyDocuments());
  }, [allDocuments, ingestedDocuments, ingestionJobs]);

  // Initial fetch
  useEffect(() => {
    fetchIngestedDocuments();
    fetchAllDocuments();
    fetchAllIngestionJobs();
  }, [fetchIngestedDocuments, fetchAllDocuments, fetchAllIngestionJobs]);

  // Auto-scroll to answer
  useEffect(() => {
    if (answerContainerRef.current && (answer || streamingAnswer)) {
      answerContainerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [answer, streamingAnswer]);

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
  const handleDocumentSelect = async (document) => {
    try {
      await fetchDocumentDetails(document.id);
      setShowDocumentsDropdown(false);
      clearAnswer();
    } catch (error) {
      console.error('Error selecting document:', error);
      // Fallback to local document data
      setSelectedDocument(document);
      clearAnswer();
    }
  };

  // Handle ask question
  // Handle ask question me temporary fix
  const handleAskQuestion = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      await alerts.error('Error', 'Please enter a question.');
      return;
    }

    if (!selectedDocument) {
      await alerts.error('Error', 'Please select a document first.');
      return;
    }

    try {
      const documentId = selectedDocument.id;

      // ✅ Temporary: Use regular askQuestion instead of streamQuestion
      await askQuestion(documentId, question);
      setQuestion('');
    } catch (error) {
      console.error('Error asking question:', error);
    }
  };

  // Handle remove from RAG
  const handleRemoveFromRAG = async (documentId) => {
    try {
      const result = await alerts.confirm(
        'Remove from RAG',
        'Are you sure you want to remove this document from the RAG index? You can re-ingest it later.',
        'Remove',
        'Cancel'
      );

      if (!result.isConfirmed) {
        return;
      }

      await removeFromRAG(documentId);
    } catch (error) {
      console.error('Error removing from RAG:', error);
    }
  };

  // Handle copy answer
  const handleCopyAnswer = (text) => {
    navigator.clipboard.writeText(text);
    alerts.success('Copied!', 'Answer copied to clipboard.');
  };

  // Handle feedback
  const handleFeedback = (type, answerId) => {
    alerts.success('Thank you!', `Feedback recorded as ${type}.`);
  };

  useEffect(() => {
    console.log('🔍 CURRENT STATE:', {
      answer,
      streamingAnswer,
      isStreaming,
      asking,
      hasAnswer: !!answer,
      hasStreamingAnswer: !!streamingAnswer,
      answerText: answer?.answer,
      answerLength: answer?.answer?.length
    });
  }, [answer, streamingAnswer, isStreaming, asking]);

  return (
    <div className="qa-container">
      <div className="qa-wrapper">

        {/* Header Section */}
        <div className="qa-header">
          <h1 className="qa-title">
            <Brain size={32} className="mr-3" />
            Document Q&A
          </h1>
          <p className="qa-subtitle">
            Ask questions to your ingested documents and get AI-powered answers
          </p>
        </div>

        <div className="qa-grid">

          {/* Left Column - Document Selection & History */}
          <div className="qa-left-column">

            {/* Document Selection */}
            <div className="document-selection-card">
              <h3 className="section-title">
                <FileText size={20} />
                Select Document
              </h3>

              <div className="documents-dropdown-wrapper" ref={documentsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDocumentsDropdown(!showDocumentsDropdown)}
                  className="documents-dropdown-button"
                  disabled={qaLoading}
                >
                  <div className="dropdown-button-content">
                    {selectedDocument ? (
                      <>
                        <FileText size={18} className={getFileIconColor(selectedDocument.file_type)} />
                        <span className="dropdown-selected-text">
                          {selectedDocument.original_filename || selectedDocument.filename || 'Selected Document'}
                        </span>
                      </>
                    ) : (
                      <>
                        <FileText size={18} className="text-gray-400" />
                        <span className="dropdown-placeholder">
                          {qaLoading ? 'Loading documents...' : 'Select a document to query...'}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={20} className="text-gray-400" />
                </button>

                {showDocumentsDropdown && (
                  <div className="documents-dropdown-menu">
                    {/* Search in dropdown */}
                    <div className="dropdown-search">
                      <Search size={16} className="dropdown-search-icon" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        className="dropdown-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Documents list */}
                    <div className="dropdown-documents-list">
                      {getFilteredDocuments().length === 0 ? (
                        <div className="dropdown-empty">
                          <FileQuestion size={32} className="text-gray-400 mb-2" />
                          <p className="text-gray-500 text-sm">
                            {allDocuments.length === 0
                              ? 'No documents uploaded yet'
                              : 'No ingested documents found'
                            }
                          </p>
                          <p className="text-gray-400 text-xs">
                            {allDocuments.length === 0
                              ? 'Upload and ingest documents first'
                              : 'Ingest documents first to ask questions'
                            }
                          </p>
                        </div>
                      ) : (
                        getFilteredDocuments().map((doc) => {
                          const filename = doc.original_filename || doc.filename || `Document ${doc.id}`;
                          const fileType = doc.file_type || 'doc';

                          return (
                            <div
                              key={doc.id}
                              className={`dropdown-document-item ${selectedDocument?.id === doc.id ? 'selected' : ''
                                }`}
                              onClick={() => handleDocumentSelect(doc)}
                            >
                              <div className="document-item-icon">
                                <FileText size={16} className={getFileIconColor(fileType)} />
                              </div>
                              <div className="document-item-info">
                                <div className="document-item-name">
                                  {filename}
                                </div>
                                <div className="document-item-meta">
                                  <span className={`document-item-type ${getFileTypeBadgeClass(fileType)}`}>
                                    {getDisplayFileType(fileType)}
                                  </span>
                                  <span className="document-item-date">
                                    <Calendar size={12} />
                                    {formatDate(doc.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Document Info */}
              {selectedDocument && (
                <div className="selected-document-info">
                  <div className="document-info-header">
                    <h4 className="document-info-title">
                      Selected Document
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromRAG(selectedDocument.id)}
                      className="remove-from-rag-button"
                      title="Remove from RAG index"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="document-info-content">
                    <div className="document-info-row">
                      <span className="document-info-label">Name:</span>
                      <span className="document-info-value">
                        {selectedDocument.original_filename || selectedDocument.filename}
                      </span>
                    </div>

                    <div className="document-info-row">
                      <span className="document-info-label">Type:</span>
                      <span className="document-info-value">
                        {selectedDocument.file_type ? getDisplayFileType(selectedDocument.file_type).toUpperCase() : 'Unknown'}
                      </span>
                    </div>

                    <div className="document-info-row">
                      <span className="document-info-label">Size:</span>
                      <span className="document-info-value">
                        {selectedDocument.file_size ?
                          `${(selectedDocument.file_size / 1024).toFixed(1)} KB` :
                          'Unknown'
                        }
                      </span>
                    </div>

                    <div className="document-info-row">
                      <span className="document-info-label">Uploaded:</span>
                      <span className="document-info-value">
                        {selectedDocument.created_at ?
                          formatDate(selectedDocument.created_at) :
                          'Unknown'
                        }
                      </span>
                    </div>

                    {selectedDocument.description && (
                      <div className="document-info-description">
                        <span className="document-info-label">Description:</span>
                        <p className="document-info-value">
                          {selectedDocument.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Conversation History */}
            <div className="history-card">
              <div className="history-header">
                <h3 className="section-title">
                  <Clock size={20} />
                  Recent Questions
                </h3>
                {answerHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="clear-history-button"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="history-list">
                {answerHistory.length === 0 ? (
                  <div className="history-empty">
                    <MessageSquare size={32} className="text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">No questions yet</p>
                    <p className="text-gray-400 text-xs">Ask your first question!</p>
                  </div>
                ) : (
                  answerHistory.map((item) => (
                    <div
                      key={item.id}
                      className="history-item"
                      onClick={() => {
                        // Try to find and select the document
                        const doc = getReadyDocuments().find(d => d.id === item.documentId);
                        if (doc) {
                          handleDocumentSelect(doc);
                        }
                      }}
                    >
                      <div className="history-question">
                        <User size={14} className="text-blue-500 mr-2" />
                        <span className="history-text">
                          {item.question.length > 50
                            ? `${item.question.substring(0, 50)}...`
                            : item.question
                          }
                        </span>
                      </div>
                      <div className="history-time">
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="qa-right-column">

            {/* Question Input */}
            <div className="question-input-card">
              <form onSubmit={handleAskQuestion}>
                <div className="question-input-wrapper">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={
                      selectedDocument
                        ? `Ask a question about "${selectedDocument.original_filename || selectedDocument.filename}"...`
                        : 'Select a document first to ask questions...'
                    }
                    className="question-input"
                    rows="3"
                    disabled={asking || !selectedDocument}
                  />

                  <div className="question-input-actions">
                    <div className="input-hints">
                      {!selectedDocument && (
                        <div className="input-hint">
                          <AlertCircle size={14} />
                          <span>Please select a document first</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={asking || !question.trim() || !selectedDocument}
                      className="ask-button"
                    >
                      {asking ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={18} />
                          Thinking...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Ask Question
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Answer Display */}
            <div ref={answerContainerRef} className="answer-display-card">
              {asking ? (
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                    <div className="thinking-dot"></div>
                  </div>
                  <p className="thinking-text">
                    {isStreaming ? 'Streaming answer...' : 'Thinking...'}
                  </p>
                </div>
              ) : (answer || streamingAnswer) ? (
                <div className="answer-content">
                  {/* Question */}
                  <div className="question-display">
                    <div className="question-avatar">
                      <User size={20} className="text-blue-500" />
                    </div>
                    <div className="question-bubble">
                      <p className="question-text">
                        {answer?.question || question || 'Your question'}
                      </p>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="answer-display">
                    <div className="answer-avatar">
                      <Bot size={20} className="text-green-500" />
                    </div>
                    <div className="answer-bubble">
                      <div className="answer-header">
                        <span className="answer-source">
                          <FileText size={14} className="mr-1" />
                          Source: {selectedDocument?.original_filename || 'Selected Document'}
                        </span>
                        {answer?.confidence && (
                          <span className="answer-confidence">
                            <Hash size={14} className="mr-1" />
                            Confidence: {(answer.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                        {answer?.source_document?.avg_similarity && (
                          <span className="answer-similarity">
                            <Hash size={14} className="mr-1" />
                            Similarity: {(answer.source_document.avg_similarity * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>

                      <div className="answer-text">
                        {/* Display logic with fallbacks */}
                        {(isStreaming && streamingAnswer) ? streamingAnswer :
                          (answer?.answer) ? answer.answer :
                            (streamingAnswer) ? streamingAnswer :
                              'Answer not available'}

                        {isStreaming && (
                          <span className="streaming-cursor"></span>
                        )}
                      </div>

                      {/* Show source document info if available */}
                      {answer?.source_document && (
                        <div className="source-document-info">
                          <div className="source-stats">
                            <span className="stat-item">
                              <strong>Chunks found:</strong> {answer.source_document.chunks_found}/{answer.source_document.total_chunks}
                            </span>
                            {answer.source_document.avg_similarity && (
                              <span className="stat-item">
                                <strong>Avg similarity:</strong> {(answer.source_document.avg_similarity * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Answer Actions */}
                      <div className="answer-actions">
                        <button
                          type="button"
                          onClick={() => handleCopyAnswer(
                            isStreaming ? streamingAnswer : (answer?.answer || streamingAnswer || '')
                          )}
                          className="answer-action-button"
                        >
                          <Copy size={16} />
                          Copy
                        </button>

                        <div className="answer-feedback">
                          <span className="feedback-label">Helpful?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback('positive', answer?.id)}
                            className="feedback-button positive"
                          >
                            <ThumbsUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback('negative', answer?.id)}
                            className="feedback-button negative"
                          >
                            <ThumbsDown size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-answer">
                  <Bot size={64} className="text-gray-300 mb-4" />
                  <h3 className="empty-title">
                    {selectedDocument ? 'Ask a Question' : 'Select a Document'}
                  </h3>
                  <p className="empty-description">
                    {selectedDocument
                      ? `Ready to answer questions about "${selectedDocument.original_filename}"`
                      : 'Choose a document from the list to start asking questions'
                    }
                  </p>
                  {selectedDocument && (
                    <div className="empty-examples">
                      <p className="examples-title">Example questions:</p>
                      <ul className="examples-list">
                        <li>"What are the main points discussed in this document?"</li>
                        <li>"Summarize the key findings"</li>
                        <li>"What recommendations are provided?"</li>
                        <li>"Explain the methodology used"</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-card">
              <h4 className="actions-title">Quick Actions</h4>
              <div className="actions-grid">
                <button
                  type="button"
                  onClick={clearAnswer}
                  className="action-button"
                  disabled={!answer && !streamingAnswer}
                >
                  <RefreshCw size={18} />
                  Clear Answer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetchIngestedDocuments();
                    fetchAllDocuments();
                    fetchAllIngestionJobs();
                  }}
                  className="action-button"
                  disabled={qaLoading}
                >
                  <RefreshCw size={18} />
                  Refresh All
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedDocument) {
                      handleAskQuestion({ preventDefault: () => { } });
                    }
                  }}
                  className="action-button"
                  disabled={!selectedDocument || !question.trim()}
                >
                  <MessageSquare size={18} />
                  Ask Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QAPage;