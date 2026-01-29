// src/services/recommendation.service.js
import { getToken } from '../utils/token';
import logger from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class RecommendationService {
    /**
     * Generic API fetch with auth token
     */
    async apiFetch(endpoint, options = {}) {
        const token = getToken();

        if (!token) {
            throw new Error('No authentication token found. Please login again.');
        }

        const defaultOptions = {
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            mode: 'cors',
            credentials: 'omit',
        };

        if (options.body) {
            defaultOptions.body = JSON.stringify(options.body);
        }

        try {
            logger.debug('Recommendation API Request:', {
                endpoint,
                method: defaultOptions.method
            });

            const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

            console.log('📡 Recommendation API Response Status:', response.status, 'URL:', endpoint);

            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                try {
                    data = await response.json();
                } catch {
                    data = await response.text();
                }
            }

            if (!response.ok) {
                const errorMessage = data?.error?.message || data?.detail || data?.message || `HTTP ${response.status}`;
                const error = new Error(errorMessage);
                error.data = data;
                error.status = response.status;
                throw error;
            }

            logger.debug('Recommendation API Success:', { endpoint, status: response.status });
            return data;

        } catch (error) {
            logger.error('Recommendation API Fetch Error:', {
                endpoint,
                error: error.message,
                status: error.status
            });

            // Handle specific errors
            if (error.status === 401) {
                error.message = 'Session expired. Please login again.';
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else if (error.status === 403) {
                error.message = 'You do not have permission to access this resource.';
            } else if (error.message.includes('Failed to fetch')) {
                error.message = 'Network error. Please check your internet connection.';
            }

            throw error;
        }
    }

    /**
     * Get personalized recommendations
     */
    async getPersonalizedRecommendations(params = {}) {
        try {
            const {
                limit = 10,
                genre = null,
                author = null,
                year_from = null,
                year_to = null,
                min_rating = null,
                force_refresh = false
            } = params;

            const validatedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

            const queryParams = new URLSearchParams();
            queryParams.append('limit', validatedLimit);

            if (genre && typeof genre === 'string' && genre.trim()) {
                queryParams.append('genre', genre.trim());
            }

            if (author && typeof author === 'string' && author.trim()) {
                queryParams.append('author', author.trim());
            }

            if (year_from && !isNaN(year_from)) {
                queryParams.append('year_from', parseInt(year_from));
            }

            if (year_to && !isNaN(year_to)) {
                queryParams.append('year_to', parseInt(year_to));
            }

            if (min_rating && !isNaN(min_rating)) {
                queryParams.append('min_rating', parseFloat(min_rating));
            }

            queryParams.append('force_refresh', Boolean(force_refresh));

            console.log('📡 API Call:', `/recommendations/?${queryParams}`);

            const data = await this.apiFetch(`/recommendations/?${queryParams}`);

            console.log('Success:', data.recommendations?.length || 0, 'recommendations');

            return data;
        } catch (error) {
            // Specific error handling
            if (error.status === 422) {
                console.error('422 Validation Error:', error.data);

                // Try with default parameters
                console.log('Retrying with default parameters...');
                const defaultParams = new URLSearchParams();
                defaultParams.append('limit', 10);
                defaultParams.append('force_refresh', false);

                return await this.apiFetch(`/recommendations/?${defaultParams}`);
            }

            logger.error('Get personalized recommendations failed:', error);
            throw error;
        }
    }

    /**
     * Get popular recommendations
     */
    async getPopularRecommendations(limit = 10) {
        try {
            console.log('Fetching popular recommendations...');

            const data = await this.apiFetch(`/recommendations/popular?limit=${limit}`);

            console.log('Popular recommendations:', data.recommendations?.length || 0);

            return data;
        } catch (error) {
            logger.error('Get popular recommendations failed:', error);
            throw error;
        }
    }

    /**
     * Get new releases
     */
    async getNewReleases(limit = 10) {
        try {
            console.log('Fetching new releases...');

            const data = await this.apiFetch(`/recommendations/new?limit=${limit}`);

            console.log('New releases:', data.recommendations?.length || 0);

            return data;
        } catch (error) {
            logger.error('Get new releases failed:', error);
            throw error;
        }
    }

    /**
     * Clear recommendation cache
     */
    async clearRecommendationCache() {
        try {
            console.log('Clearing recommendation cache...');

            const data = await this.apiFetch(`/recommendations/clear-cache`, {
                method: 'POST'
            });

            console.log('Cache cleared:', data);

            return data;
        } catch (error) {
            logger.error('Clear recommendation cache failed:', error);
            throw error;
        }
    }

    /**
     * Get recommendation stats
     */
    async getRecommendationStats() {
        try {
            console.log(' Fetching recommendation stats...');

            const data = await this.apiFetch(`/recommendations/stats`);

            console.log('Stats fetched:', data);

            return data;
        } catch (error) {
            logger.error('Get recommendation stats failed:', error);
            throw error;
        }
    }

    /**
     * Get available filters (genres, authors, etc.)
     */
    async getAvailableFilters() {
        try {
            console.log(' Fetching available filters...');

            // Get recommendations to extract filters
            const recommendations = await this.getPersonalizedRecommendations({ limit: 100 });

            // Extract unique genres and authors
            const books = recommendations.recommendations || [];
            const genres = [...new Set(books.map(book => book.genre).filter(Boolean))].sort();
            const authors = [...new Set(books.map(book => book.author).filter(Boolean))].sort();

            // Extract years range
            const years = books.map(book => book.publication_year).filter(year => year && !isNaN(year));
            const minYear = years.length > 0 ? Math.min(...years) : 1900;
            const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

            return {
                genres,
                authors,
                yearRange: { min: minYear, max: maxYear },
                ratingRange: { min: 0, max: 5 }
            };
        } catch (error) {
            logger.error('Get available filters failed:', error);
            return {
                genres: [],
                authors: [],
                yearRange: { min: 1900, max: new Date().getFullYear() },
                ratingRange: { min: 0, max: 5 }
            };
        }
    }

    /**
     * Rate a recommendation (like/dislike)
     */
    async rateRecommendation(bookId, rating, feedback = '') {
        try {
            console.log(`⭐ Rating recommendation for book ${bookId}:`, rating);

            const userRatings = JSON.parse(localStorage.getItem('book_ratings') || '{}');
            userRatings[bookId] = {
                rating,
                feedback,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('book_ratings', JSON.stringify(userRatings));

            console.log('Rating saved locally:', userRatings[bookId]);

            // Simulate API response
            return {
                success: true,
                message: 'Rating saved locally',
                data: {
                    book_id: bookId,
                    rating,
                    feedback,
                    timestamp: new Date().toISOString()
                }
            };

            // COMMENT OUT the actual API call (temporarily)
            /*
            const data = await this.apiFetch(`/recommendations/${bookId}/rate`, {
              method: 'POST',
              body: { rating, feedback }
            });
        
            console.log('Rating submitted:', data);
        
            return data;
            */

        } catch (error) {
            logger.error('Rate recommendation failed:', error);

            // Don't throw error - return success for local storage
            console.log('⚠️ Using local storage for rating');

            // Save to local storage as fallback
            const userRatings = JSON.parse(localStorage.getItem('book_ratings') || '{}');
            userRatings[bookId] = {
                rating,
                feedback,
                timestamp: new Date().toISOString(),
                local_fallback: true
            };

            localStorage.setItem('book_ratings', JSON.stringify(userRatings));

            return {
                success: true,
                message: 'Rating saved locally (fallback)',
                local_fallback: true
            };
        }
    }
}

// Create singleton instance
const recommendationService = new RecommendationService();

export { RecommendationService };
export default recommendationService;