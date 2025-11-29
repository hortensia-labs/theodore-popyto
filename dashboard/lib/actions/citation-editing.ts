/**
 * Citation Editing Actions
 * 
 * Server actions for editing citation metadata of stored Zotero items
 * Includes validation and APA formatting
 */

'use server';

import { db } from '../db/client';
import { urls } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { StateGuards } from '../state-machine/state-guards';
import { getUrlWithCapabilities } from '../orchestrator/processing-helpers';
import { updateItem, validateCitation, getItem, type ZoteroItem } from '../zotero-client';

/**
 * Update citation metadata for a stored URL
 * 
 * @param urlId - URL ID
 * @param itemKey - Zotero item key
 * @param metadata - Updated metadata fields
 * @returns Result
 */
export async function updateCitation(
  urlId: number,
  itemKey: string,
  metadata: Partial<ZoteroItem>
): Promise<{ success: boolean; validationStatus?: string; error?: string }> {
  try {
    // Get URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if can edit citation
    if (!StateGuards.canEditCitation(urlData)) {
      return {
        success: false,
        error: `Cannot edit citation (current status: ${urlData.processingStatus})`,
      };
    }
    
    // Verify item key matches
    if (urlData.zoteroItemKey !== itemKey) {
      return {
        success: false,
        error: 'Item key mismatch',
      };
    }
    
    // Update item in Zotero
    const updateResult = await updateItem(itemKey, metadata);
    
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error?.message || 'Failed to update item in Zotero',
      };
    }
    
    // Fetch updated item and revalidate
    const itemMetadata = await getItem(itemKey);
    const validation = validateCitation(itemMetadata);
    
    // Update URL record
    await db.update(urls)
      .set({
        citationValidationStatus: validation.status,
        citationValidatedAt: new Date(),
        citationValidationDetails: { missingFields: validation.missingFields },
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // If citation is now complete, transition from stored_incomplete to stored
    if (
      urlData.processingStatus === 'stored_incomplete' &&
      validation.status === 'valid'
    ) {
      await URLProcessingStateMachine.transition(
        urlId,
        'stored_incomplete',
        'stored',
        {
          reason: 'Citation completed by user',
          updatedFields: Object.keys(metadata),
        }
      );
      
      await db.update(urls)
        .set({ processingStatus: 'stored' })
        .where(eq(urls.id, urlId));
    }
    
    console.log(`Updated citation for URL ${urlId}: ${itemKey}`);
    
    return {
      success: true,
      validationStatus: validation.status,
    };
  } catch (error) {
    console.error('Error updating citation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get citation preview in APA format
 * 
 * @param metadata - Zotero item metadata
 * @returns Formatted citation string
 */
export async function getCitationPreview(
  metadata: ZoteroItem
): Promise<{ success: boolean; citation?: string; error?: string }> {
  try {
    // Simple APA format (can be enhanced with proper citation library)
    const citation = formatAPA(metadata);
    
    return {
      success: true,
      citation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format citation in APA style (simplified version)
 * 
 * @param metadata - Zotero item metadata
 * @returns Formatted citation
 */
function formatAPA(metadata: ZoteroItem): string {
  const parts: string[] = [];
  
  // Authors
  if (metadata.creators && metadata.creators.length > 0) {
    const authors = metadata.creators
      .filter(c => c.creatorType === 'author')
      .map(c => {
        if (c.lastName && c.firstName) {
          return `${c.lastName}, ${c.firstName.charAt(0)}.`;
        } else if (c.name) {
          return c.name;
        }
        return '';
      })
      .filter(Boolean);
    
    if (authors.length > 0) {
      parts.push(authors.join(', '));
    }
  }
  
  // Date
  if (metadata.date) {
    const year = new Date(metadata.date).getFullYear();
    parts.push(`(${year})`);
  }
  
  // Title
  if (metadata.title) {
    parts.push(`*${metadata.title}*`);
  }
    
  // URL
  if (metadata.url) {
    parts.push(metadata.url);
  }
  
  return parts.join('. ') + '.';
}

/**
 * Get missing fields for a citation
 * 
 * @param urlId - URL ID
 * @returns Missing critical fields
 */
export async function getMissingCitationFields(
  urlId: number
): Promise<{ success: boolean; missingFields?: string[]; error?: string }> {
  try {
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    if (!urlRecord.zoteroItemKey) {
      return {
        success: false,
        error: 'URL not linked to Zotero item',
      };
    }
    
    // Get item and validate
    const itemMetadata = await getItem(urlRecord.zoteroItemKey);
    const validation = validateCitation(itemMetadata);
    
    return {
      success: true,
      missingFields: validation.missingFields || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

