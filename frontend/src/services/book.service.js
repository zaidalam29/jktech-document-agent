import { getToken } from '../utils/token';
import logger from '../utils/logger';
import alerts from '../utils/alerts';

const API_BASE = import.meta.env.VITE_API_URL;

class BookService {
  /**
   * Generic API fetch method
   */
  async apiFetch(endpoint, options = {}) {
    const token = getToken();

    const defaultOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'omit',
    };

    if (options.body) {
      defaultOptions.body = JSON.stringify(options.body);
    }

    try {
      logger.debug('Book API Request:', { endpoint, method: defaultOptions.method });

      const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

      console.log('API Response Status:', response.status); // Debug log

      // Handle 204 No Content specially
      if (response.status === 204) {
        logger.debug('204 No Content received for:', endpoint);
        return {
          success: true,
          message: 'Operation completed successfully',
          status: 204
        };
      }

      // For other responses, try to parse JSON
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle API errors (new format)
      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.detail || data?.message || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        error.data = data;
        error.status = response.status;
        throw error;
      }

      logger.debug('Book API Success:', { endpoint, status: response.status });
      return data;

    } catch (error) {
      logger.error('Book API Fetch Error:', {
        endpoint,
        error: error.message,
        status: error.status
      });

      // Handle specific errors
      if (error.status === 404) {
        error.message = 'Book not found or already deleted.';
      } else if (error.message.includes('UNAUTHORIZED') || error.message.includes('Not authenticated')) {
        error.message = 'Session expired. Please login again.';
      } else if (error.message.includes('NOT_FOUND')) {
        error.message = 'Book not found.';
      } else if (error.message.includes('VALIDATION_ERROR')) {
        error.message = error.data?.errors?.[0]?.message || 'Validation failed.';
      }

      throw error;
    }
  }

  /**
   * Get all books (public)
   */
  async getAllBooks(skip = 0, limit = 100) {
    try {
      const data = await this.apiFetch(`/books?skip=${skip}&limit=${limit}`);

      // Handle new API format
      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to fetch books');
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error('Get all books failed:', error.message);
      throw error;
    }
  }

  /**
   * Get my books
   */
  async getMyBooks(skip = 0, limit = 100) {
    try {
      const data = await this.apiFetch(`/books/my-books?skip=${skip}&limit=${limit}`);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to fetch your books');
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error('Get my books failed:', error.message);
      throw error;
    }
  }

  /**
   * Get book details with reviews
   */
  async getBookDetails(bookId) {
    try {
      const data = await this.apiFetch(`/books/${bookId}/details`);

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Book not found');
      }

      return data;
    } catch (error) {
      logger.error('Get book details failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a new book
   */
  async createBook(bookData) {
    try {
      const data = await this.apiFetch('/books', {
        method: 'POST',
        body: {
          title: bookData.title,
          author: bookData.author,
          genre: bookData.genre,
          year_published: parseInt(bookData.year_published),
          content: bookData.content,
        },
      });

      // Show loading for LLM summary generation
      const loadingAlert = alerts.loading('Creating book and generating AI summary... Please wait');

      if (data?.success === false) {
        alerts.close();
        throw new Error(data?.error?.message || 'Failed to create book');
      }

      // Wait a bit for LLM processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      alerts.close();

      // Show success with summary
      if (data?.summary) {
        await alerts.success(
          'Book Created Successfully!',
          `AI Summary Generated: ${data.summary.substring(0, 200)}...`
        );
      } else {
        await alerts.success('Book Created!', 'Your book has been created successfully.');
      }

      return data;
    } catch (error) {
      alerts.close();
      logger.error('Create book failed:', error.message);
      throw error;
    }
  }

  /**
   * Update a book
   */
  async updateBook(bookId, bookData) {
    try {
      const data = await this.apiFetch(`/books/${bookId}`, {
        method: 'PUT',
        body: {
          title: bookData.title,
          author: bookData.author,
          genre: bookData.genre,
          year_published: bookData.year_published ? parseInt(bookData.year_published) : null,
          content: bookData.content,
        },
      });

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to update book');
      }

      await alerts.success('Book Updated!', 'Book has been updated successfully.');
      return data;
    } catch (error) {
      logger.error('Update book failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete a book
   */
  async deleteBook(bookId) {
    try {
      const result = await alerts.confirm(
        'Delete Book',
        'Are you sure you want to delete this book? This action cannot be undone.',
        'Delete',
        'Cancel'
      );

      if (!result.isConfirmed) {
        return { cancelled: true };
      }

      const loadingAlert = alerts.loading('Deleting book...');
      await this.apiFetch(`/books/${bookId}`, { method: 'DELETE' });
      alerts.close();

      await alerts.success('Deleted!', 'Book has been deleted successfully.');
      return { success: true };
    } catch (error) {
      alerts.close();
      logger.error('Delete book failed:', error.message);
      throw error;
    }
  }

  /**
   * Regenerate book summary using LLM
   */
  async regenerateSummary(bookId) {
    try {
      const result = await alerts.confirm(
        'Regenerate Summary',
        'This will generate a new AI summary using LLM. Continue?',
        'Regenerate',
        'Cancel'
      );

      if (!result.isConfirmed) {
        return { cancelled: true };
      }

      const loadingAlert = alerts.loading('Generating new AI summary... This may take a moment.');

      const data = await this.apiFetch(`/books/${bookId}/regenerate-summary`, {
        method: 'POST',
      });

      alerts.close();

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to regenerate summary');
      }

      await alerts.success('New Summary Generated!', 'AI has created a fresh summary for your book.');
      return data;
    } catch (error) {
      alerts.close();
      logger.error('Regenerate summary failed:', error.message);
      throw error;
    }
  }

  /**
   * Add a review to a book
   */
  async addReview(bookId, reviewData) {
    try {
      console.log('Adding review for book:', bookId, reviewData);

      const data = await this.apiFetch('/reviews', {
        method: 'POST',
        body: {
          book_id: parseInt(bookId),
          rating: parseInt(reviewData.rating),
          review_text: reviewData.review_text || reviewData.content,
        },
      });

      if (data?.success === false) {
        throw new Error(data?.error?.message || 'Failed to add review');
      }

      await alerts.success('Review Added!', 'Your review has been submitted.');
      return data;
    } catch (error) {
      logger.error('Add review failed:', error);
      throw error;
    }
  }

  /**
   * Delete a review
   */
  // async deleteReview(bookId, reviewId) {
  //   try {
  //     const result = await alerts.confirm(
  //       'Delete Review',
  //       'Are you sure you want to delete this review?',
  //       'Delete',
  //       'Cancel'
  //     );

  //     if (!result.isConfirmed) {
  //       return { cancelled: true };
  //     }

  //     const loadingAlert = alerts.loading('Deleting review...');
  //     await this.apiFetch(`/reviews/${reviewId}`, { method: 'DELETE' });
  //     alerts.close();

  //     await alerts.success('Review Deleted!', 'Review has been deleted successfully.');
  //     return { success: true };
  //   } catch (error) {
  //     alerts.close();
  //     logger.error('Delete review failed:', error);
  //     throw error;
  //   }
  // }


  /**
   * Open AI model for review generation
   */
  async openReviewModel(bookId, prompt = '') {
    try {
      // This would integrate with OpenRouter AI
      // For now, we'll show a modal with a textarea
      const { value: reviewText } = await alerts.fire({
        title: 'Write Your Review',
        html: `
          <div class="review-modal">
            <p>Writing review for Book ID: ${bookId}</p>
            <textarea 
              id="reviewText" 
              class="review-textarea" 
              placeholder="Write your detailed review here..."
              rows="6"
              style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"
            >${prompt}</textarea>
            <div class="rating-section" style="margin-top: 15px;">
              <label style="display: block; margin-bottom: 5px;">Rating:</label>
              <div class="star-rating" style="display: flex; gap: 5px;">
                ${[1, 2, 3, 4, 5].map(star => `
                  <button 
                    type="button" 
                    class="star-btn" 
                    data-rating="${star}"
                    style="background: none; border: none; font-size: 24px; cursor: pointer; color: #ddd;"
                    onmouseover="this.style.color='#ffc107'"
                    onmouseout="this.style.color='#ddd'"
                  >★</button>
                `).join('')}
              </div>
              <input type="hidden" id="ratingValue" value="5">
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Review',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
          const review = document.getElementById('reviewText').value;
          const rating = document.getElementById('ratingValue').value;

          if (!review.trim()) {
            alerts.showValidationMessage('Please write a review');
            return false;
          }

          return { review, rating: parseInt(rating) };
        },
        didOpen: () => {
          // Add star rating functionality
          const stars = document.querySelectorAll('.star-btn');
          const ratingInput = document.getElementById('ratingValue');

          stars.forEach(star => {
            star.addEventListener('click', () => {
              const rating = star.getAttribute('data-rating');
              ratingInput.value = rating;

              // Update star colors
              stars.forEach((s, index) => {
                s.style.color = index < rating ? '#ffc107' : '#ddd';
              });
            });
          });

          // Initialize with 5 stars
          stars.forEach((star, index) => {
            if (index < 5) {
              star.style.color = '#ffc107';
            }
          });
        }
      });

      if (reviewText) {
        return {
          review_text: reviewText.review,
          rating: reviewText.rating,
        };
      }

      return null;
    } catch (error) {
      logger.error('Open review model failed:', error);
      return null;
    }
  }
}

// Create singleton instance
const bookService = new BookService();

export { BookService };
export default bookService;