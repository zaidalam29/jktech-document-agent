import env from '../config/env';
import { setAuthData, clearAuthData, getToken, getRefreshToken } from '../utils/token';
import logger from '../utils/logger';

class AuthService {
  /**
   * Direct fetch method for all API calls - UPDATED FOR NEW ERROR FORMAT
   */
  async apiFetch(endpoint, options = {}) {
    const defaultOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'omit',
    };

    // Add body if present
    if (options.body) {
      defaultOptions.body = options.body;
    }

    try {
      logger.debug('API Request:', {
        endpoint,
        method: defaultOptions.method,
        url: endpoint,
      });

      const response = await fetch(endpoint, defaultOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // ✅ UPDATED: Handle error responses with new format
      if (!response.ok) {
        logger.error('API Error Response:', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          data,
        });

        // ✅ EXTRACT ERROR MESSAGE FROM NEW FORMAT
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        // Check for new error format: data.error.message
        if (data?.error?.message) {
          errorMessage = data.error.message;
        }
        // Check for old formats
        else if (data?.detail) {
          errorMessage = data.detail;
        }
        else if (data?.message) {
          errorMessage = data.message;
        }
        else if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        }

        // Throw error with extracted message
        const error = new Error(errorMessage);
        error.response = response;
        error.data = data;
        throw error;
      }

      logger.debug('API Success Response:', {
        endpoint,
        status: response.status,
        data: typeof data === 'string' ? data.substring(0, 100) + '...' : data,
      });

      return data;

    } catch (error) {
      logger.error('API Fetch Error:', {
        endpoint,
        error: error.message,
        stack: error.stack,
      });

      // Enhance error messages for CORS/network issues
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error(`Cannot connect to server at ${endpoint}. Please check:
        1. Backend is running on http://localhost:8000
        2. CORS is enabled in backend
        3. Try Chrome with --disable-web-security flag`);
      }

      throw error;
    }
  }

  /**
   * User Login - UPDATED FOR NEW ERROR FORMAT
   */
  async login(username, password) {
    try {
      // Validation
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      logger.info('Login attempt for:', username);

      const data = await this.apiFetch(env.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      console.log('🔍 Login API response:', data);

      // Check if API returned success: false (new format)
      if (data?.success === false) {
        console.log('⚠️ Login API returned success: false');
        throw new Error(data?.error?.message || 'Login failed');
      }

      if (data?.access_token && data?.user) {
        // Store data using token utilities
        setAuthData({
          accessToken: data.access_token,
          refreshToken: data?.refresh_token || null,
          user: data.user
        });

        console.log('✅ Login - Auth data stored:', {
          tokenStored: !!getToken(),
          userStored: !!localStorage.getItem('user'),
          user: data.user.username
        });

        logger.info('Login successful:', {
          username: data.user.username,
          userId: data.user.id
        });

        return {
          success: true,
          user: data.user,
          token: data.access_token,
          message: 'Login successful'
        };
      }

      // Handle case where response doesn't have expected structure
      console.warn('⚠️ Login response missing token or user:', data);
      throw new Error('Invalid response from server');

    } catch (error) {
      console.error('❌ Login failed:', {
        username,
        error: error.message
      });

      // ✅ SPECIFIC ERROR HANDLING FOR NEW API FORMAT
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes('incorrect username or password') ||
        errorMsg.includes('unauthorized') ||
        errorMsg.includes('invalid credentials')) {
        throw new Error('Incorrect username or password. Please try again.');
      }

      // Handle CORS/network errors
      if (errorMsg.includes('failed to fetch') ||
        errorMsg.includes('cors') ||
        errorMsg.includes('network') ||
        errorMsg.includes('cannot connect')) {
        throw new Error(`Cannot connect to login server. Please check:
        1. Backend is running on http://localhost:8000
        2. CORS is enabled in backend
        3. Try Chrome with --disable-web-security flag`);
      }

      // Handle server errors
      if (errorMsg.includes('500') || errorMsg.includes('internal server error')) {
        throw new Error('Server error. Please try again later.');
      }

      // Handle Bad Request
      if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
        throw new Error('Invalid login data. Please check your input.');
      }

      // Re-throw the original error for other cases
      throw error;
    }
  }

  /**
   * User Registration - UPDATED FOR NEW ERROR FORMAT
   */
  async register(username, password) {
    try {
      // Validation
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      logger.info('Registration attempt for:', username);

      console.log('📞 Calling registration endpoint:', env.AUTH.REGISTER);

      const data = await this.apiFetch(env.AUTH.REGISTER, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      console.log('🔍 Registration API response:', data);

      // Check if API returned success: false (new format)
      if (data?.success === false) {
        console.log('⚠️ Registration API returned success: false');
        throw new Error(data?.error?.message || 'Registration failed');
      }

      // SIMPLE: Just check if we have the data we need
      if (data?.access_token && data?.user) {
        // Store data using token utilities
        setAuthData({
          accessToken: data.access_token,
          refreshToken: data?.refresh_token || null,
          user: data.user
        });

        console.log('✅ Registration complete. Data stored:', {
          hasToken: !!getToken(),
          user: data.user.username,
          userId: data.user.id
        });

        // IMMEDIATE RETURN - NO FURTHER API CALLS
        return {
          success: true,
          user: data.user,
          token: data.access_token,
          message: 'Registration successful'
        };
      }

      // If response doesn't have token/user
      console.warn('⚠️ Registration response missing token or user:', data);
      throw new Error('Registration response incomplete');

    } catch (error) {
      console.error('❌ Registration failed:', {
        username,
        error: error.message
      });

      // ✅ SPECIFIC ERROR HANDLING FOR NEW API FORMAT
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes('username already registered') ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate')) {
        throw new Error('Username already exists. Please choose another one.');
      }

      // Handle Bad Request errors
      if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
        throw new Error('Invalid registration data. Please check your input.');
      }

      // Handle CORS/network errors
      if (errorMsg.includes('failed to fetch') ||
        errorMsg.includes('cors') ||
        errorMsg.includes('network') ||
        errorMsg.includes('cannot connect')) {
        throw new Error(`Cannot connect to registration server. Please check:
        1. Backend is running on http://localhost:8000
        2. CORS is enabled in backend
        3. Try Chrome with --disable-web-security flag`);
      }

      // Handle server errors
      if (errorMsg.includes('500') || errorMsg.includes('internal server error')) {
        throw new Error('Server error during registration. Please try again later.');
      }

      // Re-throw the original error for other cases
      throw error;
    }
  }

  /**
   * Get user details - CORS SAFE VERSION (UPDATED)
   */

  async getUserDetails() {
    try {
      const token = getToken();

      if (!token) {
        console.log('🟡 No token available for getUserDetails');
        throw new Error('Not authenticated');
      }

      console.log('🔍 Attempting to fetch user details...');
      console.log('📞 Calling endpoint:', env.AUTH.USER_DETAILS);

      const data = await this.apiFetch(env.AUTH.USER_DETAILS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('🔍 User details API response:', data);

      // ✅ Check if API returned success: false (unauthorized case)
      if (data?.success === false) {
        console.log('⚠️ getUserDetails returned success: false');

        if (data?.error?.code === 'UNAUTHORIZED' ||
          data?.error?.message?.includes('Not authenticated')) {
          console.log('🔒 Unauthorized, clearing auth data');
          clearAuthData();
          throw new Error('Not authenticated. Please login again.');
        }

        throw new Error(data?.error?.message || 'Failed to get user details');
      }

      // ✅ Success case - user data received
      if (data?.username) {
        console.log('✅ User details fetched:', {
          username: data.username,
          id: data.id,
          roles: data.roles
        });

        // ✅ Transform the data to match expected format
        const userData = {
          username: data.username,
          id: data.id,
          is_active: data.is_active || true,
          created_at: data.created_at,
          roles: this.transformRoles(data.roles) // Transform roles array
        };

        // Update localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ User data stored in localStorage');

        return userData;
      }

      // If response doesn't have expected structure
      console.warn('⚠️ Unexpected user details response:', data);
      throw new Error('Invalid user data received');

    } catch (error) {
      console.error('❌ getUserDetails error:', error.message);

      // Handle unauthorized errors
      if (error.message.includes('Not authenticated') ||
        error.message.includes('UNAUTHORIZED') ||
        error.message.includes('401')) {
        console.log('🔒 Clearing auth data due to authentication error');
        clearAuthData();
        throw new Error('Session expired. Please login again.');
      }

      // Handle CORS/network errors
      if (error.message.includes('Failed to fetch') ||
        error.message.includes('CORS') ||
        error.message.includes('Network')) {
        console.log('🔄 Network/CORS issue in getUserDetails');

        // Try to return cached user if available
        const cachedUser = this.getCurrentUser();
        if (cachedUser) {
          console.log('🔄 Returning cached user due to network error');
          return cachedUser;
        }

        throw new Error('Cannot connect to server. Please check your connection.');
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Transform roles array to match expected format
   */
  transformRoles(roles) {
    if (!roles || !Array.isArray(roles)) {
      return ['user']; // Default role
    }

    // If roles are objects with 'name' property
    if (roles.length > 0 && typeof roles[0] === 'object' && roles[0].name) {
      return roles.map(role => role.name);
    }

    // If roles are already strings
    return roles;
  }

  /**
   * User Logout - UPDATED
   */
  async logout() {
    try {
      const token = getToken();
      if (token) {
        try {
          const data = await this.apiFetch(env.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          // Check if API returned success: false (new format)
          if (data?.success === false) {
            console.log('⚠️ Logout API returned success: false (but continuing)', data);
          }
        } catch (err) {
          // Non-critical error - log but continue
          logger.warn('Logout API call failed (non-critical):', err.message);
        }
      }

      logger.info('Logout successful');
      return { success: true };

    } catch (error) {
      logger.error('Logout error:', error);
      return { success: false };

    } finally {
      // Always clear auth data from localStorage
      clearAuthData();
      console.log('✅ Auth data cleared from localStorage');
    }
  }

  /**
   * Validate session - UPDATED
   */
  async validateSession() {
    try {
      const token = getToken();
      console.log('🔍 validateSession - Token exists:', !!token);

      if (!token) return false;

      // Check token expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        console.log('🔍 Token expiration check:', {
          expiresAt: payload.exp,
          currentTime: currentTime,
          valid: payload.exp > currentTime
        });

        if (payload.exp < currentTime) {
          console.log('🛑 Token expired, clearing auth data');
          clearAuthData();
          return false;
        }
      } catch (parseError) {
        console.error('❌ Token parse error:', parseError);
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ Session validation failed:', error);
      clearAuthData();
      return false;
    }
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (user) {
        console.log('🔍 getCurrentUser found:', user.username || 'User');
      } else {
        console.log('🔍 getCurrentUser: no user found');
      }

      return user;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get current token
   */
  getCurrentToken() {
    const token = getToken();
    console.log('🔍 getCurrentToken:', token ? 'Token exists' : 'No token');
    return token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const authenticated = !!getToken() && !!this.getCurrentUser();
    console.log('🔍 isAuthenticated:', authenticated);
    return authenticated;
  }

  /**
   * Test API connection - for debugging
   */
  async testConnection() {
    try {
      console.log('🧪 Testing API connection...');

      // Try to reach a simple endpoint
      const response = await fetch(env.API_URL + '/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('🧪 Connection test result:', {
        status: response.status,
        ok: response.ok,
        url: env.API_URL + '/health'
      });

      return response.ok;
    } catch (error) {
      console.error('🧪 Connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

// Export for debugging
if (typeof window !== 'undefined') {
  window.authService = authService;
  console.log('🔧 authService available globally as window.authService');
}

export { AuthService };
export default authService;