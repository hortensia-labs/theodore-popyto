/**
 * Metadata Approval Server Actions
 * 
 * Handles user review and approval of extracted metadata
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlExtractedMetadata } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { storeViaMetadata, storeWithSnapshot } from '../storage/metadata-storage';
import { getCachedContent } from '../content-cache';
import type { ExtractedMetadata } from '../extractors/html-metadata-extractor';

export interface ApproveMetadataResult {
  success: boolean;
  itemKey?: string;
  error?: string;
}

/**
 * Get extracted metadata for URL
 */
export async function getExtractedMetadata(urlId: number) {
  const metadata = await db.query.urlExtractedMetadata.findFirst({
    where: eq(urlExtractedMetadata.urlId, urlId),
  });
  
  return metadata;
}

/**
 * Approve and store metadata as Zotero item
 */
export async function approveAndStoreMetadata(
  urlId: number,
  attachSnapshot: boolean = true
): Promise<ApproveMetadataResult> {
  try {
    // Get metadata
    const metadataRecord = await db.query.urlExtractedMetadata.findFirst({
      where: eq(urlExtractedMetadata.urlId, urlId),
    });
    
    if (!metadataRecord) {
      return {
        success: false,
        error: 'No extracted metadata found',
      };
    }
    
    // Convert to ExtractedMetadata format
    const metadata: ExtractedMetadata = {
      title: metadataRecord.title || undefined,
      creators: metadataRecord.creators || undefined,
      date: metadataRecord.date || undefined,
      itemType: metadataRecord.itemType || undefined,
      abstractNote: metadataRecord.abstractNote || undefined,
      publicationTitle: metadataRecord.publicationTitle || undefined,
      url: metadataRecord.url || undefined,
      accessDate: metadataRecord.accessDate || undefined,
      language: metadataRecord.language || undefined,
      extractionSources: metadataRecord.extractionSources || {},
    };
    
    // Check if we should attach snapshot
    let result: any;
    
    if (attachSnapshot) {
      const cached = await getCachedContent(urlId);
      if (cached && cached.metadata.contentType.includes('html')) {
        const snapshotContent = cached.content.toString('utf8');
        result = await storeWithSnapshot(metadata, snapshotContent);
      } else {
        result = await storeViaMetadata(metadata);
      }
    } else {
      result = await storeViaMetadata(metadata);
    }
    
    if (!result.success) {
      return result;
    }
    
    // Update database
    await db.update(urlExtractedMetadata)
      .set({
        userReviewed: true,
        userApproved: true,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(urlExtractedMetadata.urlId, urlId));
    
    await db.update(urls)
      .set({
        zoteroItemKey: result.itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: 'metadata',
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Validate citation after creation
    if (result.itemKey) {
      try {
        const { getItem, validateCitation } = await import('../zotero-client');
        const itemMetadata = await getItem(result.itemKey);
        const validation = validateCitation(itemMetadata);
        
        await db.update(urls)
          .set({
            citationValidationStatus: validation.status,
            citationValidatedAt: new Date(),
            citationValidationDetails: { missingFields: validation.missingFields },
            updatedAt: new Date(),
          })
          .where(eq(urls.id, urlId));
      } catch (error) {
        console.error('Citation validation failed:', error);
        // Don't fail the whole operation if validation fails
      }
    }
    
    revalidatePath('/urls');
    
    return {
      success: true,
      itemKey: result.itemKey,
    };
  } catch (error) {
    console.error('Error approving metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Reject metadata (user chooses not to store)
 */
export async function rejectMetadata(
  urlId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(urlExtractedMetadata)
      .set({
        userReviewed: true,
        userApproved: false,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(urlExtractedMetadata.urlId, urlId));
    
    await db.update(urls)
      .set({
        zoteroProcessingStatus: 'user_skipped',
        zoteroProcessingError: reason || 'User rejected metadata',
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    revalidatePath('/urls');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update extracted metadata (user edits before approval)
 */
export async function updateExtractedMetadata(
  urlId: number,
  updates: Partial<ExtractedMetadata>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(urlExtractedMetadata)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(urlExtractedMetadata.urlId, urlId));
    
    revalidatePath('/urls');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

