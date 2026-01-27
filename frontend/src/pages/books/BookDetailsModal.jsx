import React, { useState, useEffect } from 'react';
import { useBooks } from '../../store/book.context';
import { useAuth } from '../../store/auth.context';
import Button from '../common/Button';
import Loader from '../common/Loader';
import ReviewForm from './ReviewForm';
import { 
  X, 
  BookOpen, 
  User, 
  Calendar, 
  Star, 
  Edit,
  RefreshCw,
  MessageSquare,
  Sparkles,
  ThumbsUp
} from 'lucide-react';
import './BookDetailsModal.css';

const BookDetailsModal = ({ bookId, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { 
    selectedBook, 
    fetchBookDetails, 
    loading,
    regenerateSummary,
    openReviewModel,
    addReview
  } = useBooks();
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (bookId) {
      fetchBookDetails(bookId);
    }
  }, [bookId, fetchBookDetails]);

  const handleRegenerateSummary = async () => {
    try {
      setIsRegenerating(true);
      await regenerateSummary(bookId);
    } catch (error) {
      console.error('Regenerate failed:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenAIReview = async () => {
    try {
      const prompt = `Write a review for the book "${selectedBook?.title}" by ${selectedBook?.author}. ` +
                    `Consider these points: plot, characters, writing style, and overall impact.`;
      
      await openReviewModel(bookId, prompt);
    } catch (error) {
      console.error('AI review failed:', error);
    }
  };

  const handleAddReview = async (reviewData) => {
    try {
      await addReview(bookId, reviewData);
      setShowReviewForm(false);
    } catch (error) {
      console.error('Add review failed:', error);
    }
  };

  if (loading && !selectedBook) {
    return (
      <div className="modal-overlay">
        <div className="details-modal loading-modal">
          <Loader size="large" text="Loading book details..." />
        </div>
      </div>
    );
  }

  if (!selectedBook) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="details-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Book Not Found</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="modal-body">
            <p>The book you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <BookOpen size={24} />
            <h2>{selectedBook.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            AI Summary
          </button>
          <button
            className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({selectedBook.total_reviews || 0})
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {activeTab === 'details' && (
            <div className="details-content">
              <div className="book-meta">
                <div className="meta-item">
                  <User size={16} />
                  <span>
                    <strong>Author:</strong> {selectedBook.author}
                  </span>
                </div>
                <div className="meta-item">
                  <Calendar size={16} />
                  <span>
                    <strong>Published:</strong> {selectedBook.year_published}
                  </span>
                </div>
                <div className="meta-item">
                  <BookOpen size={16} />
                  <span>
                    <strong>Genre:</strong> {selectedBook.genre}
                  </span>
                </div>
                {selectedBook.average_rating && (
                  <div className="meta-item">
                    <Star size={16} />
                    <span>
                      <strong>Rating:</strong> {selectedBook.average_rating}/5 
                      ({selectedBook.total_reviews} reviews)
                    </span>
                  </div>
                )}
              </div>

              <div className="book-content">
                <h3>Content</h3>
                <div className="content-text">
                  {selectedBook.content}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="summary-content">
              <div className="summary-header">
                <div className="ai-badge-large">
                  <Sparkles size={20} />
                  <span>AI Generated Summary</span>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={handleRegenerateSummary}
                  disabled={isRegenerating}
                  loading={isRegenerating}
                >
                  <RefreshCw size={14} />
                  <span>Regenerate with AI</span>
                </Button>
              </div>
              
              <div className="summary-text">
                {selectedBook.summary || 'No summary available'}
              </div>
              
              <div className="summary-note">
                <p>
                  <Sparkles size={14} />
                  <strong>Note:</strong> This summary was generated by LLaMA 3 AI model via OpenRouter. 
                  You can regenerate it for a fresh perspective.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-content">
              <div className="reviews-header">
                <h3>Reader Reviews</h3>
                {user && (
                  <div className="review-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      <MessageSquare size={14} />
                      <span>Write Review</span>
                    </Button>
                    
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleOpenAIReview}
                    >
                      <Sparkles size={14} />
                      <span>AI Review Assistant</span>
                    </Button>
                  </div>
                )}
              </div>

              {showReviewForm && (
                <ReviewForm
                  onSubmit={handleAddReview}
                  onCancel={() => setShowReviewForm(false)}
                />
              )}

              {selectedBook.reviews?.length > 0 ? (
                <div className="reviews-list">
                  {selectedBook.reviews.map(review => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-rating">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              fill={i < review.rating ? '#ffc107' : 'none'}
                              color={i < review.rating ? '#ffc107' : '#ddd'}
                            />
                          ))}
                          <span className="rating-number">{review.rating}/5</span>
                        </div>
                        <div className="review-user">
                          User #{review.user_id}
                        </div>
                      </div>
                      <div className="review-text">
                        {review.review_text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-reviews">
                  <MessageSquare size={48} />
                  <h4>No reviews yet</h4>
                  <p>Be the first to share your thoughts about this book!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {user && selectedBook.user_id === user.id && (
            <Button variant="primary" onClick={() => onUpdate()}>
              <Edit size={16} />
              <span>Edit Book</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetailsModal;