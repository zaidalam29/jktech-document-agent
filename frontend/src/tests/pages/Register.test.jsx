import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../../pages/auth/Register';
import userEvent from '@testing-library/user-event';

// ======================= MOCKS =======================

// mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// mock auth context
const mockRegister = vi.fn();
vi.mock('../../store/auth.context', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

// mock app context
const mockAddNotification = vi.fn();
vi.mock('../../store/app.context', () => ({
  useApp: () => ({
    addNotification: mockAddNotification,
  }),
}));

// mock alerts
vi.mock('../../utils/alerts', () => ({
  default: {
    loading: vi.fn(() => ({ close: vi.fn() })),
    success: vi.fn(),
    error: vi.fn(),
    fire: vi.fn(),
    close: vi.fn(),
  },
}));

// mock UI components we don't need real behavior for
vi.mock('../../components/common/Button', () => ({
  default: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

vi.mock('../../components/common/Loader', () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock('../../components/common/Input', () => ({
  default: ({ label, error, ...props }) => (
    <div>
      <label>{label}</label>
      <input aria-label={label} {...props} />
      {error && <div>{error}</div>} {/* must match what your test expects */}
    </div>
  ),
}));


// =====================================================

// helper to render the page
const setup = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

describe('Register Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form', () => {
    setup();

    // Heading
    expect(
      screen.getByRole('heading', { name: /create account/i })
    ).toBeInTheDocument();

    // Inputs
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();

    // Button
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });

  

  it('does not submit if terms not accepted', async () => {
    setup();

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('registers successfully and navigates to dashboard', async () => {
    mockRegister.mockResolvedValue({ success: true });

    setup();

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('testuser', 'password123');
    });

    expect(mockAddNotification).toHaveBeenCalledWith({
      type: 'success',
      message: 'Welcome to Document QA!',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows error when registration fails', async () => {
    mockRegister.mockResolvedValue({
      success: false,
      error: 'Registration failed',
    });

    setup();

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'error',
        message: 'Registration failed. Please try again.',
      });
    });
  });

  it('handles exception error from register()', async () => {
    mockRegister.mockRejectedValue(new Error('Network Error'));

    setup();

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalled();
    });
  });
});
