// src/store/ingestion.context.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import ingestionService from '../services/ingestion.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const IngestionContext = createContext();

export const IngestionProvider = ({ children }) => {
  const { addNotification } = useApp();
  
  // State
  const [ingestionJobs, setIngestionJobs] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const [ingestionStatus, setIngestionStatus] = useState('');
  const [activeIngestions, setActiveIngestions] = useState(new Set());
  const [ingestionStats, setIngestionStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0
  });

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get all ingestion jobs
  const fetchAllIngestionJobs = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching all ingestion jobs...');

      const data = await ingestionService.getAllIngestionJobs(params);
      console.log('Ingestion jobs fetched:', data);
      setIngestionJobs(data);

      // Update stats
      updateIngestionStats(data);

      return data;
    } catch (error) {
      logger.error('Fetch all ingestion jobs error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load ingestion jobs: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Update ingestion stats
  const updateIngestionStats = useCallback((jobs) => {
    const stats = {
      total: jobs.length,
      completed: 0,
      processing: 0,
      failed: 0
    };

    jobs.forEach(job => {
      switch (job.status?.toLowerCase()) {
        case 'completed':
          stats.completed++;
          break;
        case 'processing':
        case 'pending':
          stats.processing++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    setIngestionStats(stats);
  }, []);

  // Start ingestion for a single document
  const startIngestion = useCallback(async (documentId) => {
    try {
      setLoading(true);
      setError(null);
      setIngestionProgress(0);
      setIngestionStatus('Starting ingestion...');
      
      console.log(`🚀 Starting ingestion for document ID: ${documentId}`);
      
      // Add to active ingestions
      setActiveIngestions(prev => new Set([...prev, documentId]));

      const onProgress = (progress, status) => {
        setIngestionProgress(progress);
        setIngestionStatus(status);
        console.log(`📊 Ingestion progress: ${progress}% - ${status}`);
      };

      const result = await ingestionService.startIngestionWithProgress(documentId, onProgress);
      
      console.log('Ingestion completed:', result);

      // Remove from active ingestions
      setActiveIngestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });

      // Refresh ingestion jobs
      await fetchAllIngestionJobs();

      addNotification({
        type: 'success',
        message: 'Ingestion completed successfully!'
      });

      return result;
    } catch (error) {
      logger.error('Start ingestion error:', error);
      setError(error.message);
      
      // Remove from active ingestions
      setActiveIngestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });

      addNotification({
        type: 'error',
        message: `Failed to start ingestion: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIngestionProgress(0);
        setIngestionStatus('');
      }, 2000);
    }
  }, [fetchAllIngestionJobs, addNotification]);

  // Batch ingest multiple documents
  const batchIngestDocuments = useCallback(async (documentIds) => {
    try {
      setLoading(true);
      setError(null);
      setIngestionProgress(0);
      setIngestionStatus('Starting batch ingestion...');
      
      console.log(`🚀 Starting batch ingestion for ${documentIds.length} documents`);
      
      // Add all to active ingestions
      setActiveIngestions(prev => new Set([...prev, ...documentIds]));

      const onProgress = (progress, status) => {
        setIngestionProgress(progress);
        setIngestionStatus(status);
        console.log(`📊 Batch ingestion progress: ${progress}% - ${status}`);
      };

      const results = await ingestionService.batchIngestDocuments(documentIds, onProgress);
      
      console.log('Batch ingestion completed:', results);

      // Remove all from active ingestions
      setActiveIngestions(prev => {
        const newSet = new Set(prev);
        documentIds.forEach(id => newSet.delete(id));
        return newSet;
      });

      // Refresh ingestion jobs
      await fetchAllIngestionJobs();

      // Check for failures
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        addNotification({
          type: 'warning',
          message: `Batch ingestion completed with ${failures.length} failure(s)`
        });
      } else {
        addNotification({
          type: 'success',
          message: 'Batch ingestion completed successfully!'
        });
      }

      return results;
    } catch (error) {
      logger.error('Batch ingest documents error:', error);
      setError(error.message);
      
      // Remove all from active ingestions
      setActiveIngestions(prev => {
        const newSet = new Set(prev);
        documentIds.forEach(id => newSet.delete(id));
        return newSet;
      });

      addNotification({
        type: 'error',
        message: `Failed to start batch ingestion: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIngestionProgress(0);
        setIngestionStatus('');
      }, 2000);
    }
  }, [fetchAllIngestionJobs, addNotification]);

  // Get ingestion status for a document
  const getIngestionStatus = useCallback(async (documentId) => {
    try {
      setLoading(true);
      const status = await ingestionService.getIngestionStatus(documentId);
      return status;
    } catch (error) {
      logger.error('Get ingestion status error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if document is being ingested
  const isDocumentIngesting = useCallback((documentId) => {
    return activeIngestions.has(documentId);
  }, [activeIngestions]);

  // Cancel ingestion (simulated)
  const cancelIngestion = useCallback(async (documentId) => {
    try {
      setActiveIngestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });

      addNotification({
        type: 'info',
        message: 'Ingestion cancelled'
      });
    } catch (error) {
      logger.error('Cancel ingestion error:', error);
      throw error;
    }
  }, [addNotification]);

  // Context value
  const value = {
    // State
    ingestionJobs,
    selectedDocument,
    loading,
    error,
    ingestionProgress,
    ingestionStatus,
    activeIngestions,
    ingestionStats,
    
    // Actions
    fetchAllIngestionJobs,
    startIngestion,
    batchIngestDocuments,
    getIngestionStatus,
    isDocumentIngesting,
    cancelIngestion,
    
    // Setters
    setSelectedDocument,
    clearError,
  };

  return (
    <IngestionContext.Provider value={value}>
      {children}
    </IngestionContext.Provider>
  );
};

export const useIngestion = () => {
  const context = useContext(IngestionContext);
  if (!context) {
    throw new Error('useIngestion must be used within an IngestionProvider');
  }
  return context;
};