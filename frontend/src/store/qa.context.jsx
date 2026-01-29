// src/store/qa.context.jsx
import React, { createContext, useState, useContext, useCallback } from 'react';
import qaService from '../services/qa.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const QAContext = createContext();

export const QAProvider = ({ children }) => {
  const { addNotification } = useApp();

  // State
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear answer
  const clearAnswer = useCallback(() => {
    setAnswer(null);
    setStreamingAnswer('');
  }, []);

  // Get all ingested documents for Q&A
  const fetchIngestedDocuments = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching ingested documents for Q&A...');

      const data = await qaService.getIngestedDocuments(params);
      console.log('Ingested documents fetched:', data.length);

      setDocuments(data);

      return data;
    } catch (error) {
      logger.error('Fetch ingested documents error:', error);
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

  // Get document details
  const fetchDocumentDetails = useCallback(async (documentId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📄 Fetching details for document ${documentId}`);

      const data = await qaService.getDocumentDetails(documentId);
      console.log('Document details:', data);

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

  // Ask question to document
  const askQuestion = useCallback(async (documentId, question) => {
  try {
    setAsking(true);
    setError(null);
    clearAnswer();
    console.log(`❓ Asking question for document ${documentId}:`, question);

    const data = await qaService.askDocumentQuestion(documentId, question);
    console.log('Answer received:', data);

    // Check if answer is actually in the response
    if (!data.answer && !data.content) {
      console.warn('⚠️ No answer or content in response:', data);
    }

    // Format the answer with better error handling
    const formattedAnswer = {
      id: Date.now(),
      documentId,
      question,
      answer: data.answer || data.content || data.message || 'No answer provided.',
      confidence: data.confidence || data.score || null,
      source_document: data.source_document || null,
      sources: data.sources || data.context || [],
      timestamp: new Date().toISOString(),
      metadata: data.metadata || {},
      rawData: data // Keep raw data for debugging
    };

    console.log('📝 Formatted answer:', formattedAnswer);
    
    setAnswer(formattedAnswer);

    // Add to history
    setAnswerHistory(prev => [formattedAnswer, ...prev.slice(0, 9)]);

    addNotification({
      type: 'success',
      message: 'Answer received!'
    });

    return formattedAnswer;
  } catch (error) {
    logger.error('Ask question error:', error);
    
    // More detailed error message
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Unknown error';
    
    setError(errorMessage);

    // Create error answer
    const errorAnswer = {
      id: Date.now(),
      documentId,
      question,
      answer: `Error: ${errorMessage}`,
      confidence: null,
      sources: [],
      timestamp: new Date().toISOString(),
      metadata: { 
        error: true,
        status: error.response?.status,
        rawError: error.toString()
      }
    };
    
    setAnswer(errorAnswer);

    addNotification({
      type: 'error',
      message: `Failed to get answer: ${errorMessage}`
    });
    
    // Don't re-throw if we want to show error in UI
    // throw error;
    return errorAnswer;
  } finally {
    setAsking(false);
  }
}, [addNotification, clearAnswer]);

  // Stream question to document (if supported)
  const streamQuestion = useCallback(async (documentId, question) => {
    try {
      setAsking(true);
      setIsStreaming(true);
      setError(null);
      setStreamingAnswer('');
      console.log(`🌊 Streaming question for document ${documentId}`);

      let fullAnswer = '';

      await qaService.streamDocumentQuestion(documentId, question, (chunk, completeAnswer) => {
        setStreamingAnswer(completeAnswer);
        fullAnswer = completeAnswer;
      });

      // AFTER STREAMING COMPLETE - Set the final answer
      const formattedAnswer = {
        id: Date.now(),
        documentId,
        question,
        answer: fullAnswer,
        confidence: null,
        sources: [],
        timestamp: new Date().toISOString(),
        metadata: { streamed: true }
      };

      setAnswer(formattedAnswer);
      setStreamingAnswer(''); // Clear streaming answer

      // Add to history
      setAnswerHistory(prev => [formattedAnswer, ...prev.slice(0, 9)]);

      addNotification({
        type: 'success',
        message: 'Streaming answer complete!'
      });

      return formattedAnswer;
    } catch (error) {
      logger.error('Stream question error:', error);
      setError(error.message);

      // Fallback to regular ask if streaming fails
      console.log('Streaming failed, falling back to regular ask');
      return await askQuestion(documentId, question);
    } finally {
      setAsking(false);
      setIsStreaming(false);
    }
  }, [askQuestion, addNotification]);

  // Remove document from RAG index
  const removeFromRAG = useCallback(async (documentId) => {
    try {
      setLoading(true);
      console.log(`🗑️ Removing document ${documentId} from RAG`);

      await qaService.removeDocumentFromRAG(documentId);

      // Remove from local documents list
      setDocuments(prev => prev.filter(doc => doc.document_id !== documentId));

      // Clear selected document if it's the removed one
      if (selectedDocument && selectedDocument.id === documentId) {
        setSelectedDocument(null);
      }

      addNotification({
        type: 'success',
        message: 'Document removed from RAG index successfully!'
      });

      return { success: true };
    } catch (error) {
      logger.error('Remove from RAG error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to remove document from RAG: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedDocument, addNotification]);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setAnswerHistory([]);
    setAnswer(null);
    setStreamingAnswer('');
    addNotification({
      type: 'info',
      message: 'Conversation history cleared'
    });
  }, [addNotification]);

  // Context value
  const value = {
    // State
    documents,
    selectedDocument,
    loading,
    error,
    asking,
    answer,
    answerHistory,
    streamingAnswer,
    isStreaming,

    // Actions
    fetchIngestedDocuments,
    fetchDocumentDetails,
    askQuestion,
    streamQuestion,
    removeFromRAG,
    clearHistory,
    clearAnswer,

    // Setters
    setSelectedDocument,
    clearError,
  };

  return (
    <QAContext.Provider value={value}>
      {children}
    </QAContext.Provider>
  );
};

export const useQA = () => {
  const context = useContext(QAContext);
  if (!context) {
    throw new Error('useQA must be used within a QAProvider');
  }
  return context;
};