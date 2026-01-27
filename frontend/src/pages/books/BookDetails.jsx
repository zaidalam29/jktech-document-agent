// src/pages/books/BookDetails.jsx
import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBooks } from '../../store/book.context';
import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';
import BookDetailView from '../../components/books/BookDetailView';
import ReviewsSection from '../../components/books/ReviewsSection';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';

import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Printer,
  Share2
} from 'lucide-react';
import ROUTES from '../../config/routes';
import './BookDetails.css';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useApp();
  const {
    selectedBook,
    loading,
    fetchBookDetails,
    deleteBook,
    regenerateSummary
  } = useBooks();

  useEffect(() => {
    if (id) {
      fetchBookDetails(id);
    }
  }, [id, fetchBookDetails]);

  const handleDeleteBook = async () => {
    if (!selectedBook || !window.confirm(`Are you sure you want to delete "${selectedBook.title}"?`)) {
      return;
    }

    try {
      await deleteBook(selectedBook.id);
      addNotification({
        type: 'success',
        message: 'Book deleted successfully'
      });
      navigate(ROUTES.PRIVATE.BOOKS.LIST);
    } catch (error) {
      console.error('Failed to delete book:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete book'
      });
    }
  };

  const handleRegenerateSummary = async (bookId) => {
    try {
      await regenerateSummary(bookId);
      addNotification({
        type: 'success',
        message: 'AI summary regenerated successfully'
      });
      // Refresh book details
      fetchBookDetails(id);
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      addNotification({
        type: 'error',
        message: 'Failed to regenerate summary'
      });
    }
  };

  const handleEditBook = () => {

    // Replace :id with actual book ID
    const editRoute = ROUTES.PRIVATE.BOOKS.EDIT.replace(':id', selectedBook.id);
    navigate(editRoute, { replace: true });
  };

  const handleShareBook = () => {
    if (navigator.share && selectedBook) {
      navigator.share({
        title: selectedBook.title,
        text: `Check out "${selectedBook.title}" by ${selectedBook.author}`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      addNotification({
        type: 'info',
        message: 'Link copied to clipboard!'
      });
    }
  };

  const handleExportBook = () => {
    if (!selectedBook) return;

    const bookData = {
      title: selectedBook.title,
      author: selectedBook.author,
      genre: selectedBook.genre,
      year_published: selectedBook.year_published,
      summary: selectedBook.summary,
      content: selectedBook.content,
      export_date: new Date().toISOString()
    };

    const dataStr = JSON.stringify(bookData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedBook.title.replace(/\s+/g, '_')}_export.json`;
    link.click();

    addNotification({
      type: 'success',
      message: 'Book data exported successfully'
    });
  };

  if (loading) {
    return (
      <div className="book-details-loading">
        <Loader size="large" text="Loading book details..." />
      </div>
    );
  }

  if (!selectedBook) {
    return (
      <div className="book-details-not-found">
        <h2>Book not found</h2>
        <p>The book you're looking for doesn't exist or has been removed.</p>
        <Link to={ROUTES.PRIVATE.BOOKS.LIST} className="back-button">
          <ArrowLeft size={16} />
          <span>Back to Books Library</span>
        </Link>
      </div>
    );
  }

  const isOwner = user && selectedBook.user_id === user.id;

  return (
    <div className="book-details-page">
      <div className="page-container">
        {/* Header with Navigation and Actions */}
        <div className="page-header">
          <div className="header-left">
            <Link to={ROUTES.PRIVATE.BOOKS.LIST} className="back-link">
              <ArrowLeft size={18} />
              <span>Back to Books</span>
            </Link>
          </div>

          <div className="header-right">
            <div className="action-buttons">
              {/* <Button
                variant="outline"
                size="small"
                onClick={handleShareBook}
                title="Share Book"
              >
                <Share2 size={16} />
                <span>Share</span>
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={handleExportBook}
                title="Export Book Data"
              >
                <Download size={16} />
                <span>Export</span>
              </Button>
              
              <Button
                variant="outline"
                size="small"
                onClick={() => window.print()}
                title="Print Details"
              >
                <Printer size={16} />
                <span>Print</span>
              </Button> */}

              {isOwner && (
                <>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={handleEditBook}
                    title="Edit Book"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="small"
                    onClick={handleDeleteBook}
                    title="Delete Book"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="page-content">
          <BookDetailView
            book={selectedBook}
            onRegenerateSummary={handleRegenerateSummary}
          />
          <ReviewsSection book={selectedBook} />
        </div>
      </div>
    </div>
  );
};

export default BookDetails;