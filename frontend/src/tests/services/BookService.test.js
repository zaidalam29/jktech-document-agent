// src/tests/services/BookService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockBook, mockBooksList, mockBookWithReviews } from '../mocks/bookMocks';

// ================= MOCKS =================
vi.mock('../../utils/token', () => ({
  getToken: vi.fn(() => 'mock-token')
}));

vi.mock('../../utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../utils/alerts', () => ({
  default: {
    loading: vi.fn(() => ({ close: vi.fn() })),
    success: vi.fn(),
    confirm: vi.fn(() => Promise.resolve({ isConfirmed: true })),
    fire: vi.fn(() =>
      Promise.resolve({ value: { review: 'Test review', rating: 5 } })
    ),
    close: vi.fn(),
    showValidationMessage: vi.fn()
  }
}));

// ========================================

describe('BookService', () => {
  let bookService;
  let mockFetch;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    const module = await import('../../services/book.service');
    bookService = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================= apiFetch =================
  describe('apiFetch', () => {
    it('adds auth token to headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({ success: true })
      });

      await bookService.apiFetch('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token'
          })
        })
      );
    });

    it('handles 204 response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Map()
      });

      const res = await bookService.apiFetch('/test');
      expect(res).toEqual({
        success: true,
        message: 'Operation completed successfully',
        status: 204
      });
    });

    it('throws API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({
          error: { message: 'Not found' }
        })
      });

      await expect(bookService.apiFetch('/test'))
        .rejects.toThrow();
    });
  });

  // ================= getAllBooks =================
  describe('getAllBooks', () => {
    it('returns book list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(mockBooksList)
      });

      const res = await bookService.getAllBooks(0, 10);
      expect(res).toEqual(mockBooksList);
    });

    it('returns empty array for invalid response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue({})
      });

      const res = await bookService.getAllBooks();
      expect(res).toEqual([]);
    });
  });

  // ================= getBookDetails =================
  describe('getBookDetails', () => {
    it('returns book with reviews', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: vi.fn().mockResolvedValue(mockBookWithReviews)
      });

      const res = await bookService.getBookDetails(1);
      expect(res).toEqual(mockBookWithReviews);
    });
  });

  // ================= deleteBook =================
  describe('deleteBook', () => {
    it('deletes book after confirmation', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Map()
      });

      const res = await bookService.deleteBook(1);
      expect(res).toEqual({ success: true });
    });

    it('does not delete if cancelled', async () => {
      const alerts = (await import('../../utils/alerts')).default;
      alerts.confirm.mockResolvedValue({ isConfirmed: false });

      const res = await bookService.deleteBook(1);
      expect(res).toEqual({ cancelled: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ================= openReviewModel =================
  describe('openReviewModel', () => {
    it('returns review data', async () => {
      const res = await bookService.openReviewModel(1);
      expect(res).toEqual({
        review_text: 'Test review',
        rating: 5
      });
    });

    it('returns null on error', async () => {
      const alerts = (await import('../../utils/alerts')).default;
      alerts.fire.mockRejectedValue(new Error('Modal failed'));

      const res = await bookService.openReviewModel(1);
      expect(res).toBeNull();
    });
  });
});
