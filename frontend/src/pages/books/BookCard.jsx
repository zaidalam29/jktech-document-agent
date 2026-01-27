// src/components/books/BookCard.jsx - UPDATED
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Star, 
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Sparkles
} from 'lucide-react';
import ROUTES from '../../config/routes';
import './BookCard.css';

const BookCard = ({ 
  book, 
  viewMode = 'grid',
  showActions = false
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Format summary for preview
  const formatSummary = (summary) => {
    if (!summary) return 'No summary available';
    const maxLength = viewMode === 'grid' ? 120 : 200;
    return summary.length > maxLength 
      ? `${summary.substring(0, maxLength)}...` 
      : summary;
  };

  // Get year color based on age
  const getYearColor = (year) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    if (age < 5) return '#10b981'; // Recent - Green
    if (age < 20) return '#f59e0b'; // Moderate - Yellow
    return '#ef4444'; // Old - Red
  };

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div className="book-card-grid">
        <div className="card-header">
          <div 
            className="book-year" 
            style={{ backgroundColor: getYearColor(book.year_published) }}
          >
            {book.year_published}
          </div>
          
          {showActions && (
            <div className="card-menu">
              <button
                className="menu-btn"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="More options"
              >
                <MoreVertical size={18} />
              </button>
              
              {showMenu && (
                <div className="dropdown-menu">
                  <Link to={`/books/${book.id}/edit`}>
                    <Edit size={14} />
                    Edit Book
                  </Link>
                  <button>
                    <RefreshCw size={14} />
                    Regenerate Summary
                  </button>
                  <button className="delete-btn">
                    <Trash2 size={14} />
                    Delete Book
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="card-body">
          <div className="book-icon">
            <BookOpen size={24} />
          </div>
          
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">
            <User size={14} />
            {book.author}
          </p>
          
          <div className="book-genre">{book.genre}</div>
          
          <p className="book-summary">{formatSummary(book.summary)}</p>
          
          {book.summary && (
            <div className="ai-badge">
              <Sparkles size={12} />
              AI Summary
            </div>
          )}
        </div>
        
        <div className="card-footer">
          <Link to={`/books/${book.id}`} className="view-link">
            <Button
              variant="outline"
              size="small"
              fullWidth
            >
              <Eye size={14} />
              View Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="book-card-list">
      <div className="list-left">
        <div className="list-icon">
          <BookOpen size={20} />
        </div>
        
        <div className="list-content">
          <div className="list-header">
            <h3>{book.title}</h3>
            <div 
              className="list-year" 
              style={{ backgroundColor: getYearColor(book.year_published) }}
            >
              {book.year_published}
            </div>
          </div>
          
          <div className="list-meta">
            <span className="meta-item">
              <User size={14} />
              {book.author}
            </span>
            <span className="meta-item">
              {book.genre}
            </span>
          </div>
          
          <p className="list-summary">{formatSummary(book.summary)}</p>
        </div>
      </div>
      
      <div className="list-right">
        <div className="list-actions">
          <Link to={`/books/${book.id}`}>
            <Button variant="ghost" size="small">
              <Eye size={14} />
              View
            </Button>
          </Link>
          
          {showActions && (
            <>
              <Button variant="ghost" size="small">
                <RefreshCw size={14} />
                AI
              </Button>
              
              <div className="more-menu">
                <button
                  className="more-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="More options"
                >
                  <MoreVertical size={18} />
                </button>
                
                {showMenu && (
                  <div className="dropdown-menu">
                    <Link to={`/books/${book.id}/edit`}>
                      <Edit size={14} />
                      Edit
                    </Link>
                    <button className="delete-btn">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;