/**
 * State Guards Tests
 * 
 * Tests for StateGuards that control when actions are allowed
 */

import { describe, test, expect } from '@jest/globals';
import { StateGuards } from '../lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '../lib/state-machine/state-guards';

describe('StateGuards', () => {
  // Helper to create test URL
  const createTestUrl = (overrides: Partial<UrlForGuardCheck> = {}): UrlForGuardCheck => ({
    id: 1,
    url: 'https://example.com',
    processingStatus: 'not_started',
    userIntent: 'auto',
    capability: {
      hasIdentifiers: true,
      hasWebTranslators: false,
      hasContent: false,
      isAccessible: true,
      canUseLLM: false,
      isPDF: false,
      manualCreateAvailable: true,
    },
    ...overrides,
  });

  describe('canProcessWithZotero', () => {
    test('allows processing for not_started with identifiers', () => {
      const url = createTestUrl({
        processingStatus: 'not_started',
        userIntent: 'auto',
        capability: { ...createTestUrl().capability!, hasIdentifiers: true },
      });
      expect(StateGuards.canProcessWithZotero(url)).toBe(true);
    });

    test('blocks processing if ignored', () => {
      const url = createTestUrl({ userIntent: 'ignore' });
      expect(StateGuards.canProcessWithZotero(url)).toBe(false);
    });

    test('blocks processing if archived', () => {
      const url = createTestUrl({ userIntent: 'archive' });
      expect(StateGuards.canProcessWithZotero(url)).toBe(false);
    });

    test('blocks processing if manual_only', () => {
      const url = createTestUrl({ userIntent: 'manual_only' });
      expect(StateGuards.canProcessWithZotero(url)).toBe(false);
    });

    test('blocks processing if already stored', () => {
      const url = createTestUrl({ processingStatus: 'stored' });
      expect(StateGuards.canProcessWithZotero(url)).toBe(false);
    });

    test('allows processing from awaiting_selection', () => {
      const url = createTestUrl({ processingStatus: 'awaiting_selection' });
      expect(StateGuards.canProcessWithZotero(url)).toBe(true);
    });
  });

  describe('canUnlink', () => {
    test('allows unlinking from stored', () => {
      const url = createTestUrl({ processingStatus: 'stored' });
      expect(StateGuards.canUnlink(url)).toBe(true);
    });

    test('allows unlinking from stored_incomplete', () => {
      const url = createTestUrl({ processingStatus: 'stored_incomplete' });
      expect(StateGuards.canUnlink(url)).toBe(true);
    });

    test('allows unlinking from stored_custom', () => {
      const url = createTestUrl({ processingStatus: 'stored_custom' });
      expect(StateGuards.canUnlink(url)).toBe(true);
    });

    test('blocks unlinking from not_started', () => {
      const url = createTestUrl({ processingStatus: 'not_started' });
      expect(StateGuards.canUnlink(url)).toBe(false);
    });
  });

  describe('canDeleteZoteroItem', () => {
    test('allows deletion if created by Theodore, not modified, single link', () => {
      const url = createTestUrl({
        zoteroItemKey: 'ABC123',
        createdByTheodore: true,
        userModifiedInZotero: false,
        linkedUrlCount: 1,
      });
      expect(StateGuards.canDeleteZoteroItem(url)).toBe(true);
    });

    test('blocks deletion if no item key', () => {
      const url = createTestUrl({
        zoteroItemKey: null,
        createdByTheodore: true,
      });
      expect(StateGuards.canDeleteZoteroItem(url)).toBe(false);
    });

    test('blocks deletion if not created by Theodore', () => {
      const url = createTestUrl({
        zoteroItemKey: 'ABC123',
        createdByTheodore: false,
        linkedUrlCount: 1,
      });
      expect(StateGuards.canDeleteZoteroItem(url)).toBe(false);
    });

    test('blocks deletion if user modified', () => {
      const url = createTestUrl({
        zoteroItemKey: 'ABC123',
        createdByTheodore: true,
        userModifiedInZotero: true,
        linkedUrlCount: 1,
      });
      expect(StateGuards.canDeleteZoteroItem(url)).toBe(false);
    });

    test('blocks deletion if linked to multiple URLs', () => {
      const url = createTestUrl({
        zoteroItemKey: 'ABC123',
        createdByTheodore: true,
        userModifiedInZotero: false,
        linkedUrlCount: 3,
      });
      expect(StateGuards.canDeleteZoteroItem(url)).toBe(false);
    });
  });

  describe('canManuallyCreate', () => {
    test('always allows manual creation', () => {
      const url1 = createTestUrl({ processingStatus: 'not_started' });
      const url2 = createTestUrl({ processingStatus: 'stored' });
      const url3 = createTestUrl({ processingStatus: 'exhausted' });
      
      expect(StateGuards.canManuallyCreate(url1)).toBe(true);
      expect(StateGuards.canManuallyCreate(url2)).toBe(true);
      expect(StateGuards.canManuallyCreate(url3)).toBe(true);
    });
  });

  describe('canReset', () => {
    test('allows reset from final states', () => {
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'stored' }))).toBe(true);
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'exhausted' }))).toBe(true);
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'ignored' }))).toBe(true);
    });

    test('blocks reset during active processing', () => {
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'processing_zotero' }))).toBe(false);
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'processing_content' }))).toBe(false);
      expect(StateGuards.canReset(createTestUrl({ processingStatus: 'processing_llm' }))).toBe(false);
    });
  });

  describe('canEditCitation', () => {
    test('allows editing for stored URLs with item key', () => {
      const url = createTestUrl({
        processingStatus: 'stored_incomplete',
        zoteroItemKey: 'ABC123',
      });
      expect(StateGuards.canEditCitation(url)).toBe(true);
    });

    test('blocks editing without item key', () => {
      const url = createTestUrl({
        processingStatus: 'stored',
        zoteroItemKey: null,
      });
      expect(StateGuards.canEditCitation(url)).toBe(false);
    });

    test('blocks editing for non-stored states', () => {
      const url = createTestUrl({
        processingStatus: 'not_started',
        zoteroItemKey: 'ABC123',
      });
      expect(StateGuards.canEditCitation(url)).toBe(false);
    });
  });

  describe('canSelectIdentifier', () => {
    test('allows selection when in awaiting_selection state', () => {
      const url = createTestUrl({ processingStatus: 'awaiting_selection' });
      expect(StateGuards.canSelectIdentifier(url)).toBe(true);
    });

    test('blocks selection in other states', () => {
      expect(StateGuards.canSelectIdentifier(createTestUrl({ processingStatus: 'not_started' }))).toBe(false);
      expect(StateGuards.canSelectIdentifier(createTestUrl({ processingStatus: 'stored' }))).toBe(false);
    });
  });

  describe('canApproveMetadata', () => {
    test('allows approval when in awaiting_metadata state', () => {
      const url = createTestUrl({ processingStatus: 'awaiting_metadata' });
      expect(StateGuards.canApproveMetadata(url)).toBe(true);
    });

    test('blocks approval in other states', () => {
      expect(StateGuards.canApproveMetadata(createTestUrl({ processingStatus: 'not_started' }))).toBe(false);
      expect(StateGuards.canApproveMetadata(createTestUrl({ processingStatus: 'stored' }))).toBe(false);
    });
  });

  describe('canIgnore', () => {
    test('allows ignoring from most states', () => {
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'not_started' }))).toBe(true);
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'stored' }))).toBe(true);
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'exhausted' }))).toBe(true);
    });

    test('blocks ignoring if already ignored/archived', () => {
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'ignored' }))).toBe(false);
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'archived' }))).toBe(false);
    });

    test('blocks ignoring during active processing', () => {
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'processing_zotero' }))).toBe(false);
      expect(StateGuards.canIgnore(createTestUrl({ processingStatus: 'processing_content' }))).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    test('returns correct actions for not_started with identifiers', () => {
      const url = createTestUrl({
        processingStatus: 'not_started',
        userIntent: 'auto',
      });
      const actions = StateGuards.getAvailableActions(url);
      
      expect(actions).toContain('process');
      expect(actions).toContain('manual_create');
      expect(actions).toContain('ignore');
      expect(actions).toContain('archive');
      expect(actions).toContain('delete');
    });

    test('returns correct actions for stored URL', () => {
      const url = createTestUrl({
        processingStatus: 'stored',
        zoteroItemKey: 'ABC123',
        createdByTheodore: true,
        linkedUrlCount: 1,
      });
      const actions = StateGuards.getAvailableActions(url);
      
      expect(actions).toContain('unlink');
      expect(actions).toContain('delete_item');
      expect(actions).toContain('edit_citation');
      expect(actions).not.toContain('process');
    });

    test('returns correct actions for awaiting_selection', () => {
      const url = createTestUrl({
        processingStatus: 'awaiting_selection',
        processingAttempts: 1,
      });
      const actions = StateGuards.getAvailableActions(url);
      
      expect(actions).toContain('select_identifier');
      expect(actions).toContain('manual_create');
      expect(actions).toContain('view_history');
    });
  });

  describe('getActionPriority', () => {
    test('returns correct priorities', () => {
      expect(StateGuards.getActionPriority('process')).toBe(100);
      expect(StateGuards.getActionPriority('select_identifier')).toBe(95);
      expect(StateGuards.getActionPriority('manual_create')).toBe(75);
      expect(StateGuards.getActionPriority('delete')).toBe(10);
    });

    test('returns 0 for unknown action', () => {
      expect(StateGuards.getActionPriority('unknown_action')).toBe(0);
    });
  });
});

