/**
 * Processing Helper Functions
 * 
 * Utility functions for URL processing orchestration
 * Including capability computation, history management, and validation
 */

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, urlContentCache, urlIdentifiers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type {
  ProcessingCapability,
  ProcessingAttempt,
  ProcessingStatus,
  UserIntent,
} from '../types/url-processing';
import type { UrlForGuardCheck } from '../state-machine/state-guards';

/**
 * Get URL with all related data and computed capabilities
 * 
 * @param urlId - URL ID to fetch
 * @returns URL with capabilities or null if not found
 */
export async function getUrlWithCapabilities(
  urlId: number
): Promise<UrlForGuardCheck | null> {
  try {
    const result = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .leftJoin(urlContentCache, eq(urls.id, urlContentCache.urlId))
      .where(eq(urls.id, urlId))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    const analysisData = row.url_analysis_data;
    const enrichment = row.url_enrichments;
    const contentCache = row.url_content_cache;

    // Compute capabilities
    const capability = await computeProcessingCapability(
      urlId,
      row.urls,
      analysisData,
      enrichment,
      contentCache
    );

    return {
      id: row.urls.id,
      url: row.urls.url,
      processingStatus: (row.urls.processingStatus || 'not_started') as ProcessingStatus,
      userIntent: (row.urls.userIntent || 'auto') as UserIntent,
      zoteroItemKey: row.urls.zoteroItemKey,
      createdByTheodore: row.urls.createdByTheodore,
      userModifiedInZotero: row.urls.userModifiedInZotero,
      linkedUrlCount: row.urls.linkedUrlCount,
      processingAttempts: row.urls.processingAttempts,
      capability,
    };
  } catch (error) {
    console.error(`Failed to get URL with capabilities for ${urlId}:`, error);
    return null;
  }
}

/**
 * Compute processing capability for a URL
 * 
 * @param urlId - URL ID
 * @param urlData - URL record
 * @param analysisData - Analysis data
 * @param enrichment - User enrichments
 * @param contentCache - Content cache record
 * @returns Processing capability
 */
export async function computeProcessingCapability(
  urlId: number,
  urlData: any,
  analysisData: any,
  enrichment: any,
  contentCache: any
): Promise<ProcessingCapability> {
  // Check for identifiers
  const hasValidIdentifiers = !!(
    analysisData?.validIdentifiers && 
    Array.isArray(analysisData.validIdentifiers) && 
    analysisData.validIdentifiers.length > 0
  );
  
  const hasCustomIdentifiers = !!(
    enrichment?.customIdentifiers && 
    Array.isArray(enrichment.customIdentifiers) && 
    enrichment.customIdentifiers.length > 0
  );
  
  // Check for extracted identifiers
  let hasExtractedIdentifiers = false;
  try {
    const extractedIds = await db
      .select()
      .from(urlIdentifiers)
      .where(eq(urlIdentifiers.urlId, urlId))
      .limit(1);
    hasExtractedIdentifiers = extractedIds.length > 0;
  } catch (error) {
    // Ignore errors
  }

  // Has identifiers from any source
  const hasIdentifiers = hasValidIdentifiers || hasCustomIdentifiers || hasExtractedIdentifiers;

  // Check for web translators
  const hasWebTranslators = !!(
    analysisData?.webTranslators && 
    Array.isArray(analysisData.webTranslators) && 
    analysisData.webTranslators.length > 0
  );

  // Check if content is cached
  const hasContent = !!contentCache;

  // Check if accessible
  const isAccessible = !!(
    urlData.isAccessible ||
    (urlData.success && !urlData.hasErrors && 
     (!urlData.statusCode || urlData.statusCode < 400))
  );

  // Can use LLM if content is available
  const canUseLLM = hasContent;

  // Check if PDF
  const isPDF = !!(
    urlData.contentType?.includes('pdf') ||
    contentCache?.contentType?.includes('pdf')
  );

  return {
    hasIdentifiers,
    hasWebTranslators,
    hasContent,
    isAccessible,
    canUseLLM,
    isPDF,
    manualCreateAvailable: true,
  };
}

/**
 * Record a processing attempt in the history
 * 
 * @param urlId - URL ID
 * @param attempt - Processing attempt data
 */
export async function recordProcessingAttempt(
  urlId: number,
  attempt: ProcessingAttempt
): Promise<void> {
  try {
    const url = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });

    if (!url) {
      console.error(`Cannot record attempt: URL ${urlId} not found`);
      return;
    }

    // Get existing history
    const existingHistory: ProcessingAttempt[] = url.processingHistory || [];

    // Add new attempt
    const updatedHistory = [...existingHistory, attempt];

    // Update database
    await db.update(urls)
      .set({
        processingHistory: updatedHistory,
        processingAttempts: updatedHistory.length,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));

    console.log(`Recorded processing attempt for URL ${urlId}: ${attempt.stage} - ${attempt.success ? 'success' : 'failed'}`);
  } catch (error) {
    console.error(`Failed to record processing attempt for URL ${urlId}:`, error);
  }
}

/**
 * Get processing history for a URL
 * 
 * @param urlId - URL ID
 * @returns Processing history array
 */
export async function getProcessingHistory(
  urlId: number
): Promise<ProcessingAttempt[]> {
  try {
    const url = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
      columns: {
        processingHistory: true,
      },
    });

    if (!url) return [];

    return url.processingHistory || [];
  } catch (error) {
    console.error(`Failed to get processing history for URL ${urlId}:`, error);
    return [];
  }
}

/**
 * Clear processing history for a URL
 * Used when resetting processing state
 * 
 * @param urlId - URL ID
 */
export async function clearProcessingHistory(urlId: number): Promise<void> {
  try {
    await db.update(urls)
      .set({
        processingHistory: [],
        processingAttempts: 0,
        lastProcessingMethod: null,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));

    console.log(`Cleared processing history for URL ${urlId}`);
  } catch (error) {
    console.error(`Failed to clear processing history for URL ${urlId}:`, error);
  }
}

/**
 * Get statistics from processing history
 * 
 * @param history - Processing history
 * @returns Statistics object
 */
export function getHistoryStats(history: ProcessingAttempt[]) {
  const stats = {
    totalAttempts: history.length,
    successfulAttempts: 0,
    failedAttempts: 0,
    stagesAttempted: new Set<string>(),
    lastAttempt: history[history.length - 1],
    firstAttempt: history[0],
    averageDuration: 0,
    errors: [] as string[],
  };

  let totalDuration = 0;
  let durationsCount = 0;

  for (const attempt of history) {
    if (attempt.success) {
      stats.successfulAttempts++;
    } else {
      stats.failedAttempts++;
      if (attempt.error) {
        stats.errors.push(attempt.error);
      }
    }

    if (attempt.stage) {
      stats.stagesAttempted.add(attempt.stage);
    }

    if (attempt.duration) {
      totalDuration += attempt.duration;
      durationsCount++;
    }
  }

  if (durationsCount > 0) {
    stats.averageDuration = totalDuration / durationsCount;
  }

  return stats;
}

/**
 * Reset URL to initial state
 * Clears all processing data but keeps original metadata
 * 
 * @param urlId - URL ID to reset
 */
export async function resetUrlProcessingState(urlId: number): Promise<void> {
  try {
    await db.update(urls)
      .set({
        processingStatus: 'not_started',
        processingAttempts: 0,
        processingHistory: [],
        lastProcessingMethod: null,
        zoteroProcessingStatus: null,
        zoteroProcessingError: null,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));

    console.log(`Reset processing state for URL ${urlId}`);
  } catch (error) {
    console.error(`Failed to reset URL ${urlId}:`, error);
    throw error;
  }
}

/**
 * Set user intent for a URL
 * 
 * @param urlId - URL ID
 * @param intent - New user intent
 */
export async function setUserIntent(
  urlId: number,
  intent: UserIntent
): Promise<void> {
  try {
    await db.update(urls)
      .set({
        userIntent: intent,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));

    console.log(`Set user intent for URL ${urlId}: ${intent}`);
  } catch (error) {
    console.error(`Failed to set user intent for URL ${urlId}:`, error);
    throw error;
  }
}

/**
 * Increment processing attempts counter
 * 
 * @param urlId - URL ID
 */
export async function incrementProcessingAttempts(urlId: number): Promise<void> {
  try {
    await db.execute(
      `UPDATE urls SET processing_attempts = processing_attempts + 1, updated_at = ${Math.floor(Date.now() / 1000)} WHERE id = ${urlId}`
    );
  } catch (error) {
    console.error(`Failed to increment attempts for URL ${urlId}:`, error);
  }
}

/**
 * Check if URL has reached max processing attempts
 * 
 * @param urlId - URL ID
 * @param maxAttempts - Maximum allowed attempts
 * @returns true if max attempts reached
 */
export async function hasReachedMaxAttempts(
  urlId: number,
  maxAttempts: number = 5
): Promise<boolean> {
  const url = await db.query.urls.findFirst({
    where: eq(urls.id, urlId),
    columns: {
      processingAttempts: true,
    },
  });

  if (!url) return false;

  return (url.processingAttempts || 0) >= maxAttempts;
}

/**
 * Get URLs that need processing
 * Filters URLs that are ready to be processed based on state and capability
 * 
 * @param limit - Maximum number of URLs to return
 * @returns Array of URL IDs ready for processing
 */
export async function getUrlsReadyForProcessing(limit: number = 100): Promise<number[]> {
  try {
    const results = await db
      .select({ id: urls.id })
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(
        // Not started or awaiting user action
        // Not ignored or archived
        // Has identifiers or translators
        `processing_status IN ('not_started', 'awaiting_selection') 
         AND user_intent NOT IN ('ignore', 'archive', 'manual_only')
         AND (
           json_array_length(url_analysis_data.valid_identifiers) > 0
           OR json_array_length(url_analysis_data.web_translators) > 0
           OR json_array_length(url_enrichments.custom_identifiers) > 0
         )` as any
      )
      .limit(limit);

    return results.map(r => r.id);
  } catch (error) {
    console.error('Failed to get URLs ready for processing:', error);
    return [];
  }
}

/**
 * Get URLs that need user attention
 * Filters URLs in states that require user action
 * 
 * @param limit - Maximum number of URLs to return
 * @returns Array of URL IDs needing attention
 */
export async function getUrlsNeedingAttention(limit: number = 100): Promise<number[]> {
  try {
    const results = await db
      .select({ id: urls.id })
      .from(urls)
      .where(
        `processing_status IN ('awaiting_selection', 'awaiting_metadata', 'exhausted', 'stored_incomplete')` as any
      )
      .limit(limit);

    return results.map(r => r.id);
  } catch (error) {
    console.error('Failed to get URLs needing attention:', error);
    return [];
  }
}

/**
 * Generate a unique session ID for batch processing
 */
export function generateSessionId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Sleep for specified milliseconds (used for rate limiting)
 * 
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 * 
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Format duration in milliseconds to human-readable string
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  } else {
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

/**
 * Calculate estimated time remaining for batch processing
 * 
 * @param completed - Number completed
 * @param total - Total to process
 * @param averageDuration - Average duration per item in ms
 * @returns Estimated completion date
 */
export function calculateEstimatedCompletion(
  completed: number,
  total: number,
  averageDuration: number
): Date {
  const remaining = total - completed;
  const estimatedMs = remaining * averageDuration;
  return new Date(Date.now() + estimatedMs);
}

/**
 * Get summary of processing history for display
 * 
 * @param history - Processing history
 * @returns Summary object
 */
export function summarizeProcessingHistory(history: ProcessingAttempt[]): {
  totalAttempts: number;
  lastAttempt: ProcessingAttempt | null;
  stagesAttempted: string[];
  successCount: number;
  failureCount: number;
  commonErrors: string[];
} {
  if (!history || history.length === 0) {
    return {
      totalAttempts: 0,
      lastAttempt: null,
      stagesAttempted: [],
      successCount: 0,
      failureCount: 0,
      commonErrors: [],
    };
  }

  const stages = new Set<string>();
  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (const attempt of history) {
    if (attempt.stage) {
      stages.add(attempt.stage);
    }

    if (attempt.success) {
      successCount++;
    } else {
      failureCount++;
      if (attempt.error) {
        errors.push(attempt.error);
      }
    }
  }

  // Get most common errors (deduplicated)
  const errorCounts = errors.reduce((acc, error) => {
    acc[error] = (acc[error] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([error]) => error);

  return {
    totalAttempts: history.length,
    lastAttempt: history[history.length - 1],
    stagesAttempted: Array.from(stages),
    successCount,
    failureCount,
    commonErrors,
  };
}

/**
 * Export processing history for a set of URLs
 * 
 * @param urlIds - Array of URL IDs
 * @returns Export data
 */
export async function exportProcessingHistoryData(
  urlIds: number[]
): Promise<Array<{
  urlId: number;
  url: string;
  processingStatus: string;
  attempts: number;
  history: ProcessingAttempt[];
}>> {
  const exportData = [];

  for (const urlId of urlIds) {
    const url = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });

    if (url) {
      exportData.push({
        urlId: url.id,
        url: url.url,
        processingStatus: url.processingStatus || 'not_started',
        attempts: url.processingAttempts || 0,
        history: url.processingHistory || [],
      });
    }
  }

  return exportData;
}

/**
 * Utility to safely parse JSON from database
 * 
 * @param jsonString - JSON string from database
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeParseJson<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

