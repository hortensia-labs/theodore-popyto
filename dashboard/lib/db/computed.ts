import type { Url, UrlAnalysisData, UrlEnrichment } from './schema';

/**
 * URL status types based on analysis
 */
export type UrlStatus = 'stored' | 'error' | 'extractable' | 'translatable' | 'resolvable' | 'unknown';

/**
 * URL status configuration with colors for UI
 */
export const URL_STATUS_CONFIG = {
  stored: {
    label: 'Stored',
    color: 'black',
    description: 'Successfully stored in Zotero library',
  },
  error: {
    label: 'Error',
    color: 'red',
    description: 'URL has errors or is inaccessible',
  },
  extractable: {
    label: 'Extractable',
    color: 'green',
    description: 'Has valid identifiers for extraction',
  },
  translatable: {
    label: 'Translatable',
    color: 'blue',
    description: 'Has web translators available',
  },
  resolvable: {
    label: 'Resolvable',
    color: 'pink',
    description: 'Can be resolved via AI translation',
  },
  unknown: {
    label: 'Unknown',
    color: 'gray',
    description: 'Status cannot be determined',
  },
} as const;

/**
 * Compute URL status based on analysis data, enrichments, and URL metadata
 * 
 * Priority order:
 * 1. stored - if URL has been successfully processed and stored in Zotero (overrides all)
 * 2. extractable - if validIdentifiers OR customIdentifiers has at least one item (overrides errors)
 * 3. error - if success is false, statusCode >= 400, or hasErrors is true (unless extractable)
 * 4. translatable - if webTranslators has at least one item
 * 5. resolvable - if aiTranslation is true
 * 6. unknown - fallback
 */
export function computeUrlStatus(
  url: Pick<Url, 'success' | 'hasErrors' | 'statusCode' | 'zoteroItemKey' | 'zoteroProcessingStatus'>,
  analysis: Pick<UrlAnalysisData, 'validIdentifiers' | 'webTranslators' | 'aiTranslation'> | null,
  enrichment: Pick<UrlEnrichment, 'customIdentifiers'> | null = null
): UrlStatus {
  // Priority 1: Stored (overrides everything else)
  if (url.zoteroItemKey && url.zoteroProcessingStatus === 'stored') {
    return 'stored';
  }
  
  // Priority 2: Extractable (overrides errors if custom identifiers exist)
  const hasValidIdentifiers = analysis?.validIdentifiers && Array.isArray(analysis.validIdentifiers) && analysis.validIdentifiers.length > 0;
  const hasCustomIdentifiers = enrichment?.customIdentifiers && Array.isArray(enrichment.customIdentifiers) && enrichment.customIdentifiers.length > 0;
  
  if (hasValidIdentifiers || hasCustomIdentifiers) {
    return 'extractable';
  }
  
  // Priority 3: Error status (only if not extractable)
  if (!url.success || url.hasErrors || (url.statusCode !== null && url.statusCode >= 400)) {
    return 'error';
  }
  
  // If no analysis data, return unknown
  if (!analysis) {
    return 'unknown';
  }
  
  // Priority 4: Translatable
  if (analysis.webTranslators && Array.isArray(analysis.webTranslators) && analysis.webTranslators.length > 0) {
    return 'translatable';
  }
  
  // Priority 5: Resolvable
  if (analysis.aiTranslation === true) {
    return 'resolvable';
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Extended URL type with computed status
 */
export interface UrlWithStatus extends Url {
  status: UrlStatus;
  analysisData: UrlAnalysisData | null;
}

/**
 * Add computed status to a URL with its analysis data and enrichments
 */
export function addUrlStatus(
  url: Url,
  analysis: UrlAnalysisData | null,
  enrichment: Pick<UrlEnrichment, 'customIdentifiers'> | null = null
): UrlWithStatus {
  const status = computeUrlStatus(url, analysis, enrichment);
  
  return {
    ...url,
    status,
    analysisData: analysis,
  };
}

/**
 * Filter helper for SQL queries to match status conditions
 * Note: This returns SQL-compatible conditions as strings for use in WHERE clauses
 */
export function getStatusFilterConditions(status: UrlStatus): string {
  switch (status) {
    case 'stored':
      return `(urls.zotero_item_key IS NOT NULL AND urls.zotero_processing_status = 'stored')`;
    
    case 'error':
      return '(urls.success = 0 OR urls.has_errors = 1 OR urls.status_code >= 400)';
    
    case 'extractable':
      return `(urls.success = 1 AND urls.has_errors = 0 AND (urls.status_code IS NULL OR urls.status_code < 400) 
              AND json_array_length(url_analysis_data.valid_identifiers) > 0)`;
    
    case 'translatable':
      return `(urls.success = 1 AND urls.has_errors = 0 AND (urls.status_code IS NULL OR urls.status_code < 400)
              AND (url_analysis_data.valid_identifiers IS NULL OR json_array_length(url_analysis_data.valid_identifiers) = 0)
              AND json_array_length(url_analysis_data.web_translators) > 0)`;
    
    case 'resolvable':
      return `(urls.success = 1 AND urls.has_errors = 0 AND (urls.status_code IS NULL OR urls.status_code < 400)
              AND (url_analysis_data.valid_identifiers IS NULL OR json_array_length(url_analysis_data.valid_identifiers) = 0)
              AND (url_analysis_data.web_translators IS NULL OR json_array_length(url_analysis_data.web_translators) = 0)
              AND url_analysis_data.ai_translation = 1)`;
    
    case 'unknown':
      return `(urls.success = 1 AND urls.has_errors = 0 AND (urls.status_code IS NULL OR urls.status_code < 400)
              AND (url_analysis_data.valid_identifiers IS NULL OR json_array_length(url_analysis_data.valid_identifiers) = 0)
              AND (url_analysis_data.web_translators IS NULL OR json_array_length(url_analysis_data.web_translators) = 0)
              AND (url_analysis_data.ai_translation IS NULL OR url_analysis_data.ai_translation = 0))`;
    
    default:
      return '1=1'; // Match all if unknown status
  }
}

/**
 * Get status badge properties for UI rendering
 */
export function getStatusBadgeProps(status: UrlStatus) {
  return URL_STATUS_CONFIG[status];
}

/**
 * Count URLs by status (for stats)
 * This is a helper that can be used client-side after fetching URLs
 */
export function groupUrlsByStatus(urlsWithStatus: UrlWithStatus[]): Record<UrlStatus, number> {
  return urlsWithStatus.reduce((acc, url) => {
    acc[url.status] = (acc[url.status] || 0) + 1;
    return acc;
  }, {} as Record<UrlStatus, number>);
}

