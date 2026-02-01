// src/tests/utils/alerts.test.js
import { describe, test, expect, beforeEach, vi, beforeAll } from 'vitest';

// Mock Swal before importing alerts
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
    mixin: vi.fn(() => ({
      fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
    })),
    showLoading: vi.fn(),
    stopTimer: vi.fn(),
    resumeTimer: vi.fn(),
    close: vi.fn()
  }
}));

describe('AlertService', () => {
  let Swal;
  let alerts;

  // Import alerts once before all tests
  beforeAll(async () => {
    // Import alerts module
    const alertsModule = await import('../../utils/alerts');
    alerts = alertsModule.default;
    
    // Import Swal for mocking
    const swalModule = await import('sweetalert2');
    Swal = swalModule.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success', () => {
    test('should call Swal.fire with success config', async () => {
      await alerts.success('Success Title', 'Success message');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Success Title',
        text: 'Success message',
        icon: 'success',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        background: '#d4edda',
        color: '#155724',
      });
    });

    test('should use default text when not provided', async () => {
      await alerts.success('Success Title');

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success Title',
          text: '',
        })
      );
    });
  });

  describe('error', () => {
    test('should call Swal.fire with error config', async () => {
      await alerts.error('Error Title', 'Error message');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Error Title',
        text: 'Error message',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#667eea',
        background: '#f8d7da',
        color: '#721c24',
      });
    });
  });

  describe('warning', () => {
    test('should call Swal.fire with warning config', async () => {
      await alerts.warning('Warning Title', 'Warning message');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Warning Title',
        text: 'Warning message',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ff9800',
      });
    });
  });

  describe('info', () => {
    test('should call Swal.fire with info config', async () => {
      await alerts.info('Info Title', 'Info message');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Info Title',
        text: 'Info message',
        icon: 'info',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    });
  });

  describe('confirm', () => {
    test('should call Swal.fire with confirm config', async () => {
      await alerts.confirm('Confirm Title', 'Are you sure?', 'Yes', 'No');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Confirm Title',
        text: 'Are you sure?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#667eea',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
      });
    });
  });

  describe('loading', () => {
    test('should call Swal.fire with loading config', async () => {
      await alerts.loading('Loading...');

      expect(Swal.fire).toHaveBeenCalledWith({
        title: 'Loading...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: expect.any(Function),
      });
    });

    test('should call Swal.showLoading in willOpen', async () => {
      await alerts.loading('Loading...');
      
      // Get the willOpen function from the first call
      const willOpenFunction = Swal.fire.mock.calls[0][0].willOpen;
      willOpenFunction();
      
      expect(Swal.showLoading).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    test('should call Swal.close', () => {
      alerts.close();
      expect(Swal.close).toHaveBeenCalled();
    });
  });

  describe('toast', () => {
    test('should call Swal.mixin and fire toast', async () => {
      const mockMixin = { fire: vi.fn(() => Promise.resolve()) };
      Swal.mixin.mockReturnValue(mockMixin);

      await alerts.toast('success', 'Toast message', 2000);

      expect(Swal.mixin).toHaveBeenCalledWith({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        didOpen: expect.any(Function),
      });

      expect(mockMixin.fire).toHaveBeenCalledWith({
        icon: 'success',
        title: 'Toast message',
      });
    });
  });
});