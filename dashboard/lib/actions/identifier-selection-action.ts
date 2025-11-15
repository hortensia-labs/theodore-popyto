/**
 * Identifier Selection Server Actions
 * 
 * Handles user selection of identifiers and processing them with Zotero
 * NEW: Integrated with state machine and orchestrator
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlIdentifiers, zoteroItemLinks } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { processIdentifier, validateCitation, getItem } from '../zotero-client';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { StateGuards } from '../state-machine/state-guards';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import type { ProcessingStatus } from '../types/url-processing';

export interface SelectIdentifierResult {
  success: boolean;
  itemKey?: string;
  error?: string;
  method?: string;
}

/**
 * Select and process an identifier
 * NEW: Integrated with state machine
 */
export async function selectAndProcessIdentifier(
  urlId: number,
  identifierId: number
): Promise<SelectIdentifierResult> {
  try {
    // Get URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if can select identifier
    if (!StateGuards.canSelectIdentifier(urlData)) {
      return {
        success: false,
        error: `Cannot select identifier (current status: ${urlData.processingStatus})`,
      };
    }
    
    // Get the identifier
    const identifier = await db.query.urlIdentifiers.findFirst({
      where: and(
        eq(urlIdentifiers.id, identifierId),
        eq(urlIdentifiers.urlId, urlId)
      ),
    });
    
    if (!identifier) {
      return {
        success: false,
        error: 'Identifier not found',
      };
    }
    
    // Transition to processing
    await URLProcessingStateMachine.transition(
      urlId,
      'awaiting_selection',
      'processing_zotero',
      {
        reason: 'User selected identifier',
        selectedIdentifierId: identifierId,
        selectedIdentifierValue: identifier.identifierValue,
      }
    );
    
    // Record attempt start
    const startTime = Date.now();
    
    // Process with Zotero
    const result = await processIdentifier(identifier.identifierValue);
    
    const duration = Date.now() - startTime;
    
    if (!result.success) {
      // Record failure
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'zotero_identifier',
        method: identifier.identifierType,
        success: false,
        error: result.error?.message || 'Processing failed',
        duration,
      });
      
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
        method: identifier.identifierType,
        success: false,
        error: 'Item created but key not found',
        duration,
      });
      
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
    
    // Transition to final status
    await URLProcessingStateMachine.transition(
      urlId,
      'processing_zotero',
      finalStatus,
      {
        itemKey,
        validationStatus,
        missingFields,
      }
    );
    
    // Update identifier as selected
    await db.update(urlIdentifiers)
      .set({
        userSelected: true,
        selectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(urlIdentifiers.id, identifierId));
    
    // Update URL record with Zotero data and citation validation
    await db.update(urls)
      .set({
        zoteroItemKey: itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: 'identifier',
        citationValidationStatus: validationStatus,
        citationValidatedAt: new Date(),
        citationValidationDetails: { missingFields },
        createdByTheodore: true, // NEW: Track provenance
        linkedUrlCount: 1, // NEW: Track link count
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
    
    // Record successful attempt
    await recordProcessingAttempt(urlId, {
      timestamp: startTime,
      stage: 'zotero_identifier',
      method: identifier.identifierType,
      success: true,
      itemKey,
      duration,
      metadata: {
        identifierValue: identifier.identifierValue,
        validationStatus,
        missingFields,
      },
    });
    
    revalidatePath('/urls');
    
    return {
      success: true,
      itemKey,
      method: result.method,
    };
  } catch (error) {
    console.error('Error selecting and processing identifier:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all identifiers with previews for a URL
 */
export async function getIdentifiersWithPreviews(urlId: number) {
  const identifiers = await db.query.urlIdentifiers.findMany({
    where: eq(urlIdentifiers.urlId, urlId),
  });
  
  return identifiers.map(id => ({
    id: id.id,
    type: id.identifierType,
    value: id.identifierValue,
    confidence: id.confidence,
    extractionSource: id.extractionSource,
    preview: id.previewData,
    previewFetched: id.previewFetched,
    qualityScore: id.previewQualityScore,
    userSelected: id.userSelected,
    selectedAt: id.selectedAt,
  }));
}

/**
 * Refresh preview for an identifier
 */
export async function refreshIdentifierPreview(
  identifierId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const identifier = await db.query.urlIdentifiers.findFirst({
      where: eq(urlIdentifiers.id, identifierId),
    });
    
    if (!identifier) {
      return { success: false, error: 'Identifier not found' };
    }
    
    // Import preview orchestrator
    const { getPreviewForIdentifier } = await import('../preview-orchestrator');
    
    // Force refresh
    const result = await getPreviewForIdentifier(identifierId, true);
    
    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || 'Preview failed',
      };
    }
    
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
 * Fetch previews for all identifiers of a URL
 */
export async function fetchAllPreviews(
  urlId: number
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { previewAllIdentifiers } = await import('../preview-orchestrator');
    
    const results = await previewAllIdentifiers(urlId, {
      parallelLimit: 3,
      cacheResults: true,
      force: false,
    });
    
    const successCount = results.filter(r => r.success).length;
    
    revalidatePath('/urls');
    
    return {
      success: true,
      count: successCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deselect identifier (if user wants to choose a different one)
 */
export async function deselectIdentifier(
  identifierId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.update(urlIdentifiers)
      .set({
        userSelected: false,
        selectedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(urlIdentifiers.id, identifierId));
    
    revalidatePath('/urls');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

