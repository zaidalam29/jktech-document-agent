import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const isValid = await authService.validateSession();
      
      if (isValid) {
        const userDetails = await authService.getUserDetails();
        setUser(userDetails);
      } else {
        setUser(null);
      }
      
    } catch (error) {
      setError(error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.login(username, password);
      
      if (result.success) {
        setUser(result.user);
        return { success: true, user: result.user };
      }
      
      return { success: false, error: 'Login failed' };
      
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
      
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.register(username, password);
      
      if (result.success && result.token) {
        // Auto-login after registration if token is returned
        const userDetails = await authService.getUserDetails();
        setUser(userDetails);
      }
      
      return result;
      
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
      
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    checkAuth,
    setUser,
  };
};