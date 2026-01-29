// src/services/admin.service.js
import { getToken } from '../utils/token';
import logger from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class AdminService {
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
      logger.debug('Admin API Request:', {
        endpoint,
        method: defaultOptions.method
      });

      const response = await fetch(`${API_BASE}${endpoint}`, defaultOptions);

      console.log('📡 Admin API Response Status:', response.status, 'URL:', endpoint);

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

      logger.debug('Admin API Success:', { endpoint, status: response.status });
      return data;

    } catch (error) {
      logger.error('Admin API Fetch Error:', {
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
      } else if (error.status === 404) {
        error.message = 'Resource not found.';
      } else if (error.message.includes('Failed to fetch')) {
        error.message = 'Network error. Please check your internet connection.';
      }

      throw error;
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(params = {}) {
    try {
      const { skip = 0, limit = 100, search } = params;

      const queryParams = new URLSearchParams();
      queryParams.append('skip', skip);
      queryParams.append('limit', limit);
      if (search) queryParams.append('search', search);

      console.log('👥 Fetching all users...');

      const data = await this.apiFetch(`/admin/users?${queryParams}`);

      console.log('Users fetched:', data.length || data?.users?.length || 0);

      return data;
    } catch (error) {
      logger.error('Get all users failed:', error);
      throw error;
    }
  }

  /**
   * Update user roles
   */
  async updateUserRoles(userId, roles) {
    try {
      console.log(`🔄 Updating roles for user ${userId}:`, roles);

      const data = await this.apiFetch(`/admin/users/${userId}/roles`, {
        method: 'PUT',
        body: { roles }
      });

      console.log('User roles updated:', data);

      return data;
    } catch (error) {
      logger.error('Update user roles failed:', error);
      throw error;
    }
  }

  /**
   * Toggle user active status
   */
  async toggleUserActiveStatus(userId) {
    try {
      console.log(`🔄 Toggling active status for user ${userId}`);

      const data = await this.apiFetch(`/admin/users/${userId}/toggle-active`, {
        method: 'PUT'
      });

      console.log('User active status toggled:', data);

      return data;
    } catch (error) {
      logger.error('Toggle user active status failed:', error);
      throw error;
    }
  }

  /**
   * Search users by email or name
   */
  async searchUsers(query) {
    try {
      console.log(`🔍 Searching users for: "${query}"`);

      const data = await this.apiFetch(`/admin/users?search=${encodeURIComponent(query)}`);

      console.log('Search results:', data.length || data?.users?.length || 0);

      return data;
    } catch (error) {
      logger.error('Search users failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const adminService = new AdminService();

export { AdminService };
export default adminService;