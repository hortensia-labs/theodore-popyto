/**
 * Error Handling & Recovery
 * 
 * Comprehensive error classification and recovery strategies
 * Enhanced with new error categorization system for URL processing
 */

import type { FetchErrorCode } from './content-fetcher';
import type { ErrorCategory, ProcessingError as NewProcessingError } from './types/url-processing';

export enum ErrorSeverity {
  RECOVERABLE = 'recoverable',   // Can retry automatically
  TEMPORARY = 'temporary',        // Try again later
  PERMANENT = 'permanent',        // User intervention needed
  FATAL = 'fatal',               // System error
}

export interface ProcessingError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  retryDelay?: number; // milliseconds
  userAction?: string; // What user should do
  context?: Record<string, any>;
}

/**
 * Error catalog with detailed information
 */
export const ERROR_CATALOG: Record<string, ProcessingError> = {
  // Network errors
  FETCH_TIMEOUT: {
    code: 'FETCH_TIMEOUT',
    message: 'Request timed out while fetching URL',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: true,
    retryDelay: 5000,
  },
  FETCH_NETWORK_ERROR: {
    code: 'FETCH_NETWORK_ERROR',
    message: 'Network error while fetching URL',
    severity: ErrorSeverity.TEMPORARY,
    retryable: true,
    retryDelay: 10000,
  },
  FETCH_404: {
    code: 'FETCH_404',
    message: 'URL not found (404)',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Verify URL is correct',
  },
  FETCH_403: {
    code: 'FETCH_403',
    message: 'Access forbidden (403)',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'URL may require authentication or be restricted',
  },
  FETCH_500: {
    code: 'FETCH_500',
    message: 'Server error (5xx)',
    severity: ErrorSeverity.TEMPORARY,
    retryable: true,
    retryDelay: 30000,
  },
  FETCH_SSL_ERROR: {
    code: 'FETCH_SSL_ERROR',
    message: 'SSL certificate error',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Website has SSL certificate issues',
  },
  FETCH_REDIRECT_LOOP: {
    code: 'FETCH_REDIRECT_LOOP',
    message: 'Too many redirects',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
  },
  
  // Content errors
  CONTENT_TOO_LARGE: {
    code: 'CONTENT_TOO_LARGE',
    message: 'Content exceeds size limit',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Content is too large to process',
  },
  CONTENT_INVALID_TYPE: {
    code: 'CONTENT_INVALID_TYPE',
    message: 'Content type not supported',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Only HTML and PDF content is supported',
  },
  
  // Extraction errors
  EXTRACT_NO_IDENTIFIERS: {
    code: 'EXTRACT_NO_IDENTIFIERS',
    message: 'No identifiers found in content',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: false,
    userAction: 'Check extracted metadata or try LLM extraction',
  },
  EXTRACT_NO_METADATA: {
    code: 'EXTRACT_NO_METADATA',
    message: 'Unable to extract bibliographic metadata',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Manual entry required or try LLM extraction',
  },
  
  // Preview errors
  PREVIEW_TIMEOUT: {
    code: 'PREVIEW_TIMEOUT',
    message: 'Identifier preview timed out',
    severity: ErrorSeverity.TEMPORARY,
    retryable: true,
    retryDelay: 3000,
  },
  PREVIEW_INVALID_IDENTIFIER: {
    code: 'PREVIEW_INVALID_IDENTIFIER',
    message: 'Identifier not recognized by Zotero',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
  },
  PREVIEW_TRANSLATION_FAILED: {
    code: 'PREVIEW_TRANSLATION_FAILED',
    message: 'Zotero could not translate identifier',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Identifier may be invalid or not in Zotero\'s databases',
  },
  
  // Storage errors
  STORE_ZOTERO_OFFLINE: {
    code: 'STORE_ZOTERO_OFFLINE',
    message: 'Cannot connect to Zotero',
    severity: ErrorSeverity.TEMPORARY,
    retryable: true,
    retryDelay: 5000,
    userAction: 'Ensure Zotero is running',
  },
  STORE_LIBRARY_READ_ONLY: {
    code: 'STORE_LIBRARY_READ_ONLY',
    message: 'Zotero library is read-only',
    severity: ErrorSeverity.PERMANENT,
    retryable: false,
    userAction: 'Check Zotero library permissions',
  },
  STORE_ITEM_CREATION_FAILED: {
    code: 'STORE_ITEM_CREATION_FAILED',
    message: 'Failed to create Zotero item',
    severity: ErrorSeverity.RECOVERABLE,
    retryable: true,
    retryDelay: 5000,
  },
};

/**
 * Get error information by code
 */
export function getErrorInfo(code: string): ProcessingError {
  return ERROR_CATALOG[code] || {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    severity: ErrorSeverity.FATAL,
    retryable: false,
  };
}

/**
 * Classify error from exception
 */
export function classifyError(error: any): ProcessingError {
  const message = error?.message || String(error);
  const code = error?.code || error?.errorCode;
  
  // Check if we have error catalog entry
  if (code && ERROR_CATALOG[code]) {
    return ERROR_CATALOG[code];
  }
  
  // Pattern matching
  if (message.includes('timeout')) {
    return ERROR_CATALOG.FETCH_TIMEOUT;
  }
  if (message.includes('404')) {
    return ERROR_CATALOG.FETCH_404;
  }
  if (message.includes('403')) {
    return ERROR_CATALOG.FETCH_403;
  }
  if (message.includes('5')) {
    return ERROR_CATALOG.FETCH_500;
  }
  if (message.includes('SSL') || message.includes('certificate')) {
    return ERROR_CATALOG.FETCH_SSL_ERROR;
  }
  if (message.includes('Zotero') && message.includes('connect')) {
    return ERROR_CATALOG.STORE_ZOTERO_OFFLINE;
  }
  
  // Default unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: message || 'Unknown error',
    severity: ErrorSeverity.FATAL,
    retryable: false,
  };
}

/**
 * Should retry based on error
 */
export function shouldRetry(error: ProcessingError, attemptNumber: number, maxAttempts: number = 3): boolean {
  if (!error.retryable) return false;
  if (attemptNumber >= maxAttempts) return false;
  
  // Don't retry permanent errors
  if (error.severity === ErrorSeverity.PERMANENT || error.severity === ErrorSeverity.FATAL) {
    return false;
  }
  
  return true;
}

/**
 * Get delay before retry
 */
export function getRetryDelay(error: ProcessingError, attemptNumber: number): number {
  const baseDelay = error.retryDelay || 1000;
  
  // Exponential backoff
  return baseDelay * Math.pow(2, attemptNumber - 1);
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: ProcessingError): string {
  let message = error.message;
  
  if (error.userAction) {
    message += `\n\nSuggested action: ${error.userAction}`;
  }
  
  return message;
}

/**
 * Log error with context
 */
export function logError(
  error: ProcessingError,
  context: {
    urlId?: number;
    url?: string;
    state?: string;
    attemptNumber?: number;
  }
): void {
  console.error('[URL Processing Error]', {
    code: error.code,
    message: error.message,
    severity: error.severity,
    retryable: error.retryable,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// NEW: Enhanced Error Categorization System
// ============================================

/**
 * Categorize error for the new processing system
 * Maps errors to categories that determine retry strategy
 */
export function categorizeError(error: unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as any)?.code || (error as any)?.errorCode;
  
  // Check for specific HTTP status codes
  if (code === 404 || message.includes('404') || message.includes('not found')) {
    return 'permanent';
  }
  if (code === 403 || message.includes('403') || message.includes('forbidden')) {
    return 'permanent';
  }
  if (code === 401 || message.includes('401') || message.includes('unauthorized')) {
    return 'permanent';
  }
  if (code === 410 || message.includes('410') || message.includes('gone')) {
    return 'permanent';
  }
  
  // Network errors (retryable)
  if (
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('dns') ||
    message.includes('etimedout')
  ) {
    return 'network';
  }
  
  // Server errors (retryable)
  if (
    code >= 500 ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('server error')
  ) {
    return 'http_server';
  }
  
  // Client errors (not retryable)
  if (code >= 400 && code < 500) {
    return 'http_client';
  }
  
  // Rate limiting
  if (
    code === 429 ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'rate_limit';
  }
  
  // Parsing errors
  if (
    message.includes('parse') ||
    message.includes('invalid json') ||
    message.includes('syntax error') ||
    message.includes('unexpected token')
  ) {
    return 'parsing';
  }
  
  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid identifier') ||
    message.includes('invalid format')
  ) {
    return 'validation';
  }
  
  // Zotero specific errors
  if (
    message.includes('zotero') ||
    message.includes('translation server') ||
    message.includes('connector')
  ) {
    return 'zotero_api';
  }
  
  // Default to unknown
  return 'unknown';
}

/**
 * Check if error is permanent (should not retry)
 */
export function isPermanentError(error: unknown): boolean {
  const category = categorizeError(error);
  return category === 'permanent';
}

/**
 * Check if error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  const category = categorizeError(error);
  return ['network', 'http_server', 'rate_limit', 'zotero_api'].includes(category);
}

/**
 * Get error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Unknown error';
}

/**
 * Create a processing error with category
 */
export function createProcessingError(
  error: unknown,
  context?: Record<string, unknown>
): NewProcessingError {
  const message = getErrorMessage(error);
  const category = categorizeError(error);
  
  return {
    message,
    category,
    code: (error as any)?.code || (error as any)?.errorCode,
    details: context,
    retryable: isRetryableError(error),
  };
}

/**
 * Determine retry delay based on error category
 * Uses exponential backoff for retryable errors
 */
export function getRetryDelayForCategory(
  category: ErrorCategory,
  attemptNumber: number = 1
): number {
  const baseDelays: Record<ErrorCategory, number> = {
    network: 2000,      // 2 seconds base
    http_server: 5000,  // 5 seconds base
    rate_limit: 10000,  // 10 seconds base
    zotero_api: 3000,   // 3 seconds base
    http_client: 0,     // No retry
    parsing: 0,         // No retry
    validation: 0,      // No retry
    permanent: 0,       // No retry
    unknown: 1000,      // 1 second base (conservative)
  };
  
  const baseDelay = baseDelays[category] || 1000;
  
  if (baseDelay === 0) {
    return 0; // No retry
  }
  
  // Exponential backoff: baseDelay * (2 ^ (attemptNumber - 1))
  // Capped at 60 seconds
  return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), 60000);
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: NewProcessingError): string {
  const categoryLabels: Record<ErrorCategory, string> = {
    network: 'Network Error',
    http_client: 'Client Error',
    http_server: 'Server Error',
    parsing: 'Parsing Error',
    validation: 'Validation Error',
    zotero_api: 'Zotero API Error',
    rate_limit: 'Rate Limit',
    permanent: 'Permanent Error',
    unknown: 'Error',
  };
  
  const label = categoryLabels[error.category];
  return `${label}: ${error.message}`;
}

