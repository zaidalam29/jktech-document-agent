// src/components/books/BookDetailView.jsx
import React, { useState } from 'react';
import { Calendar, User, BookOpen, Tag, Globe, BarChart, Star, FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Button from '../common/Button';
import './BookDetailView.css';

const BookDetailView = ({ book, onRegenerateSummary }) => {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);
  
  // Check if summary is long enough to need "Read More"
  const isSummaryLong = book.summary && book.summary.length > 300;
  const displaySummary = isSummaryLong && !showFullSummary 
    ? book.summary.substring(0, 300) + '...' 
    : book.summary;
  
  // Check if content preview is long enough to need "Read More"
  const isContentLong = book.content && book.content.length > 500;
  const displayContent = isContentLong && !showFullContent 
    ? book.content.substring(0, 500) + '...' 
    : book.content;

  // Render rating stars
  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;
    
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} size={16} className="star-filled" fill="currentColor" />;
          } else if (index === fullStars && hasHalfStar) {
            return <Star key={index} size={16} className="star-filled" fill="currentColor" />;
          } else {
            return <Star key={index} size={16} className="star-empty" fill="none" />;
          }
        })}
        <span className="rating-value">{(book.average_rating || 0).toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="book-detail-view">
      {/* Header with Book Info and Regenerate Button */}
      <div className="detail-header">
        <div className="header-top">
          <h1 className="book-title">{book.title}</h1>
          <div className="header-actions">
            {/* <Button
              variant="outline"
              size="small"
              onClick={() => onRegenerateSummary && onRegenerateSummary(book.id)}
              title="Regenerate AI Summary"
            >
              <RefreshCw size={16} />
              <span>Regenerate Summary</span>
            </Button> */}
          </div>
        </div>
        
        <div className="detail-header-content">
          
          
          <div className="detail-info">
            <p className="author">
              <User size={18} />
              <span>By {book.author || 'Unknown Author'}</span>
            </p>
            
            <div className="detail-meta">
              <div className="meta-item">
                <Calendar size={18} />
                <div>
                  <span className="meta-label">Published Year</span>
                  <span className="meta-value">{book.year_published || 'N/A'}</span>
                </div>
              </div>
              
              <div className="meta-item">
                <Tag size={18} />
                <div>
                  <span className="meta-label">Genre</span>
                  <span className="meta-value">{book.genre || 'Not specified'}</span>
                </div>
              </div>
              
              {/* <div className="meta-item">
                <Globe size={18} />
                <div>
                  <span className="meta-label">Language</span>
                  <span className="meta-value">{book.language || 'English'}</span>
                </div>
              </div> */}
              
              <div className="meta-item">
                <BarChart size={18} />
                <div>
                  <span className="meta-label">Reading Level</span>
                  <span className="meta-value">{book.reading_level || 'Intermediate'}</span>
                </div>
              </div>
              
              {/* <div className="meta-item">
                <FileText size={18} />
                <div>
                  <span className="meta-label">Pages</span>
                  <span className="meta-value">{book.page_count || 'N/A'}</span>
                </div>
              </div> */}
            </div>
            
            {/* <div className="detail-stats"> */}
              {/* <div className="stat">
                <span className="stat-label">Rating</span>
                <div className="stat-value">
                  {renderRatingStars(book.average_rating || 0)}
                </div>
              </div> */}
              
              {/* <div className="stat">
                <span className="stat-label">Reviews</span>
                <span className="stat-value">{book.reviews_count || 0}</span>
              </div>
              
              <div className="stat">
                <span className="stat-label">Chapters</span>
                <span className="stat-value">{book.chapter_count || 'N/A'}</span>
              </div>
              
              <div className="stat">
                <span className="stat-label">Reading Time</span>
                <span className="stat-value">
                  {book.reading_time ? `${book.reading_time} mins` : 'N/A'}
                </span>
              </div> */}
            {/* </div> */}
          </div>
        </div>
      </div>
      
      {/* Content Sections */}
      <div className="detail-content">
        {/* Summary Section with Read More */}
        <div className="section">
          <div className="section-header">
            <h2>AI Generated Summary</h2>
            <Button
              variant="outline"
              size="small"
              onClick={() => onRegenerateSummary && onRegenerateSummary(book.id)}
              title="Regenerate AI Summary"
            >
              <RefreshCw size={16} />
              <span>Regenerate Summary</span>
            </Button>
          </div>
          <div className="summary-content">
            {book.summary ? (
              <>
                <p>{displaySummary}</p>
                {isSummaryLong && (
                  <button
                    className="read-more-btn"
                    onClick={() => setShowFullSummary(!showFullSummary)}
                  >
                    {showFullSummary ? 'Show Less' : 'Read More...'}
                    {showFullSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </>
            ) : (
              <div className="no-summary">
                <p>No summary available for this book.</p>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => onRegenerateSummary && onRegenerateSummary(book.id)}
                  className="generate-summary-btn"
                >
                  <RefreshCw size={14} />
                  Generate AI Summary
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Content Preview with Read More */}
        <div className="section">
          <h2>Book Content Preview</h2>
          <div className="content-preview">
            {book.content ? (
              <>
                <div className="preview-text">
                  {displayContent}
                </div>
                {isContentLong && (
                  <button
                    className="read-more-btn"
                    onClick={() => setShowFullContent(!showFullContent)}
                  >
                    {showFullContent ? 'Show Less' : 'Read More...'}
                    {showFullContent ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </>
            ) : (
              <p className="no-content">No content preview available.</p>
            )}
          </div>
        </div>
        
        {/* Key Features/Themes */}
        {book.key_themes && book.key_themes.length > 0 && (
          <div className="section">
            <h2>Key Themes & Features</h2>
            <div className="features">
              <ul className="features-list">
                {book.key_themes.map((theme, index) => (
                  <li key={index}>
                    <div className="theme-item">
                      <div className="theme-bullet"></div>
                      <span>{theme}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Additional Info */}
        <div className="section additional-info">
          <h2>Additional Information</h2>
          <div className="info-grid">
            {book.publisher && (
              <div className="info-item">
                <span className="info-label">Publisher</span>
                <span className="info-value">{book.publisher}</span>
              </div>
            )}
            
            {book.isbn && (
              <div className="info-item">
                <span className="info-label">ISBN</span>
                <span className="info-value">{book.isbn}</span>
              </div>
            )}
            
            {book.edition && (
              <div className="info-item">
                <span className="info-label">Edition</span>
                <span className="info-value">{book.edition}</span>
              </div>
            )}
            
            {book.format && (
              <div className="info-item">
                <span className="info-label">Format</span>
                <span className="info-value">{book.format}</span>
              </div>
            )}
            
            {book.created_at && (
              <div className="info-item">
                <span className="info-label">Added On</span>
                <span className="info-value">
                  {new Date(book.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {book.updated_at && (
              <div className="info-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">
                  {new Date(book.updated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailView;