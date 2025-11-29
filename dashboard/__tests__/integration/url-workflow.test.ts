/**
 * URL Processing Workflow Integration Tests
 * 
 * Tests complete workflows from start to finish
 * These tests validate the integration between components
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../../lib/db/client';
import { urls, sections } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingOrchestrator } from '../../lib/orchestrator/url-processing-orchestrator';
import { URLProcessingStateMachine } from '../../lib/state-machine/url-processing-state-machine';
import {
  transitionProcessingState,
  resetProcessingState,
  setUserIntent,
  ignoreUrl,
  unignoreUrl,
} from '../../lib/actions/state-transitions';

describe('URL Processing Workflow Integration Tests', () => {
  // Test section and URL IDs
  const testSectionId = 9999;
  const testUrlId = 99999;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(urls).where(eq(urls.id, testUrlId));
    
    // Create test section if needed
    try {
      await db.insert(sections).values({
        id: testSectionId,
        name: 'test-section',
        path: '/test',
      });
    } catch (error) {
      // Section might already exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(urls).where(eq(urls.id, testUrlId));
  });

  describe('State Transition Workflows', () => {
    test('should transition through states correctly', async () => {
      // Create test URL
      await db.insert(urls).values({
        id: testUrlId,
        sectionId: testSectionId,
        url: 'https://example.com/test',
        domain: 'example.com',
        processingStatus: 'not_started',
        userIntent: 'auto',
      });

      // Test: not_started → ignored
      const result1 = await transitionProcessingState(testUrlId, 'ignored');
      expect(result1.success).toBe(true);

      // Verify state changed
      const url1 = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url1?.processingStatus).toBe('ignored');

      // Test: ignored → not_started
      const result2 = await transitionProcessingState(testUrlId, 'not_started');
      expect(result2.success).toBe(true);

      const url2 = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url2?.processingStatus).toBe('not_started');
    });

    test('should reject invalid transitions', async () => {
      // Create test URL in stored state
      await db.insert(urls).values({
        id: testUrlId,
        sectionId: testSectionId,
        url: 'https://example.com/test',
        domain: 'example.com',
        processingStatus: 'stored',
        userIntent: 'auto',
      });

      // Try invalid transition: stored → processing_zotero
      const result = await transitionProcessingState(testUrlId, 'processing_zotero');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });
  });

  describe('User Intent Workflows', () => {
    beforeEach(async () => {
      await db.insert(urls).values({
        id: testUrlId,
        sectionId: testSectionId,
        url: 'https://example.com/test',
        domain: 'example.com',
        processingStatus: 'not_started',
        userIntent: 'auto',
      });
    });

    test('should set user intent correctly', async () => {
      const result = await setUserIntent(testUrlId, 'priority');
      expect(result.success).toBe(true);

      const url = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url?.userIntent).toBe('priority');
    });

    test('should ignore URL and transition state', async () => {
      const result = await ignoreUrl(testUrlId);
      expect(result.success).toBe(true);

      const url = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url?.processingStatus).toBe('ignored');
      expect(url?.userIntent).toBe('ignore');
    });

    test('should unignore URL correctly', async () => {
      // First ignore
      await ignoreUrl(testUrlId);

      // Then unignore
      const result = await unignoreUrl(testUrlId);
      expect(result.success).toBe(true);

      const url = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url?.processingStatus).toBe('not_started');
      expect(url?.userIntent).toBe('auto');
    });
  });

  describe('Reset Workflow', () => {
    test('should reset processing state', async () => {
      // Create URL with processing history
      await db.insert(urls).values({
        id: testUrlId,
        sectionId: testSectionId,
        url: 'https://example.com/test',
        domain: 'example.com',
        processingStatus: 'exhausted',
        processingAttempts: 3,
        processingHistory: [
          {
            timestamp: Date.now(),
            stage: 'zotero_identifier',
            success: false,
            error: 'Failed',
          },
        ],
      });

      const result = await resetProcessingState(testUrlId);
      expect(result.success).toBe(true);

      const url = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url?.processingStatus).toBe('not_started');
      expect(url?.processingAttempts).toBe(0);
      expect(url?.processingHistory).toEqual([]);
    });
  });

  describe('Processing History', () => {
    test('should record processing transitions in history', async () => {
      await db.insert(urls).values({
        id: testUrlId,
        sectionId: testSectionId,
        url: 'https://example.com/test',
        domain: 'example.com',
        processingStatus: 'not_started',
      });

      // Perform transition
      await transitionProcessingState(testUrlId, 'processing_zotero');

      // Check history was recorded
      const url = await db.query.urls.findFirst({ where: eq(urls.id, testUrlId) });
      expect(url?.processingHistory).toBeDefined();
      expect(Array.isArray(url?.processingHistory)).toBe(true);
      
      if (url?.processingHistory) {
        expect(url.processingHistory.length).toBeGreaterThan(0);
        const lastEntry = url.processingHistory[url.processingHistory.length - 1];
        expect(lastEntry.transition).toBeDefined();
        expect(lastEntry.transition?.to).toBe('processing_zotero');
      }
    });
  });
});

