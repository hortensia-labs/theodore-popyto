/**
 * Batch Processing Orchestrator
 * 
 * Orchestrates batch processing of multiple URLs with:
 * - Parallel content fetching
 * - Sequential preview fetching
 * - Progress streaming
 * - Error handling
 */

import { db } from './db/client';
import { urls } from '../drizzle/schema';
import { eq, inArray } from 'drizzle-orm';
import { processSingleUrl } from './actions/process-url-action';
import { previewAllIdentifiers } from './preview-orchestrator';

export interface BatchProcessOptions {
  batchSize?: number;          // URLs per batch (default: 25)
  parallelFetches?: number;    // Concurrent content fetches (default: 5)
  parallelPreviews?: number;   // Concurrent previews (default: 3)
  pauseOnUserInput?: boolean;  // Wait for user decisions (default: false)
  autoSelectSingleIdentifier?: boolean; // Auto-process if only 1 (default: false)
}

export interface BatchProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'url_processed';
  phase?: 'content_fetching' | 'extracting_identifiers' | 'previewing_identifiers' | 'complete';
  progress?: number;
  total?: number;
  urlId?: number;
  url?: string;
  state?: string;
  identifierCount?: number;
  error?: string;
  stats?: BatchStats;
}

export interface BatchStats {
  total: number;
  contentFetched: number;
  identifiersFound: number;
  previewsFetched: number;
  stored: number;
  awaitingUser: number;
  failed: number;
  skipped: number;
}

export interface BatchProcessResult {
  totalUrls: number;
  processed: number;
  stored: number;
  awaitingUserInput: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: Array<{
    urlId: number;
    url: string;
    error: string;
  }>;
}

/**
 * Process batch of URLs with progress streaming
 */
export async function* processBatch(
  urlIds: number[],
  options: BatchProcessOptions = {}
): AsyncGenerator<BatchProgressEvent, BatchProcessResult> {
  const startTime = Date.now();
  const {
    batchSize = 25,
    parallelFetches = 5,
    parallelPreviews = 3,
    autoSelectSingleIdentifier = false,
  } = options;
  
  const stats: BatchStats = {
    total: urlIds.length,
    contentFetched: 0,
    identifiersFound: 0,
    previewsFetched: 0,
    stored: 0,
    awaitingUser: 0,
    failed: 0,
    skipped: 0,
  };
  
  const errors: Array<{ urlId: number; url: string; error: string }> = [];
  
  // Get URL records
  const urlRecords = await db.query.urls.findMany({
    where: inArray(urls.id, urlIds),
  });
  
  const urlMap = new Map(urlRecords.map(u => [u.id, u]));
  
  // Phase 1: Content Fetching (Parallel)
  yield {
    type: 'progress',
    phase: 'content_fetching',
    progress: 0,
    total: urlIds.length,
    stats,
  };
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < urlIds.length; i += batchSize) {
    const batchIds = urlIds.slice(i, i + batchSize);
    
    // Process batch with limited parallelism
    const fetchPromises = [];
    for (let j = 0; j < batchIds.length; j += parallelFetches) {
      const chunk = batchIds.slice(j, j + parallelFetches);
      const chunkPromises = chunk.map(async (urlId) => {
        try {
          const result = await processSingleUrl(urlId);
          
          if (result.success) {
            stats.contentFetched++;
            
            if (result.identifierCount && result.identifierCount > 0) {
              stats.identifiersFound += result.identifierCount;
            }
            
            if (result.state === 'identifiers_found') {
              stats.awaitingUser++;
            } else if (result.state === 'no_identifiers') {
              stats.awaitingUser++;
            }
          } else {
            stats.failed++;
            errors.push({
              urlId,
              url: urlMap.get(urlId)?.url || 'unknown',
              error: result.error || 'Unknown error',
            });
          }
          
          yield {
            type: 'url_processed',
            urlId,
            url: urlMap.get(urlId)?.url,
            state: result.state,
            identifierCount: result.identifierCount,
            stats: { ...stats },
          };
        } catch (error) {
          stats.failed++;
          errors.push({
            urlId,
            url: urlMap.get(urlId)?.url || 'unknown',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      
      await Promise.allSettled(chunkPromises);
    }
  }
  
  // Final progress
  yield {
    type: 'progress',
    phase: 'complete',
    progress: urlIds.length,
    total: urlIds.length,
    stats,
  };
  
  // Return final result
  return {
    totalUrls: urlIds.length,
    processed: stats.contentFetched,
    stored: stats.stored,
    awaitingUserInput: stats.awaitingUser,
    failed: stats.failed,
    skipped: stats.skipped,
    duration: Date.now() - startTime,
    errors,
  };
}

/**
 * Process all pending URLs in database
 */
export async function* processAllPending(
  options: BatchProcessOptions = {}
): AsyncGenerator<BatchProgressEvent, BatchProcessResult> {
  // Get all pending URLs
  const pendingUrls = await db.query.urls.findMany({
    where: eq(urls.zoteroProcessingStatus, 'pending'),
  });
  
  const urlIds = pendingUrls.map(u => u.id);
  
  yield* processBatch(urlIds, options);
}

/**
 * Process URLs by section
 */
export async function* processBySection(
  sectionId: number,
  options: BatchProcessOptions = {}
): AsyncGenerator<BatchProgressEvent, BatchProcessResult> {
  const sectionUrls = await db.query.urls.findMany({
    where: eq(urls.sectionId, sectionId),
  });
  
  const urlIds = sectionUrls.map(u => u.id);
  
  yield* processBatch(urlIds, options);
}

/**
 * Retry failed URLs
 */
export async function* retryFailed(
  options: BatchProcessOptions = {}
): AsyncGenerator<BatchProgressEvent, BatchProcessResult> {
  const failedUrls = await db.query.urls.findMany({
    where: eq(urls.zoteroProcessingStatus, 'failed_fetch'),
  });
  
  const urlIds = failedUrls.map(u => u.id);
  
  // Reset state to pending
  await db.update(urls)
    .set({
      zoteroProcessingStatus: 'pending',
      lastFetchError: null,
    })
    .where(inArray(urls.id, urlIds));
  
  yield* processBatch(urlIds, options);
}

/**
 * Get batch processing statistics
 */
export async function getBatchStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySection: Record<string, number>;
}> {
  const allUrls = await db.query.urls.findMany({
    columns: {
      id: true,
      sectionId: true,
      zoteroProcessingStatus: true,
    },
  });
  
  const byStatus: Record<string, number> = {};
  const bySection: Record<string, number> = {};
  
  for (const url of allUrls) {
    const status = url.zoteroProcessingStatus || 'pending';
    byStatus[status] = (byStatus[status] || 0) + 1;
    
    const sectionId = String(url.sectionId);
    bySection[sectionId] = (bySection[sectionId] || 0) + 1;
  }
  
  return {
    total: allUrls.length,
    byStatus,
    bySection,
  };
}

