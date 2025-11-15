/**
 * State Machine Tests
 * 
 * Tests for URL Processing State Machine
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { URLProcessingStateMachine } from '../lib/state-machine/url-processing-state-machine';
import type { ProcessingStatus } from '../lib/types/url-processing';
import { db } from '../lib/db/client';
import { urls } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('URLProcessingStateMachine', () => {
  // Test URL ID (use a high number to avoid conflicts)
  const testUrlId = 999999;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(urls).where(eq(urls.id, testUrlId));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(urls).where(eq(urls.id, testUrlId));
  });

  describe('canTransition', () => {
    test('allows valid transitions from not_started', () => {
      expect(URLProcessingStateMachine.canTransition('not_started', 'processing_zotero')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('not_started', 'processing_content')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('not_started', 'ignored')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('not_started', 'archived')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('not_started', 'stored_custom')).toBe(true);
    });

    test('rejects invalid transitions from not_started', () => {
      expect(URLProcessingStateMachine.canTransition('not_started', 'stored')).toBe(false);
      expect(URLProcessingStateMachine.canTransition('not_started', 'awaiting_selection')).toBe(false);
      expect(URLProcessingStateMachine.canTransition('not_started', 'exhausted')).toBe(false);
    });

    test('allows valid transitions from processing_zotero', () => {
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'stored')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'stored_incomplete')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'processing_content')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'exhausted')).toBe(true);
    });

    test('rejects invalid transitions from processing_zotero', () => {
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'not_started')).toBe(false);
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'processing_llm')).toBe(false);
      expect(URLProcessingStateMachine.canTransition('processing_zotero', 'ignored')).toBe(false);
    });

    test('allows valid transitions from stored', () => {
      expect(URLProcessingStateMachine.canTransition('stored', 'not_started')).toBe(true);
      expect(URLProcessingStateMachine.canTransition('stored', 'stored_incomplete')).toBe(true);
    });

    test('rejects invalid transitions from stored', () => {
      expect(URLProcessingStateMachine.canTransition('stored', 'processing_zotero')).toBe(false);
      expect(URLProcessingStateMachine.canTransition('stored', 'ignored')).toBe(false);
    });

    test('allows un-ignore transition', () => {
      expect(URLProcessingStateMachine.canTransition('ignored', 'not_started')).toBe(true);
    });

    test('allows un-archive transition', () => {
      expect(URLProcessingStateMachine.canTransition('archived', 'not_started')).toBe(true);
    });
  });

  describe('getPossibleNextStates', () => {
    test('returns correct next states for not_started', () => {
      const nextStates = URLProcessingStateMachine.getPossibleNextStates('not_started');
      expect(nextStates).toContain('processing_zotero');
      expect(nextStates).toContain('processing_content');
      expect(nextStates).toContain('ignored');
      expect(nextStates).toContain('archived');
      expect(nextStates).toContain('stored_custom');
    });

    test('returns correct next states for exhausted', () => {
      const nextStates = URLProcessingStateMachine.getPossibleNextStates('exhausted');
      expect(nextStates).toContain('not_started');
      expect(nextStates).toContain('stored_custom');
      expect(nextStates).toContain('ignored');
      expect(nextStates).toContain('archived');
    });
  });

  describe('isFinalState', () => {
    test('identifies final states correctly', () => {
      expect(URLProcessingStateMachine.isFinalState('stored')).toBe(true);
      expect(URLProcessingStateMachine.isFinalState('stored_incomplete')).toBe(true);
      expect(URLProcessingStateMachine.isFinalState('stored_custom')).toBe(true);
      expect(URLProcessingStateMachine.isFinalState('exhausted')).toBe(true);
      expect(URLProcessingStateMachine.isFinalState('ignored')).toBe(true);
      expect(URLProcessingStateMachine.isFinalState('archived')).toBe(true);
    });

    test('identifies non-final states correctly', () => {
      expect(URLProcessingStateMachine.isFinalState('not_started')).toBe(false);
      expect(URLProcessingStateMachine.isFinalState('processing_zotero')).toBe(false);
      expect(URLProcessingStateMachine.isFinalState('processing_content')).toBe(false);
      expect(URLProcessingStateMachine.isFinalState('awaiting_selection')).toBe(false);
    });
  });

  describe('isProcessingState', () => {
    test('identifies processing states correctly', () => {
      expect(URLProcessingStateMachine.isProcessingState('processing_zotero')).toBe(true);
      expect(URLProcessingStateMachine.isProcessingState('processing_content')).toBe(true);
      expect(URLProcessingStateMachine.isProcessingState('processing_llm')).toBe(true);
    });

    test('identifies non-processing states correctly', () => {
      expect(URLProcessingStateMachine.isProcessingState('not_started')).toBe(false);
      expect(URLProcessingStateMachine.isProcessingState('stored')).toBe(false);
      expect(URLProcessingStateMachine.isProcessingState('awaiting_selection')).toBe(false);
    });
  });

  describe('requiresUserAction', () => {
    test('identifies states requiring user action', () => {
      expect(URLProcessingStateMachine.requiresUserAction('awaiting_selection')).toBe(true);
      expect(URLProcessingStateMachine.requiresUserAction('awaiting_metadata')).toBe(true);
      expect(URLProcessingStateMachine.requiresUserAction('exhausted')).toBe(true);
    });

    test('identifies states not requiring user action', () => {
      expect(URLProcessingStateMachine.requiresUserAction('not_started')).toBe(false);
      expect(URLProcessingStateMachine.requiresUserAction('processing_zotero')).toBe(false);
      expect(URLProcessingStateMachine.requiresUserAction('stored')).toBe(false);
    });
  });

  describe('getStateLabel', () => {
    test('returns correct labels for all states', () => {
      expect(URLProcessingStateMachine.getStateLabel('not_started')).toBe('Not Started');
      expect(URLProcessingStateMachine.getStateLabel('processing_zotero')).toBe('Processing (Zotero)');
      expect(URLProcessingStateMachine.getStateLabel('stored')).toBe('Stored');
      expect(URLProcessingStateMachine.getStateLabel('exhausted')).toBe('Exhausted (Manual Needed)');
    });
  });

  describe('validateTransitionGraph', () => {
    test('validates that transition graph has no issues', () => {
      const validation = URLProcessingStateMachine.validateTransitionGraph();
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });
});

