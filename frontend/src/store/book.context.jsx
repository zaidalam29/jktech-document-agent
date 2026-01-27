import React, { createContext, useState, useContext, useCallback } from 'react';
import bookService from '../services/book.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const BookContext = createContext();

export const BookProvider = ({ children }) => {
  const { addNotification } = useApp();
  const [allBooks, setAllBooks] = useState([]);
  const [myBooks, setMyBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all books (public)
  const fetchAllBooks = useCallback(async (skip = 0, limit = 100) => {
    try {
      setLoading(true);
      setError(null);

      const books = await bookService.getAllBooks(skip, limit);
      setAllBooks(books);

      return books;
    } catch (error) {
      logger.error('Fetch all books error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load books: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Fetch my books
  const fetchMyBooks = useCallback(async (skip = 0, limit = 100) => {
    try {
      setLoading(true);
      setError(null);

      const books = await bookService.getMyBooks(skip, limit);
      setMyBooks(books);

      return books;
    } catch (error) {
      logger.error('Fetch my books error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load your books: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Fetch book details
  const fetchBookDetails = useCallback(async (bookId) => {
    try {
      setLoading(true);
      setError(null);

      const book = await bookService.getBookDetails(bookId);
      setSelectedBook(book);

      return book;
    } catch (error) {
      logger.error('Fetch book details error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to load book details: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Create book
  const createBook = useCallback(async (bookData) => {
    try {
      setLoading(true);
      setError(null);

      const newBook = await bookService.createBook(bookData);

      // Refresh my books
      await fetchMyBooks();

      addNotification({
        type: 'success',
        message: 'Book created successfully with AI summary!'
      });

      return newBook;
    } catch (error) {
      logger.error('Create book error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to create book: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchMyBooks, addNotification]);

  // Update book
  const updateBook = useCallback(async (bookId, bookData) => {
    try {
      setLoading(true);
      setError(null);

      const updatedBook = await bookService.updateBook(bookId, bookData);

      // Update local state
      setMyBooks(prev => prev.map(book =>
        book.id === bookId ? { ...book, ...updatedBook } : book
      ));

      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => ({ ...prev, ...updatedBook }));
      }

      addNotification({
        type: 'success',
        message: 'Book updated successfully!'
      });

      return updatedBook;
    } catch (error) {
      logger.error('Update book error:', error);
      setError(error.message);
      addNotification({
        type: 'error',
        message: `Failed to update book: ${error.message}`
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedBook, addNotification]);

  // Delete book
  // src/store/book.context.jsx में
  const deleteBook = async (bookId) => {
    try {
      console.log('Attempting to delete book:', bookId);

      const response = await bookService.deleteBook(bookId);

      if (response.cancelled) {
        console.log('Delete cancelled by user');
        return { cancelled: true };
      }

      if (response.notFound) {
        // Book not found - remove from local state anyway
        setAllBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));
        setMyBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));
        return { notFound: true };
      }

      if (response.success) {
        // Remove from local state
        setAllBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));
        setMyBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));

        // Clear selected book if it's the deleted one
        if (selectedBook && selectedBook.id === parseInt(bookId)) {
          setSelectedBook(null);
        }

        console.log('Book deleted successfully from local state');
        return { success: true, bookId };
      }

      return response;

    } catch (error) {
      console.error('Failed to delete book in context:', error);

      // Check if it's a 404 error
      if (error.status === 404) {
        // Still remove from local state
        setAllBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));
        setMyBooks(prev => prev.filter(book => book.id !== parseInt(bookId)));
        console.log('Book removed from local state after 404');
        return { notFound: true, bookId };
      }

      throw error;
    }
  };

  // Regenerate summary
  const regenerateSummary = useCallback(async (bookId) => {
    try {
      const result = await bookService.regenerateSummary(bookId);

      if (result.cancelled) {
        return;
      }

      // Refresh book details
      await fetchBookDetails(bookId);

      addNotification({
        type: 'success',
        message: 'AI summary regenerated successfully!'
      });

      return result;
    } catch (error) {
      logger.error('Regenerate summary error:', error);
      addNotification({
        type: 'error',
        message: `Failed to regenerate summary: ${error.message}`
      });
      throw error;
    }
  }, [fetchBookDetails, addNotification]);

  // Add review
  const addReview = useCallback(async (bookId, reviewData) => {
    try {
      const newReview = await bookService.addReview(bookId, reviewData);

      // Refresh book details to get updated reviews
      await fetchBookDetails(bookId);

      addNotification({
        type: 'success',
        message: 'Review added successfully!'
      });

      return newReview;
    } catch (error) {
      logger.error('Add review error:', error);
      addNotification({
        type: 'error',
        message: `Failed to add review: ${error.message}`
      });
      throw error;
    }
  }, [fetchBookDetails, addNotification]);

  // Open AI review model
  const openReviewModel = useCallback(async (bookId, prompt = '') => {
    try {
      const reviewData = await bookService.openReviewModel(bookId, prompt);

      if (reviewData) {
        await addReview(bookId, reviewData);
      }

      return reviewData;
    } catch (error) {
      logger.error('Open review model error:', error);
      throw error;
    }
  }, [addReview]);

  const value = {
    allBooks,
    myBooks,
    selectedBook,
    loading,
    error,
    fetchAllBooks,
    fetchMyBooks,
    fetchBookDetails,
    createBook,
    updateBook,
    deleteBook,
    regenerateSummary,
    addReview,
    openReviewModel,
    setSelectedBook,
    clearError: () => setError(null),
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
};

export const useBooks = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return context;
};