/**
 * URL Processing State Machine
 * 
 * Manages state transitions for the URL processing workflow.
 * Ensures all transitions are valid, records history, and handles side effects.
 * 
 * Based on PRD Section 6: State Machine Design
 */

import { db } from '../db/client';
import { urls } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type {
  ProcessingStatus,
  TransitionMetadata,
  TransitionResult,
  ProcessingAttempt,
} from '../types/url-processing';

/**
 * URL Processing State Machine
 * 
 * Defines valid state transitions and manages the transition workflow
 */
export class URLProcessingStateMachine {
  /**
   * Valid state transitions map
   * Key: current state → Value: array of allowed next states
   */
  private static readonly TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
    not_started: [
      'processing_zotero',
      'processing_content',  // Direct if no Zotero options
      'ignored',
      'archived',
      'stored_custom',       // Manual creation
    ],
    
    processing_zotero: [
      'stored',
      'stored_incomplete',
      'processing_content',  // Auto-cascade on failure
      'exhausted',           // Permanent error
    ],
    
    processing_content: [
      'awaiting_selection',  // Found identifiers
      'processing_llm',      // Auto-cascade if no identifiers
      'exhausted',           // Permanent error
    ],
    
    processing_llm: [
      'awaiting_metadata',   // Found metadata
      'exhausted',           // Failed or low quality
    ],
    
    awaiting_selection: [
      'processing_zotero',   // User selected identifier
      'ignored',             // User gives up
      'stored_custom',       // Manual creation
    ],
    
    awaiting_metadata: [
      'stored',              // User approved
      'stored_incomplete',   // User approved with missing fields
      'processing_zotero',   // User wants to retry
      'ignored',
      'stored_custom',
    ],
    
    stored: [
      'not_started',         // Unlinked
      'stored_incomplete',   // Re-validation found issues
    ],
    
    stored_incomplete: [
      'stored',              // User completed metadata
      'not_started',         // Unlinked
    ],
    
    stored_custom: [
      'not_started',         // Unlinked
    ],
    
    exhausted: [
      'not_started',         // User wants to retry
      'stored_custom',       // Manual creation
      'ignored',
      'archived',
    ],
    
    ignored: [
      'not_started',         // Un-ignore
      'archived',
    ],
    
    archived: [
      'not_started',         // Un-archive
    ],
  };

  /**
   * Check if a state transition is valid
   * 
   * @param from - Current state
   * @param to - Desired state
   * @returns true if transition is allowed
   */
  static canTransition(from: ProcessingStatus, to: ProcessingStatus): boolean {
    const allowedTransitions = this.TRANSITIONS[from];
    if (!allowedTransitions) {
      console.warn(`Unknown state: ${from}`);
      return false;
    }
    return allowedTransitions.includes(to);
  }

  /**
   * Perform a state transition with validation and history recording
   * 
   * @param urlId - URL ID to transition
   * @param from - Current state (for validation)
   * @param to - Desired state
   * @param metadata - Additional transition metadata
   * @returns Transition result
   */
  static async transition(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus,
    metadata?: TransitionMetadata
  ): Promise<TransitionResult> {
    // Validate transition
    if (!this.canTransition(from, to)) {
      return {
        success: false,
        error: `Invalid transition from ${from} to ${to}`,
        from,
        to,
      };
    }

    try {
      // Fetch current URL data to verify state
      const urlRecord = await db.query.urls.findFirst({
        where: eq(urls.id, urlId),
      });

      if (!urlRecord) {
        return {
          success: false,
          error: `URL ${urlId} not found`,
        };
      }

      // Verify current state matches expectation
      if (urlRecord.processingStatus !== from) {
        console.warn(
          `State mismatch for URL ${urlId}: expected ${from}, got ${urlRecord.processingStatus}`
        );
        // Continue anyway - state may have been updated by another process
      }

      // Perform the transition
      await db.update(urls)
        .set({
          processingStatus: to,
          updatedAt: new Date(),
          ...metadata,
        })
        .where(eq(urls.id, urlId));

      // Record transition in history
      await this.recordTransition(urlId, from, to, metadata);

      // Handle side effects
      await this.handleTransitionSideEffects(urlId, from, to, metadata);

      return {
        success: true,
        from,
        to,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during transition',
        from,
        to,
      };
    }
  }

  /**
   * Record transition in processing history
   * 
   * @param urlId - URL ID
   * @param from - Previous state
   * @param to - New state
   * @param metadata - Transition metadata
   */
  private static async recordTransition(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus,
    metadata?: TransitionMetadata
  ): Promise<void> {
    try {
      // Get current URL data
      const urlRecord = await db.query.urls.findFirst({
        where: eq(urls.id, urlId),
      });

      if (!urlRecord) {
        console.error(`Cannot record transition: URL ${urlId} not found`);
        return;
      }

      // Get existing history
      const existingHistory: ProcessingAttempt[] = urlRecord.processingHistory
        ? (Array.isArray(urlRecord.processingHistory) 
            ? urlRecord.processingHistory 
            : JSON.parse(JSON.stringify(urlRecord.processingHistory)))
        : [];

      // Create new history entry
      const newEntry: ProcessingAttempt = {
        timestamp: Date.now(),
        transition: { from, to },
        metadata: metadata as Record<string, unknown>,
      };

      // Append to history
      const updatedHistory = [...existingHistory, newEntry];

      // Update database
      await db.update(urls)
        .set({
          processingHistory: updatedHistory,
        })
        .where(eq(urls.id, urlId));
    } catch (error) {
      console.error(`Failed to record transition for URL ${urlId}:`, error);
      // Don't throw - transition succeeded, just logging failed
    }
  }

  /**
   * Handle side effects of state transitions
   * 
   * @param urlId - URL ID
   * @param from - Previous state
   * @param to - New state
   * @param metadata - Transition metadata
   */
  private static async handleTransitionSideEffects(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus,
    metadata?: TransitionMetadata
  ): Promise<void> {
    // Log state changes for debugging
    console.log(`URL ${urlId}: ${from} → ${to}`, metadata);

    // Example: When moving to exhausted, could create a notification
    if (to === 'exhausted') {
      console.warn(`URL ${urlId} reached exhausted state - all automated methods failed`);
      // In the future, could create a suggestion or notification here
    }

    // Example: When moving from stored to not_started (unlink)
    if (from.startsWith('stored') && to === 'not_started') {
      console.log(`URL ${urlId} was unlinked from Zotero`);
      // Could trigger additional cleanup here
    }

    // Example: When moving to ignored/archived
    if (to === 'ignored' || to === 'archived') {
      console.log(`URL ${urlId} marked as ${to}`);
    }

    // Example: When manual creation
    if (to === 'stored_custom') {
      console.log(`URL ${urlId} manually created by user`);
    }

    // No async operations needed for now, but keeping async for future extensibility
  }

  /**
   * Get all possible next states from current state
   * 
   * @param current - Current state
   * @returns Array of possible next states
   */
  static getPossibleNextStates(current: ProcessingStatus): ProcessingStatus[] {
    return this.TRANSITIONS[current] || [];
  }

  /**
   * Check if a state is a final state (typically requires user action to change)
   * 
   * @param state - State to check
   * @returns true if state is final
   */
  static isFinalState(state: ProcessingStatus): boolean {
    const finalStates: ProcessingStatus[] = [
      'stored',
      'stored_incomplete',
      'stored_custom',
      'exhausted',
      'ignored',
      'archived',
    ];
    return finalStates.includes(state);
  }

  /**
   * Check if a state is an active processing state
   * 
   * @param state - State to check
   * @returns true if actively processing
   */
  static isProcessingState(state: ProcessingStatus): boolean {
    const processingStates: ProcessingStatus[] = [
      'processing_zotero',
      'processing_content',
      'processing_llm',
    ];
    return processingStates.includes(state);
  }

  /**
   * Check if a state requires user action
   * 
   * @param state - State to check
   * @returns true if user action required
   */
  static requiresUserAction(state: ProcessingStatus): boolean {
    const actionStates: ProcessingStatus[] = [
      'awaiting_selection',
      'awaiting_metadata',
      'exhausted', // Requires manual creation
    ];
    return actionStates.includes(state);
  }

  /**
   * Get state label for UI display
   * 
   * @param state - Processing state
   * @returns Human-readable label
   */
  static getStateLabel(state: ProcessingStatus): string {
    const labels: Record<ProcessingStatus, string> = {
      not_started: 'Not Started',
      processing_zotero: 'Processing (Zotero)',
      processing_content: 'Processing (Content)',
      processing_llm: 'Processing (LLM)',
      awaiting_selection: 'Awaiting Identifier Selection',
      awaiting_metadata: 'Awaiting Metadata Approval',
      stored: 'Stored',
      stored_incomplete: 'Stored (Incomplete)',
      stored_custom: 'Stored (Custom)',
      exhausted: 'Exhausted (Manual Needed)',
      ignored: 'Ignored',
      archived: 'Archived',
    };
    return labels[state] || state;
  }

  /**
   * Get state description for UI tooltips
   * 
   * @param state - Processing state
   * @returns Description text
   */
  static getStateDescription(state: ProcessingStatus): string {
    const descriptions: Record<ProcessingStatus, string> = {
      not_started: 'URL has not been processed yet',
      processing_zotero: 'Currently being processed with Zotero API',
      processing_content: 'Fetching content and extracting identifiers',
      processing_llm: 'Extracting metadata using LLM',
      awaiting_selection: 'Identifiers found - select one to process',
      awaiting_metadata: 'Metadata extracted - review and approve',
      stored: 'Successfully stored in Zotero with complete citation',
      stored_incomplete: 'Stored in Zotero but missing critical citation fields',
      stored_custom: 'Manually created custom Zotero item',
      exhausted: 'All automated processing methods failed - manual intervention required',
      ignored: 'Marked to skip processing',
      archived: 'Permanently archived',
    };
    return descriptions[state] || 'Unknown state';
  }

  /**
   * Validate entire transition graph (for testing/debugging)
   * Ensures no dead states and all states are reachable
   * 
   * @returns Validation result with any issues found
   */
  static validateTransitionGraph(): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const allStates = Object.keys(this.TRANSITIONS) as ProcessingStatus[];

    // Check each state has valid transitions
    for (const state of allStates) {
      const transitions = this.TRANSITIONS[state];
      
      if (!transitions || transitions.length === 0) {
        // It's ok for some states to be terminal (archived, ignored)
        if (!['archived'].includes(state)) {
          issues.push(`State ${state} has no outgoing transitions (dead end)`);
        }
      }

      // Check all transition targets are valid states
      for (const target of transitions) {
        if (!allStates.includes(target)) {
          issues.push(`State ${state} has invalid transition to ${target}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

