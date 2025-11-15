/**
 * URL Suggestions Engine
 * 
 * Generates context-aware suggestions based on URL state, capabilities,
 * and processing history to guide users toward the best next action.
 * 
 * Based on PRD Section 8.2: Smart Suggestions System
 */

import type {
  ProcessingStatus,
  UserIntent,
  ProcessingCapability,
  ProcessingAttempt,
  Suggestion,
  SuggestionPriority,
  SuggestionType,
} from '../types/url-processing';

interface UrlForSuggestions {
  id: number;
  url: string;
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  processingAttempts: number;
  processingHistory?: ProcessingAttempt[];
  capability: ProcessingCapability;
  citationValidationStatus?: string | null;
  citationValidationDetails?: { missingFields?: string[] };
  zoteroItemKey?: string | null;
}

/**
 * Generate suggestions for a URL based on its current state
 * 
 * @param url - URL with all relevant data
 * @returns Array of suggestions sorted by priority
 */
export function generateSuggestions(url: UrlForSuggestions): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // ============================================
  // HIGH PRIORITY SUGGESTIONS
  // ============================================

  // Suggestion: Incomplete citation
  if (url.processingStatus === 'stored_incomplete' && url.citationValidationDetails?.missingFields) {
    suggestions.push({
      type: 'warning',
      priority: 'high',
      message: `Citation is missing critical fields: ${url.citationValidationDetails.missingFields.join(', ')}`,
      action: {
        label: 'Edit Citation',
        handler: 'editCitation',
        params: { urlId: url.id, itemKey: url.zoteroItemKey },
      },
    });
  }

  // Suggestion: Failed Zotero but found identifiers (KEY SUGGESTION from requirements)
  if (
    url.processingStatus === 'awaiting_selection' &&
    hasFailedZoteroAttempt(url.processingHistory)
  ) {
    suggestions.push({
      type: 'info',
      priority: 'high',
      message: 'Zotero processing failed, but identifiers were found in the content. Review and select the most appropriate identifier to process.',
      action: {
        label: 'Select Identifier',
        handler: 'selectIdentifier',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Exhausted - manual creation needed
  if (url.processingStatus === 'exhausted') {
    suggestions.push({
      type: 'error',
      priority: 'high',
      message: 'All automated processing methods have failed. Manual intervention is required to create a Zotero item.',
      action: {
        label: 'Create Manually',
        handler: 'manualCreate',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Awaiting metadata approval
  if (url.processingStatus === 'awaiting_metadata') {
    suggestions.push({
      type: 'info',
      priority: 'high',
      message: 'AI has extracted metadata for this URL. Review the quality and approve to create a Zotero item.',
      action: {
        label: 'Review & Approve',
        handler: 'approveMetadata',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Multiple failures (3+ attempts)
  if (url.processingAttempts >= 3 && url.processingStatus !== 'stored') {
    const failureCount = url.processingHistory?.filter(h => !h.success).length || 0;
    
    if (failureCount >= 3) {
      suggestions.push({
        type: 'warning',
        priority: 'high',
        message: `Processing has failed ${failureCount} times. Consider manual creation or check if the URL is accessible.`,
        action: {
          label: 'Create Manually',
          handler: 'manualCreate',
          params: { urlId: url.id },
        },
      });
    }
  }

  // ============================================
  // MEDIUM PRIORITY SUGGESTIONS
  // ============================================

  // Suggestion: Ready to process with identifiers
  if (
    url.processingStatus === 'not_started' &&
    url.userIntent === 'auto' &&
    url.capability.hasIdentifiers
  ) {
    suggestions.push({
      type: 'info',
      priority: 'medium',
      message: 'This URL has valid identifiers (DOI, PMID, etc.). Ready to process with Zotero for high-quality metadata.',
      action: {
        label: 'Process Now',
        handler: 'process',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Has web translators
  if (
    url.processingStatus === 'not_started' &&
    url.userIntent === 'auto' &&
    !url.capability.hasIdentifiers &&
    url.capability.hasWebTranslators
  ) {
    suggestions.push({
      type: 'info',
      priority: 'medium',
      message: 'Zotero web translator is available for this URL. Processing will attempt to extract metadata automatically.',
      action: {
        label: 'Process with Translator',
        handler: 'process',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Content available for processing
  if (
    url.processingStatus === 'not_started' &&
    url.capability.hasContent &&
    !url.capability.hasIdentifiers &&
    !url.capability.hasWebTranslators
  ) {
    suggestions.push({
      type: 'info',
      priority: 'medium',
      message: 'Content is cached and ready for identifier extraction or LLM processing.',
      action: {
        label: 'Extract Identifiers',
        handler: 'process',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Can retry after failure
  if (
    url.processingStatus === 'not_started' &&
    url.processingAttempts > 0 &&
    url.processingAttempts < 3
  ) {
    suggestions.push({
      type: 'info',
      priority: 'medium',
      message: 'Previous processing attempt failed. You can retry or reset the processing state.',
      action: {
        label: 'Retry Processing',
        handler: 'process',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: URL is inaccessible
  if (!url.capability.isAccessible && url.processingStatus === 'not_started') {
    suggestions.push({
      type: 'warning',
      priority: 'medium',
      message: 'URL appears to be inaccessible (HTTP error or network issue). Manual creation may be the only option.',
      action: {
        label: 'Create Manually',
        handler: 'manualCreate',
        params: { urlId: url.id },
      },
    });
  }

  // ============================================
  // LOW PRIORITY SUGGESTIONS
  // ============================================

  // Suggestion: Ignored URL
  if (url.processingStatus === 'ignored' || url.userIntent === 'ignore') {
    suggestions.push({
      type: 'info',
      priority: 'low',
      message: 'This URL is marked as ignored and will be skipped in batch processing. You can un-ignore it to enable processing.',
      action: {
        label: 'Un-ignore',
        handler: 'unignore',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: View processing history
  if (url.processingAttempts > 1 && url.processingStatus !== 'stored') {
    suggestions.push({
      type: 'info',
      priority: 'low',
      message: `This URL has ${url.processingAttempts} processing attempts. View history to see what was tried.`,
      action: {
        label: 'View History',
        handler: 'viewHistory',
        params: { urlId: url.id },
      },
    });
  }

  // Suggestion: Priority intent could batch process first
  if (url.userIntent === 'priority' && url.processingStatus === 'not_started') {
    suggestions.push({
      type: 'info',
      priority: 'low',
      message: 'This URL is marked as priority and will be processed first in batch operations.',
    });
  }

  // Suggestion: Custom item could be replaced
  if (url.processingStatus === 'stored_custom') {
    suggestions.push({
      type: 'info',
      priority: 'low',
      message: 'This is a custom-created item. You can unlink and try automated processing if you want to replace it.',
      action: {
        label: 'Unlink & Retry',
        handler: 'unlink',
        params: { urlId: url.id },
      },
    });
  }

  // Sort suggestions by priority
  return sortSuggestions(suggestions);
}

/**
 * Check if URL had a failed Zotero attempt in history
 */
function hasFailedZoteroAttempt(history?: ProcessingAttempt[]): boolean {
  if (!history || history.length === 0) return false;
  
  return history.some(
    attempt =>
      (attempt.stage === 'zotero_identifier' || attempt.stage === 'zotero_url') &&
      (attempt.success === false || attempt.success === 0)
  );
}

/**
 * Sort suggestions by priority (high > medium > low)
 */
function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return suggestions.sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by type (error > warning > info)
    const typeOrder: Record<SuggestionType, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };

    return typeOrder[a.type] - typeOrder[b.type];
  });
}

/**
 * Get common error patterns from processing history
 */
export function getCommonErrors(history: ProcessingAttempt[]): string[] {
  if (!history || history.length === 0) return [];

  const errorCounts: Record<string, number> = {};

  history.forEach(attempt => {
    if (attempt.error) {
      errorCounts[attempt.error] = (errorCounts[attempt.error] || 0) + 1;
    }
  });

  // Return top 3 most common errors
  return Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([error]) => error);
}

/**
 * Get suggestion count for badge display
 */
export function getSuggestionCount(url: UrlForSuggestions): number {
  return generateSuggestions(url).length;
}

/**
 * Get highest priority suggestion
 */
export function getTopSuggestion(url: UrlForSuggestions): Suggestion | null {
  const suggestions = generateSuggestions(url);
  return suggestions.length > 0 ? suggestions[0] : null;
}

/**
 * Filter suggestions by type
 */
export function getSuggestionsByType(
  url: UrlForSuggestions,
  type: SuggestionType
): Suggestion[] {
  return generateSuggestions(url).filter(s => s.type === type);
}

/**
 * Filter suggestions by priority
 */
export function getSuggestionsByPriority(
  url: UrlForSuggestions,
  priority: SuggestionPriority
): Suggestion[] {
  return generateSuggestions(url).filter(s => s.priority === priority);
}

