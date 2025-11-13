/**
 * Content Fetcher Module
 * 
 * Handles downloading URL content with:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Size limit enforcement
 * - Redirect following
 * - Error classification
 */

import { createHash } from 'crypto';

// Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const PDF_TIMEOUT = 60000; // 60 seconds for PDFs
const MAX_SIZE_HTML = 10 * 1024 * 1024; // 10MB
const MAX_SIZE_PDF = 50 * 1024 * 1024; // 50MB
const MAX_REDIRECTS = 5;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface FetchContentOptions {
  maxRedirects?: number;
  timeout?: number;
  maxSize?: number;
  userAgent?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface FetchContentResult {
  success: boolean;
  content?: Buffer;
  contentType: string;
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  headers: Record<string, string>;
  size: number;
  fetchDuration: number;
  error?: string;
  errorCode?: string;
}

export enum FetchErrorCode {
  TIMEOUT = 'FETCH_TIMEOUT',
  NETWORK_ERROR = 'FETCH_NETWORK_ERROR',
  HTTP_404 = 'FETCH_404',
  HTTP_403 = 'FETCH_403',
  HTTP_500 = 'FETCH_500',
  SIZE_EXCEEDED = 'CONTENT_TOO_LARGE',
  INVALID_CONTENT = 'CONTENT_INVALID_TYPE',
  REDIRECT_LOOP = 'FETCH_REDIRECT_LOOP',
  SSL_ERROR = 'FETCH_SSL_ERROR',
}

/**
 * Fetch URL content with comprehensive error handling
 */
export async function fetchUrlContent(
  url: string,
  options: FetchContentOptions = {}
): Promise<FetchContentResult> {
  const startTime = Date.now();
  const redirectChain: string[] = [url];
  
  const {
    maxRedirects = MAX_REDIRECTS,
    timeout = DEFAULT_TIMEOUT,
    maxSize = MAX_SIZE_HTML,
    userAgent = USER_AGENT,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;
  
  // First, do a HEAD request to check size and content type
  let headResult: FetchContentResult | null = null;
  try {
    headResult = await performHeadRequest(url, timeout, userAgent);
    
    // Check if content is too large
    if (headResult.size > 0 && headResult.size > maxSize) {
      return {
        success: false,
        error: `Content too large: ${formatBytes(headResult.size)} exceeds ${formatBytes(maxSize)}`,
        errorCode: FetchErrorCode.SIZE_EXCEEDED,
        contentType: headResult.contentType,
        finalUrl: url,
        statusCode: headResult.statusCode,
        redirectChain,
        headers: headResult.headers,
        size: headResult.size,
        fetchDuration: Date.now() - startTime,
      };
    }
  } catch (error) {
    // HEAD request failed, continue with GET (some servers don't support HEAD)
    console.warn(`HEAD request failed for ${url}, proceeding with GET:`, error);
  }
  
  // Perform the actual GET request
  try {
    const result = await performGetRequest(
      url,
      timeout,
      userAgent,
      maxSize,
      maxRedirects,
      redirectChain
    );
    
    return {
      ...result,
      fetchDuration: Date.now() - startTime,
    };
  } catch (error) {
    // Classify error
    const errorInfo = classifyFetchError(error);
    
    return {
      success: false,
      error: errorInfo.message,
      errorCode: errorInfo.code,
      contentType: headResult?.contentType || 'unknown',
      finalUrl: url,
      statusCode: headResult?.statusCode || 0,
      redirectChain,
      headers: headResult?.headers || {},
      size: 0,
      fetchDuration: Date.now() - startTime,
    };
  }
}

/**
 * Perform HEAD request to check size and content type
 */
async function performHeadRequest(
  url: string,
  timeout: number,
  userAgent: string
): Promise<FetchContentResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': userAgent,
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const contentType = response.headers.get('content-type') || 'unknown';
    
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    return {
      success: true,
      contentType,
      finalUrl: response.url,
      statusCode: response.status,
      redirectChain: [url, response.url],
      headers,
      size: contentLength,
      fetchDuration: 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Perform GET request with streaming and size checking
 */
async function performGetRequest(
  url: string,
  timeout: number,
  userAgent: string,
  maxSize: number,
  maxRedirects: number,
  redirectChain: string[]
): Promise<FetchContentResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    // Check status code
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || 'unknown';
    
    // Get headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Stream the response with size checking
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is null');
    }
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      totalSize += value.length;
      
      // Check size limit
      if (totalSize > maxSize) {
        reader.cancel();
        throw new Error(`Content size exceeded limit: ${formatBytes(totalSize)} > ${formatBytes(maxSize)}`);
      }
      
      chunks.push(value);
    }
    
    // Combine chunks into single buffer
    const content = Buffer.concat(chunks);
    
    return {
      success: true,
      content,
      contentType,
      finalUrl: response.url,
      statusCode: response.status,
      redirectChain: response.url !== url ? [...redirectChain, response.url] : redirectChain,
      headers,
      size: totalSize,
      fetchDuration: 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Classify fetch error into specific error codes
 */
function classifyFetchError(error: any): { code: FetchErrorCode; message: string } {
  const message = error?.message || String(error);
  
  // Timeout
  if (error.name === 'AbortError' || message.includes('timeout')) {
    return {
      code: FetchErrorCode.TIMEOUT,
      message: 'Request timed out',
    };
  }
  
  // Network errors
  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return {
      code: FetchErrorCode.NETWORK_ERROR,
      message: 'Network error: Cannot connect to server',
    };
  }
  
  // SSL errors
  if (message.includes('certificate') || message.includes('SSL')) {
    return {
      code: FetchErrorCode.SSL_ERROR,
      message: 'SSL certificate error',
    };
  }
  
  // HTTP errors
  if (message.includes('HTTP 404')) {
    return {
      code: FetchErrorCode.HTTP_404,
      message: 'URL not found (404)',
    };
  }
  
  if (message.includes('HTTP 403')) {
    return {
      code: FetchErrorCode.HTTP_403,
      message: 'Access forbidden (403)',
    };
  }
  
  if (message.includes('HTTP 5')) {
    return {
      code: FetchErrorCode.HTTP_500,
      message: 'Server error (5xx)',
    };
  }
  
  // Size exceeded
  if (message.includes('exceeded limit')) {
    return {
      code: FetchErrorCode.SIZE_EXCEEDED,
      message,
    };
  }
  
  // Too many redirects
  if (message.includes('redirect')) {
    return {
      code: FetchErrorCode.REDIRECT_LOOP,
      message: 'Too many redirects',
    };
  }
  
  // Generic error
  return {
    code: FetchErrorCode.NETWORK_ERROR,
    message: message || 'Unknown fetch error',
  };
}

/**
 * Calculate SHA-256 hash of content
 */
export function calculateContentHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Detect content type from buffer and headers
 */
export function detectContentType(
  content: Buffer,
  headers: Record<string, string>
): string {
  // First check header
  const headerContentType = headers['content-type'];
  if (headerContentType) {
    return headerContentType.split(';')[0].trim();
  }
  
  // Check magic numbers
  const magic = content.slice(0, 8);
  
  // PDF: %PDF
  if (magic.toString('utf8', 0, 4) === '%PDF') {
    return 'application/pdf';
  }
  
  // HTML: <!DOCTYPE, <html, <HTML
  const start = content.toString('utf8', 0, 100).toLowerCase();
  if (start.includes('<!doctype') || start.includes('<html')) {
    return 'text/html';
  }
  
  // XML
  if (start.startsWith('<?xml')) {
    return 'application/xml';
  }
  
  return 'application/octet-stream';
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: FetchErrorCode[];
  }
): Promise<T> {
  let lastError: any;
  let delay = options.initialDelay;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const errorInfo = classifyFetchError(error);
      if (!options.retryableErrors.includes(errorInfo.code)) {
        throw error;
      }
      
      // Last attempt - don't delay
      if (attempt === options.maxAttempts) {
        break;
      }
      
      // Wait before retry
      await sleep(delay);
      
      // Exponential backoff
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(errorCode: FetchErrorCode): boolean {
  const retryableCodes = [
    FetchErrorCode.TIMEOUT,
    FetchErrorCode.NETWORK_ERROR,
    FetchErrorCode.HTTP_500,
  ];
  return retryableCodes.includes(errorCode);
}

/**
 * Get timeout for content type
 */
export function getTimeoutForContentType(contentType: string): number {
  if (contentType.includes('pdf')) {
    return PDF_TIMEOUT;
  }
  return DEFAULT_TIMEOUT;
}

/**
 * Get max size for content type
 */
export function getMaxSizeForContentType(contentType: string): number {
  if (contentType.includes('pdf')) {
    return MAX_SIZE_PDF;
  }
  return MAX_SIZE_HTML;
}

