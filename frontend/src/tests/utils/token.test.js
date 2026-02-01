// src/tests/utils/token.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import { 
  setAuthData, 
  getToken, 
  getRefreshToken, 
  clearAuthData,
  refreshToken,
  clearTokens 
} from '../../utils/token';

// Store original localStorage methods
const originalLocalStorage = {
  getItem: global.localStorage.getItem,
  setItem: global.localStorage.setItem,
  removeItem: global.localStorage.removeItem,
  clear: global.localStorage.clear
};

describe('Token Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('setAuthData', () => {
    test('should set access token in localStorage', () => {
      const authData = {
        accessToken: 'test_access_token_123',
        user: { id: 1, username: 'test' }
      };
      
      setAuthData(authData);
      
      expect(localStorage.getItem('accessToken')).toBe('test_access_token_123');
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1, username: 'test' }));
    });

    test('should set refresh token when provided', () => {
      const authData = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token_456',
        user: { id: 1 }
      };
      
      setAuthData(authData);
      
      expect(localStorage.getItem('accessToken')).toBe('access_token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh_token_456');
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1 }));
    });

    test('should handle partial data - only access token', () => {
      setAuthData({ accessToken: 'token_only' });
      
      expect(localStorage.getItem('accessToken')).toBe('token_only');
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    test('should handle partial data - only user', () => {
      const user = { username: 'testuser', id: 1 };
      setAuthData({ user });
      
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    });

    test('should handle empty object', () => {
      setAuthData({});
      
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getToken', () => {
    test('should return access token from localStorage', () => {
      localStorage.setItem('accessToken', 'test_token_123');
      
      const token = getToken();
      
      expect(token).toBe('test_token_123');
    });

    test('should return null when no access token exists', () => {
      const token = getToken();
      
      expect(token).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    test('should return refresh token from localStorage', () => {
      localStorage.setItem('refreshToken', 'refresh_token_456');
      
      const token = getRefreshToken();
      
      expect(token).toBe('refresh_token_456');
    });

    test('should return null when no refresh token exists', () => {
      const token = getRefreshToken();
      
      expect(token).toBeNull();
    });
  });

  describe('clearAuthData', () => {
    test('should clear all auth data from localStorage', () => {
      // Set up some data
      localStorage.setItem('accessToken', 'test_token');
      localStorage.setItem('refreshToken', 'refresh_token');
      localStorage.setItem('user', JSON.stringify({ username: 'test' }));
      localStorage.setItem('otherData', 'should remain');
      
      clearAuthData();
      
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('otherData')).toBe('should remain');
    });

    test('should work when no auth data exists', () => {
      // Should not throw any errors
      expect(() => clearAuthData()).not.toThrow();
    });
  });

  describe('backward compatibility functions', () => {
    test('refreshToken should be alias of getRefreshToken', () => {
      localStorage.setItem('refreshToken', 'test_refresh');
      
      const result1 = getRefreshToken();
      const result2 = refreshToken();
      
      expect(result1).toBe('test_refresh');
      expect(result2).toBe('test_refresh');
      // Check they reference the same function
      expect(refreshToken).toBe(getRefreshToken);
    });

    test('clearTokens should be alias of clearAuthData', () => {
      localStorage.setItem('accessToken', 'test_token');
      
      clearTokens();
      
      expect(localStorage.getItem('accessToken')).toBeNull();
      // Check they reference the same function
      expect(clearTokens).toBe(clearAuthData);
    });
  });

  describe('integration', () => {
    test('complete auth flow: set, get, clear', () => {
      // Set auth data
      const authData = {
        accessToken: 'access_123',
        refreshToken: 'refresh_456',
        user: { id: 1, username: 'test' }
      };
      
      setAuthData(authData);
      
      // Verify data was set
      expect(getToken()).toBe('access_123');
      expect(getRefreshToken()).toBe('refresh_456');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 1, username: 'test' });
      
      // Clear data
      clearAuthData();
      
      // Verify data was cleared
      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    test('should handle complex user object', () => {
      const complexUser = {
        id: 1,
        username: 'testuser',
        roles: ['admin', 'user'],
        preferences: { theme: 'dark', notifications: true },
        created_at: '2023-01-01T00:00:00Z'
      };
      
      setAuthData({ accessToken: 'token', user: complexUser });
      
      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser).toEqual(complexUser);
    });
  });
});