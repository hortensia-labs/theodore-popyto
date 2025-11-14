'use server';

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments } from '../db/schema';
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
 */
export async function processUrlWithZotero(urlId: number): Promise<ProcessingResult> {
  try {
    // Fetch URL with all related data
    const result = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(eq(urls.id, urlId))
      .limit(1);
    
    if (result.length === 0) {
      return {
        urlId,
        success: false,
        error: 'URL not found',
      };
    }
    
    const row = result[0];
    const urlData = row.urls;
    const analysisData = row.url_analysis_data;
    const enrichment = row.url_enrichments;
    
    // Compute status
    const urlWithStatus = addUrlStatus(urlData, analysisData, enrichment);
    
    // Don't process if already stored
    if (urlWithStatus.status === 'stored') {
      return {
        urlId,
        success: false,
        error: 'URL already processed and stored in Zotero',
      };
    }
    
    // Determine processing strategy
    const strategy = determineProcessingStrategy(
      urlData.url,
      urlWithStatus.status,
      analysisData?.validIdentifiers || null,
      enrichment?.customIdentifiers || null
    );
    
    if (!strategy) {
      return {
        urlId,
        success: false,
        error: `Cannot process URL with status: ${urlWithStatus.status}`,
      };
    }
    
    // Mark as processing
    await db
      .update(urls)
      .set({
        zoteroProcessingStatus: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Process with Zotero
    let response: ZoteroProcessResponse;
    
    try {
      if (strategy.endpoint === 'identifier' && strategy.identifier) {
        response = await processIdentifier(strategy.identifier);
      } else {
        response = await processUrl(urlData.url);
      }
    } catch (error) {
      // Update with error
      await db
        .update(urls)
        .set({
          zoteroProcessingStatus: 'failed',
          zoteroProcessingError: getErrorMessage(error),
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));
      
      // Automatically attempt content fetching for alternative processing routes
      try {
        const { processSingleUrl } = await import('./process-url-action');
        await processSingleUrl(urlId);
        console.log(`Content fetching triggered for failed URL ${urlId} to enable alternative processing`);
      } catch (contentError) {
        console.error(`Failed to fetch content for URL ${urlId}:`, contentError);
        // Don't fail the main function - this is a best-effort attempt
      }
      
      throw error;
    }
    
    // Extract item key
    const itemKey = extractItemKey(response);
    
    if (!itemKey) {
      // Update with error
      await db
        .update(urls)
        .set({
          zoteroProcessingStatus: 'failed',
          zoteroProcessingError: 'No item key returned from Zotero',
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));
      
      // Automatically attempt content fetching for alternative processing routes
      try {
        const { processSingleUrl } = await import('./process-url-action');
        await processSingleUrl(urlId);
        console.log(`Content fetching triggered for failed URL ${urlId} to enable alternative processing`);
      } catch (contentError) {
        console.error(`Failed to fetch content for URL ${urlId}:`, contentError);
        // Don't fail the main function - this is a best-effort attempt
      }
      
      return {
        urlId,
        success: false,
        error: 'No item key returned from Zotero',
      };
    }
    
    // Fetch item metadata and validate citation
    let validationStatus: CitationValidationStatus = 'incomplete';
    let validationDetails: { missingFields?: string[] } = {};
    
    try {
      const itemMetadata = await getItem(itemKey);
      const validation = validateCitation(itemMetadata);
      validationStatus = validation.status;
      validationDetails = { missingFields: validation.missingFields };
    } catch (error) {
      // If validation fails, default to incomplete
      console.error('Citation validation failed:', error);
      validationDetails = { missingFields: ['title', 'creators', 'date'] };
    }
    
    // Update URL with success and validation
    await db
      .update(urls)
      .set({
        zoteroItemKey: itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: strategy.endpoint,
        zoteroProcessingError: null,
        citationValidationStatus: validationStatus,
        citationValidatedAt: new Date(),
        citationValidationDetails: validationDetails,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    return {
      urlId,
      success: true,
      itemKey,
      method: response.method,
      isExisting: isExistingItem(response),
    };
  } catch (error) {
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
 */
export async function unlinkUrlFromZotero(urlId: number) {
  try {
    // Get current URL data
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
    
    if (!url.zoteroItemKey) {
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }
    
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
    
    return {
      success: true,
      urlId,
      itemKey: url.zoteroItemKey,
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
 */
export async function deleteZoteroItemAndUnlink(urlId: number) {
  try {
    // Get current URL data
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
    
    if (!url.zoteroItemKey) {
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }
    
    // Delete item from Zotero
    let deleteResponse: ZoteroDeleteResponse;
    try {
      deleteResponse = await deleteItem(url.zoteroItemKey);
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
        urlId,
        itemKey: url.zoteroItemKey,
      };
    }
    
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
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    return {
      success: true,
      urlId,
      itemKey: url.zoteroItemKey,
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

