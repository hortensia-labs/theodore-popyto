/**
 * Content Processing Helper Functions
 *
 * Utility functions for formatting and computing display values
 * for the Content Processing section in the URL detail panel
 */

import type { ProcessingStatus, ErrorCategory } from '../types/url-processing';
import type { UrlContentCache, Url, UrlExtractedMetadata } from '../../drizzle/schema';

/**
 * Format bytes to human-readable size
 */
export function formatContentSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '-';

  const kb = bytes / 1024;
  const mb = kb / 1024;
  const gb = mb / 1024;

  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(2)} KB`;
  return `${bytes} bytes`;
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: Date | number | null | undefined): string {
  if (!timestamp) return '-';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Get icon name for content type
 */
export function getContentTypeIcon(contentType: string | null | undefined): string {
  if (!contentType) return 'File';

  if (contentType.includes('html') || contentType.includes('xml')) return 'FileText';
  if (contentType.includes('pdf')) return 'FileType';
  if (contentType.includes('image')) return 'FileImage';
  if (contentType.includes('video')) return 'FileVideo';
  if (contentType.includes('json')) return 'FileCode';
  return 'File';
}

/**
 * Get display label for content type
 */
export function getContentTypeLabel(contentType: string | null | undefined): string {
  if (!contentType) return 'Unknown';

  if (contentType.includes('html')) return 'HTML Document';
  if (contentType.includes('pdf')) return 'PDF Document';
  if (contentType.includes('xml')) return 'XML Document';
  if (contentType.includes('json')) return 'JSON Data';
  if (contentType.includes('image')) return 'Image';
  if (contentType.includes('video')) return 'Video';
  return contentType;
}

/**
 * Compute color class for metadata quality score
 */
export function computeMetadataQualityColor(score: number | null | undefined): {
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  if (score === null || score === undefined) {
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
    };
  }

  if (score >= 80) {
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
    };
  }

  if (score >= 60) {
    return {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300',
    };
  }

  if (score >= 40) {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
    };
  }

  return {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
  };
}

/**
 * Format error message to be user-friendly
 */
export function formatErrorMessage(
  error: string | null | undefined,
  category?: ErrorCategory | string | null
): string {
  if (!error) return 'Unknown error';

  // Common error patterns to make more user-friendly
  const errorPatterns: Record<string, string> = {
    'ENOTFOUND': 'Domain not found (DNS error)',
    'ETIMEDOUT': 'Connection timed out',
    'ECONNREFUSED': 'Connection refused by server',
    'ECONNRESET': 'Connection reset by server',
    'certificate': 'SSL certificate error',
    '404': 'Page not found (404)',
    '403': 'Access forbidden (403)',
    '401': 'Authentication required (401)',
    '500': 'Server error (500)',
    '502': 'Bad gateway (502)',
    '503': 'Service unavailable (503)',
  };

  // Check for pattern matches
  for (const [pattern, friendlyMessage] of Object.entries(errorPatterns)) {
    if (error.includes(pattern)) {
      return friendlyMessage;
    }
  }

  // Return original error if no pattern matches
  return error;
}

/**
 * Get error category display label
 */
export function getErrorCategoryLabel(category: ErrorCategory | string | null | undefined): string {
  if (!category) return 'Unknown';

  const labels: Record<string, string> = {
    'network': 'Network Error',
    'http_client': 'Client Error (4xx)',
    'http_server': 'Server Error (5xx)',
    'parsing': 'Parsing Error',
    'validation': 'Validation Error',
    'zotero_api': 'Zotero API Error',
    'rate_limit': 'Rate Limit',
    'permanent': 'Permanent Error',
    'unknown': 'Unknown Error',
  };

  return labels[category] || category;
}

/**
 * Check if error is retryable
 */
export function isErrorRetryable(category: ErrorCategory | string | null | undefined): boolean {
  if (!category) return false;

  const retryableCategories = ['network', 'http_server', 'rate_limit', 'unknown'];
  return retryableCategories.includes(category);
}

/**
 * Content Availability Status
 */
export type ContentAvailabilityStatus =
  | 'cached'           // Content is cached and accessible
  | 'accessible'       // URL is accessible but not cached yet
  | 'inaccessible'     // URL is not accessible
  | 'error'            // Fetch error occurred
  | 'not_attempted';   // Never attempted to fetch

/**
 * Compute content availability status
 */
export function getContentAvailabilityStatus(
  url: Pick<Url, 'isAccessible' | 'contentFetchAttempts' | 'lastFetchError'>,
  cache: UrlContentCache | null | undefined
): ContentAvailabilityStatus {
  // If cached, content is available
  if (cache) {
    return 'cached';
  }

  // If fetch error exists, show error status
  if (url.lastFetchError) {
    return 'error';
  }

  // If fetch attempted but no cache and not accessible
  if (url.contentFetchAttempts && url.contentFetchAttempts > 0) {
    if (url.isAccessible === false) {
      return 'inaccessible';
    }
  }

  // If accessible but not cached
  if (url.isAccessible) {
    return 'accessible';
  }

  // Never attempted
  return 'not_attempted';
}

/**
 * Identifier Extraction Status
 */
export type IdentifierExtractionStatus =
  | 'found'            // Identifiers found
  | 'not_found'        // No identifiers found
  | 'not_processed';   // Not yet processed

/**
 * Compute identifier extraction status
 */
export function getIdentifierExtractionStatus(
  url: Pick<Url, 'identifierCount'>,
  cache: UrlContentCache | null | undefined
): IdentifierExtractionStatus {
  // If identifiers found
  if (url.identifierCount && url.identifierCount > 0) {
    return 'found';
  }

  // If content cached but no identifiers
  if (cache) {
    return 'not_found';
  }

  // Not yet processed
  return 'not_processed';
}

/**
 * Metadata Extraction Status
 */
export type MetadataExtractionStatus =
  | 'extracted'        // Metadata extracted
  | 'incomplete'       // Extracted but low quality
  | 'not_extracted';   // Not extracted

/**
 * Compute metadata extraction status
 */
export function getMetadataExtractionStatus(
  url: Pick<Url, 'hasExtractedMetadata'>,
  metadata: UrlExtractedMetadata | null | undefined
): MetadataExtractionStatus {
  if (!url.hasExtractedMetadata || !metadata) {
    return 'not_extracted';
  }

  // Check quality score
  if (metadata.qualityScore !== null && metadata.qualityScore !== undefined) {
    if (metadata.qualityScore >= 60) {
      return 'extracted';
    }
    return 'incomplete';
  }

  return 'extracted';
}

/**
 * LLM Processing Status
 */
export type LLMProcessingStatus =
  | 'available'        // Can use LLM
  | 'completed'        // LLM processing completed
  | 'failed'           // LLM processing failed
  | 'not_available';   // LLM not available

/**
 * Compute LLM processing status
 */
export function getLLMProcessingStatus(
  url: Pick<Url, 'llmExtractionStatus'>,
  canUseLLM: boolean
): LLMProcessingStatus {
  // Check explicit LLM status
  if (url.llmExtractionStatus === 'completed') {
    return 'completed';
  }

  if (url.llmExtractionStatus === 'failed') {
    return 'failed';
  }

  // Check if LLM is available
  if (canUseLLM) {
    return 'available';
  }

  return 'not_available';
}

/**
 * Get status badge variant for content availability
 */
export function getContentAvailabilityBadgeVariant(status: ContentAvailabilityStatus):
  'success' | 'warning' | 'error' | 'secondary' {
  switch (status) {
    case 'cached':
      return 'success';
    case 'accessible':
      return 'warning';
    case 'inaccessible':
    case 'error':
      return 'error';
    case 'not_attempted':
      return 'secondary';
  }
}

/**
 * Get status badge variant for identifier extraction
 */
export function getIdentifierExtractionBadgeVariant(status: IdentifierExtractionStatus):
  'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'found':
      return 'success';
    case 'not_found':
      return 'warning';
    case 'not_processed':
      return 'secondary';
  }
}

/**
 * Get status badge variant for metadata extraction
 */
export function getMetadataExtractionBadgeVariant(status: MetadataExtractionStatus):
  'success' | 'warning' | 'secondary' {
  switch (status) {
    case 'extracted':
      return 'success';
    case 'incomplete':
      return 'warning';
    case 'not_extracted':
      return 'secondary';
  }
}

/**
 * Get status badge variant for LLM processing
 */
export function getLLMProcessingBadgeVariant(status: LLMProcessingStatus):
  'success' | 'error' | 'secondary' | 'default' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'available':
      return 'default';
    case 'not_available':
      return 'secondary';
  }
}

/**
 * Get display label for content availability status
 */
export function getContentAvailabilityLabel(status: ContentAvailabilityStatus): string {
  switch (status) {
    case 'cached':
      return 'Cached';
    case 'accessible':
      return 'Accessible';
    case 'inaccessible':
      return 'Inaccessible';
    case 'error':
      return 'Error';
    case 'not_attempted':
      return 'Not Attempted';
  }
}

/**
 * Get display label for identifier extraction status
 */
export function getIdentifierExtractionLabel(status: IdentifierExtractionStatus): string {
  switch (status) {
    case 'found':
      return 'Found';
    case 'not_found':
      return 'Not Found';
    case 'not_processed':
      return 'Not Processed';
  }
}

/**
 * Get display label for metadata extraction status
 */
export function getMetadataExtractionLabel(status: MetadataExtractionStatus): string {
  switch (status) {
    case 'extracted':
      return 'Extracted';
    case 'incomplete':
      return 'Incomplete';
    case 'not_extracted':
      return 'Not Extracted';
  }
}

/**
 * Get display label for LLM processing status
 */
export function getLLMProcessingLabel(status: LLMProcessingStatus): string {
  switch (status) {
    case 'available':
      return 'Available';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'not_available':
      return 'Not Available';
  }
}
