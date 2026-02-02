// src/pages/recommendations/RecommendationsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  RefreshCw,
  Filter,
  X,
  BookOpen,
  User,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Eye,
  Tag,
  BarChart,
  Award,
  Clock
} from 'lucide-react';
import { useRecommendation } from '../../store/recommendation.context';
import Loader from '../../components/common/Loader';
import './RecommendationsPage.css';

function RecommendationsPage() {
  const {
    personalizedRecs,
    popularRecs,
    newReleases,
    loading,
    error,
    stats,
    filters,
    availableFilters,
    loadAllRecommendations,
    refreshRecommendations,
    fetchPersonalizedOnly,
    clearRecommendationCache,
    rateRecommendation,
    updateFilters,
    resetFilters,
    clearError
  } = useRecommendation();

  const [activeTab, setActiveTab] = useState('personalized');
  const [showFilters, setShowFilters] = useState(false);
  const [ratingBook, setRatingBook] = useState(null);

  // SIRF EK HI BAAR CALL - component mount par
  useEffect(() => {
    console.log('🎯 Component mounted - loading recommendations ONCE');
    loadAllRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = sirf ek baar

  // Tab change handler
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    
    // Agar koi data nahi hai to fetch karo
    if (tab === 'personalized' && personalizedRecs.length === 0 && !loading) {
      fetchPersonalizedOnly();
    }
  }, [personalizedRecs.length, loading, fetchPersonalizedOnly]);

  // Filter apply handler
  const handleApplyFilters = useCallback((newFilters) => {
    updateFilters(newFilters);
    fetchPersonalizedOnly(newFilters);
    setShowFilters(false);
  }, [updateFilters, fetchPersonalizedOnly]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await refreshRecommendations();
  }, [refreshRecommendations]);

  // Clear cache handler
  const handleClearCache = useCallback(async () => {
    await clearRecommendationCache();
  }, [clearRecommendationCache]);

  // Rate handler
  const handleRate = useCallback(async (bookId, rating) => {
    setRatingBook(bookId);
    try {
      await rateRecommendation(bookId, rating);
    } catch (error) {
      console.error('Rating error:', error);
    } finally {
      setRatingBook(null);
    }
  }, [rateRecommendation]);

  // Get active recommendations
  const getActiveRecommendations = () => {
    switch (activeTab) {
      case 'personalized':
        return personalizedRecs;
      case 'popular':
        return popularRecs;
      case 'new':
        return newReleases;
      default:
        return personalizedRecs;
    }
  };

  // Book Card Component (simplified)
  const BookCard = ({ book, type = 'personalized' }) => (
    <div className={`book-card ${type}`}>
      <div className="book-header">
        <div className="book-cover">
          {book.cover_image ? (
            <img src={book.cover_image} alt={book.title} className="cover-image" />
          ) : (
            <div className="cover-placeholder">
              <BookOpen className="placeholder-icon" />
            </div>
          )}
        </div>
        
        <div className="book-badges">
          {type === 'personalized' && (
            <span className="badge personalized">
              <Sparkles size={12} />
              For You
            </span>
          )}
          {book.genre && (
            <span className="badge genre">
              <Tag size={12} />
              {book.genre}
            </span>
          )}
        </div>
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">
          <User size={14} />
          {book.author || 'Unknown Author'}
        </p>
        
        {book.publication_year && (
          <div className="book-meta">
            <span className="meta-item">
              <Calendar size={14} />
              {book.publication_year}
            </span>
          </div>
        )}

        {book.rating && (
          <div className="book-rating">
            <span className="rating-text">⭐ {book.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="book-actions">
        <button
          onClick={() => handleRate(book.id || book.book_id, 5)}
          disabled={ratingBook === (book.id || book.book_id)}
          className="action-btn like"
          title="Like"
        >
          {ratingBook === (book.id || book.book_id) ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <ThumbsUp size={16} />
          )}
        </button>
        
        <button className="action-btn view" title="View Details">
          <Eye size={16} />
          Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="recommendations-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">
            <Sparkles className="title-icon" />
            Book Recommendations
          </h1>
          <p className="page-subtitle">
            Discover books tailored just for you
          </p>
        </div>
        <div className="header-right">
          <button
            onClick={handleRefresh}
            className="btn-refresh"
            disabled={loading}
          >
            <RefreshCw className={`refresh-icon ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <BarChart className="stat-icon" />
            <div>
              <p className="stat-value">{personalizedRecs.length}</p>
              <p className="stat-label">Personalized</p>
            </div>
          </div>
          <div className="stat-card">
            <TrendingUp className="stat-icon" />
            <div>
              <p className="stat-value">{popularRecs.length}</p>
              <p className="stat-label">Popular</p>
            </div>
          </div>
          <div className="stat-card">
            <Calendar className="stat-icon" />
            <div>
              <p className="stat-value">{newReleases.length}</p>
              <p className="stat-label">New</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-filters-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'personalized' ? 'active' : ''}`}
            onClick={() => handleTabChange('personalized')}
          >
            <Sparkles size={18} />
            Personalized
          </button>
          <button
            className={`tab ${activeTab === 'popular' ? 'active' : ''}`}
            onClick={() => handleTabChange('popular')}
          >
            <TrendingUp size={18} />
            Popular
          </button>
          <button
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => handleTabChange('new')}
          >
            <Calendar size={18} />
            New
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && personalizedRecs.length === 0 ? (
        <div className="loading-overlay">
          <Loader />
          <p>Finding perfect recommendations for you...</p>
        </div>
      ) : (
        <div className="recommendations-grid">
          {getActiveRecommendations().length === 0 ? (
            <div className="empty-state">
              <Sparkles className="empty-icon" />
              <h3>No Recommendations Found</h3>
              <button onClick={handleRefresh} className="btn-try-again">
                Try Again
              </button>
            </div>
          ) : (
            getActiveRecommendations().map((book, index) => (
              <BookCard
                key={book.id || book.book_id || index}
                book={book}
                type={activeTab}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default RecommendationsPage;