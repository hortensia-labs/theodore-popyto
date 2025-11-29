/**
 * Client-Safe Processing Utilities
 * 
 * Pure utility functions that don't require database access
 * Safe to import in client components
 */

import type { ProcessingAttempt } from '../types/url-processing';

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
 * Utility to safely parse JSON
 * 
 * @param jsonString - JSON string
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

