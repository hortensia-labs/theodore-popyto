/**
 * Zotero API Client
 * 
 * Handles communication with the local Zotero Citation Linker API
 */

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';
const ZOTERO_REQUEST_TIMEOUT = parseInt(process.env.ZOTERO_REQUEST_TIMEOUT || '60000');

/**
 * Get the Zotero user ID from environment variable
 * Defaults to '0' if not set (local library)
 */
function getZoteroUserId(): string {
  return process.env.ZOTERO_USER_ID || '0';
}

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
  const startTime = Date.now();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 ZOTERO API CALL START');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🎯 Endpoint:', endpoint);
  console.log('🌐 Full URL:', url);
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  console.log('⏱️  Timeout:', `${ZOTERO_REQUEST_TIMEOUT}ms`);
  
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
    const duration = Date.now() - startTime;
    
    console.log('📡 HTTP Response received');
    console.log('⏱️  Duration:', `${duration}ms`);
    console.log('📊 Status:', response.status, response.statusText);
    console.log('📋 Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    // Parse response
    const data: ZoteroProcessResponse = await response.json();
    
    console.log('📦 Parsed Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check for success
    if (!data.success) {
      console.log('❌ ZOTERO API RETURNED FAILURE');
      console.log('💬 Error message:', data.error?.message);
      console.log('🔢 Error code:', data.error?.code);
      console.log('📍 Method used:', data.method);
      console.log('🔧 Translator:', data.translator);
      console.log('⏱️  Total duration:', `${duration}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      throw new ZoteroApiError(
        data.error?.message || 'Unknown Zotero API error',
        data.error?.code || response.status
      );
    }
    
    console.log('✅ ZOTERO API CALL SUCCESS');
    console.log('📍 Method used:', data.method);
    console.log('🔧 Translator:', data.translator);
    console.log('📚 Item count:', data.itemCount);
    console.log('⏱️  Duration:', `${duration}ms`);
    
    if (data.items && data.items.length > 0) {
      console.log('🔑 Item keys created:');
      data.items.forEach((item, idx) => {
        const key = item.key || item._meta?.itemKey;
        const title = item.title || item._meta?.citation?.substring(0, 60);
        console.log(`   ${idx + 1}. ${key} - ${title}`);
      });
    }
    
    if (data.duplicateInfo) {
      console.log('🔄 Duplicate info:', JSON.stringify(data.duplicateInfo, null, 2));
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    console.log('💥 ZOTERO API CALL EXCEPTION');
    console.log('⏱️  Duration before error:', `${duration}ms`);
    console.log('🏷️  Error type:', error?.constructor?.name || 'Unknown');
    
    if (error instanceof ZoteroApiError) {
      console.log('❌ ZoteroApiError caught');
      console.log('💬 Message:', error.message);
      console.log('🔢 Code:', error.code);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
    
    if (error instanceof Error) {
      console.log('⚠️  JavaScript Error');
      console.log('📛 Name:', error.name);
      console.log('💬 Message:', error.message);
      console.log('📜 Stack trace:');
      console.log(error.stack);
      
      if (error.name === 'AbortError') {
        console.log('⏱️  Request TIMEOUT after', `${ZOTERO_REQUEST_TIMEOUT}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError('Request timeout - Zotero processing took too long', 504);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        console.log('🔌 CONNECTION REFUSED - Zotero not running or Citation Linker not active');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running with Citation Linker plugin',
          503
        );
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(error.message);
    }
    
    console.log('❓ UNKNOWN error type');
    console.log('🔍 Error object:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Process identifier through Zotero
 */
export async function processIdentifier(identifier: string): Promise<ZoteroProcessResponse> {
  console.log('🔷 processIdentifier() called with:', identifier);
  try {
    const result = await callZoteroEndpoint('/citationlinker/processidentifier', { identifier });
    console.log('🔷 processIdentifier() completed successfully');
    return result;
  } catch (error) {
    console.log('🔷 processIdentifier() threw error:', error);
    throw error;
  }
}

/**
 * Process URL through Zotero
 */
export async function processUrl(url: string): Promise<ZoteroProcessResponse> {
  console.log('🔶 processUrl() called with:', url);
  try {
    const result = await callZoteroEndpoint('/citationlinker/processurl', { url });
    console.log('🔶 processUrl() completed successfully');
    return result;
  } catch (error) {
    console.log('🔶 processUrl() threw error:', error);
    throw error;
  }
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
 *
 * Uses the Local API: GET /api/users/:userID/items/:itemKey
 * This is more reliable than the Citation Linker endpoint for item retrieval.
 *
 * See: HTTP_ZOTERO_SERVER_API.md - Local API Endpoints, Items section (line 882)
 */
export async function getItem(itemKey: string): Promise<ZoteroItemResponse> {
  const userId = getZoteroUserId();
  const url = `${ZOTERO_API_BASE_URL}/api/users/${userId}/items/${encodeURIComponent(itemKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);

  try {
    console.log('🔷 getItem() called for key:', itemKey);
    console.log('📍 Using Local API endpoint:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Zotero-API-Version': '3',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log('📊 HTTP Response status:', response.status, response.statusText);

    // Local API returns JSON with the item data directly
    const data = await response.json();

    console.log('📦 Item data received:', JSON.stringify(data, null, 2));

    // Handle success - Local API returns the item data directly when successful
    if (response.ok && data.data) {
      // Transform Local API response to ZoteroItemResponse format
      const itemResponse: ZoteroItemResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        key: data.key,
        version: data.version,
        itemType: data.data.itemType,
        libraryID: data.library?.id,
        dateAdded: data.dateAdded,
        dateModified: data.dateModified,
        title: data.data.title,
        fields: data.data, // Store full data fields
        creators: data.data.creators,
        tags: data.data.tags,
        collections: data.data.collections,
        relations: data.data.relations,
      };

      console.log('✅ getItem() success for key:', itemKey);
      return itemResponse;
    }

    // Handle 404 - item not found
    if (response.status === 404) {
      console.log('❌ Item not found:', itemKey);
      throw new ZoteroApiError('Item not found in Zotero library', 404);
    }

    // Handle other errors
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status);
      throw new ZoteroApiError(
        `Failed to retrieve item from Zotero (HTTP ${response.status})`,
        response.status
      );
    }

    // Unexpected state
    console.log('❌ Unexpected response structure');
    throw new ZoteroApiError('Unexpected response from Zotero API', response.status);

  } catch (error) {
    clearTimeout(timeoutId);

    console.log('💥 getItem() exception');

    if (error instanceof ZoteroApiError) {
      console.log('❌ ZoteroApiError:', error.message);
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('⏱️  Request timeout');
        throw new ZoteroApiError('Request timeout - Zotero item retrieval took too long', 504);
      }

      if (error.message.includes('ECONNREFUSED')) {
        console.log('🔌 Connection refused - Zotero not running');
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running',
          503
        );
      }

      console.log('⚠️  Error:', error.message);
      throw new ZoteroApiError(error.message);
    }

    console.log('❓ Unknown error');
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
 *
 * Uses the Citation Linker Edit Item endpoint (POST /citationlinker/edititem)
 * This endpoint supports updating fields, creators, tags, collections, and relations
 * See: docs/zotero/ZOTERO_EDIT_ITEM_ENDPOINT.md
 */
export interface ZoteroUpdateResponse {
  success: boolean;
  timestamp?: string;
  key?: string;
  itemKey?: string;
  itemType?: string;
  title?: string;
  version?: number;
  dateModified?: string;
  updatedFields?: string[];
  message?: string;
  warnings?: string[];
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
  };
  data?: {
    errors?: string[];
  };
}

export async function updateItem(
  itemKey: string,
  metadata: Partial<ZoteroItem>
): Promise<ZoteroUpdateResponse> {
  // Use Citation Linker Edit Item endpoint for updates
  // Endpoint: POST /citationlinker/edititem
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/edititem`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 ZOTERO UPDATE ITEM - CITATION LINKER ENDPOINT');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🎯 Endpoint: POST /citationlinker/edititem');
    console.log('🔑 Item Key:', itemKey);
    console.log('🌐 Full URL:', url);
    console.log('📦 Metadata to update:', JSON.stringify(metadata, null, 2));

    // Construct the update payload for the citation linker endpoint
    // Map metadata fields to the endpoint's expected format
    const payload: any = {
      itemKey: itemKey,
      fields: {},
    };

    // Map standard ZoteroItem fields to the fields object
    if (metadata.title !== undefined) payload.fields.title = metadata.title;
    if (metadata.url !== undefined) payload.fields.url = metadata.url;
    if (metadata.DOI !== undefined) payload.fields.DOI = metadata.DOI;
    if (metadata.abstractNote !== undefined) payload.fields.abstractNote = metadata.abstractNote;
    if (metadata.date !== undefined) payload.fields.date = metadata.date;
    if (metadata.publicationTitle !== undefined) payload.fields.publicationTitle = metadata.publicationTitle;
    if (metadata.volume !== undefined) payload.fields.volume = metadata.volume;
    if (metadata.issue !== undefined) payload.fields.issue = metadata.issue;
    if (metadata.pages !== undefined) payload.fields.pages = metadata.pages;
    if (metadata.language !== undefined) payload.fields.language = metadata.language;
    if (metadata.rights !== undefined) payload.fields.rights = metadata.rights;
    if (metadata.accessDate !== undefined) payload.fields.accessDate = metadata.accessDate;

    // Handle creators if present
    if (metadata.creators && Array.isArray(metadata.creators) && metadata.creators.length > 0) {
      payload.creators = metadata.creators;
    }

    // Handle tags if present
    if (metadata.tags && Array.isArray(metadata.tags) && metadata.tags.length > 0) {
      payload.tags = metadata.tags;
    }

    // Handle collections if present
    if (metadata.collections && Array.isArray(metadata.collections) && metadata.collections.length > 0) {
      payload.collections = metadata.collections;
    }

    // Handle relations if present
    if (metadata.relations && typeof metadata.relations === 'object') {
      payload.relations = metadata.relations;
    }

    // Validate that at least one field to update was provided
    const hasFields = Object.keys(payload.fields).length > 0;
    const hasOtherData = payload.creators || payload.tags || payload.collections || payload.relations;

    if (!hasFields && !hasOtherData) {
      console.log('⚠️  No update fields provided');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(
        'At least one of fields, creators, tags, collections, or relations must be provided',
        400
      );
    }

    console.log('📤 Sending update with payload:', JSON.stringify(payload, null, 2));

    // Send the update request to the citation linker endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 HTTP Response received');
    console.log('📊 Status:', response.status, response.statusText);

    // Parse response
    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      responseData = {};
    }

    console.log('📦 Response data:', JSON.stringify(responseData, null, 2));

    // Handle success response (200 OK)
    if (response.status === 200) {
      if (responseData.success === true) {
        console.log('✅ UPDATE SUCCESS');
        console.log('🔄 Updated fields:', responseData.updatedFields?.join(', ') || 'none');
        if (responseData.warnings && responseData.warnings.length > 0) {
          console.log('⚠️  Warnings:', responseData.warnings.join('; '));
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return {
          success: true,
          itemKey: responseData.itemKey || itemKey,
          itemType: responseData.itemType,
          title: responseData.title,
          version: responseData.version,
          dateModified: responseData.dateModified,
          updatedFields: responseData.updatedFields,
          message: responseData.message,
          warnings: responseData.warnings,
          timestamp: responseData.timestamp || new Date().toISOString(),
        };
      }
    }

    // Handle error responses
    if (response.status === 400) {
      const errorMessage = responseData.error?.message || 'Bad request - invalid payload';
      console.log('❌ UPDATE FAILED (400 Bad Request)');
      console.log('💬 Error:', errorMessage);
      if (responseData.data?.errors) {
        console.log('🔍 Validation errors:', responseData.data.errors.join('; '));
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(errorMessage, 400);
    }

    if (response.status === 403) {
      const errorMessage = responseData.error?.message || 'Library is not editable';
      console.log('❌ UPDATE FAILED (403 Forbidden)');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(errorMessage, 403);
    }

    if (response.status === 404) {
      const errorMessage = responseData.error?.message || `Item with key ${itemKey} not found`;
      console.log('❌ UPDATE FAILED (404 Not Found)');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(errorMessage, 404);
    }

    if (response.status === 500) {
      const errorMessage = responseData.error?.message || 'Server error while updating item';
      console.log('❌ UPDATE FAILED (500 Internal Server Error)');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(errorMessage, 500);
    }

    // Handle any other non-success response
    if (!response.ok) {
      let errorMessage = `Failed to update item: ${response.statusText}`;
      if (responseData.error?.message) {
        errorMessage = responseData.error.message;
      } else if (responseData.message) {
        errorMessage = responseData.message;
      }

      console.log('❌ UPDATE FAILED');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new ZoteroApiError(errorMessage, response.status);
    }

    // If we get here with a 200 response but success !== true
    console.log('❌ UPDATE FAILED - Unexpected response');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw new ZoteroApiError('Update failed - unexpected response from server', response.status);
  } catch (error) {
    clearTimeout(timeoutId);

    console.log('💥 UPDATE EXCEPTION');
    console.log('🏷️  Error type:', error?.constructor?.name || 'Unknown');

    if (error instanceof ZoteroApiError) {
      console.log('❌ ZoteroApiError');
      console.log('💬 Message:', error.message);
      console.log('🔢 Code:', error.code);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }

    if (error instanceof Error) {
      console.log('⚠️  JavaScript Error');
      console.log('💬 Message:', error.message);

      if (error.name === 'AbortError') {
        console.log('⏱️  Request TIMEOUT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError('Request timeout - Zotero update took too long', 504);
      }

      if (error.message.includes('ECONNREFUSED')) {
        console.log('🔌 CONNECTION REFUSED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running',
          503
        );
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(error.message);
    }

    console.log('❓ UNKNOWN error type');
    console.log('🔍 Error object:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━');
    throw new ZoteroApiError('Unknown error occurred');
  }
}

/**
 * Create Zotero item
 *
 * Uses the Zotero Connector API (POST /connector/saveItems)
 * See: docs/zotero/HTTP_ZOTERO_SERVER_API.md, Connector API section
 *
 * The Connector API requires:
 * - A session ID for tracking the save operation
 * - Items wrapped in an array
 * - URI field for the source URL
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

/**
 * Generate a unique session ID for Connector API
 */
function generateSessionId(): string {
  return `theodore-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function createItem(
  metadata: ZoteroItem
): Promise<ZoteroCreateResponse> {
  // Use Zotero Connector API for item creation
  // Endpoint: POST /connector/saveItems
  const sessionID = generateSessionId();
  const userId = getZoteroUserId();
  const url = `${ZOTERO_API_BASE_URL}/connector/saveItems`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 ZOTERO CREATE ITEM - CONNECTOR API');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🎯 Endpoint: POST /connector/saveItems');
    console.log('🔑 Session ID:', sessionID);
    console.log('🌐 Full URL:', url);
    console.log('📦 Item metadata:', JSON.stringify(metadata, null, 2));

    // Prepare the Connector API payload
    // The Connector API expects items in a specific format
    const connectorPayload = {
      sessionID,
      uri: metadata.url || 'https://example.com', // Required by Connector API
      items: [
        {
          itemType: metadata.itemType || 'webpage',
          title: metadata.title || 'Untitled',
          creators: metadata.creators || [],
          url: metadata.url,
          accessDate: metadata.accessDate,
          date: metadata.date,
          abstractNote: metadata.abstractNote,
          publicationTitle: metadata.publicationTitle,
          journalAbbreviation: metadata.journalAbbreviation,
          volume: metadata.volume,
          issue: metadata.issue,
          pages: metadata.pages,
          numPages: metadata.numPages,
          publisher: metadata.publisher,
          place: metadata.place,
          edition: metadata.edition,
          language: metadata.language,
          rights: metadata.rights,
          series: metadata.series,
          seriesNumber: metadata.seriesNumber,
          seriesTitle: metadata.seriesTitle,
          websiteTitle: metadata.websiteTitle,
          websiteType: metadata.websiteType,
          bookTitle: metadata.bookTitle,
          thesisType: metadata.thesisType,
          university: metadata.university,
          conferenceName: metadata.conferenceName,
          proceedingsTitle: metadata.proceedingsTitle,
          archive: metadata.archive,
          archiveLocation: metadata.archiveLocation,
          libraryCatalog: metadata.libraryCatalog,
          callNumber: metadata.callNumber,
          shortTitle: metadata.shortTitle,
          extra: metadata.extra,
          DOI: metadata.DOI,
          ISBN: metadata.ISBN,
          ISSN: metadata.ISSN,
          tags: metadata.tags,
          collections: metadata.collections,
          relations: metadata.relations,
        },
      ],
    };

    console.log('📤 Connector API payload:', JSON.stringify(connectorPayload, null, 2));

    // Send the create request via Connector API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zotero-Connector-API-Version': '3',
      },
      body: JSON.stringify(connectorPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 HTTP Response received');
    console.log('📊 Status:', response.status, response.statusText);

    // Handle different response codes
    if (response.status === 201) {
      // 201 Created = success
      console.log('✅ CREATE SUCCESS (201 Created)');

      // Strategy: Use Zotero Local API to find the most recently added item
      // This is more reliable than URL lookup since URL might not be unique
      // or the item might not be indexed yet

      console.log('🔍 Retrieving item key via Local API (most recent item)...');

      // Wait a moment for Zotero to fully process the item
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        // Query for recently added items, sorted by dateAdded descending
        const recentItemsResponse = await fetch(
          `${ZOTERO_API_BASE_URL}/api/users/${userId}/items?sort=dateAdded&direction=desc&limit=1`,
          {
            method: 'GET',
            headers: {
              'Zotero-API-Version': '3',
            },
          }
        );

        if (recentItemsResponse.ok) {
          const items = await recentItemsResponse.json();

          if (Array.isArray(items) && items.length > 0) {
            const mostRecentItem = items[0];
            const itemKey = mostRecentItem.key;

            // Verify this item matches what we just created by comparing title
            const itemTitle = mostRecentItem.data?.title || '';
            const expectedTitle = metadata.title || 'Untitled';

            if (itemTitle === expectedTitle || !metadata.title) {
              console.log('🔑 Item key retrieved from most recent item:', itemKey);
              console.log('📋 Title match:', itemTitle);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

              return {
                success: true,
                successful: {
                  '0': {
                    key: itemKey,
                    version: mostRecentItem.version,
                    itemType: mostRecentItem.data?.itemType || metadata.itemType || 'webpage',
                    title: itemTitle,
                  },
                },
                timestamp: new Date().toISOString(),
              };
            } else {
              console.log('⚠️  Title mismatch - might be wrong item');
              console.log('   Expected:', expectedTitle);
              console.log('   Got:', itemTitle);
            }
          }
        }
      } catch (apiError) {
        console.log('⚠️  Local API query failed:', apiError);
      }

      // Fallback: Try URL-based lookup if we have a URL
      if (metadata.url) {
        console.log('🔍 Trying URL-based lookup as fallback...');

        try {
          const itemKeyResponse = await fetch(
            `${ZOTERO_API_BASE_URL}/citationlinker/itemkeybyurl`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: metadata.url }),
            }
          );

          if (itemKeyResponse.ok) {
            const itemKeyData = await itemKeyResponse.json();
            if (itemKeyData.found && itemKeyData.itemKey) {
              console.log('🔑 Item key retrieved via URL lookup:', itemKeyData.itemKey);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

              return {
                success: true,
                successful: {
                  '0': {
                    key: itemKeyData.itemKey,
                    itemType: metadata.itemType || 'webpage',
                    title: metadata.title,
                  },
                },
                timestamp: new Date().toISOString(),
              };
            }
          }
        } catch (lookupError) {
          console.log('⚠️  URL lookup also failed:', lookupError);
        }
      }

      // Last resort: Error out instead of returning without key
      console.log('❌ CRITICAL: Could not retrieve item key after creation');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new ZoteroApiError(
        'Item created in Zotero but could not retrieve item key. Please check Zotero manually.',
        500
      );
    }

    if (response.status === 409) {
      // 409 Conflict = session already exists or duplicate
      const errorText = await response.text();
      console.log('⚠️  CREATE CONFLICT (409)');
      console.log('💬 Response:', errorText);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new ZoteroApiError(
        'Session conflict or duplicate item detected',
        409
      );
    }

    if (response.status === 500) {
      // 500 Server Error - might be library not editable
      let errorMessage = 'Server error creating item';
      try {
        const errorData = await response.json();
        if (errorData.libraryEditable === false) {
          errorMessage = 'Library is not editable (read-only)';
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Ignore JSON parse errors
      }

      console.log('❌ CREATE FAILED (500)');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new ZoteroApiError(errorMessage, 500);
    }

    if (!response.ok) {
      let errorMessage = `Failed to create item: ${response.statusText}`;
      try {
        const errorData = await response.text();
        if (errorData) {
          errorMessage = errorData;
        }
      } catch {
        // Ignore parse errors
      }

      console.log('❌ CREATE FAILED');
      console.log('💬 Error:', errorMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new ZoteroApiError(errorMessage, response.status);
    }

    // Unexpected success response
    console.log('⚠️  Unexpected response status:', response.status);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    console.log('💥 CREATE EXCEPTION');
    console.log('🏷️  Error type:', error?.constructor?.name || 'Unknown');

    if (error instanceof ZoteroApiError) {
      console.log('❌ ZoteroApiError');
      console.log('💬 Message:', error.message);
      console.log('🔢 Code:', error.code);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }

    if (error instanceof Error) {
      console.log('⚠️  JavaScript Error');
      console.log('💬 Message:', error.message);

      if (error.name === 'AbortError') {
        console.log('⏱️  Request TIMEOUT');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError('Request timeout - Zotero creation took too long', 504);
      }

      if (error.message.includes('ECONNREFUSED')) {
        console.log('🔌 CONNECTION REFUSED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        throw new ZoteroApiError(
          'Cannot connect to Zotero - ensure Zotero is running',
          503
        );
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new ZoteroApiError(error.message);
    }

    console.log('❓ UNKNOWN error type');
    console.log('🔍 Error object:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

