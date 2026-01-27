// src/components/books/ReviewsSection.jsx
import React, { useState } from 'react';
import { useAuth } from '../../store/auth.context';
import { useBooks } from '../../store/book.context';
import { useApp } from '../../store/app.context';
import Button from '../common/Button';
import { Star, User, ThumbsUp, MessageCircle, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import './ReviewsSection.css';

const ReviewsSection = ({ book }) => {
  const { user } = useAuth();
  const { addNotification } = useApp();
  const { addReview, deleteReview, likeReview } = useBooks();
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState({});

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newReview.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addReview(book.id, {
        content: newReview,
        rating: rating,
        userId: user.id,
      });
      setNewReview('');
      setRating(5);
      addNotification({
        type: 'success',
        message: 'Review submitted successfully!'
      });
    } catch (error) {
      console.error('Failed to submit review:', error);
      addNotification({
        type: 'error',
        message: 'Failed to submit review'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleLikeReview = async (reviewId) => {
  //   try {
  //     await likeReview(book.id, reviewId);
  //   } catch (error) {
  //     console.error('Failed to like review:', error);
  //   }
  // };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await deleteReview(book.id, reviewId);
      addNotification({
        type: 'success',
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete review:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete review'
      });
    }
  };

  const toggleReviewExpansion = (reviewId) => {
    setExpandedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            size={16}
            className={index < rating ? 'star-filled' : 'star-empty'}
            fill={index < rating ? 'currentColor' : 'none'}
          />
        ))}
      </div>
    );
  };

  // Get review content - check multiple possible field names
  const getReviewContent = (review) => {
    return review.review_text || review.content || review.review || '';
  };

  // Check if review is long enough to need "Read More"
  const isReviewLong = (review) => {
    const content = getReviewContent(review);
    return content.length > 300;
  };

  // Get display content for review
  const getDisplayContent = (review) => {
    const content = getReviewContent(review);
    const isLong = isReviewLong(review);
    const isExpanded = expandedReviews[review.id];
    
    if (isLong && !isExpanded) {
      return content.substring(0, 300) + '...';
    }
    return content;
  };

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h2>
          <MessageCircle size={24} />
          <span>Reviews ({book.reviews?.length || 0})</span>
        </h2>
        {book.reviews?.length > 0 && (
          <div className="average-rating">
            <div className="avg-rating-stars">
              {renderStars(Math.round(book.average_rating || 0))}
            </div>
            <span className="avg-rating-text">
              Average Rating: {book.average_rating?.toFixed(1) || '0.0'}/5
            </span>
            <span className="total-reviews">
              ({book.total_reviews || book.reviews?.length || 0} reviews)
            </span>
          </div>
        )}
      </div>

      {/* Add Review Form */}
      {user && (
        <form className="add-review-form" onSubmit={handleSubmitReview}>
          <div className="form-header">
            <h3>Write a Review</h3>
            <div className="rating-selector">
              <span>Your Rating:</span>
              <div className="rating-stars-input">
                {[...Array(5)].map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setRating(index + 1)}
                    className="star-input-btn"
                  >
                    <Star
                      size={20}
                      className={index < rating ? 'star-filled' : 'star-empty'}
                      fill={index < rating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
                <span className="rating-value">{rating}/5</span>
              </div>
            </div>
          </div>
          
          <div className="review-input-group">
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Share your thoughts about this book. What did you like or dislike? Would you recommend it to others?"
              rows={4}
              disabled={isSubmitting}
              className="review-textarea"
            />
            <div className="form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={!newReview.trim() || isSubmitting}
                loading={isSubmitting}
              >
                <Send size={16} />
                <span>Submit Review</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {book.reviews?.length > 0 ? (
          <>
            {/* Sort Controls */}
            {/* <div className="sort-controls">
              <span className="sort-label">Sort by:</span>
              <div className="sort-options">
                <button className="sort-btn active">Most Recent</button>
                <button className="sort-btn">Highest Rated</button>
                <button className="sort-btn">Most Helpful</button>
              </div>
            </div> */}

            {book.reviews.map((review) => {
              const isLong = isReviewLong(review);
              const isExpanded = expandedReviews[review.id];
              
              return (
                <div key={review.id} className="review-card">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <div className="avatar">
                        {review.user_avatar ? (
                          <img src={review.user_avatar} alt={review.userName} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="reviewer-details">
                        <h4>{review.userName || review.user_name || 'Anonymous'}</h4>
                        <div className="review-meta">
                          {renderStars(review.rating || 0)}
                          {/* <span className="review-date">
                            {new Date(review.created_at || review.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span> */}
                        </div>
                      </div>
                    </div>
                    
                    <div className="review-actions">
                      <button
                        className={`like-btn ${review.liked || review.is_liked ? 'liked' : ''}`}
                        onClick={() => handleLikeReview(review.id)}
                        title="Helpful"
                      >
                        <ThumbsUp size={16} />
                        <span>{review.likes || review.like_count || review.helpful_count || 0}</span>
                      </button>
                      
                      {/* {(user?.id === review.userId || user?.id === review.user_id) && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteReview(review.id)}
                          title="Delete review"
                        >
                          <Trash2 size={16} />
                        </button>
                      )} */}
                    </div>
                  </div>
                  
                  <div className="review-content">
                    <p>{getDisplayContent(review)}</p>
                    
                    {/* Read More/Less Button */}
                    {isLong && (
                      <button
                        className="read-more-btn"
                        onClick={() => toggleReviewExpansion(review.id)}
                      >
                        {isExpanded ? 'Show Less' : 'Read More...'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                  
                  {/* Review Stats */}
                  <div className="review-stats">
                    {review.verified_purchase && (
                      <span className="verified-badge">✓ Verified Purchase</span>
                    )}
                    {review.edited && (
                      <span className="edited-badge">(Edited)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="no-reviews">
            <MessageCircle size={48} />
            <h3>No reviews yet</h3>
            <p>Be the first to share your thoughts about this book!</p>
            {!user && (
              <div className="login-prompt">
                <p>Please login to add a review.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to login
                    window.location.href = '/login';
                  }}
                >
                  Login to Review
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Load More Button if there are more reviews */}
      {book.reviews?.length > 5 && (
        <div className="load-more-reviews">
          <Button variant="outline">
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;