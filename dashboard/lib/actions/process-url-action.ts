/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Process URL Server Action
 * 
 * Orchestrates the complete URL processing workflow:
 * 1. Fetch content
 * 2. Cache content
 * 3. Extract identifiers
 * 4. Store results in database
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlIdentifiers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import {
  fetchUrlContent,
  FetchErrorCode,
  isRetryableError,
  withRetry,
  detectContentType,
} from '../content-fetcher';
import { cacheContent, getCachedContent } from '../content-cache';
import { extractIdentifiersFromHtml, sortIdentifiersByPriority } from '../extractors/html-identifier-extractor';
import { extractIdentifiersFromPdf } from '../extractors/pdf-identifier-extractor';
import { extractMetadataFromHtml } from '../extractors/html-metadata-extractor';
import { extractMetadataFromPdf } from '../extractors/pdf-metadata-extractor';
import { validateExtractedMetadata, calculateMetadataQualityScore } from '../metadata-validator';
import { globalRateLimiter } from '../rate-limiter';
import type { Identifier } from '../extractors/html-identifier-extractor';
import type { ExtractedMetadata } from '../extractors/html-metadata-extractor';
import { urlExtractedMetadata } from '../../drizzle/schema';

export type ProcessingState =
  | 'pending'
  | 'fetching_content'
  | 'content_cached'
  | 'extracting_identifiers'
  | 'identifiers_found'
  | 'no_identifiers'
  | 'failed_fetch'
  | 'failed_parse';

export interface ProcessUrlResult {
  success: boolean;
  state: ProcessingState;
  identifierCount?: number;
  error?: string;
  errorCode?: FetchErrorCode;
}

/**
 * Process a single URL through the workflow
 */
export async function processSingleUrl(urlId: number): Promise<ProcessUrlResult> {
  try {
    // Get URL record
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return {
        success: false,
        state: 'failed_fetch',
        error: 'URL not found',
      };
    }
    
    // Check if content is already cached
    const cached = await getCachedContent(urlId);
    if (cached) {
      console.log(`Using cached content for URL ${urlId}`);
      
      // Extract identifiers from cached content
      await transitionState(urlId, 'extracting_identifiers');
      const identifiers = await extractIdentifiersFromCache(
        urlId,
        cached.content,
        cached.metadata.contentType,
        urlRecord.url
      );
      
      if (identifiers.length > 0) {
        await transitionState(urlId, 'identifiers_found', {
          identifierCount: identifiers.length,
        });
        
        revalidatePath('/urls');
        return {
          success: true,
          state: 'identifiers_found',
          identifierCount: identifiers.length,
        };
      } else {
        await transitionState(urlId, 'no_identifiers');
        revalidatePath('/urls');
        return {
          success: true,
          state: 'no_identifiers',
          identifierCount: 0,
        };
      }
    }
    
    // Step 1: Fetch content with rate limiting
    await transitionState(urlId, 'fetching_content');
    
    const fetchResult = await globalRateLimiter.executeWithRateLimit(
      urlRecord.url,
      () => fetchUrlContent(urlRecord.url, {
        retryAttempts: 3,
        retryDelay: 1000,
      })
    );
    
    if (!fetchResult.success) {
      await transitionState(urlId, 'failed_fetch', {
        lastFetchError: fetchResult.error,
        contentFetchAttempts: (urlRecord.contentFetchAttempts || 0) + 1,
      });
      
      revalidatePath('/urls');
      return {
        success: false,
        state: 'failed_fetch',
        error: fetchResult.error,
        errorCode: fetchResult.errorCode as FetchErrorCode,
      };
    }
    
    // Step 2: Cache content
    const contentHash = await cacheContent(urlId, fetchResult.content!, fetchResult);
    await transitionState(urlId, 'content_cached');
    
    // Step 3: Extract identifiers and metadata based on content type
    await transitionState(urlId, 'extracting_identifiers');
    
    const finalContentType = detectContentType(fetchResult.content!, fetchResult.headers);
    
    // Extract identifiers
    const identifiers = await extractIdentifiersFromContent(
      urlId,
      fetchResult.content!,
      finalContentType,
      urlRecord.url
    );
    
    // Always extract metadata (even if identifiers found - useful for validation)
    const metadata = await extractMetadataFromContent(
      urlId,
      fetchResult.content!,
      finalContentType,
      urlRecord.url
    );
    
    // Step 4: Store results and trigger previews
    if (identifiers.length > 0) {
      await transitionState(urlId, 'identifiers_found', {
        identifierCount: identifiers.length,
        hasExtractedMetadata: !!metadata,
      });
      
      // Automatically fetch previews for all identifiers
      try {
        const { previewAllIdentifiers } = await import('../preview-orchestrator');
        await previewAllIdentifiers(urlId, {
          parallelLimit: 3,
          cacheResults: true,
          force: false,
        });
      } catch (error) {
        console.error('Failed to fetch previews:', error);
        // Don't fail the whole process if preview fails
      }
      
      revalidatePath('/urls');
      return {
        success: true,
        state: 'identifiers_found',
        identifierCount: identifiers.length,
      };
    } else if (metadata) {
      // No identifiers but we have metadata
      await transitionState(urlId, 'no_identifiers', {
        hasExtractedMetadata: true,
      });
      
      revalidatePath('/urls');
      return {
        success: true,
        state: 'no_identifiers',
        identifierCount: 0,
      };
    } else {
      // No identifiers and no metadata
      await transitionState(urlId, 'failed_parse');
      revalidatePath('/urls');
      return {
        success: false,
        state: 'failed_parse',
        error: 'No identifiers or metadata found',
      };
    }
  } catch (error) {
    console.error(`Error processing URL ${urlId}:`, error);
    
    await transitionState(urlId, 'failed_fetch', {
      lastFetchError: error instanceof Error ? error.message : String(error),
    });
    
    revalidatePath('/urls');
    return {
      success: false,
      state: 'failed_fetch',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract identifiers from content based on type
 */
async function extractIdentifiersFromContent(
  urlId: number,
  content: Buffer,
  contentType: string,
  url: string
): Promise<Identifier[]> {
  let identifiers: Identifier[] = [];
  
  if (contentType.includes('html') || contentType.includes('xml')) {
    // Extract from HTML
    const htmlContent = content.toString('utf8');
    identifiers = await extractIdentifiersFromHtml(htmlContent, url);
  } else if (contentType.includes('pdf')) {
    // Extract from PDF using Zotero and custom extraction in parallel
    const pdfResult = await extractIdentifiersFromPdf(
      content, 
      new URL(url).pathname.split('/').pop() || 'document.pdf',
      urlId
    );
    if (pdfResult.identifiers.length > 0) {
      identifiers = pdfResult.identifiers;
    } else if (pdfResult.error) {
      console.error(`PDF identifier extraction failed for URL ${urlId}:`, pdfResult.error);
    }
    // PDF text is automatically cached by extractIdentifiersFromPdf if urlId is provided
  }
  
  // Sort by priority
  const sorted = sortIdentifiersByPriority(identifiers);
  
  // Store identifiers in database
  for (const identifier of sorted) {
    await db.insert(urlIdentifiers)
      .values({
        urlId,
        identifierType: identifier.type,
        identifierValue: identifier.value,
        extractionMethod: determineExtractionMethod(identifier.source),
        extractionSource: identifier.source,
        confidence: identifier.confidence,
        previewFetched: false,
      })
      .onConflictDoNothing();
  }
  
  return sorted;
}

/**
 * Extract identifiers from cached content
 */
async function extractIdentifiersFromCache(
  urlId: number,
  content: Buffer,
  contentType: string,
  url: string
): Promise<Identifier[]> {
  // Check if we already have identifiers in DB
  const existingIdentifiers = await db.query.urlIdentifiers.findMany({
    where: eq(urlIdentifiers.urlId, urlId),
  });
  
  if (existingIdentifiers.length > 0) {
    return existingIdentifiers.map(id => ({
      type: id.identifierType as any,
      value: id.identifierValue,
      source: id.extractionSource || 'database',
      confidence: id.confidence as any,
    }));
  }
  
  // Extract fresh
  return await extractIdentifiersFromContent(urlId, content, contentType, url);
}

/**
 * Extract metadata from content based on type
 */
async function extractMetadataFromContent(
  urlId: number,
  content: Buffer,
  contentType: string,
  url: string
): Promise<ExtractedMetadata | null> {
  let metadata: ExtractedMetadata | null = null;
  
  if (contentType.includes('html') || contentType.includes('xml')) {
    metadata = await extractMetadataFromHtml(content.toString('utf8'), url);
  } else if (contentType.includes('pdf')) {
    metadata = await extractMetadataFromPdf(content, url);
  }
  
  if (!metadata) return null;
  
  // Validate metadata
  const validation = validateExtractedMetadata(metadata);
  
  // Only store if quality is acceptable (score >= 30)
  if (validation.score < 30) {
    console.log(`Metadata quality too low (${validation.score}) for URL ${urlId}`);
    return null;
  }
  
  // Determine extraction method
  const primarySource = Object.values(metadata.extractionSources)[0] || 'unknown';
  const extractionMethod = determineExtractionMethod(primarySource);
  
  // Store in database
  await db.insert(urlExtractedMetadata)
    .values({
      urlId,
      title: metadata.title,
      creators: metadata.creators,
      date: metadata.date,
      itemType: metadata.itemType,
      abstractNote: metadata.abstractNote,
      publicationTitle: metadata.publicationTitle,
      url: metadata.url,
      accessDate: metadata.accessDate,
      language: metadata.language,
      extractionMethod,
      extractionSources: metadata.extractionSources,
      qualityScore: validation.score,
      validationStatus: validation.status,
      validationErrors: validation.errors,
      missingFields: validation.missingFields,
    })
    .onConflictDoUpdate({
      target: urlExtractedMetadata.urlId,
      set: {
        title: metadata.title,
        creators: metadata.creators,
        date: metadata.date,
        itemType: metadata.itemType,
        abstractNote: metadata.abstractNote,
        publicationTitle: metadata.publicationTitle,
        extractionMethod,
        extractionSources: metadata.extractionSources,
        qualityScore: validation.score,
        validationStatus: validation.status,
        validationErrors: validation.errors,
        missingFields: validation.missingFields,
        updatedAt: new Date(),
      },
    });
  
  return metadata;
}

/**
 * Determine extraction method from source
 */
function determineExtractionMethod(source: string): string {
  if (source.includes('meta[')) return 'html_meta_tag';
  if (source.includes('JSON-LD')) return 'json_ld';
  if (source.includes('og:')) return 'opengraph';
  if (source.includes('regex')) return 'regex_content';
  if (source.includes('pdf')) return 'pdf_metadata';
  return 'unknown';
}

/**
 * Transition URL to new processing state
 */
async function transitionState(
  urlId: number,
  toState: ProcessingState,
  additionalFields?: Partial<typeof urls.$inferInsert>
): Promise<void> {
  await db.update(urls)
    .set({
      zoteroProcessingStatus: toState,
      updatedAt: new Date(),
      ...additionalFields,
    })
    .where(eq(urls.id, urlId));
}

/**
 * Retry failed URL
 */
export async function retryFailedUrl(urlId: number): Promise<ProcessUrlResult> {
  // Reset state to pending
  await db.update(urls)
    .set({
      zoteroProcessingStatus: 'pending',
      lastFetchError: null,
      updatedAt: new Date(),
    })
    .where(eq(urls.id, urlId));
  
  revalidatePath('/urls');
  
  // Process again
  return await processSingleUrl(urlId);
}

/**
 * Get processing stats for URLs
 */
export async function getProcessingStats(): Promise<{
  total: number;
  pending: number;
  fetching: number;
  cached: number;
  identifiersFound: number;
  noIdentifiers: number;
  failed: number;
}> {
  const allUrls = await db.query.urls.findMany();
  
  return {
    total: allUrls.length,
    pending: allUrls.filter(u => u.zoteroProcessingStatus === 'pending').length,
    fetching: allUrls.filter(u => u.zoteroProcessingStatus === 'fetching_content').length,
    cached: allUrls.filter(u => u.zoteroProcessingStatus === 'content_cached').length,
    identifiersFound: allUrls.filter(u => u.zoteroProcessingStatus === 'identifiers_found').length,
    noIdentifiers: allUrls.filter(u => u.zoteroProcessingStatus === 'no_identifiers').length,
    failed: allUrls.filter(u => u.zoteroProcessingStatus === 'failed_fetch').length,
  };
}

