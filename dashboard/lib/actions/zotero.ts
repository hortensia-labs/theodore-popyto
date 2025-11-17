'use server';

import { db, sqlite } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, zoteroItemLinks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { addUrlStatus, type UrlStatus } from '../db/computed';
import { 
  processIdentifier, 
  processUrl, 
  extractItemKey, 
  isExistingItem,
  getErrorMessage,
  deleteItem,
  getItem,
  validateCitation,
  type ZoteroProcessResponse,
  type ZoteroDeleteResponse,
  type ZoteroItemResponse,
  type CitationValidationStatus,
  ZoteroApiError
} from '../zotero-client';
import { URLProcessingOrchestrator } from '../orchestrator/url-processing-orchestrator';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { StateGuards } from '../state-machine/state-guards';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import type { ProcessingStatus } from '../types/url-processing';

/**
 * Processing result for a single URL
 */
export interface ProcessingResult {
  urlId: number;
  success: boolean;
  itemKey?: string;
  method?: string;
  error?: string;
  isExisting?: boolean;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  total: number;
  successful: number;
  failed: number;
  results: ProcessingResult[];
}

/**
 * Determine processing strategy based on URL status
 */
function determineProcessingStrategy(
  url: string,
  status: UrlStatus,
  validIdentifiers: string[] | null,
  customIdentifiers: string[] | null
): { endpoint: 'identifier' | 'url'; identifier?: string } | null {
  // Only process extractable and translatable URLs
  if (status === 'extractable') {
    // Priority: custom identifiers > valid identifiers
    const identifiers = customIdentifiers && customIdentifiers.length > 0
      ? customIdentifiers
      : validIdentifiers;
    
    if (identifiers && identifiers.length > 0) {
      return {
        endpoint: 'identifier',
        identifier: identifiers[0], // Use first identifier
      };
    }
  }
  
  if (status === 'translatable') {
    return {
      endpoint: 'url',
    };
  }
  
  // Don't process other statuses (error, unknown, resolvable, stored)
  return null;
}

/**
 * Process a single URL with Zotero
 * 
 * NEW: This now uses the orchestrator as the primary method,
 * which handles multi-stage processing with auto-cascade.
 * 
 * The orchestrator will:
 * 1. Try Zotero processing (identifier or URL)
 * 2. On failure, auto-cascade to content extraction
 * 3. On content failure, try LLM extraction
 * 4. Record all attempts in history
 */
export async function processUrlWithZotero(urlId: number): Promise<ProcessingResult> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 ACTION ENTRY: processUrlWithZotero()                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('📌 URL ID:', urlId);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📍 Called from: Server Action (zotero.ts)');
  
  try {
    console.log('📂 Fetching URL data and checking capabilities...');
    
    // Check if URL exists and get capabilities
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      console.log('❌ URL not found');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return {
        urlId,
        success: false,
        error: 'URL not found',
      };
    }
    
    console.log('✅ URL data loaded');
    console.log('🌐 URL:', urlData.url);
    console.log('📊 Current status:', urlData.processingStatus);
    console.log('🎯 User intent:', urlData.userIntent);
    console.log('🔢 Attempts so far:', urlData.processingAttempts);
    
    // Check if can be processed
    console.log('\n🔍 Checking processing eligibility...');
    if (!StateGuards.canProcessWithZotero(urlData)) {
      console.log('❌ URL cannot be processed');
      console.log('📊 Status:', urlData.processingStatus);
      console.log('🎯 Intent:', urlData.userIntent);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return {
        urlId,
        success: false,
        error: `Cannot process URL (status: ${urlData.processingStatus}, intent: ${urlData.userIntent})`,
      };
    }
    
    console.log('✅ URL is eligible for processing');
    console.log('\n🚀 Delegating to URLProcessingOrchestrator...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // NEW: Delegate to orchestrator for complete workflow
    // The orchestrator handles:
    // - Multi-stage processing (Zotero → Content → LLM)
    // - Auto-cascade on failure
    // - State management
    // - History recording
    const result = await URLProcessingOrchestrator.processUrl(urlId);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 Orchestrator returned');
    console.log('✅ Success:', result.success);
    console.log('📊 Final status:', result.status);
    console.log('🔑 Item key:', result.itemKey || 'none');
    console.log('📍 Method used:', result.method || 'none');
    if (result.error) {
      console.log('❌ Error:', result.error);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Convert orchestrator result to legacy format for compatibility
    return {
      urlId,
      success: result.success,
      itemKey: result.itemKey,
      method: result.method,
      error: result.error,
      isExisting: result.metadata?.isExisting as boolean,
    };
  } catch (error) {
    console.log('\n💥 EXCEPTION in processUrlWithZotero()');
    console.log('💬 Error:', getErrorMessage(error));
    
    if (error instanceof Error) {
      console.log('📜 Stack:', error.stack);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      urlId,
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Process multiple URLs with Zotero (batch processing)
 * Processes in batches of 5 in parallel with rate limiting
 */
export async function processMultipleUrlsWithZotero(
  urlIds: number[]
): Promise<BatchProcessingResult> {
  const BATCH_SIZE = 5;
  const RATE_LIMIT_MS = parseInt(process.env.ZOTERO_RATE_LIMIT_MS || '2000');
  
  const results: ProcessingResult[] = [];
  
  // Process in batches
  for (let i = 0; i < urlIds.length; i += BATCH_SIZE) {
    const batch = urlIds.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(urlId => processUrlWithZotero(urlId))
    );
    
    results.push(...batchResults);
    
    // Rate limiting: wait before next batch (unless it's the last batch)
    if (i + BATCH_SIZE < urlIds.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }
  }
  
  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Retry failed Zotero processing for a URL
 */
export async function retryFailedZoteroProcessing(urlId: number): Promise<ProcessingResult> {
  // Clear previous error state
  await db
    .update(urls)
    .set({
      zoteroProcessingStatus: null,
      zoteroProcessingError: null,
      updatedAt: new Date(),
    })
    .where(eq(urls.id, urlId));
  
  // Attempt processing again
  return processUrlWithZotero(urlId);
}

/**
 * Get processing status for a URL
 */
export async function getZoteroProcessingStatus(urlId: number) {
  try {
    const result = await db
      .select({
        zoteroItemKey: urls.zoteroItemKey,
        zoteroProcessedAt: urls.zoteroProcessedAt,
        zoteroProcessingStatus: urls.zoteroProcessingStatus,
        zoteroProcessingError: urls.zoteroProcessingError,
        zoteroProcessingMethod: urls.zoteroProcessingMethod,
      })
      .from(urls)
      .where(eq(urls.id, urlId))
      .limit(1);
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unlink URL from Zotero item (without deleting the Zotero item)
 * 
 * NEW: Enhanced with state machine and link tracking
 */
export async function unlinkUrlFromZotero(urlId: number) {
  try {
    // Get current URL data with capabilities
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if can unlink
    if (!StateGuards.canUnlink(urlData)) {
      return {
        success: false,
        error: `Cannot unlink URL (current status: ${urlData.processingStatus})`,
      };
    }
    
    if (!urlData.zoteroItemKey) {
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }
    
    const currentStatus = urlData.processingStatus;
    const itemKey = urlData.zoteroItemKey;
    
    // Transition back to not_started (per requirements: unlink returns to initial state)
    await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      'not_started',
      {
        reason: 'User unlinked from Zotero',
        previousItemKey: itemKey,
      }
    );
    
    // Clear Zotero fields and citation validation
    await db
      .update(urls)
      .set({
        zoteroItemKey: null,
        zoteroProcessedAt: null,
        zoteroProcessingStatus: null,
        zoteroProcessingError: null,
        zoteroProcessingMethod: null,
        citationValidationStatus: null,
        citationValidatedAt: null,
        citationValidationDetails: null,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Remove link record
    await db
      .delete(zoteroItemLinks)
      .where(eq(zoteroItemLinks.urlId, urlId));
    
    // Update linked_url_count for other URLs with same item
    sqlite.exec(`
      UPDATE urls
      SET linked_url_count = (
        SELECT COUNT(*) FROM zotero_item_links WHERE item_key = '${itemKey}'
      )
      WHERE zotero_item_key = '${itemKey}'
    `);
    
    return {
      success: true,
      urlId,
      itemKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete Zotero item and unlink URL
 * 
 * NEW: Enhanced with safety checks to prevent accidental deletion
 */
export async function deleteZoteroItemAndUnlink(urlId: number) {
  try {
    // Get current URL data with capabilities
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    if (!urlData.zoteroItemKey) {
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }
    
    // NEW: Safety checks before deletion
    if (!StateGuards.canDeleteZoteroItem(urlData)) {
      const reasons = [];
      if (!urlData.createdByTheodore) {
        reasons.push('Item was not created by Theodore (pre-existing item)');
      }
      if (urlData.userModifiedInZotero) {
        reasons.push('Item was modified by user in Zotero');
      }
      if ((urlData.linkedUrlCount || 0) > 1) {
        reasons.push(`Item is linked to ${urlData.linkedUrlCount} URLs`);
      }
      
      return {
        success: false,
        error: `Cannot safely delete item: ${reasons.join(', ')}`,
        urlId,
        itemKey: urlData.zoteroItemKey,
        safetyCheckFailed: true,
        reasons,
      };
    }
    
    const itemKey = urlData.zoteroItemKey;
    const currentStatus = urlData.processingStatus;
    
    // Delete item from Zotero
    let deleteResponse: ZoteroDeleteResponse;
    try {
      deleteResponse = await deleteItem(itemKey);
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        urlId,
        itemKey,
      };
    }
    
    // Transition to not_started
    await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      'not_started',
      {
        reason: 'User deleted Zotero item',
        deletedItemKey: itemKey,
      }
    );
    
    // Clear Zotero fields and citation validation in database
    await db
      .update(urls)
      .set({
        zoteroItemKey: null,
        zoteroProcessedAt: null,
        zoteroProcessingStatus: null,
        zoteroProcessingError: null,
        zoteroProcessingMethod: null,
        citationValidationStatus: null,
        citationValidatedAt: null,
        citationValidationDetails: null,
        createdByTheodore: false,
        linkedUrlCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Remove link record
    await db
      .delete(zoteroItemLinks)
      .where(eq(zoteroItemLinks.urlId, urlId));
    
    return {
      success: true,
      urlId,
      itemKey,
      deleted: deleteResponse.deleted,
      itemInfo: deleteResponse.itemInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk unlink URLs from Zotero items (without deleting)
 */
export async function bulkUnlinkFromZotero(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => unlinkUrlFromZotero(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Bulk delete Zotero items and unlink URLs
 */
export async function bulkDeleteZoteroItemsAndUnlink(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => deleteZoteroItemAndUnlink(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Get Zotero item metadata by item key
 */
export async function getZoteroItemMetadata(itemKey: string) {
  try {
    const itemData = await getItem(itemKey);
    
    return {
      success: true,
      data: itemData,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Revalidate citation for a stored URL
 * Fetches latest metadata from Zotero and updates validation status
 */
export async function revalidateCitation(urlId: number) {
  try {
    // Get URL data
    const urlData = await db
      .select()
      .from(urls)
      .where(eq(urls.id, urlId))
      .limit(1);
    
    if (urlData.length === 0) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    const url = urlData[0];
    
    if (!url.zoteroItemKey || url.zoteroProcessingStatus !== 'stored') {
      return {
        success: false,
        error: 'URL is not stored in Zotero',
      };
    }
    
    // Fetch item metadata
    const itemMetadata = await getItem(url.zoteroItemKey);
    
    // Validate citation
    const validation = validateCitation(itemMetadata);
    
    // Update validation status
    await db
      .update(urls)
      .set({
        citationValidationStatus: validation.status,
        citationValidatedAt: new Date(),
        citationValidationDetails: { missingFields: validation.missingFields },
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    return {
      success: true,
      urlId,
      validationStatus: validation.status,
      missingFields: validation.missingFields,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Bulk revalidate citations for stored URLs
 */
export async function bulkRevalidateCitations(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => revalidateCitation(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

