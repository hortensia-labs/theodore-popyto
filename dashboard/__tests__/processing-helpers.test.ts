/**
 * Processing Helpers Tests
 * 
 * Tests for processing helper functions
 */

import { describe, test, expect } from '@jest/globals';
import {
  chunkArray,
  formatDuration,
  calculateEstimatedCompletion,
  summarizeProcessingHistory,
  generateSessionId,
  safeParseJson,
} from '../lib/orchestrator/processing-helpers';
import type { ProcessingAttempt } from '../lib/types/url-processing';

describe('Processing Helpers', () => {
  describe('chunkArray', () => {
    test('chunks array into correct sizes', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = chunkArray(array, 3);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    test('handles empty array', () => {
      const chunks = chunkArray([], 5);
      expect(chunks).toHaveLength(0);
    });

    test('handles array smaller than chunk size', () => {
      const array = [1, 2];
      const chunks = chunkArray(array, 5);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2]);
    });
  });

  describe('formatDuration', () => {
    test('formats milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    test('formats seconds correctly', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(5500)).toBe('5.5s');
      expect(formatDuration(30000)).toBe('30.0s');
    });

    test('formats minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(150000)).toBe('2.5m');
    });

    test('formats hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1.0h');
      expect(formatDuration(7200000)).toBe('2.0h');
    });
  });

  describe('calculateEstimatedCompletion', () => {
    test('calculates correct completion time', () => {
      const now = Date.now();
      const completed = 50;
      const total = 100;
      const avgDuration = 1000; // 1 second per item
      
      const estimated = calculateEstimatedCompletion(completed, total, avgDuration);
      const expectedTime = now + (50 * 1000); // 50 items * 1s
      
      // Allow 100ms tolerance
      expect(Math.abs(estimated.getTime() - expectedTime)).toBeLessThan(100);
    });

    test('handles completed state', () => {
      const estimated = calculateEstimatedCompletion(100, 100, 1000);
      const now = Date.now();
      
      // Should be very close to now (no remaining items)
      expect(Math.abs(estimated.getTime() - now)).toBeLessThan(100);
    });
  });

  describe('summarizeProcessingHistory', () => {
    test('returns empty summary for empty history', () => {
      const summary = summarizeProcessingHistory([]);
      
      expect(summary.totalAttempts).toBe(0);
      expect(summary.lastAttempt).toBeNull();
      expect(summary.stagesAttempted).toHaveLength(0);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(0);
    });

    test('correctly summarizes successful attempts', () => {
      const history: ProcessingAttempt[] = [
        {
          timestamp: Date.now(),
          stage: 'zotero_identifier',
          success: true,
          itemKey: 'ABC123',
        },
      ];
      
      const summary = summarizeProcessingHistory(history);
      
      expect(summary.totalAttempts).toBe(1);
      expect(summary.successCount).toBe(1);
      expect(summary.failureCount).toBe(0);
      expect(summary.stagesAttempted).toContain('zotero_identifier');
      expect(summary.lastAttempt).toEqual(history[0]);
    });

    test('correctly summarizes mixed attempts', () => {
      const history: ProcessingAttempt[] = [
        {
          timestamp: Date.now() - 3000,
          stage: 'zotero_identifier',
          success: false,
          error: 'Not found',
        },
        {
          timestamp: Date.now() - 2000,
          stage: 'content_extraction',
          success: false,
          error: 'Parse failed',
        },
        {
          timestamp: Date.now(),
          stage: 'llm',
          success: true,
        },
      ];
      
      const summary = summarizeProcessingHistory(history);
      
      expect(summary.totalAttempts).toBe(3);
      expect(summary.successCount).toBe(1);
      expect(summary.failureCount).toBe(2);
      expect(summary.stagesAttempted).toHaveLength(3);
      expect(summary.commonErrors).toContain('Not found');
      expect(summary.commonErrors).toContain('Parse failed');
    });

    test('identifies most common errors', () => {
      const history: ProcessingAttempt[] = [
        { timestamp: 1, success: false, error: 'Error A' },
        { timestamp: 2, success: false, error: 'Error A' },
        { timestamp: 3, success: false, error: 'Error A' },
        { timestamp: 4, success: false, error: 'Error B' },
        { timestamp: 5, success: false, error: 'Error C' },
      ];
      
      const summary = summarizeProcessingHistory(history);
      
      // Error A should be first (most common)
      expect(summary.commonErrors[0]).toBe('Error A');
      expect(summary.commonErrors).toHaveLength(3);
    });
  });

  describe('generateSessionId', () => {
    test('generates unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^batch_\d+_[a-z0-9]+$/);
    });
  });

  describe('safeParseJson', () => {
    test('parses valid JSON', () => {
      const json = '{"key": "value"}';
      const result = safeParseJson(json, {});
      
      expect(result).toEqual({ key: 'value' });
    });

    test('returns fallback for invalid JSON', () => {
      const invalid = 'not valid json';
      const fallback = { default: true };
      const result = safeParseJson(invalid, fallback);
      
      expect(result).toEqual(fallback);
    });

    test('returns fallback for null', () => {
      const fallback = { default: true };
      expect(safeParseJson(null, fallback)).toEqual(fallback);
    });

    test('returns fallback for undefined', () => {
      const fallback = { default: true };
      expect(safeParseJson(undefined, fallback)).toEqual(fallback);
    });
  });

  describe('getRetryDelayForCategory', () => {
    test('uses exponential backoff for network errors', () => {
      const delays = [
        getRetryDelayForCategory('network', 1),
        getRetryDelayForCategory('network', 2),
        getRetryDelayForCategory('network', 3),
        getRetryDelayForCategory('network', 4),
      ];
      
      expect(delays).toEqual([2000, 4000, 8000, 16000]);
    });

    test('caps delay at 60 seconds', () => {
      const delay = getRetryDelayForCategory('network', 10);
      expect(delay).toBeLessThanOrEqual(60000);
    });

    test('returns 0 for non-retryable categories', () => {
      expect(getRetryDelayForCategory('permanent', 1)).toBe(0);
      expect(getRetryDelayForCategory('http_client', 1)).toBe(0);
    });
  });

  describe('formatErrorForDisplay', () => {
    test('formats errors with category labels', () => {
      const networkError = createProcessingError(new Error('Timeout'));
      const formatted = formatErrorForDisplay(networkError);
      
      expect(formatted).toContain('Network Error');
      expect(formatted).toContain('Timeout');
    });

    test('formats permanent errors', () => {
      const permanentError = createProcessingError(new Error('404 Not Found'));
      const formatted = formatErrorForDisplay(permanentError);
      
      expect(formatted).toContain('Permanent Error');
      expect(formatted).toContain('404 Not Found');
    });
  });
});

