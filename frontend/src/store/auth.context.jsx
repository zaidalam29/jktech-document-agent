import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/auth.service';
import { getToken } from '../utils/token';
import logger from '../utils/logger';

// Create context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      console.log('🔄 checkAuth called...');

      // First check localStorage directly
      const token = getToken();
      const userStr = localStorage.getItem('user');
      const parsedUser = userStr ? JSON.parse(userStr) : null;

      console.log('📋 LocalStorage check:', {
        hasToken: !!token,
        hasUser: !!parsedUser,
        user: parsedUser?.username
      });

      if (!token || !parsedUser) {
        console.log('🟡 No auth data in localStorage');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // We have token and user, set authenticated state
      console.log('Setting authenticated state from localStorage');
      setUser(parsedUser);
      setIsAuthenticated(true);
      setLoading(false);

      // OPTIONAL: Try to refresh user details in background
      setTimeout(async () => {
        try {
          console.log('🔄 Background: refreshing user details...');
          await authService.getUserDetails();
          const updatedUser = authService.getCurrentUser();
          if (updatedUser) {
            setUser(updatedUser);
          }
        } catch (bgError) {
          console.log('🔄 Background refresh failed (non-critical):', bgError.message);
        }
      }, 1000);

    } catch (error) {
      console.error('🔴 checkAuth error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();

    // Setup session timeout
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        logger.info('Session timeout check');
      }
    }, 30 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.login(username, password);

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true, user: result.user };
      }

      return { success: false, error: 'Login failed' };

    } catch (error) {
      setError(error.message);
      setIsAuthenticated(false);
      return { success: false, error: error.message };

    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      setError(null);
    }
  };

  // auth.context.jsx में
  const register = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      // Call authService.register
      const result = await authService.register(username, password);

      console.log('🔍 Registration result in context:', result);

      if (result.success) {
        console.log('Registration successful, updating context...');

        // Get user from localStorage (authService.register में store किया गया)
        const token = getToken();
        const userStr = localStorage.getItem('user');
        const parsedUser = userStr ? JSON.parse(userStr) : null;

        console.log('🔍 After registration localStorage:', {
          token: token?.substring(0, 20) + '...',
          user: parsedUser
        });

        if (token && parsedUser) {
          // Update context state
          setUser(parsedUser);
          setIsAuthenticated(true);
          setLoading(false);

          // Return success with user data
          return {
            success: true,
            user: parsedUser,
            message: result.message || 'Registration successful'
          };
        } else {
          // Fallback: use result.user if available
          if (result.user) {
            setUser(result.user);
            setIsAuthenticated(true);
            setLoading(false);
            return {
              success: true,
              user: result.user,
              message: result.message || 'Registration successful'
            };
          } else {
            throw new Error('Auth data not found after registration');
          }
        }
      } else {
        throw new Error(result.message || 'Registration failed');
      }

    } catch (error) {
      console.error('🔴 Registration error in context:', error);
      setError(error.message);
      setIsAuthenticated(false);
      setLoading(false);
      return {
        success: false,
        error: error.message
      };
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
    checkAuth,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export default AuthContext;