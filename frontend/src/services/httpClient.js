import axios from 'axios';
import env from '../config/env';
import { getToken, refreshToken, clearTokens } from '../utils/token';
import logger from '../utils/logger';

// Create axios instance
const httpClient = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // CORS settings
  withCredentials: false,
});

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log in development
    if (env.ENV === 'development') {
      logger.debug('API Request:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: config.baseURL + config.url
      });
    }
    
    return config;
  },
  (error) => {
    logger.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
httpClient.interceptors.response.use(
  (response) => {
    if (env.ENV === 'development') {
      logger.debug('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log full error details
    logger.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message,
      code: error.code,
      config: error.config
    });

    // Handle 500 errors
    if (error.response?.status === 500) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      'Internal server error';
      logger.error('Server 500 Error:', errorMsg);
      
      // Check if it's a CORS issue
      if (errorMsg.includes('CORS') || errorMsg.includes('Origin')) {
        throw new Error('CORS Error: Backend needs to enable CORS for localhost:5173');
      }
      
      throw new Error(`Server Error: ${errorMsg}`);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return httpClient(originalRequest);
        }
      } catch (refreshError) {
        logger.error('Token refresh failed:', refreshError);
      }
      
      clearTokens();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session=expired';
      }
    }

    // Format error message
    const apiError = error.response?.data?.detail || 
                     error.response?.data?.message || 
                     error.message || 
                     'Something went wrong';
    
    throw new Error(apiError);
  }
);

// Export API methods
export const api = {
  get: (url, config = {}) => httpClient.get(url, config),
  post: (url, data, config = {}) => httpClient.post(url, data, config),
  put: (url, data, config = {}) => httpClient.put(url, data, config),
  patch: (url, data, config = {}) => httpClient.patch(url, data, config),
  delete: (url, config = {}) => httpClient.delete(url, config),
  
  upload: (url, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return httpClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
};

export default httpClient;