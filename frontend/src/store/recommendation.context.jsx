// src/store/recommendation.context.jsx - COMPLETE FIXED VERSION
import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import recommendationService from '../services/recommendation.service';
import { useApp } from './app.context';
import logger from '../utils/logger';

const RecommendationContext = createContext();

export const RecommendationProvider = ({ children }) => {
  const { addNotification } = useApp();

  // State
  const [allRecommendations, setAllRecommendations] = useState({
    personalized: [],
    popular: [],
    new: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    genre: '',
    author: '',
    year_from: null,
    year_to: null,
    min_rating: null,
    limit: 10
  });
  const [availableFilters, setAvailableFilters] = useState({
    genres: [],
    authors: [],
    yearRange: { min: 1900, max: new Date().getFullYear() },
    ratingRange: { min: 0, max: 5 }
  });

  // Refs for tracking
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({
      genre: '',
      author: '',
      year_from: null,
      year_to: null,
      min_rating: null,
      limit: 10
    });
  }, []);

  // MAIN FUNCTION: SINGLE API CALL - सभी data एक ही बार में fetch करेगा
  const fetchAllDataAtOnce = useCallback(async (forceRefresh = false) => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      console.log('⏳ Already loading, skipping duplicate call');
      return;
    }

    // Check cache - 5 minutes तक cache रहेगा
    const now = Date.now();
    if (!forceRefresh && (now - lastLoadTimeRef.current) < CACHE_DURATION) {
      console.log('📦 Using cached data');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      console.log('Fetching ALL recommendation data in ONE call...');

      // Parallel calls with Promise.allSettled
      const [personalizedData, popularData, newData, statsData] = await Promise.allSettled([
        recommendationService.getPersonalizedRecommendations({
          ...filters,
          limit: Math.min(filters.limit, 10) // छोटा limit for initial load
        }),
        recommendationService.getPopularRecommendations(6),
        recommendationService.getNewReleases(6),
        recommendationService.getRecommendationStats()
      ]);

      // Process results
      const recommendations = {
        personalized: personalizedData.status === 'fulfilled' 
          ? (personalizedData.value.recommendations || personalizedData.value.items || []) 
          : [],
        popular: popularData.status === 'fulfilled' 
          ? (popularData.value.recommendations || popularData.value.items || []) 
          : [],
        new: newData.status === 'fulfilled' 
          ? (newData.value.recommendations || newData.value.items || []) 
          : []
      };

      setAllRecommendations(recommendations);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }

      // Extract filters from personalized data
      if (personalizedData.status === 'fulfilled' && personalizedData.value.recommendations) {
        const books = personalizedData.value.recommendations;
        const genres = [...new Set(books.map(book => book.genre).filter(Boolean))].sort();
        const authors = [...new Set(books.map(book => book.author).filter(Boolean))].sort();
        
        if (genres.length > 0 || authors.length > 0) {
          setAvailableFilters(prev => ({
            ...prev,
            genres,
            authors
          }));
        }
      }

      lastLoadTimeRef.current = Date.now();
      isLoadingRef.current = false;

      addNotification({
        type: 'success',
        message: `Loaded ${recommendations.personalized.length} personalized, ${recommendations.popular.length} popular, and ${recommendations.new.length} new recommendations!`
      });

      return recommendations;

    } catch (error) {
      isLoadingRef.current = false;
      logger.error('Fetch all data error:', error);
      
      if (error.status !== 422) {
        setError(error.message);
        addNotification({
          type: 'error',
          message: `Failed to load recommendations: ${error.message}`
        });
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters, addNotification]);

  // SIMPLIFIED loadAllRecommendations - sirf ek function call karega
  const loadAllRecommendations = useCallback(async () => {
    return await fetchAllDataAtOnce(false);
  }, [fetchAllDataAtOnce]);

  // Refresh function - force refresh karega
  const refreshRecommendations = useCallback(async () => {
    console.log('🔄 Force refreshing all recommendations...');
    // Clear cache timestamp to force reload
    lastLoadTimeRef.current = 0;
    return await fetchAllDataAtOnce(true);
  }, [fetchAllDataAtOnce]);

  // Fetch ONLY personalized with filters (tab switch ke liye)
  const fetchPersonalizedOnly = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      
      const params = { 
        ...filters, 
        ...customFilters,
        limit: Math.min((customFilters.limit || filters.limit || 10), 50)
      };

      console.log('🔍 Fetching personalized only...');
      
      const data = await recommendationService.getPersonalizedRecommendations(params);
      const recommendations = data.recommendations || data.items || [];
      
      setAllRecommendations(prev => ({
        ...prev,
        personalized: recommendations
      }));

      return recommendations;
    } catch (error) {
      logger.error('Fetch personalized only error:', error);
      if (error.status !== 422) {
        setError(error.message);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Rate recommendation - LOCAL STORAGE VERSION
  const rateRecommendation = useCallback(async (bookId, rating, feedback = '') => {
    try {
      console.log(`⭐ Local rating for book ${bookId}:`, rating);
      
      // TEMPORARY FIX: Backend endpoint नहीं है, इसलिए local state update करें
      // Book को liked/disliked marked करें
      setAllRecommendations(prev => {
        const updatedPersonalized = prev.personalized.map(book => {
          if (book.id === bookId || book.book_id === bookId) {
            return {
              ...book,
              user_rating: rating,
              rated_at: new Date().toISOString(),
              rated: true
            };
          }
          return book;
        });
        
        return {
          ...prev,
          personalized: updatedPersonalized
        };
      });
      
      // Also save to local storage
      const userRatings = JSON.parse(localStorage.getItem('book_ratings') || '{}');
      userRatings[bookId] = {
        rating,
        feedback,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('book_ratings', JSON.stringify(userRatings));
      
      // Success notification
      addNotification({
        type: 'success',
        message: rating >= 4 ? 'Book liked!' : 'Book disliked!'
      });
      
      return { success: true, message: 'Rating saved locally' };
      
    } catch (error) {
      logger.error('Rate recommendation error:', error);
      return { success: false, error: error.message };
    }
  }, [addNotification]);

  // Clear cache
  const clearRecommendationCache = useCallback(async () => {
    try {
      await recommendationService.clearRecommendationCache();
      lastLoadTimeRef.current = 0; // Reset cache
      addNotification({
        type: 'success',
        message: 'Recommendation cache cleared!'
      });
      return { success: true };
    } catch (error) {
      logger.error('Clear cache error:', error);
      addNotification({
        type: 'error',
        message: `Failed to clear cache: ${error.message}`
      });
      throw error;
    }
  }, [addNotification]);

  // Get user ratings from localStorage
  const getUserRatings = useCallback(() => {
    return JSON.parse(localStorage.getItem('book_ratings') || '{}');
  }, []);

  // Context value - SIMPLIFIED
  const value = {
    // State
    personalizedRecs: allRecommendations.personalized,
    popularRecs: allRecommendations.popular,
    newReleases: allRecommendations.new,
    loading,
    error,
    stats,
    filters,
    availableFilters,

    // Actions - ONLY THESE MAIN FUNCTIONS
    loadAllRecommendations,    // Initial load (ONE TIME)
    refreshRecommendations,    // Force refresh
    fetchPersonalizedOnly,     // Filter changes ke liye
    
    // Other actions
    rateRecommendation,
    clearRecommendationCache,
    getUserRatings,
    updateFilters,
    resetFilters,
    clearError,
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendation = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendation must be used within a RecommendationProvider');
  }
  return context;
};