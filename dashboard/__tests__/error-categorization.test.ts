/**
 * Error Categorization Tests
 * 
 * Tests for error categorization and handling functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  categorizeError,
  isPermanentError,
  isRetryableError,
  getErrorMessage,
  createProcessingError,
  getRetryDelayForCategory,
  formatErrorForDisplay,
} from '../lib/error-handling';
import type { ErrorCategory } from '../lib/types/url-processing';

describe('Error Categorization', () => {
  describe('categorizeError', () => {
    test('categorizes 404 errors as permanent', () => {
      const error = new Error('404 Not Found');
      expect(categorizeError(error)).toBe('permanent');
    });

    test('categorizes 403 errors as permanent', () => {
      const error = new Error('403 Forbidden');
      expect(categorizeError(error)).toBe('permanent');
    });

    test('categorizes 401 errors as permanent', () => {
      const error = new Error('401 Unauthorized');
      expect(categorizeError(error)).toBe('permanent');
    });

    test('categorizes timeout as network error', () => {
      const error = new Error('Request timeout');
      expect(categorizeError(error)).toBe('network');
    });

    test('categorizes connection refused as network error', () => {
      const error = new Error('ECONNREFUSED');
      expect(categorizeError(error)).toBe('network');
    });

    test('categorizes 500 errors as http_server', () => {
      const error = new Error('500 Internal Server Error');
      expect(categorizeError(error)).toBe('http_server');
    });

    test('categorizes 429 as rate_limit', () => {
      const error = new Error('429 Too Many Requests');
      expect(categorizeError(error)).toBe('rate_limit');
    });

    test('categorizes parse errors as parsing', () => {
      const error = new Error('Failed to parse JSON');
      expect(categorizeError(error)).toBe('parsing');
    });

    test('categorizes validation errors as validation', () => {
      const error = new Error('Validation failed: invalid identifier');
      expect(categorizeError(error)).toBe('validation');
    });

    test('categorizes Zotero errors as zotero_api', () => {
      const error = new Error('Zotero translation server error');
      expect(categorizeError(error)).toBe('zotero_api');
    });

    test('categorizes unknown errors as unknown', () => {
      const error = new Error('Some random error');
      expect(categorizeError(error)).toBe('unknown');
    });
  });

  describe('isPermanentError', () => {
    test('identifies permanent errors correctly', () => {
      expect(isPermanentError(new Error('404 Not Found'))).toBe(true);
      expect(isPermanentError(new Error('403 Forbidden'))).toBe(true);
      expect(isPermanentError(new Error('410 Gone'))).toBe(true);
    });

    test('identifies non-permanent errors correctly', () => {
      expect(isPermanentError(new Error('Timeout'))).toBe(false);
      expect(isPermanentError(new Error('500 Server Error'))).toBe(false);
      expect(isPermanentError(new Error('Rate limit exceeded'))).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    test('identifies retryable errors correctly', () => {
      expect(isRetryableError(new Error('Timeout'))).toBe(true);
      expect(isRetryableError(new Error('500 Server Error'))).toBe(true);
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
      expect(isRetryableError(new Error('Zotero API error'))).toBe(true);
    });

    test('identifies non-retryable errors correctly', () => {
      expect(isRetryableError(new Error('404 Not Found'))).toBe(false);
      expect(isRetryableError(new Error('Validation failed'))).toBe(false);
      expect(isRetryableError(new Error('Parse error'))).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    test('extracts message from Error object', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    test('handles string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    test('handles objects with message property', () => {
      const error = { message: 'Object error message' };
      expect(getErrorMessage(error)).toBe('Object error message');
    });

    test('handles unknown error types', () => {
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(undefined)).toBe('Unknown error');
      expect(getErrorMessage(123)).toBe('Unknown error');
    });
  });

  describe('createProcessingError', () => {
    test('creates processing error with correct category', () => {
      const error = new Error('404 Not Found');
      const processingError = createProcessingError(error, { urlId: 123 });
      
      expect(processingError.message).toBe('404 Not Found');
      expect(processingError.category).toBe('permanent');
      expect(processingError.retryable).toBe(false);
      expect(processingError.details).toEqual({ urlId: 123 });
    });

    test('creates retryable error for network issues', () => {
      const error = new Error('Connection timeout');
      const processingError = createProcessingError(error);
      
      expect(processingError.category).toBe('network');
      expect(processingError.retryable).toBe(true);
    });
  });

  describe('getRetryDelayForCategory', () => {
    test('returns 0 for non-retryable categories', () => {
      expect(getRetryDelayForCategory('permanent', 1)).toBe(0);
      expect(getRetryDelayForCategory('http_client', 1)).toBe(0);
      expect(getRetryDelayForCategory('parsing', 1)).toBe(0);
      expect(getRetryDelayForCategory('validation', 1)).toBe(0);
    });

    test('returns base delay for first attempt', () => {
      expect(getRetryDelayForCategory('network', 1)).toBe(2000);
      expect(getRetryDelayForCategory('http_server', 1)).toBe(5000);
      expect(getRetryDelayForCategory('rate_limit', 1)).toBe(10000);
    });

    test('implements exponential backoff', () => {
      expect(getRetryDelayForCategory('network', 1)).toBe(2000);  // 2s
      expect(getRetryDelayForCategory('network', 2)).toBe(4000);  // 4s
      expect(getRetryDelayForCategory('network', 3)).toBe(8000);  // 8s
      expect(getRetryDelayForCategory('network', 4)).toBe(16000); // 16s
    });

    test('caps delay at 60 seconds', () => {
      expect(getRetryDelayForCategory('network', 10)).toBe(60000);
      expect(getRetryDelayForCategory('http_server', 10)).toBe(60000);
    });
  });

  describe('formatErrorForDisplay', () => {
    test('formats network errors correctly', () => {
      const error = createProcessingError(new Error('Connection timeout'));
      const formatted = formatErrorForDisplay(error);
      expect(formatted).toContain('Network Error');
      expect(formatted).toContain('Connection timeout');
    });

    test('formats permanent errors correctly', () => {
      const error = createProcessingError(new Error('404 Not Found'));
      const formatted = formatErrorForDisplay(error);
      expect(formatted).toContain('Permanent Error');
      expect(formatted).toContain('404 Not Found');
    });

    test('formats Zotero API errors correctly', () => {
      const error = createProcessingError(new Error('Zotero translation failed'));
      const formatted = formatErrorForDisplay(error);
      expect(formatted).toContain('Zotero API Error');
    });
  });
});

