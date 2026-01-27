// src/store/document.context.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import documentService from '../services/document.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
  const { addNotification } = useApp();
  
  // State
  const [documents, setDocuments] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    by_type: {},
    by_status: {},
    total_size: 0
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch all documents
  const fetchAllDocuments = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching all documents...');

      const data = await documentService.getAllDocuments(params);
      console.log('✅ Documents fetched:', data);
      setDocuments(data);

      return data;
    } catch (error) {
      logger.error('Fetch all documents error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load documents: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Fetch my documents
  const fetchMyDocuments = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching my documents...');

      const data = await documentService.getMyDocuments(params);
      console.log('✅ My documents fetched:', data);
      setMyDocuments(data);

      return data;
    } catch (error) {
      logger.error('Fetch my documents error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load your documents: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Fetch document details
  const fetchDocumentDetails = useCallback(async (documentId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔄 Fetching document details for ID: ${documentId}`);

      const data = await documentService.getDocument(documentId);
      console.log('✅ Document details:', data);
      setSelectedDocument(data);

      return data;
    } catch (error) {
      logger.error('Fetch document details error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load document details: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Upload document with progress tracking
  const uploadDocument = useCallback(async (file, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);
      console.log('🔼 Starting upload...');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const data = await documentService.uploadDocument(file, metadata);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      console.log('✅ Upload complete:', data);

      // Refresh documents list
      await fetchAllDocuments();

      addNotification({
        type: 'success',
        message: 'Document uploaded successfully!'
      });

      return data;
    } catch (error) {
      logger.error('Upload document error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to upload document: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [fetchAllDocuments, addNotification]);

  // Delete document
  const deleteDocument = useCallback(async (documentId) => {
    try {
      console.log(`🗑️ Deleting document ID: ${documentId}`);
      
      const result = await documentService.deleteDocument(documentId);
      console.log('✅ Delete result:', result);

      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== parseInt(documentId)));
      setMyDocuments(prev => prev.filter(doc => doc.id !== parseInt(documentId)));

      // Clear selected document if it's the deleted one
      if (selectedDocument && selectedDocument.id === parseInt(documentId)) {
        setSelectedDocument(null);
      }

      addNotification({
        type: 'success',
        message: 'Document deleted successfully!'
      });

      return result;
    } catch (error) {
      logger.error('Delete document error:', error);
      
      // If document not found, still remove from local state
      if (error.status === 404) {
        setDocuments(prev => prev.filter(doc => doc.id !== parseInt(documentId)));
        setMyDocuments(prev => prev.filter(doc => doc.id !== parseInt(documentId)));
        
        addNotification({
          type: 'info',
          message: 'Document was already deleted or not found.'
        });
        
        return { notFound: true };
      }

      addNotification({
        type: 'error',
        message: `Failed to delete document: ${error.message}`
      });
      throw error;
    }
  }, [selectedDocument, addNotification]);

  // Download document
  const downloadDocument = useCallback(async (documentId) => {
    try {
      setLoading(true);
      console.log(`⬇️ Downloading document ID: ${documentId}`);
      
      await documentService.downloadDocument(documentId);
      
      addNotification({
        type: 'success',
        message: 'Download started successfully!'
      });
    } catch (error) {
      logger.error('Download document error:', error);
      addNotification({
        type: 'error',
        message: `Failed to download document: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Search documents
  const searchDocuments = useCallback(async (query, params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await documentService.searchDocuments(query, params);
      return results;
    } catch (error) {
      logger.error('Search documents error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Search failed: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Get document statistics
  const fetchDocumentStats = useCallback(async () => {
    try {
      const statsData = await documentService.getDocumentStats();
      setStats(statsData);
      return statsData;
    } catch (error) {
      logger.error('Fetch document stats error:', error);
      return stats;
    }
  }, [stats]);

  // Clear upload progress
  const clearUploadProgress = useCallback(() => {
    setUploadProgress(0);
  }, []);

  // Context value
  const value = {
    // State
    documents,
    myDocuments,
    selectedDocument,
    loading,
    error,
    uploadProgress,
    stats,
    
    // Actions
    fetchAllDocuments,
    fetchMyDocuments,
    fetchDocumentDetails,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    searchDocuments,
    fetchDocumentStats,
    
    // Setters
    setSelectedDocument,
    clearError,
    clearUploadProgress,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};