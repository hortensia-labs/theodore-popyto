/**
 * Orchestrator Tests
 * 
 * Tests for URL Processing Orchestrator
 * Note: These are unit tests with mocked dependencies
 * Integration tests will be added in Phase 2
 */

import { describe, test, expect } from '@jest/globals';
import { URLProcessingStateMachine } from '../lib/state-machine/url-processing-state-machine';

describe('URLProcessingOrchestrator', () => {
  describe('State Transition Logic', () => {
    test('validates auto-cascade workflow concept', () => {
      // Test the state machine supports the cascade workflow
      
      // Stage 1: Zotero can cascade to content
      expect(URLProcessingStateMachine.canTransition(
        'processing_zotero',
        'processing_content'
      )).toBe(true);
      
      // Stage 2: Content can cascade to LLM
      expect(URLProcessingStateMachine.canTransition(
        'processing_content',
        'processing_llm'
      )).toBe(true);
      
      // Stage 3: LLM can mark as exhausted
      expect(URLProcessingStateMachine.canTransition(
        'processing_llm',
        'exhausted'
      )).toBe(true);
    });

    test('validates success workflows', () => {
      // Zotero success → stored
      expect(URLProcessingStateMachine.canTransition(
        'processing_zotero',
        'stored'
      )).toBe(true);
      
      // Content success → awaiting selection
      expect(URLProcessingStateMachine.canTransition(
        'processing_content',
        'awaiting_selection'
      )).toBe(true);
      
      // LLM success → awaiting metadata
      expect(URLProcessingStateMachine.canTransition(
        'processing_llm',
        'awaiting_metadata'
      )).toBe(true);
    });

    test('validates user action workflows', () => {
      // User selects identifier → process again
      expect(URLProcessingStateMachine.canTransition(
        'awaiting_selection',
        'processing_zotero'
      )).toBe(true);
      
      // User approves metadata → stored
      expect(URLProcessingStateMachine.canTransition(
        'awaiting_metadata',
        'stored'
      )).toBe(true);
      
      // User can manually create from exhausted
      expect(URLProcessingStateMachine.canTransition(
        'exhausted',
        'stored_custom'
      )).toBe(true);
    });

    test('validates reset workflows', () => {
      // Can reset from stored
      expect(URLProcessingStateMachine.canTransition(
        'stored',
        'not_started'
      )).toBe(true);
      
      // Can reset from exhausted
      expect(URLProcessingStateMachine.canTransition(
        'exhausted',
        'not_started'
      )).toBe(true);
      
      // Can un-ignore
      expect(URLProcessingStateMachine.canTransition(
        'ignored',
        'not_started'
      )).toBe(true);
    });
  });

  describe('Processing Stage Progression', () => {
    test('validates complete auto-cascade path', () => {
      // Complete cascade: not_started → all stages → exhausted
      const cascadePath: [string, string][] = [
        ['not_started', 'processing_zotero'],
        ['processing_zotero', 'processing_content'],
        ['processing_content', 'processing_llm'],
        ['processing_llm', 'exhausted'],
      ];
      
      for (const [from, to] of cascadePath) {
        expect(URLProcessingStateMachine.canTransition(
          from as any,
          to as any
        )).toBe(true);
      }
    });

    test('validates complete success path with identifiers', () => {
      // Success path: not_started → zotero → stored
      const successPath: [string, string][] = [
        ['not_started', 'processing_zotero'],
        ['processing_zotero', 'stored'],
      ];
      
      for (const [from, to] of successPath) {
        expect(URLProcessingStateMachine.canTransition(
          from as any,
          to as any
        )).toBe(true);
      }
    });

    test('validates identifier selection workflow', () => {
      // Workflow: zotero fails → content finds IDs → user selects → process
      const workflow: [string, string][] = [
        ['not_started', 'processing_zotero'],
        ['processing_zotero', 'processing_content'],
        ['processing_content', 'awaiting_selection'],
        ['awaiting_selection', 'processing_zotero'],
        ['processing_zotero', 'stored'],
      ];
      
      for (const [from, to] of workflow) {
        expect(URLProcessingStateMachine.canTransition(
          from as any,
          to as any
        )).toBe(true);
      }
    });
  });
});

describe('Processing History Summarization', () => {
  test('summarizes empty history', () => {
    const summary = summarizeProcessingHistory([]);
    expect(summary.totalAttempts).toBe(0);
    expect(summary.lastAttempt).toBeNull();
  });

  test('summarizes successful attempts', () => {
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
  });

  test('summarizes failed attempts with errors', () => {
    const history: ProcessingAttempt[] = [
      {
        timestamp: Date.now(),
        stage: 'zotero_identifier',
        success: false,
        error: 'Not found',
      },
    ];
    
    const summary = summarizeProcessingHistory(history);
    expect(summary.failureCount).toBe(1);
    expect(summary.commonErrors).toContain('Not found');
  });

  test('identifies most common errors', () => {
    const history: ProcessingAttempt[] = [
      { timestamp: 1, success: false, error: 'Error A' },
      { timestamp: 2, success: false, error: 'Error A' },
      { timestamp: 3, success: false, error: 'Error B' },
    ];
    
    const summary = summarizeProcessingHistory(history);
    expect(summary.commonErrors[0]).toBe('Error A');
  });
});

describe('Utility Functions', () => {
  describe('safeParseJson', () => {
    test('parses valid JSON', () => {
      expect(safeParseJson('{"a":1}', {})).toEqual({ a: 1 });
    });

    test('returns fallback for invalid JSON', () => {
      expect(safeParseJson('invalid', { default: true })).toEqual({ default: true });
    });

    test('returns fallback for null', () => {
      expect(safeParseJson(null, [])).toEqual([]);
    });
  });

  describe('generateSessionId', () => {
    test('generates valid session IDs', () => {
      const id = generateSessionId();
      expect(id).toMatch(/^batch_\d+_[a-z0-9]+$/);
    });

    test('generates unique IDs', () => {
      const ids = new Set([
        generateSessionId(),
        generateSessionId(),
        generateSessionId(),
      ]);
      expect(ids.size).toBe(3);
    });
  });
});

