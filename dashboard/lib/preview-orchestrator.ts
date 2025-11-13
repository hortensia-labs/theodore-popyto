/**
 * Preview Orchestrator
 * 
 * Orchestrates parallel preview fetching for identifiers
 * with caching and error handling
 */

import { db } from './db/client';
import { urlIdentifiers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';
const PREVIEW_TIMEOUT = 30000; // 30 seconds per preview
const MAX_PARALLEL_PREVIEWS = 3; // Process 3 previews at a time

export interface PreviewOptions {
  parallelLimit?: number;
  timeout?: number;
  cacheResults?: boolean;
  force?: boolean; // Force re-fetch even if cached
}

export interface PreviewResult {
  identifier: {
    id: number;
    type: string;
    value: string;
  };
  success: boolean;
  preview?: any; // Zotero preview response
  qualityScore?: number;
  error?: string;
  duration: number;
}

/**
 * Preview all identifiers for a URL
 */
export async function previewAllIdentifiers(
  urlId: number,
  options: PreviewOptions = {}
): Promise<PreviewResult[]> {
  const {
    parallelLimit = MAX_PARALLEL_PREVIEWS,
    timeout = PREVIEW_TIMEOUT,
    cacheResults = true,
    force = false,
  } = options;
  
  // Get all identifiers for this URL
  const identifiers = await db.query.urlIdentifiers.findMany({
    where: eq(urlIdentifiers.urlId, urlId),
  });
  
  if (identifiers.length === 0) {
    return [];
  }
  
  // Filter out already previewed (unless force=true)
  const toPreview = force 
    ? identifiers 
    : identifiers.filter(id => !id.previewFetched || !id.previewData);
  
  if (toPreview.length === 0) {
    // All already previewed, return cached results
    return identifiers.map(id => ({
      identifier: {
        id: id.id,
        type: id.identifierType,
        value: id.identifierValue,
      },
      success: true,
      preview: id.previewData,
      qualityScore: id.previewQualityScore || 0,
      duration: 0,
    }));
  }
  
  // Process in batches
  const results: PreviewResult[] = [];
  
  for (let i = 0; i < toPreview.length; i += parallelLimit) {
    const batch = toPreview.slice(i, i + parallelLimit);
    const batchPromises = batch.map(id => 
      previewSingleIdentifier(id.id, id.identifierType, id.identifierValue, timeout)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const identifier = batch[j];
      
      if (result.status === 'fulfilled') {
        results.push(result.value);
        
        // Cache result if successful and caching is enabled
        if (cacheResults && result.value.success) {
          await cachePreviewResult(identifier.id, result.value);
        }
      } else {
        // Promise rejected
        results.push({
          identifier: {
            id: identifier.id,
            type: identifier.identifierType,
            value: identifier.identifierValue,
          },
          success: false,
          error: result.reason?.message || 'Preview failed',
          duration: 0,
        });
      }
    }
  }
  
  return results;
}

/**
 * Preview a single identifier
 */
async function previewSingleIdentifier(
  identifierId: number,
  identifierType: string,
  identifierValue: string,
  timeout: number
): Promise<PreviewResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${ZOTERO_API_BASE_URL}/citationlinker/previewidentifier`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: identifierValue,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Preview failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      return {
        identifier: {
          id: identifierId,
          type: identifierType,
          value: identifierValue,
        },
        success: false,
        error: data.message || 'Preview translation failed',
        duration: Date.now() - startTime,
      };
    }
    
    // Calculate quality score
    const qualityScore = calculateQualityScore(data);
    
    return {
      identifier: {
        id: identifierId,
        type: identifierType,
        value: identifierValue,
      },
      success: true,
      preview: data,
      qualityScore,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      identifier: {
        id: identifierId,
        type: identifierType,
        value: identifierValue,
      },
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Cache preview result in database
 */
async function cachePreviewResult(
  identifierId: number,
  result: PreviewResult
): Promise<void> {
  await db.update(urlIdentifiers)
    .set({
      previewFetched: true,
      previewData: result.preview,
      previewQualityScore: result.qualityScore,
      previewFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(urlIdentifiers.id, identifierId));
}

/**
 * Calculate quality score for preview result
 * Based on completeness and richness of metadata
 */
function calculateQualityScore(previewData: any): number {
  if (!previewData.items || previewData.items.length === 0) {
    return 0;
  }
  
  const item = previewData.items[0];
  let score = 0;
  
  // Title (20 points)
  if (item.title && item.title.length > 0) {
    score += 15;
    if (item.title.length > 30) score += 5;
  }
  
  // Creators (20 points)
  if (item.creators && item.creators.length > 0) {
    score += 10;
    if (item.creators.length > 1) score += 5;
    // Check if creators have first and last names
    const hasFullNames = item.creators.some(
      (c: any) => c.firstName && c.lastName
    );
    if (hasFullNames) score += 5;
  }
  
  // Date (15 points)
  if (item.date) {
    score += 10;
    // Check date specificity
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      score += 5; // Full date
    } else if (/^\d{4}-\d{2}$/.test(item.date)) {
      score += 3; // Year and month
    }
  }
  
  // DOI (10 points)
  if (item.DOI) {
    score += 10;
  }
  
  // Abstract (10 points)
  if (item.abstractNote && item.abstractNote.length > 0) {
    score += 5;
    if (item.abstractNote.length > 200) score += 5;
  }
  
  // Publication Title (10 points)
  if (item.publicationTitle) {
    score += 10;
  }
  
  // Additional rich metadata (10 points)
  let richFieldCount = 0;
  const richFields = [
    'volume', 'issue', 'pages', 'ISBN', 'ISSN', 
    'publisher', 'place', 'series', 'url'
  ];
  
  for (const field of richFields) {
    if (item[field]) richFieldCount++;
  }
  
  score += Math.min(10, richFieldCount * 2);
  
  // Field completeness bonus (5 points)
  const totalFields = Object.keys(item).filter(
    key => item[key] !== null && item[key] !== '' && item[key] !== undefined
  ).length;
  
  if (totalFields > 15) score += 5;
  else if (totalFields > 10) score += 3;
  
  return Math.min(100, Math.round(score));
}

/**
 * Get preview for single identifier by ID
 */
export async function getPreviewForIdentifier(
  identifierId: number,
  force: boolean = false
): Promise<PreviewResult | null> {
  const identifier = await db.query.urlIdentifiers.findFirst({
    where: eq(urlIdentifiers.id, identifierId),
  });
  
  if (!identifier) {
    return null;
  }
  
  // Check if already cached
  if (!force && identifier.previewFetched && identifier.previewData) {
    return {
      identifier: {
        id: identifier.id,
        type: identifier.identifierType,
        value: identifier.identifierValue,
      },
      success: true,
      preview: identifier.previewData,
      qualityScore: identifier.previewQualityScore || 0,
      duration: 0,
    };
  }
  
  // Fetch preview
  const result = await previewSingleIdentifier(
    identifier.id,
    identifier.identifierType,
    identifier.identifierValue,
    PREVIEW_TIMEOUT
  );
  
  // Cache if successful
  if (result.success) {
    await cachePreviewResult(identifier.id, result);
  }
  
  return result;
}

/**
 * Rank preview results by quality
 */
export function rankPreviewsByQuality(results: PreviewResult[]): PreviewResult[] {
  return results
    .filter(r => r.success)
    .sort((a, b) => {
      // Primary: Quality score
      if (a.qualityScore !== b.qualityScore) {
        return (b.qualityScore || 0) - (a.qualityScore || 0);
      }
      
      // Secondary: Identifier type priority
      const typePriority: Record<string, number> = {
        DOI: 4,
        PMID: 3,
        ARXIV: 2,
        ISBN: 1,
      };
      
      return (typePriority[b.identifier.type] || 0) - 
             (typePriority[a.identifier.type] || 0);
    });
}

