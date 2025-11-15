/**
 * Manual Zotero Item Creation Actions
 * 
 * Allows users to manually create Zotero items when automated methods fail
 * or when they want to create a custom item
 */

'use server';

import { db } from '../db/client';
import { urls, urlContentCache, zoteroItemLinks, urlExtractedMetadata } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import { createItem, type ZoteroItem } from '../zotero-client';
import { getCachedContent, getProcessedContent } from '../content-cache';
import { fetchUrlContent } from '../content-fetcher';

export interface ContentViews {
  raw?: string;
  reader?: string;
  isPDF: boolean;
  pdfUrl?: string;
  cachedPath?: string;
}

/**
 * Create a custom Zotero item manually
 * 
 * This is the "escape hatch" - always available regardless of processing status
 * 
 * @param urlId - URL ID
 * @param metadata - Zotero item metadata
 * @returns Processing result
 */
export async function createCustomZoteroItem(
  urlId: number,
  metadata: Partial<ZoteroItem>
): Promise<{
  success: boolean;
  itemKey?: string;
  error?: string;
}> {
  try {
    // Get URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Validate required fields
    if (!metadata.title) {
      return {
        success: false,
        error: 'Title is required',
      };
    }
    
    if (!metadata.creators || metadata.creators.length === 0) {
      return {
        success: false,
        error: 'At least one creator is required',
      };
    }
    
    // Ensure URL is set
    const itemData: ZoteroItem = {
      itemType: metadata.itemType || 'webpage',
      title: metadata.title,
      creators: metadata.creators,
      url: metadata.url || urlData.url,
      accessDate: metadata.accessDate || new Date().toISOString(),
      ...metadata,
    };
    
    const startTime = Date.now();
    
    // Create item in Zotero
    const result = await createItem(itemData);
    
    if (!result.successful || !result.successful['0'] || !result.successful['0'].key) {
      return {
        success: false,
        error: 'Failed to create item in Zotero',
      };
    }
    
    const itemKey = result.successful['0'].key;
    const duration = Date.now() - startTime;
    
    // Transition to stored_custom
    const currentStatus = urlData.processingStatus;
    await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      'stored_custom',
      {
        reason: 'User created custom item',
        itemKey,
      }
    );
    
    // Update URL record
    await db.update(urls)
      .set({
        zoteroItemKey: itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: 'manual',
        processingStatus: 'stored_custom',
        citationValidationStatus: 'valid', // Assume valid since user created it
        citationValidatedAt: new Date(),
        createdByTheodore: true,
        linkedUrlCount: 1,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Create link record
    await db.insert(zoteroItemLinks).values({
      itemKey,
      urlId,
      createdByTheodore: true,
      userModified: false,
      linkedAt: new Date(),
    });
    
    // Record in processing history
    await recordProcessingAttempt(urlId, {
      timestamp: startTime,
      stage: 'manual',
      success: true,
      itemKey,
      duration,
      metadata: {
        title: metadata.title,
        creators: metadata.creators?.length || 0,
      },
    });
    
    console.log(`Manual item created for URL ${urlId}: ${itemKey}`);
    
    return {
      success: true,
      itemKey,
    };
  } catch (error) {
    console.error('Error creating custom Zotero item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get content for manual creation
 * Provides different views of the URL content for user review
 * 
 * @param urlId - URL ID
 * @returns Content in various formats
 */
export async function getContentForManualCreation(
  urlId: number
): Promise<{ success: boolean; data?: ContentViews; error?: string }> {
  try {
    // Get URL record
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if content is cached
    const cached = await getCachedContent(urlId);
    
    const isPDF = urlRecord.contentType?.includes('pdf') || false;
    
    if (cached) {
      // Get processed content and cache path separately
      const processedContent = await getProcessedContent(urlId);
      const cacheRecord = await db.query.urlContentCache.findFirst({
        where: eq(urlContentCache.urlId, urlId),
      });
      
      // Content is cached - return it
      const views: ContentViews = {
        raw: isPDF ? undefined : cached.content.toString(),
        reader: processedContent || undefined,
        isPDF,
        pdfUrl: isPDF ? `/api/content/${urlId}` : undefined,
        cachedPath: cacheRecord?.rawContentPath || undefined,
      };
      
      return {
        success: true,
        data: views,
      };
    } else {
      // Content not cached - fetch it
      console.log(`Fetching content for manual creation: ${urlRecord.url}`);
      
      const fetchResult = await fetchUrlContent(urlRecord.url, {
        retryAttempts: 2,
        retryDelay: 1000,
      });
      
      if (!fetchResult.success || !fetchResult.content) {
        return {
          success: false,
          error: fetchResult.error || 'Failed to fetch content',
        };
      }
      
      const views: ContentViews = {
        raw: isPDF ? undefined : fetchResult.content.toString(),
        reader: undefined, // Would need to extract/clean content
        isPDF,
        pdfUrl: isPDF ? urlRecord.url : undefined,
      };
      
      return {
        success: true,
        data: views,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get URL metadata for pre-populating manual creation form
 * 
 * @param urlId - URL ID
 * @returns Extracted metadata if available
 */
export async function getMetadataForManualCreation(
  urlId: number
): Promise<{ success: boolean; data?: Partial<ZoteroItem>; error?: string }> {
  try {
    // Check if we have extracted metadata
    const extracted = await db.query.urlExtractedMetadata.findFirst({
      where: eq(urlExtractedMetadata.urlId, urlId),
    });
    
    if (!extracted) {
      // No extracted metadata - return URL only
      const urlRecord = await db.query.urls.findFirst({
        where: eq(urls.id, urlId),
      });
      
      return {
        success: true,
        data: urlRecord ? {
          url: urlRecord.url,
          accessDate: new Date().toISOString(),
        } : undefined,
      };
    }
    
    // Transform extracted metadata to Zotero format
    const metadata: Partial<ZoteroItem> = {
      itemType: extracted.itemType || 'webpage',
      title: extracted.title || undefined,
      creators: extracted.creators || [],
      url: extracted.url || undefined,
      accessDate: extracted.accessDate || new Date().toISOString(),
      abstractNote: extracted.abstractNote || undefined,
      publicationTitle: extracted.publicationTitle || undefined,
      date: extracted.date || undefined,
      language: extracted.language || undefined,
    };
    
    return {
      success: true,
      data: metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

