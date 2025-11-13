/**
 * Metadata-Based Storage
 * 
 * Creates Zotero items from extracted metadata using the Connector API
 */

import type { ExtractedMetadata } from '../extractors/html-metadata-extractor';

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';

export interface MetadataStorageResult {
  success: boolean;
  itemKey?: string;
  error?: string;
}

/**
 * Store metadata as a Zotero item using Connector API
 */
export async function storeViaMetadata(
  metadata: ExtractedMetadata
): Promise<MetadataStorageResult> {
  try {
    // Generate unique session ID
    const sessionID = `metadata-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Convert metadata to Connector format
    const connectorItem = convertToConnectorFormat(metadata);
    
    // Call /connector/saveItems
    const saveResponse = await fetch(`${ZOTERO_API_BASE_URL}/connector/saveItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionID,
        uri: metadata.url,
        items: [connectorItem],
      }),
    });
    
    if (saveResponse.status !== 201) {
      const errorText = await saveResponse.text();
      throw new Error(`Failed to save item: ${saveResponse.status} - ${errorText}`);
    }
    
    // Wait a moment for item to be created in Zotero
    await sleep(500);
    
    // Find the created item using the Local API
    const itemKey = await findItemKeyByUrl(metadata.url!);
    
    if (!itemKey) {
      // Try searching by title as fallback
      const itemKeyByTitle = await findItemKeyByTitle(metadata.title!);
      if (itemKeyByTitle) {
        return {
          success: true,
          itemKey: itemKeyByTitle,
        };
      }
      
      return {
        success: false,
        error: 'Item created but key not found',
      };
    }
    
    return {
      success: true,
      itemKey,
    };
  } catch (error) {
    console.error('Metadata storage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Store metadata with HTML snapshot attachment
 */
export async function storeWithSnapshot(
  metadata: ExtractedMetadata,
  snapshotContent: string
): Promise<MetadataStorageResult> {
  try {
    const sessionID = `metadata-snap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // First, create the item
    const connectorItem = convertToConnectorFormat(metadata);
    
    const saveResponse = await fetch(`${ZOTERO_API_BASE_URL}/connector/saveItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionID,
        uri: metadata.url,
        items: [connectorItem],
      }),
    });
    
    if (saveResponse.status !== 201) {
      throw new Error(`Failed to save item: ${saveResponse.status}`);
    }
    
    // Wait for item creation
    await sleep(500);
    
    // Attach snapshot
    const snapshotResponse = await fetch(`${ZOTERO_API_BASE_URL}/connector/saveSingleFile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionID,
        snapshotContent,
        url: metadata.url,
        title: metadata.title || 'Saved Page',
      }),
    });
    
    if (snapshotResponse.status !== 201) {
      console.warn('Snapshot attachment failed, but item was created');
    }
    
    // Find item key
    await sleep(500);
    const itemKey = await findItemKeyByUrl(metadata.url!);
    
    return {
      success: true,
      itemKey: itemKey || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Convert extracted metadata to Zotero Connector format
 */
function convertToConnectorFormat(metadata: ExtractedMetadata): any {
  const item: any = {
    itemType: metadata.itemType || 'webpage',
    title: metadata.title,
    url: metadata.url,
    accessDate: metadata.accessDate || new Date().toISOString(),
  };
  
  // Add creators
  if (metadata.creators && metadata.creators.length > 0) {
    item.creators = metadata.creators;
  }
  
  // Add date
  if (metadata.date) {
    item.date = metadata.date;
  }
  
  // Add optional fields
  if (metadata.abstractNote) item.abstractNote = metadata.abstractNote;
  if (metadata.publicationTitle) item.publicationTitle = metadata.publicationTitle;
  if (metadata.language) item.language = metadata.language;
  if (metadata.volume) item.volume = metadata.volume;
  if (metadata.issue) item.issue = metadata.issue;
  if (metadata.pages) item.pages = metadata.pages;
  if (metadata.publisher) item.publisher = metadata.publisher;
  
  // Add note about extraction
  const extractionMethods = Object.entries(metadata.extractionSources)
    .map(([field, source]) => `${field}: ${source}`)
    .join(', ');
  
  item.extra = `Imported via automated workflow\nExtraction sources: ${extractionMethods}`;
  
  return item;
}

/**
 * Find item key by URL using Local API
 */
async function findItemKeyByUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${ZOTERO_API_BASE_URL}/api/users/0/items?` + new URLSearchParams({
        q: url,
        qmode: 'everything',
        limit: '10',
      }),
      {
        headers: {
          'Zotero-API-Version': '3',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const items = await response.json();
    
    if (Array.isArray(items) && items.length > 0) {
      // Find exact URL match
      const match = items.find(item => item.data?.url === url);
      if (match) return match.key;
      
      // Return first item as fallback
      return items[0].key;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding item by URL:', error);
    return null;
  }
}

/**
 * Find item key by title using Local API
 */
async function findItemKeyByTitle(title: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${ZOTERO_API_BASE_URL}/api/users/0/items?` + new URLSearchParams({
        q: title,
        qmode: 'titleCreatorYear',
        limit: '5',
      }),
      {
        headers: {
          'Zotero-API-Version': '3',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const items = await response.json();
    
    if (Array.isArray(items) && items.length > 0) {
      // Find exact title match
      const match = items.find(item => 
        item.data?.title?.toLowerCase() === title.toLowerCase()
      );
      if (match) return match.key;
      
      // Return first item as fallback
      return items[0].key;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding item by title:', error);
    return null;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

