import React from 'react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/auth/Login';

vi.mock('../../store/auth.context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../store/app.context', () => ({
  useApp: vi.fn(),
}));

import { useAuth } from '../../store/auth.context';
import { useApp } from '../../store/app.context';

const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

describe('Login Component (UI based)', () => {
  let mockLogin;

  beforeEach(() => {
    mockLogin = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    vi.mocked(useApp).mockReturnValue({
      addNotification: vi.fn(),
    });
  });

  test('renders login form', () => {
    renderLogin();

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to your account to continue')
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('updates input values', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
    expect(screen.getByLabelText(/password/i)).toHaveValue('password123');
  });

  test('calls login with username and password', async () => {
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledOnce();
    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
  });

  test('shows register link', () => {
    renderLogin();

    const link = screen.getByText('Create New Account');
    expect(link.closest('a')).toHaveAttribute('href', '/register');
  });
});
