/**
 * Client-Safe State Machine Utilities
 * 
 * Pure utility functions for state machine operations that don't require database access
 * Safe to import in client components
 */

import type { ProcessingStatus } from '../types/url-processing';

/**
 * Valid state transitions map
 * Key: current state → Value: array of allowed next states
 */
const TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  not_started: ['processing_zotero', 'processing_content', 'processing_llm', 'ignored', 'archived'],
  processing_zotero: ['stored', 'stored_incomplete', 'awaiting_selection', 'exhausted', 'not_started'],
  processing_content: ['processing_llm', 'awaiting_metadata', 'exhausted', 'not_started'],
  processing_llm: ['awaiting_metadata', 'exhausted', 'not_started'],
  awaiting_selection: ['processing_zotero', 'exhausted', 'not_started'],
  awaiting_metadata: ['stored', 'stored_incomplete', 'exhausted', 'not_started'],
  stored: ['not_started', 'stored_incomplete'],
  stored_incomplete: ['stored', 'not_started'],
  stored_custom: ['not_started'],
  exhausted: ['not_started', 'stored_custom'],
  ignored: ['not_started'],
  archived: ['not_started'],
};

/**
 * State descriptions for tooltips and help text
 */
const STATE_DESCRIPTIONS: Record<ProcessingStatus, string> = {
  not_started: 'URL has not been processed yet',
  processing_zotero: 'Processing through Zotero translators',
  processing_content: 'Extracting content from the URL',
  processing_llm: 'Using AI to extract metadata',
  awaiting_selection: 'Waiting for user to select an identifier',
  awaiting_metadata: 'Waiting for user to review and approve metadata',
  stored: 'Successfully stored in Zotero with complete metadata',
  stored_incomplete: 'Stored in Zotero but missing some metadata fields',
  stored_custom: 'Manually created by user',
  exhausted: 'All automated methods failed - manual creation required',
  ignored: 'User chose to ignore this URL',
  archived: 'URL has been archived',
};

/**
 * State labels for display
 */
const STATE_LABELS: Record<ProcessingStatus, string> = {
  not_started: 'Not Started',
  processing_zotero: 'Processing (Zotero)',
  processing_content: 'Processing (Content)',
  processing_llm: 'Processing (AI)',
  awaiting_selection: 'Awaiting Selection',
  awaiting_metadata: 'Awaiting Review',
  stored: 'Stored',
  stored_incomplete: 'Incomplete',
  stored_custom: 'Custom',
  exhausted: 'Exhausted',
  ignored: 'Ignored',
  archived: 'Archived',
};

/**
 * Get all possible next states from current state
 * 
 * @param current - Current state
 * @returns Array of possible next states
 */
export function getPossibleNextStates(current: ProcessingStatus): ProcessingStatus[] {
  return TRANSITIONS[current] || [];
}

/**
 * Get human-readable description for a state
 * 
 * @param state - Processing state
 * @returns Description string
 */
export function getStateDescription(state: ProcessingStatus): string {
  return STATE_DESCRIPTIONS[state] || 'Unknown state';
}

/**
 * Get human-readable label for a state
 * 
 * @param state - Processing state
 * @returns Label string
 */
export function getStateLabel(state: ProcessingStatus): string {
  return STATE_LABELS[state] || state;
}

/**
 * Check if a state is a final state (no further processing expected)
 * 
 * @param state - Processing state
 * @returns true if final state
 */
export function isFinalState(state: ProcessingStatus): boolean {
  return ['stored', 'stored_incomplete', 'stored_custom', 'ignored', 'archived'].includes(state);
}

/**
 * Check if a state is a processing state (currently being processed)
 * 
 * @param state - Processing state
 * @returns true if processing state
 */
export function isProcessingState(state: ProcessingStatus): boolean {
  return state.startsWith('processing_');
}

/**
 * Check if a state requires user action
 * 
 * @param state - Processing state
 * @returns true if requires user action
 */
export function requiresUserAction(state: ProcessingStatus): boolean {
  return state.startsWith('awaiting_') || state === 'exhausted';
}

/**
 * Check if a transition is valid
 * 
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is valid
 */
export function isValidTransition(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) || false;
}

