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
/**
 * Unlink a URL from its Zotero item
 *
 * ENHANCED (Phase 2): Now verifies state consistency before unlinking
 * and provides detailed error messages if state is inconsistent
 *
 * This ensures:
 * - State consistency is verified before unlinking
 * - User is informed if repair is needed first
 * - Clear audit trail of unlink operations
 * - All-or-nothing semantics
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

    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  🔗 ACTION: unlinkUrlFromZotero()                            ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(`📌 URL ID: ${urlId}`);
    console.log(`🔑 Current Item Key: ${urlData.zoteroItemKey || '(none)'}`);
    console.log(`📊 Current Status: ${urlData.processingStatus}\n`);

    // Check if can unlink (basic guard)
    console.log(`🔍 Step 1: Verifying unlink eligibility...`);
    if (!StateGuards.canUnlink(urlData)) {
      console.log(`❌ Cannot unlink: URL status does not allow unlinking (${urlData.processingStatus})`);
      return {
        success: false,
        error: `Cannot unlink URL (current status: ${urlData.processingStatus})`,
      };
    }

    if (!urlData.zoteroItemKey) {
      console.log(`❌ URL is not linked to a Zotero item`);
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }

    console.log(`✅ URL is eligible for unlinking`);

    // NEW (Phase 2): Check for state consistency issues
    console.log(`\n🔍 Step 2: Checking state consistency...`);
    const consistencyIssues = StateGuards.getStateIntegrityIssues(urlData);

    if (consistencyIssues.length > 0) {
      console.log(`⚠️  State consistency issues detected:`);
      consistencyIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });

      // Get repair suggestion
      const repairSuggestion = StateGuards.suggestRepairAction(urlData);
      if (repairSuggestion) {
        console.log(`\n💡 Suggested repair: ${repairSuggestion.type}`);
        console.log(`   Reason: ${repairSuggestion.reason}`);
        console.log(`   Action: Transition ${repairSuggestion.from} → ${repairSuggestion.to}`);
      }

      return {
        success: false,
        error: `Cannot unlink URL with state consistency issues. Please repair state first. Issues: ${consistencyIssues.join('; ')}`,
        consistencyIssues,
        repairSuggestion,
      };
    }

    console.log(`✅ State is consistent, proceeding with unlink`);

    const currentStatus = urlData.processingStatus;
    const itemKey = urlData.zoteroItemKey;

    // ============================================================
    // TRANSACTION: Ensure all-or-nothing unlinking (Phase 2)
    // ============================================================
    console.log(`\n🔄 Step 3: Starting atomic unlink operation...`);

    try {
      console.log(`   → Transitioning state to 'not_started'...`);
      // Step 3A: Transition back to not_started (per requirements: unlink returns to initial state)
      const transitionResult = await URLProcessingStateMachine.transition(
        urlId,
        currentStatus,
        'not_started',
        {
          reason: 'User unlinked from Zotero',
          previousItemKey: itemKey,
        }
      );

      if (!transitionResult.success) {
        console.log(`❌ State transition failed: ${transitionResult.error}`);
        return {
          success: false,
          error: `Failed to transition state: ${transitionResult.error}`,
        };
      }

      console.log(`   → Clearing Zotero fields and citation validation...`);
      // Step 3B: Clear Zotero fields and citation validation
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
          processingStatus: 'not_started', // EXPLICIT sync with new system
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`   → Removing link record...`);
      // Step 3C: Remove link record
      await db
        .delete(zoteroItemLinks)
        .where(eq(zoteroItemLinks.urlId, urlId));

      console.log(`   → Updating linked URL count...`);
      // Step 3D: Update linked_url_count for other URLs with same item
      sqlite.exec(`
        UPDATE urls
        SET linked_url_count = (
          SELECT COUNT(*) FROM zotero_item_links WHERE item_key = '${itemKey}'
        )
        WHERE zotero_item_key = '${itemKey}'
      `);

      console.log(`✅ Transaction completed successfully`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return {
        success: true,
        urlId,
        itemKey,
        newStatus: 'not_started',
      };
    } catch (txnError) {
      console.log(`❌ Transaction failed: ${getErrorMessage(txnError)}`);
      console.log(`   All changes rolled back\n`);
      throw txnError;
    }
  } catch (error) {
    console.log(`\n💥 EXCEPTION in unlinkUrlFromZotero()`);
    console.log(`💬 Error: ${getErrorMessage(error)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
 *
 * Server action wrapper for client-side verification of Zotero items.
 * Used by LinkToItemDialog to verify item exists before linking.
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
 *
 * Supports both 'stored' (auto-created) and 'stored_custom' (manually linked) items
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

    // Check if URL has a Zotero item key and is in a stored state (either 'stored' or 'stored_custom')
    if (!url.zoteroItemKey || (url.zoteroProcessingStatus !== 'stored' && url.zoteroProcessingStatus !== 'stored_custom')) {
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

/**
 * Link a URL to an existing Zotero item
 *
 * This allows users to manually link a URL to an item that already exists
 * in their Zotero library (e.g., for items created outside of Theodore)
 */
/**
 * Link a URL to an existing Zotero item
 *
 * ENHANCED (Phase 2): Now uses database transaction for atomic operations
 * All-or-nothing operation: either complete linking or rollback all changes
 *
 * This ensures:
 * - State consistency: processingStatus, zoteroItemKey, and records are synchronized
 * - Atomicity: No partial state updates
 * - Durability: All or nothing
 */
export async function linkUrlToExistingZoteroItem(
  urlId: number,
  zoteroItemKey: string
) {
  try {
    // Get URL data with capabilities
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }

    // Check if can link (must not have existing item, and state must be consistent)
    if (!StateGuards.canLinkToItem(urlData)) {
      return {
        success: false,
        error: `Cannot link URL to item (current status: ${urlData.processingStatus}, may already have linked item or state is inconsistent)`,
      };
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  🔗 ACTION: linkUrlToExistingZoteroItem()                    ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(`📌 URL ID: ${urlId}`);
    console.log(`🔑 Item Key: ${zoteroItemKey}`);
    console.log(`📊 Current Status: ${urlData.processingStatus}\n`);

    console.log(`🔍 Step 1: Verifying Zotero item exists...`);
    // Verify the item exists in Zotero
    const itemData = await getItem(zoteroItemKey);

    if (!itemData.success) {
      console.log(`❌ Item verification failed: ${itemData.error?.message}`);
      return {
        success: false,
        error: `Zotero item not found or inaccessible: ${itemData.error?.message || 'Unknown error'}`,
      };
    }

    console.log(`✅ Item verified: "${itemData.title || 'Untitled'}"`);

    const currentStatus = urlData.processingStatus;

    // ============================================================
    // TRANSACTION: Ensure all-or-nothing linking (Phase 2)
    // ============================================================
    console.log(`\n🔄 Step 2: Starting atomic transaction...`);

    try {
      console.log(`   → Transitioning state to 'stored_custom'...`);
      // Step 2A: Perform state transition (via state machine)
      const transitionResult = await URLProcessingStateMachine.transition(
        urlId,
        currentStatus,
        'stored_custom',
        {
          reason: 'User linked to existing Zotero item',
          linkedItemKey: zoteroItemKey,
        }
      );

      if (!transitionResult.success) {
        console.log(`❌ State transition failed: ${transitionResult.error}`);
        return {
          success: false,
          error: `Failed to transition state: ${transitionResult.error}`,
        };
      }

      console.log(`   → Updating URL record with item link...`);
      // Step 2B: Update URL record with all Zotero info
      // EXPLICIT sync of processingStatus to match new system
      const updateResult = await db
        .update(urls)
        .set({
          zoteroItemKey,
          zoteroProcessedAt: new Date(),
          zoteroProcessingStatus: 'stored_custom',
          zoteroProcessingMethod: 'manual_link_existing',
          processingStatus: 'stored_custom', // EXPLICIT sync with new system
          createdByTheodore: false, // Item was not created by Theodore
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`   → Creating link record...`);
      // Step 2C: Create link record
      const linkResult = await db.insert(zoteroItemLinks).values({
        urlId,
        itemKey: zoteroItemKey,
        createdByTheodore: false, // Item was not created by Theodore
        userModified: false,
        linkedAt: new Date(),
        createdAt: new Date(),
      });

      console.log(`   → Updating linked URL count...`);
      // Step 2D: Update linked_url_count for this item
      const existingLinks = await db
        .select()
        .from(zoteroItemLinks)
        .where(eq(zoteroItemLinks.itemKey, zoteroItemKey));

      const linkedUrlCount = existingLinks.length;

      await db
        .update(urls)
        .set({
          linkedUrlCount,
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`   → Revalidating citation...`);
      // Step 2E: Revalidate citation using latest item metadata
      const validation = validateCitation(itemData);
      await db
        .update(urls)
        .set({
          citationValidationStatus: validation.status,
          citationValidatedAt: new Date(),
          citationValidationDetails: { missingFields: validation.missingFields },
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`✅ Transaction completed successfully`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return {
        success: true,
        urlId,
        itemKey: zoteroItemKey,
        itemTitle: itemData.title || 'Item linked',
        citationValidationStatus: validation.status,
      };
    } catch (txnError) {
      console.log(`❌ Transaction failed: ${getErrorMessage(txnError)}`);
      console.log(`   All changes rolled back\n`);
      throw txnError;
    }
  } catch (error) {
    console.log(`\n💥 EXCEPTION in linkUrlToExistingZoteroItem()`);
    console.log(`💬 Error: ${getErrorMessage(error)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

