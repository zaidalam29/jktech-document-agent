import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* =======================
   MOCKS (TOP LEVEL ONLY)
======================= */

// token utils
vi.mock('../../utils/token', () => ({
  getToken: vi.fn(),
  clearAuthData: vi.fn(),
  setAuthData: vi.fn(),
}));

// alerts
vi.mock('../../utils/alerts', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// logger
vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// auth service
vi.mock('../../services/auth.service', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getUserDetails: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
    validateSession: vi.fn(),
  },
}));

/* =======================
   IMPORTS AFTER MOCKS
======================= */

import { AuthProvider, useAuth } from '../../store/auth.context';
import authService from '../../services/auth.service';

/* =======================
   TEST COMPONENT
======================= */

const TestComponent = () => {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="user">
        {auth.user?.username || 'No user'}
      </div>

      <div data-testid="auth">
        {auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>

      <button
        data-testid="login-btn"
        onClick={() => auth.login('testuser', 'password123')}
      >
        Login
      </button>

      <button
        data-testid="logout-btn"
        onClick={auth.logout}
      >
        Logout
      </button>
    </div>
  );
};

/* =======================
   TESTS
======================= */

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    authService.getCurrentUser.mockReturnValue(null);
    authService.isAuthenticated.mockReturnValue(false);

    authService.login.mockResolvedValue({
      success: true,
      user: { username: 'testuser' },
      token: 'mock-token',
    });

    authService.logout.mockResolvedValue({
      success: true,
    });
  });

  test('AuthProvider renders children', () => {
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  test('useAuth provides default values', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('auth')).toHaveTextContent('Not authenticated');
  });

  test('login button triggers login function', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const user = userEvent.setup();

    await act(async () => {
      await user.click(screen.getByTestId('login-btn'));
    });

    expect(authService.login).toHaveBeenCalledOnce();
    expect(authService.login).toHaveBeenCalledWith(
      'testuser',
      'password123'
    );
  });

  test('logout button triggers logout function', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const user = userEvent.setup();

    await act(async () => {
      await user.click(screen.getByTestId('logout-btn'));
    });

    expect(authService.logout).toHaveBeenCalledOnce();
  });
});
