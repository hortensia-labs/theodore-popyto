/**
 * Zotero Types Server Actions
 * 
 * Fetches and caches Zotero item types, creator types, and field definitions
 */

'use server';

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';

// In-memory cache for item types (valid for app lifetime)
let itemTypesCache: ZoteroItemType[] | null = null;
let creatorTypesCache: Map<string, ZoteroCreatorType[]> = new Map();

export interface ZoteroItemType {
  itemType: string;
  localized: string;
}

export interface ZoteroCreatorType {
  creatorType: string;
  localized: string;
}

/**
 * Get all Zotero item types
 */
export async function getZoteroItemTypes(): Promise<{
  success: boolean;
  itemTypes?: ZoteroItemType[];
  error?: string;
}> {
  try {
    // Return cached if available
    if (itemTypesCache) {
      return {
        success: true,
        itemTypes: itemTypesCache,
      };
    }
    
    // Fetch from Zotero Local API
    const response = await fetch(`${ZOTERO_API_BASE_URL}/api/itemTypes`, {
      headers: {
        'Zotero-API-Version': '3',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch item types: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform to our format
    const itemTypes: ZoteroItemType[] = data.map((item: any) => ({
      itemType: item.itemType,
      localized: item.localized || item.itemType,
    }));
    
    // Cache the results
    itemTypesCache = itemTypes;
    
    return {
      success: true,
      itemTypes,
    };
  } catch (error) {
    console.error('Error fetching Zotero item types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch item types',
    };
  }
}

/**
 * Get creator types for a specific item type
 */
export async function getCreatorTypesForItemType(
  itemType: string
): Promise<{
  success: boolean;
  creatorTypes?: ZoteroCreatorType[];
  error?: string;
}> {
  try {
    // Check cache
    if (creatorTypesCache.has(itemType)) {
      return {
        success: true,
        creatorTypes: creatorTypesCache.get(itemType),
      };
    }
    
    // Fetch from Zotero
    const response = await fetch(
      `${ZOTERO_API_BASE_URL}/api/itemTypeCreatorTypes?itemType=${itemType}`,
      {
        headers: {
          'Zotero-API-Version': '3',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch creator types: ${response.status}`);
    }
    
    const data = await response.json();
    
    const creatorTypes: ZoteroCreatorType[] = data.map((item: any) => ({
      creatorType: item.creatorType,
      localized: item.localized || item.creatorType,
    }));
    
    // Cache
    creatorTypesCache.set(itemType, creatorTypes);
    
    return {
      success: true,
      creatorTypes,
    };
  } catch (error) {
    console.error('Error fetching creator types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch creator types',
    };
  }
}

/**
 * Validate item type against Zotero's allowed types
 */
export async function validateItemType(
  itemType: string
): Promise<{
  valid: boolean;
  normalized?: string;
  error?: string;
}> {
  try {
    const result = await getZoteroItemTypes();
    
    if (!result.success || !result.itemTypes) {
      return {
        valid: false,
        error: result.error || 'Failed to fetch item types',
      };
    }
    
    // Check if item type exists
    const found = result.itemTypes.find(
      t => t.itemType.toLowerCase() === itemType.toLowerCase()
    );
    
    if (found) {
      return {
        valid: true,
        normalized: found.itemType,
      };
    }
    
    // Try common mappings
    const mappings: Record<string, string> = {
      'article': 'journalArticle',
      'journal article': 'journalArticle',
      'blog': 'blogPost',
      'blog post': 'blogPost',
      'web page': 'webpage',
      'website': 'webpage',
      'conference paper': 'conferencePaper',
      'thesis': 'thesis',
      'dissertation': 'thesis',
    };
    
    const mapped = mappings[itemType.toLowerCase()];
    if (mapped) {
      return {
        valid: true,
        normalized: mapped,
      };
    }
    
    return {
      valid: false,
      error: `Invalid item type: ${itemType}. Use one of Zotero's supported types.`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Clear item types cache (useful for testing or after Zotero updates)
 */
export async function clearItemTypesCache(): Promise<void> {
  itemTypesCache = null;
  creatorTypesCache.clear();
}

