/**
 * State Guards
 * 
 * Guards that control when certain actions are allowed based on URL state.
 * These guards ensure actions are only performed when appropriate and safe.
 * 
 * Based on PRD Section 6.2: State Guards
 */

import type { ProcessingStatus, UserIntent, ProcessingCapability } from '../types/url-processing';
import type { Url } from '../../drizzle/schema';
import { categorizeError, isPermanentError } from '../error-handling';
import { isSemanticScholarUrl } from '../orchestrator/semantic-scholar-helpers';

/**
 * Extended URL type with computed fields for guard checks
 */
export interface UrlForGuardCheck {
  id: number;
  url: string;
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  zoteroItemKey?: string | null;
  createdByTheodore?: boolean | number | null;
  userModifiedInZotero?: boolean | number | null;
  linkedUrlCount?: number | null;
  processingAttempts?: number | null;
  capability?: ProcessingCapability;
}

/**
 * State Guards - Control when actions are allowed
 */
export class StateGuards {
  /**
   * Can this URL be processed with Zotero?
   *
   * Requirements:
   * - Not ignored/archived
   * - Not in manual_only mode (unless explicitly allowed)
   * - In appropriate processing state
   * - Has identifiers or web translators available
   */
  /**
   * Can this URL be processed with Zotero?
   *
   * ENHANCED (Phase 3): Now includes state consistency verification
   *
   * Requirements:
   * - Not ignored/archived
   * - Not in manual_only mode
   * - In appropriate processing state
   * - State must be consistent (no broken state)
   * - Has identifiers or web translators available
   */
  static canProcessWithZotero(url: UrlForGuardCheck): boolean {
    // User intent check
    if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
      return false;
    }

    if (url.userIntent === 'manual_only') {
      return false;
    }

    // State check - can only process from certain states
    const processableStates: ProcessingStatus[] = [
      'not_started',
      'awaiting_selection', // User selected an identifier
    ];

    if (!processableStates.includes(url.processingStatus)) {
      return false;
    }

    // NEW (Phase 3): Check for state consistency issues
    // Cannot process if state is already inconsistent
    const consistencyIssues = this.getStateIntegrityIssues(url);
    if (consistencyIssues.length > 0) {
      console.log(`[canProcessWithZotero] URL has state consistency issues: ${consistencyIssues[0]}`);
      return false;
    }

    if (isSemanticScholarUrl(url.url)) {
      console.log(`[canProcessWithZotero] URL is Semantic Scholar, returning true`);
      return true;
    }

    // Capability check - must have identifiers or translators
    if (url.capability) {
      return url.capability.hasIdentifiers || url.capability.hasWebTranslators;
    }

    // If no capability info, assume it can be attempted
    return true;
  }

  /**
   * Can content be fetched and identifiers extracted?
   *
   * ENHANCED (Phase 3): Now includes state consistency verification
   *
   * Requirements:
   * - Not ignored/archived
   * - Not in manual_only mode
   * - Not currently in active processing state
   * - Not already successfully stored
   * - State must be consistent (no broken state)
   */
  static canProcessContent(url: UrlForGuardCheck): boolean {
    // User intent check
    if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
      return false;
    }

    if (url.userIntent === 'manual_only') {
      return false;
    }

    // Cannot process if already stored (complete or incomplete)
    const nonProcessableStates: ProcessingStatus[] = [
      'stored',
      'stored_incomplete',
      'stored_custom',
      'ignored',
      'archived',
    ];

    if (nonProcessableStates.includes(url.processingStatus)) {
      return false;
    }

    // Cannot process if currently in active processing
    const activeStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    if (activeStates.includes(url.processingStatus)) {
      return false;
    }

    // NEW (Phase 3): Check for state consistency issues
    // Cannot process if state is already inconsistent
    const consistencyIssues = this.getStateIntegrityIssues(url);
    if (consistencyIssues.length > 0) {
      console.log(`[canProcessContent] URL has state consistency issues: ${consistencyIssues[0]}`);
      return false;
    }

    // Can process from: not_started, awaiting_selection, awaiting_metadata, exhausted
    return true;
  }

  /**
   * Can this URL be unlinked from Zotero?
   * 
   * Requirements:
   * - Currently stored in Zotero (any stored variant)
   */
  /**
   * Can this URL be unlinked from its Zotero item?
   *
   * ENHANCED (Phase 3): Now includes additional safety checks
   *
   * Requirements:
   * - Status must be in unlinkable states (stored*)
   * - State must be consistent (no broken state)
   * - Item must not have multiple links (if critical)
   * - User intent must allow unlinking
   */
  static canUnlink(url: UrlForGuardCheck): boolean {
    // Check if in unlinkable state
    const unlinkableStates: ProcessingStatus[] = [
      'stored',
      'stored_incomplete',
      'stored_custom',
    ];

    if (!unlinkableStates.includes(url.processingStatus)) {
      return false;
    }

    // NEW (Phase 3): Check for state consistency issues
    // Cannot unlink if state is already inconsistent
    const consistencyIssues = this.getStateIntegrityIssues(url);
    if (consistencyIssues.length > 0) {
      console.log(`[canUnlink] URL has state consistency issues: ${consistencyIssues[0]}`);
      return false;
    }

    // NEW (Phase 3): Check if item has multiple links
    // Warn if item is linked to multiple URLs (might be important)
    if (url.linkedUrlCount && url.linkedUrlCount > 1) {
      console.log(`[canUnlink] Item is linked to ${url.linkedUrlCount} URLs, unlinking may affect other URLs`);
      // Still allowed, but logged as warning
    }

    return true;
  }

  /**
   * Can the Zotero item be deleted (not just unlinked)?
   * 
   * Safety requirements:
   * - Item must have been created by Theodore (not pre-existing)
   * - Item must not have been modified by user in Zotero
   * - Item must not be linked to other URLs (linkedUrlCount <= 1)
   */
  static canDeleteZoteroItem(url: UrlForGuardCheck): boolean {
    if (!url.zoteroItemKey) {
      return false; // No item to delete
    }

    // Must be created by Theodore
    const createdByTheodore = typeof url.createdByTheodore === 'boolean' 
      ? url.createdByTheodore 
      : Boolean(url.createdByTheodore);
      
    if (!createdByTheodore) {
      return false;
    }

    // Must not be modified by user in Zotero
    const userModified = typeof url.userModifiedInZotero === 'boolean'
      ? url.userModifiedInZotero
      : Boolean(url.userModifiedInZotero);
      
    if (userModified) {
      return false;
    }

    // Must not be linked to other URLs
    const linkedCount = url.linkedUrlCount || 0;
    if (linkedCount > 1) {
      return false;
    }

    return true;
  }

  /**
   * Can a custom Zotero item be created manually?
   * 
   * This is always allowed from any state (provides escape hatch)
   */
  static canManuallyCreate(url: UrlForGuardCheck): boolean {
    // Always allow manual creation as an escape hatch
    // Even if already stored, user might want to create a different item
    return true;
  }

  /**
   * Can processing state be reset?
   * 
   * Requirements:
   * - Not currently in an active processing state
   *   (can't reset while processing is ongoing)
   */
  static canReset(url: UrlForGuardCheck): boolean {
    const activeProcessingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    return !activeProcessingStates.includes(url.processingStatus);
  }

  /**
   * Should auto-cascade to next processing stage after failure?
   * 
   * Requirements:
   * - Error is not permanent (retryable category)
   * - User intent is not manual_only
   * - Currently in a cascadable state
   */
  static shouldAutoCascade(
    processingStatus: ProcessingStatus,
    error: unknown,
    userIntent?: UserIntent
  ): boolean {
    // Don't cascade on permanent errors
    if (isPermanentError(error)) {
      return false;
    }

    // Don't cascade if user wants manual control
    if (userIntent === 'manual_only') {
      return false;
    }

    // Only cascade from certain states
    const cascadableStates: ProcessingStatus[] = [
      'processing_zotero',   // → processing_content
      'processing_content',  // → processing_llm
    ];

    return cascadableStates.includes(processingStatus);
  }

  /**
   * Can citation metadata be edited?
   * 
   * Requirements:
   * - URL must be stored (any stored variant)
   * - Must have a Zotero item key
   */
  static canEditCitation(url: UrlForGuardCheck): boolean {
    if (!url.zoteroItemKey) {
      return false;
    }

    const editableStates: ProcessingStatus[] = [
      'stored',
      'stored_incomplete',
      'stored_custom',
    ];

    return editableStates.includes(url.processingStatus);
  }

  /**
   * Can identifier be selected from available identifiers?
   * 
   * Requirements:
   * - Must be in awaiting_selection state
   */
  static canSelectIdentifier(url: UrlForGuardCheck): boolean {
    return url.processingStatus === 'awaiting_selection';
  }

  /**
   * Can extracted metadata be approved?
   * 
   * Requirements:
   * - Must be in awaiting_metadata state
   */
  static canApproveMetadata(url: UrlForGuardCheck): boolean {
    return url.processingStatus === 'awaiting_metadata';
  }

  /**
   * Can URL be ignored (marked to skip)?
   * 
   * Requirements:
   * - Not already ignored or archived
   * - Not currently processing
   */
  static canIgnore(url: UrlForGuardCheck): boolean {
    // Already ignored/archived
    if (url.processingStatus === 'ignored' || url.processingStatus === 'archived') {
      return false;
    }

    // Can't ignore while processing
    const activeProcessingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    return !activeProcessingStates.includes(url.processingStatus);
  }

  /**
   * Can URL be un-ignored (removed from ignore state)?
   * 
   * Requirements:
   * - Currently ignored or archived
   */
  static canUnignore(url: UrlForGuardCheck): boolean {
    return url.processingStatus === 'ignored' || url.processingStatus === 'archived';
  }

  /**
   * Can URL be archived (permanent ignore)?
   * 
   * Requirements:
   * - Not currently processing
   * - Not already archived
   */
  static canArchive(url: UrlForGuardCheck): boolean {
    if (url.processingStatus === 'archived') {
      return false;
    }

    const activeProcessingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    return !activeProcessingStates.includes(url.processingStatus);
  }

  /**
   * Can processing be retried?
   * 
   * Requirements:
   * - Processing must have failed or be exhausted
   * - Not currently processing
   */
  static canRetry(url: UrlForGuardCheck): boolean {
    // Can retry from these states
    const retryableStates: ProcessingStatus[] = [
      'exhausted',
      'not_started', // If previous attempt failed
    ];

    if (!retryableStates.includes(url.processingStatus)) {
      return false;
    }

    // Must have attempted at least once to retry
    if (url.processingStatus === 'not_started' && (url.processingAttempts || 0) === 0) {
      return false;
    }

    return true;
  }

  /**
   * Should show retry button (failed processing)?
   * 
   * Requirements:
   * - Processing status shows failure
   * - Has processing attempts
   */
  static shouldShowRetry(url: UrlForGuardCheck): boolean {
    return (
      url.processingStatus === 'exhausted' ||
      ((url.processingAttempts || 0) > 0 && url.processingStatus === 'not_started')
    );
  }

  /**
   * Can view processing history?
   * 
   * Requirements:
   * - Has at least one processing attempt
   */
  static canViewHistory(url: UrlForGuardCheck): boolean {
    return (url.processingAttempts || 0) > 0;
  }

  /**
   * Can delete URL from database?
   * 
   * This is generally always allowed, but we check it's not actively processing
   */
  static canDelete(url: UrlForGuardCheck): boolean {
    const activeProcessingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    return !activeProcessingStates.includes(url.processingStatus);
  }

  /**
   * Can extract BibTeX citation from Semantic Scholar?
   *
   * Requirements:
   * - URL domain must be semanticscholar.org
   * - Must be in not_started state (hasn't been processed yet)
   * - Not ignored/archived
   */
  static canExtractSemanticScholar(url: UrlForGuardCheck): boolean {
    // User intent check
    if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
      return false;
    }

    // Must be from Semantic Scholar domain
    try {
      const urlObj = new URL(url.url);
      if (!urlObj.hostname.includes('semanticscholar.org')) {
        return false;
      }
    } catch {
      return false;
    }

    // Only available from not_started state
    if (url.processingStatus !== 'not_started') {
      return false;
    }

    return true;
  }

  /**
   * Can link URL to an existing Zotero item?
   *
   * Enhanced with state consistency checks (Phase 2)
   *
   * Requirements:
   * - URL must not already be linked to a Zotero item
   * - Not ignored/archived
   * - Not currently processing
   * - State must be consistent (no orphaned items, etc.)
   */
  static canLinkToItem(url: UrlForGuardCheck): boolean {
    // User intent check
    if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
      return false;
    }

    // Must not already have a Zotero item linked
    if (url.zoteroItemKey) {
      console.log(`[canLinkToItem] URL with id ${url.id} already has a Zotero item linked (${url.zoteroItemKey}), returning false`);
      return false;
    }

    // NEW (Phase 2): Check for state consistency issues
    // Cannot link if state is already inconsistent
    const consistencyIssues = this.getStateIntegrityIssues(url);
    if (consistencyIssues.length > 0) {
      console.log(`[canLinkToItem] URL has state consistency issues: ${consistencyIssues[0]}`);
      return false;
    }

    // Can't link while processing
    const activeProcessingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];

    if (activeProcessingStates.includes(url.processingStatus)) {
      return false;
    }

    return true;
  }

  /**
   * Get all state consistency issues for a URL
   *
   * State Integrity Rules (MUST always be true):
   * 1. If has zoteroItemKey → must be in ['stored', 'stored_incomplete', 'stored_custom']
   * 2. If in stored* states → must have valid zoteroItemKey
   * 3. If in 'ignored'/'archived' → must NOT have zoteroItemKey
   * 4. If in 'processing_*' states → must NOT have zoteroItemKey yet
   *
   * Returns array of human-readable inconsistency descriptions
   */
  static getStateIntegrityIssues(url: UrlForGuardCheck): string[] {
    const issues: string[] = [];

    // Rule 1: If has zoteroItemKey, must be in stored state
    if (url.zoteroItemKey) {
      const storedStates: ProcessingStatus[] = ['stored', 'stored_incomplete', 'stored_custom'];
      if (!storedStates.includes(url.processingStatus)) {
        issues.push(
          `LINKED_BUT_NOT_STORED: Item ${url.zoteroItemKey} is linked but status is '${url.processingStatus}' ` +
          `(should be one of: stored, stored_incomplete, stored_custom)`
        );
      }
    }

    // Rule 2: If in stored state, must have zoteroItemKey
    const storedStates: ProcessingStatus[] = ['stored', 'stored_incomplete', 'stored_custom'];
    if (storedStates.includes(url.processingStatus) && !url.zoteroItemKey) {
      issues.push(
        `STORED_WITHOUT_ITEM: Status is '${url.processingStatus}' but no zoteroItemKey found ` +
        `(orphaned state - item was supposed to be linked but isn't)`
      );
    }

    // Rule 3: Ignored/archived shouldn't have zoteroItemKey
    if ((url.processingStatus === 'ignored' || url.processingStatus === 'archived') && url.zoteroItemKey) {
      issues.push(
        `ARCHIVED_WITH_ITEM: Status is '${url.processingStatus}' but still linked to item ${url.zoteroItemKey} ` +
        `(should not have item if ignored/archived)`
      );
    }

    // Rule 4: Processing states shouldn't have zoteroItemKey
    const processingStates: ProcessingStatus[] = ['processing_zotero', 'processing_content', 'processing_llm'];
    if (processingStates.includes(url.processingStatus) && url.zoteroItemKey) {
      issues.push(
        `PROCESSING_WITH_ITEM: Still processing but already has item ${url.zoteroItemKey} ` +
        `(should not have item until processing completes)`
      );
    }

    return issues;
  }

  /**
   * Suggest repair action for inconsistent state
   *
   * Returns the recommended action to fix inconsistencies, or null if no issues
   */
  static suggestRepairAction(url: UrlForGuardCheck): {
    type: 'transition_to_stored_custom' | 'transition_to_not_started' | 'unlink_item';
    reason: string;
    from: ProcessingStatus;
    to: ProcessingStatus;
  } | null {
    const issues = this.getStateIntegrityIssues(url);
    if (issues.length === 0) return null;

    // Pattern 1: Item linked but not in stored state
    // Best fix: transition to stored_custom (since it's linked)
    if (url.zoteroItemKey && !['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
      const firstIssue = issues.find(i => i.includes('LINKED_BUT_NOT_STORED'));
      return {
        type: 'transition_to_stored_custom',
        reason: firstIssue || 'Item is linked but status is not in stored state',
        from: url.processingStatus,
        to: 'stored_custom',
      };
    }

    // Pattern 2: In stored state but no item
    // Best fix: transition to not_started (not actually stored)
    if (!url.zoteroItemKey && ['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
      const firstIssue = issues.find(i => i.includes('STORED_WITHOUT_ITEM'));
      return {
        type: 'transition_to_not_started',
        reason: firstIssue || 'Status says stored but no item is actually linked',
        from: url.processingStatus,
        to: 'not_started',
      };
    }

    // Pattern 3: Archived/ignored but still has item
    // Best fix: unlink the item
    if ((url.processingStatus === 'ignored' || url.processingStatus === 'archived') && url.zoteroItemKey) {
      const firstIssue = issues.find(i => i.includes('ARCHIVED_WITH_ITEM'));
      return {
        type: 'unlink_item',
        reason: firstIssue || 'Item is linked but URL is archived/ignored',
        from: url.processingStatus,
        to: url.processingStatus, // Don't change status, just unlink
      };
    }

    return null;
  }

  /**
   * Check if URL has state consistency issues
   *
   * Returns true if any inconsistencies detected
   */
  static hasStateIssues(url: UrlForGuardCheck): boolean {
    return this.getStateIntegrityIssues(url).length > 0;
  }

  /**
   * NEW (Phase 3): Validate and suggest repair for state after transition
   *
   * This method is called after a state transition to verify the new state
   * is consistent. If problems are detected, it suggests repairs.
   *
   * Returns validation result with consistency status and repair suggestions
   */
  static validateTransitionState(url: UrlForGuardCheck, afterTransition: ProcessingStatus): { isConsistent: boolean; issues?: string[]; repairSuggestion?: { type: string; reason: string; from: ProcessingStatus; to: ProcessingStatus } } {
    // Create URL object with new status for checking
    const transitionedUrl: UrlForGuardCheck = {
      ...url,
      processingStatus: afterTransition,
    };

    const issues = this.getStateIntegrityIssues(transitionedUrl);

    if (issues.length === 0) {
      // State is consistent after transition
      return {
        isConsistent: true,
      };
    }

    // State is inconsistent after transition - suggest repair
    const repairSuggestion = this.suggestRepairAction(transitionedUrl);

    return {
      isConsistent: false,
      issues,
      repairSuggestion: repairSuggestion || undefined,
    };
  }

  /**
   * NEW (Phase 3): Check if a state transition would be safe
   *
   * Validates that:
   * 1. Current state allows transition from
   * 2. Target state is valid
   * 3. After transition, state will be consistent (if possible)
   *
   * Returns validation result with details
   */
  static validateTransition(url: UrlForGuardCheck, toState: ProcessingStatus): { allowed: boolean; reason?: string; requiresRepair?: boolean } {
    // Check if current state can transition from
    const currentState = url.processingStatus;

    // Define allowed transitions (basic state machine rules)
    const transitionMap: Record<ProcessingStatus, ProcessingStatus[]> = {
      'not_started': ['processing_zotero', 'processing_content', 'processing_llm', 'stored_custom', 'ignored', 'archived'],
      'awaiting_selection': ['processing_zotero', 'processing_content', 'processing_llm', 'exhausted'],
      'awaiting_metadata': ['processing_zotero', 'stored', 'stored_custom', 'exhausted'],
      'processing_zotero': ['stored', 'stored_incomplete', 'awaiting_metadata', 'exhausted'],
      'processing_content': ['awaiting_selection', 'processing_zotero', 'exhausted'],
      'processing_llm': ['awaiting_metadata', 'stored', 'exhausted'],
      'stored': ['stored_incomplete', 'stored_custom', 'ignored', 'archived', 'not_started'],
      'stored_incomplete': ['stored', 'stored_custom', 'ignored', 'archived', 'not_started'],
      'stored_custom': ['stored', 'stored_incomplete', 'ignored', 'archived', 'not_started'],
      'exhausted': ['processing_zotero', 'processing_content', 'processing_llm', 'stored_custom', 'ignored', 'archived', 'not_started'],
      'ignored': ['not_started', 'processing_zotero', 'processing_content'],
      'archived': ['not_started'],
    };

    // Get allowed transitions for current state
    const allowedTransitions = transitionMap[currentState] || [];

    if (!allowedTransitions.includes(toState)) {
      return {
        allowed: false,
        reason: `Cannot transition from '${currentState}' to '${toState}' (not in allowed transitions)`,
      };
    }

    // Check if new state would have consistency issues
    const validationResult = this.validateTransitionState(url, toState);

    if (!validationResult.isConsistent) {
      return {
        allowed: false,
        reason: `Transition would result in state inconsistency: ${validationResult.issues?.join(', ')}`,
        requiresRepair: true,
      };
    }

    return {
      allowed: true,
    };
  }

  /**
   * Get all available actions for a URL
   * Returns array of action names that are currently allowed
   */
  static getAvailableActions(url: UrlForGuardCheck): string[] {
    const actions: string[] = [];

    if (this.canProcessWithZotero(url)) actions.push('process');
    if (this.canProcessContent(url)) actions.push('process_content');
    if (this.canExtractSemanticScholar(url)) actions.push('extract_semantic_scholar');
    if (this.canLinkToItem(url)) actions.push('link_to_item');
    if (this.canUnlink(url)) actions.push('unlink');
    if (this.canDeleteZoteroItem(url)) actions.push('delete_item');
    if (this.canManuallyCreate(url)) actions.push('manual_create');
    if (this.canReset(url)) actions.push('reset');
    if (this.canEditCitation(url)) actions.push('edit_citation');
    if (this.canSelectIdentifier(url)) actions.push('select_identifier');
    if (this.canApproveMetadata(url)) actions.push('approve_metadata');
    if (this.canIgnore(url)) actions.push('ignore');
    if (this.canUnignore(url)) actions.push('unignore');
    if (this.canArchive(url)) actions.push('archive');
    if (this.canRetry(url)) actions.push('retry');
    if (this.canViewHistory(url)) actions.push('view_history');
    if (this.canDelete(url)) actions.push('delete');

    return actions;
  }

  /**
   * Get action priority for sorting/display
   * Higher priority actions should be shown more prominently
   */
  static getActionPriority(action: string): number {
    const priorities: Record<string, number> = {
      process: 100,
      select_identifier: 95,
      approve_metadata: 90,
      edit_citation: 85,
      extract_semantic_scholar: 85,
      link_to_item: 82,
      retry: 80,
      process_content: 75,
      manual_create: 70,
      unlink: 50,
      delete_item: 45,
      reset: 40,
      ignore: 30,
      unignore: 30,
      archive: 25,
      view_history: 20,
      delete: 10,
    };

    return priorities[action] || 0;
  }
}

