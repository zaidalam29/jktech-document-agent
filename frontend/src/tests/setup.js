// src/tests/setup.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    getAll: () => store
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
console.debug = vi.fn();
console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();


vi.mock('../config/env', () => ({
  default: {
    API_URL: 'http://localhost:8000/api/v1',
    AUTH: {
      LOGIN: 'http://localhost:8000/api/v1/auth/login',
      REGISTER: 'http://localhost:8000/api/v1/auth/signup',
      LOGOUT: 'http://localhost:8000/api/v1/auth/logout',
      USER_DETAILS: 'http://localhost:8000/api/v1/auth/me'
    },
    IS_DEVELOPMENT: true,
    LOG_LEVEL: 'debug'
  }
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock token utilities
// vi.mock('../utils/token', () => ({
//   setAuthData: vi.fn(),
//   clearAuthData: vi.fn(),
//   getToken: vi.fn(() => null),
//   getRefreshToken: vi.fn(() => null)
// }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),       // deprecated
    removeListener: vi.fn(),    // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.scrollTo = vi.fn();