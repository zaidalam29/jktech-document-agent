// src/tests/utils/validators.test.js
import { describe, test, expect } from 'vitest';
import { 
  validateUsername, 
  validatePassword,
  validateFile 
} from '../../utils/validators';

describe('Validators', () => {
  describe('validateUsername', () => {
    test('should return null for valid username', () => {
      expect(validateUsername('john_doe')).toBeNull();
      expect(validateUsername('user123')).toBeNull();
      expect(validateUsername('abc')).toBeNull(); // Minimum length
    });

    test('should return error for empty username', () => {
      expect(validateUsername('')).toBe('Username is required');
      expect(validateUsername('   ')).toBe('Username is required');
    });

    test('should return error for too short username', () => {
      expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
    });

    test('should return error for invalid characters', () => {
      expect(validateUsername('john doe')).toBe('Username can only contain letters, numbers and underscores');
    });
  });

  describe('validatePassword', () => {
    test('should return null for valid password', () => {
      expect(validatePassword('password123')).toBeNull();
      expect(validatePassword('123456')).toBeNull(); // Minimum length
    });

    test('should return error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    test('should return error for too short password', () => {
      expect(validatePassword('12345')).toBe('Password must be at least 6 characters');
    });
  });

  describe('validateFile', () => {
    test('should return null for valid file', () => {
      const mockFile = {
        name: 'test.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg'
      };
      
      expect(validateFile(mockFile, 10485760, ['image/jpeg', 'image/png'])).toBeNull();
    });

    test('should return error for no file', () => {
      expect(validateFile(null)).toBe('File is required');
    });

    test('should return error for file exceeding max size', () => {
      const mockFile = {
        name: 'large.jpg',
        size: 15 * 1024 * 1024, // 15MB
        type: 'image/jpeg'
      };
      
      expect(validateFile(mockFile, 10 * 1024 * 1024)).toBe('File size must be less than 10MB');
    });
  });
});