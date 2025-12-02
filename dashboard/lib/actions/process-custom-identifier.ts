/**
 * Process Custom Identifier Server Action
 * 
 * Handles processing of custom identifiers (from enrichment data) with Zotero
 * Similar to identifier-selection-action but for custom identifiers added by users
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, zoteroItemLinks } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { processIdentifier, validateCitation, getItem, deleteItem } from '../zotero-client';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import type { ProcessingStatus } from '../types/url-processing';

export interface ProcessCustomIdentifierResult {
  success: boolean;
  itemKey?: string;
  error?: string;
  method?: string;
  replaced?: boolean; // Indicates if an existing item was replaced
}

/**
 * Process a custom identifier and optionally replace existing Zotero item
 * 
 * @param urlId - The URL ID
 * @param identifier - The custom identifier to process
 * @param replaceExisting - Whether to replace an existing Zotero item (if any)
 * @returns Result with success status and item key
 */
export async function processCustomIdentifier(
  urlId: number,
  identifier: string,
  replaceExisting: boolean = false
): Promise<ProcessCustomIdentifierResult> {
  try {
    // Get URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if URL already has a Zotero item
    const hasExistingItem = !!urlData.zoteroItemKey;
    const existingItemKey = urlData.zoteroItemKey;
    
    if (hasExistingItem && !replaceExisting) {
      return {
        success: false,
        error: 'URL already has a Zotero item. Set replaceExisting to true to replace it.',
      };
    }
    
    // Determine appropriate state transition
    let fromStatus: ProcessingStatus;
    let toStatus: ProcessingStatus = 'processing_zotero';
    
    if (hasExistingItem) {
      // If replacing, transition from stored/stored_incomplete
      fromStatus = urlData.processingStatus as ProcessingStatus;
    } else {
      // If new item, can transition from various states
      fromStatus = urlData.processingStatus;
    }
    
    // Transition to processing
    await URLProcessingStateMachine.transition(
      urlId,
      fromStatus,
      toStatus,
      {
        reason: hasExistingItem 
          ? 'User replacing item with custom identifier' 
          : 'User processing custom identifier',
        customIdentifier: identifier,
      }
    );
    
    // Record attempt start
    const startTime = Date.now();
    
    // Process with Zotero
    const result = await processIdentifier(identifier);
    
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      // Record failure
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'zotero_identifier',
        method: 'custom_identifier',
        success: false,
        error: result.error?.message || 'Processing failed',
        duration,
        metadata: {
          identifier,
          replaceExisting,
        },
      });
      
      // Transition back to previous status if failed
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        fromStatus,
        {
          reason: 'Processing failed',
          error: result.error?.message || 'Processing failed',
        }
      );
      
      return {
        success: false,
        error: result.error?.message || 'Processing failed',
      };
    }
    
    // Extract item key
    const itemKey = result.items?.[0]?.key || result.items?.[0]?._meta?.itemKey;
    
    if (!itemKey) {
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'zotero_identifier',
        method: 'custom_identifier',
        success: false,
        error: 'Item created but key not found',
        duration,
        metadata: {
          identifier,
          replaceExisting,
        },
      });
      
      // Transition back
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        fromStatus,
        {
          reason: 'Item key not found',
        }
      );
      
      return {
        success: false,
        error: 'Item created but key not found',
      };
    }
    
    // Validate citation
    let validationStatus: 'valid' | 'incomplete' = 'incomplete';
    let missingFields: string[] = [];
    
    try {
      const itemMetadata = await getItem(itemKey);
      const validation = validateCitation(itemMetadata);
      validationStatus = validation.status;
      missingFields = validation.missingFields || [];
    } catch (error) {
      console.error('Citation validation failed:', error);
      missingFields = ['title', 'creators', 'date'];
    }
    
    // Determine final status
    const finalStatus: ProcessingStatus = validationStatus === 'valid' ? 'stored' : 'stored_incomplete';
    
    // If replacing existing item, handle the replacement
    let replaced = false;
    if (hasExistingItem && existingItemKey && existingItemKey !== itemKey) {
      replaced = true;
      
      // Delete old link record
      await db.delete(zoteroItemLinks)
        .where(eq(zoteroItemLinks.itemKey, existingItemKey));
      
      // Note: We don't delete the old item from Zotero library itself,
      // as it might be linked to other URLs or manually created
    }
    
    // Transition to final status
    await URLProcessingStateMachine.transition(
      urlId,
      'processing_zotero',
      finalStatus,
      {
        itemKey,
        validationStatus,
        missingFields,
        replaced,
        customIdentifier: identifier,
      }
    );
    
    // Update URL record with Zotero data and citation validation
    await db.update(urls)
      .set({
        zoteroItemKey: itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: 'custom_identifier',
        citationValidationStatus: validationStatus,
        citationValidatedAt: new Date(),
        citationValidationDetails: { missingFields },
        createdByTheodore: true, // Track provenance
        linkedUrlCount: 1, // Reset to 1 for new item
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Create new link record (or update if exists)
    await db.insert(zoteroItemLinks).values({
      itemKey,
      urlId,
      createdByTheodore: true,
      userModified: false,
      linkedAt: new Date(),
    }).onConflictDoNothing();
    
    // Record successful attempt
    await recordProcessingAttempt(urlId, {
      timestamp: startTime,
      stage: 'zotero_identifier',
      method: 'custom_identifier',
      success: true,
      itemKey,
      duration,
      metadata: {
        identifier,
        validationStatus,
        missingFields,
        replaced,
        oldItemKey: replaced ? existingItemKey : undefined,
      },
    });
    
    revalidatePath('/urls');
    
    return {
      success: true,
      itemKey,
      method: result.method,
      replaced,
    };
  } catch (error) {
    console.error('Error processing custom identifier:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

