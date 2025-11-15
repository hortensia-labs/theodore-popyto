/**
 * Zotero API Client
 * 
 * Handles communication with the local Zotero Citation Linker API
 */

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';
const ZOTERO_REQUEST_TIMEOUT = parseInt(process.env.ZOTERO_REQUEST_TIMEOUT || '60000');

/**
 * Zotero API Response Types
 */

/**
 * Creator in Zotero item
 */
export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fieldMode?: 0 | 1; // 0 = first/last, 1 = single field
}

/**
 * Zotero Item Data - for creating/updating items
 * This is the simple structure with direct field names
 * Used when calling createItem() or updateItem()
 */
export interface ZoteroItemData {
  // Item type
  itemType?: string;
  
  // Core bibliographic fields (common to most item types)
  title?: string;
  creators?: ZoteroCreator[];
  
  // Identifiers
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  url?: string;
  
  // Dates
  date?: string;
  accessDate?: string;
  
  // Publication details
  abstractNote?: string;
  publicationTitle?: string;
  journalAbbreviation?: string;
  
  // Volume/Issue/Pages (for articles)
  volume?: string;
  issue?: string;
  pages?: string;
  numPages?: string;
  
  // Publishing
  publisher?: string;
  place?: string;
  edition?: string;
  
  // Additional metadata
  language?: string;
  rights?: string;
  series?: string;
  seriesNumber?: string;
  seriesTitle?: string;
  
  // Web-specific
  websiteTitle?: string;
  websiteType?: string;
  
  // Book-specific
  bookTitle?: string;
  
  // Thesis-specific
  thesisType?: string;
  university?: string;
  
  // Conference-specific
  conferenceName?: string;
  proceedingsTitle?: string;
  
  // Archival
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  
  // Other
  shortTitle?: string;
  extra?: string;
  
  // Tags and collections
  tags?: Array<{
    tag: string;
    type?: 0 | 1; // 0 = manual, 1 = automatic
  }>;
  collections?: string[];
  
  // Relations
  relations?: Record<string, unknown>;
}

/**
 * Alias for backward compatibility
 * Most code uses "ZoteroItem" for creating/updating
 */
export type ZoteroItem = ZoteroItemData;

/**
 * Item returned in ZoteroProcessResponse
 * Contains item data plus metadata about the processing
 */
export interface ZoteroProcessedItem extends ZoteroItemData {
  // Metadata added by the processing
  key?: string;
  version?: number;
  _meta?: {
    index?: number;
    itemKey: string;
    itemType: string;
    library?: number;
    citation?: string;
    apiUrl?: string;
  };
}

export interface ZoteroProcessResponse {
  success: boolean;
  method?: string;
  translator?: string;
  itemCount?: number;
  timestamp?: string;
  items?: ZoteroProcessedItem[];
  duplicateInfo?: {
    processed: boolean;
    duplicateCount: number;
    existingItem?: boolean;
    message?: string;
    identifierInfo?: {
      identifier: string;
      identifierType: string;
      identifierValue: string;
    };
    urlInfo?: {
      url: string;
      normalizedUrl: string;
    };
  };
  qualityControl?: {
    itemsValidated: number;
    itemsRejected: number;
    rejectionReasons?: string[];
  };
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
}

/**
 * Zotero API Error
 */
export class ZoteroApiError extends Error {
  code?: number;
  
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'ZoteroApiError';
    this.code = code;
  }
}

/**
 * Call Zotero endpoint with timeout and error handling
 */
async function callZoteroEndpoint(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<ZoteroProcessResponse> {
  const url = `${ZOTERO_API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Parse response
    const data: ZoteroProcessResponse = await response.json();
    
    // Check for success
    if (!data.success) {
      throw new ZoteroApiError(
        data.error?.message || 'Unknown Zotero API error',
        data.error?.code || response.status
      );
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ZoteroApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ZoteroApiError('Request timeout - Zotero processing took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      throw new ZoteroApiError(error.message);
    }
    
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Process identifier through Zotero
 */
export async function processIdentifier(identifier: string): Promise<ZoteroProcessResponse> {
  return callZoteroEndpoint('/citationlinker/processidentifier', { identifier });
}

/**
 * Process URL through Zotero
 */
export async function processUrl(url: string): Promise<ZoteroProcessResponse> {
  return callZoteroEndpoint('/citationlinker/processurl', { url });
}

/**
 * Delete item from Zotero library
 */
export interface ZoteroDeleteResponse {
  success: boolean;
  timestamp?: string;
  deleted?: boolean;
  itemKey?: string;
  itemInfo?: {
    key: string;
    title?: string;
    itemType?: string;
  };
  message?: string;
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
}

export async function deleteItem(itemKey: string): Promise<ZoteroDeleteResponse> {
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/deleteitem`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemKey }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data: ZoteroDeleteResponse = await response.json();
    
    if (!data.success) {
      throw new ZoteroApiError(
        data.error?.message || 'Failed to delete item from Zotero',
        data.error?.code || response.status
      );
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ZoteroApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ZoteroApiError('Request timeout - Zotero deletion took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      throw new ZoteroApiError(error.message);
    }
    
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Extract item key from Zotero response
 */
export function extractItemKey(response: ZoteroProcessResponse): string | null {
  if (!response.items || response.items.length === 0) {
    return null;
  }
  
  const firstItem = response.items[0];
  return firstItem.key || firstItem._meta?.itemKey || null;
}

/**
 * Determine if response represents an existing item
 */
export function isExistingItem(response: ZoteroProcessResponse): boolean {
  return response.method === 'existing_item' || 
         response.duplicateInfo?.existingItem === true;
}

/**
 * Get user-friendly error message from Zotero error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ZoteroApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Zotero item metadata response from /citationlinker/item endpoint
 * This is what getItem() returns
 */
export interface ZoteroItemResponse {
  success: boolean;
  timestamp?: string;
  
  // Item identity
  key?: string;
  version?: number;
  itemType?: string;
  libraryID?: number;
  
  // Timestamps
  dateAdded?: string;
  dateModified?: string;
  
  // Field data (numeric field IDs as per Zotero schema)
  // Field 1 = title, Field 6 = date, etc.
  fields?: Record<string, string>;
  
  // Creators
  creators?: ZoteroCreator[];
  
  // Tags
  tags?: Array<{
    tag: string;
    type: 0 | 1;
  }>;
  
  // Collections and relations
  collections?: string[];
  relations?: Record<string, unknown>;
  
  // Attachments
  attachments?: Array<{
    key: string;
    title: string;
    contentType: string;
    path: string;
    linkMode: number;
  }>;
  
  // Notes
  notes?: Array<{
    key: string;
    note: string;
  }>;
  
  // Convenience fields (may be present)
  title?: string;
  
  // Citation output
  citation?: string;
  citationFormat?: string;
  citationStyle?: string;
  
  // URLs
  apiURL?: string;
  webURL?: string;
  
  // Response metadata
  message?: string;
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
}

/**
 * Get Zotero item metadata by key
 */
export async function getItem(itemKey: string): Promise<ZoteroItemResponse> {
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/item?key=${encodeURIComponent(itemKey)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data: ZoteroItemResponse = await response.json();
    
    if (!data.success) {
      throw new ZoteroApiError(
        data.error?.message || 'Failed to retrieve item from Zotero',
        data.error?.code || response.status
      );
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ZoteroApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ZoteroApiError('Request timeout - Zotero item retrieval took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      throw new ZoteroApiError(error.message);
    }
    
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Citation validation status
 */
export type CitationValidationStatus = 'valid' | 'incomplete';

/**
 * Citation validation result
 */
export interface CitationValidationResult {
  status: CitationValidationStatus;
  missingFields: string[];
  hasTitle: boolean;
  hasCreators: boolean;
  hasDate: boolean;
}

/**
 * Validate citation completeness from Zotero item metadata
 * 
 * A citation is valid if it has:
 * - Title (field 1 or title property)
 * - At least one creator (author)
 * - Date (field 6)
 */
export function validateCitation(itemMetadata: ZoteroItemResponse): CitationValidationResult {
  const missingFields: string[] = [];
  
  // Check title (field 1 is title)
  const title = itemMetadata.fields?.['1'] || itemMetadata.title || '';
  const hasTitle = title.trim().length > 0 && 
                   !['Untitled', 'No title', 'Unknown'].includes(title.trim());
  
  if (!hasTitle) {
    missingFields.push('title');
  }
  
  // Check creators
  const hasCreators = !!(itemMetadata.creators && 
                     itemMetadata.creators.length > 0 &&
                     itemMetadata.creators.some(creator => {
                       const name = creator.name || 
                                   `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
                       return name.length > 0;
                     }));
  
  if (!hasCreators) {
    missingFields.push('creators');
  }
  
  // Check date (field 6 is date)
  const date = itemMetadata.fields?.['6'] || '';
  const hasDate = date.trim().length > 0;
  
  if (!hasDate) {
    missingFields.push('date');
  }
  
  return {
    status: missingFields.length === 0 ? 'valid' : 'incomplete',
    missingFields,
    hasTitle,
    hasCreators,
    hasDate,
  };
}

/**
 * Update Zotero item metadata
 */
export interface ZoteroUpdateResponse {
  success: boolean;
  timestamp?: string;
  key?: string;
  version?: number;
  message?: string;
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
}

export async function updateItem(
  itemKey: string,
  metadata: Partial<ZoteroItem>
): Promise<ZoteroUpdateResponse> {
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/updateitem`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemKey, metadata }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data: ZoteroUpdateResponse = await response.json();
    
    if (!data.success) {
      throw new ZoteroApiError(
        data.error?.message || 'Failed to update item in Zotero',
        data.error?.code || response.status
      );
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ZoteroApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ZoteroApiError('Request timeout - Zotero update took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      throw new ZoteroApiError(error.message);
    }
    
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Create Zotero item
 */
export interface ZoteroCreateResponse {
  success: boolean;
  timestamp?: string;
  successful?: {
    [key: string]: {
      key: string;
      version?: number;
      itemType?: string;
      title?: string;
    };
  };
  failed?: {
    [key: string]: {
      code: number;
      message: string;
    };
  };
  message?: string;
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
}

export async function createItem(
  metadata: ZoteroItem
): Promise<ZoteroCreateResponse> {
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/createitem`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data: ZoteroCreateResponse = await response.json();
    
    if (!data.success) {
      throw new ZoteroApiError(
        data.error?.message || 'Failed to create item in Zotero',
        data.error?.code || response.status
      );
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof ZoteroApiError) {
      throw error;
    }
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ZoteroApiError('Request timeout - Zotero creation took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      throw new ZoteroApiError(error.message);
    }
    
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Get Zotero web URL for an item
 */
export function getZoteroWebUrl(itemKey: string, userId?: string): string {
  const userIdValue = userId || process.env.ZOTERO_USER_ID || '';
  
  if (!userIdValue) {
    return `https://www.zotero.org/`;
  }
  
  return `https://www.zotero.org/users/${userIdValue}/items/${itemKey}`;
}

