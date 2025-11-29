/**
 * URL Processing System Type Definitions
 * 
 * This file contains all type definitions for the new URL processing system,
 * including statuses, capabilities, processing attempts, and related interfaces.
 */

// ============================================
// Processing Status Types
// ============================================

/**
 * Processing Status - The primary state of a URL in the processing workflow
 * 
 * State Flow:
 * not_started → processing_zotero → stored/stored_incomplete
 *            → processing_content → awaiting_selection → processing_zotero
 *            → processing_llm → awaiting_metadata → stored
 *            → exhausted → stored_custom (manual)
 */
export type ProcessingStatus = 
  | 'not_started'           // Initial state, never processed
  | 'processing_zotero'     // Stage 1: Zotero API call in progress
  | 'processing_content'    // Stage 2: Content extraction in progress
  | 'processing_llm'        // Stage 3: LLM extraction in progress
  | 'awaiting_selection'    // User must select identifier
  | 'awaiting_metadata'     // User must edit/approve metadata
  | 'stored'                // Successfully linked to Zotero (complete citation)
  | 'stored_incomplete'     // Linked but missing critical citation fields
  | 'stored_custom'         // Manually created by user
  | 'exhausted'             // All automated methods failed
  | 'ignored'               // User marked to skip
  | 'archived';             // Permanent ignore

/**
 * User Intent - User's explicit preference for how to handle a URL
 */
export type UserIntent = 
  | 'auto'           // Default: system decides processing strategy
  | 'ignore'         // Skip processing, but keep in database
  | 'priority'       // Process this first in bulk operations
  | 'manual_only'    // Don't auto-process, manual intervention only
  | 'archive';       // Permanent ignore, hide from default views

/**
 * Processing Stage - Individual stages in the processing workflow
 */
export type ProcessingStage =
  | 'zotero_identifier'   // Zotero processing via identifier (DOI, PMID, etc.)
  | 'zotero_url'          // Zotero processing via URL translator
  | 'content_extraction'  // Content fetching and identifier extraction
  | 'llm'                 // LLM-based metadata extraction
  | 'manual';             // Manual creation by user

// ============================================
// Processing Capability Types
// ============================================

/**
 * Processing Capability - What processing methods are available for a URL
 * This is computed based on analysis data and content cache
 */
export interface ProcessingCapability {
  /** Has valid identifiers (DOI, PMID, arXiv, ISBN) */
  hasIdentifiers: boolean;
  
  /** Zotero web translators available */
  hasWebTranslators: boolean;
  
  /** Content fetched and cached */
  hasContent: boolean;
  
  /** URL is reachable (HTTP < 400) */
  isAccessible: boolean;
  
  /** Content available for LLM extraction */
  canUseLLM: boolean;
  
  /** Content is a PDF file */
  isPDF: boolean;
  
  /** Manual creation always available */
  manualCreateAvailable: boolean;
}

// ============================================
// Error Categorization
// ============================================

/**
 * Error Category - Classification of errors for retry logic
 */
export type ErrorCategory = 
  | 'network'        // Timeout, DNS, connection refused
  | 'http_client'    // 4xx errors (bad request, auth, not found)
  | 'http_server'    // 5xx errors (server error, temporarily unavailable)
  | 'parsing'        // Failed to extract identifiers/metadata
  | 'validation'     // Invalid data format
  | 'zotero_api'     // Zotero API specific errors
  | 'rate_limit'     // Hit rate limit
  | 'permanent'      // Unrecoverable errors (404, 410, etc.)
  | 'unknown';       // Uncategorized

/**
 * Processing Error - Detailed error information
 */
export interface ProcessingError {
  message: string;
  category: ErrorCategory;
  code?: string | number;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// ============================================
// Processing Attempt & History
// ============================================

/**
 * Processing Attempt - Record of a single processing attempt
 * Stored in processingHistory JSON field
 */
export interface ProcessingAttempt {
  /** Timestamp (milliseconds since epoch) */
  timestamp: number;
  
  /** Processing stage attempted */
  stage?: ProcessingStage;
  
  /** Specific method used (e.g., 'DOI', 'web_translator') */
  method?: string;
  
  /** Whether attempt succeeded */
  success?: boolean | number;
  
  /** Error message if failed */
  error?: string | null;
  
  /** Error category for retry logic */
  errorCategory?: ErrorCategory;
  
  /** Zotero item key if successful */
  itemKey?: string | null;
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  
  /** State transition (if this was a transition) */
  transition?: {
    from: ProcessingStatus;
    to: ProcessingStatus;
  };
}

// ============================================
// Processing Results
// ============================================

/**
 * Processing Result - Result of processing a single URL
 */
export interface ProcessingResult {
  success: boolean;
  urlId?: number;
  status?: ProcessingStatus;
  itemKey?: string;
  method?: string;
  error?: string;
  errorCategory?: ErrorCategory;
  isExisting?: boolean;
  identifierCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Batch Processing Result - Result of batch processing multiple URLs
 */
export interface BatchProcessingResult {
  total: number;
  successful: number;
  failed: number;
  results: ProcessingResult[];
}

// ============================================
// State Transition
// ============================================

/**
 * Transition Metadata - Additional data for state transitions
 */
export interface TransitionMetadata {
  reason?: string;
  userId?: string;
  error?: string;
  itemKey?: string;
  [key: string]: unknown;
}

/**
 * Transition Result - Result of a state transition
 */
export interface TransitionResult {
  success: boolean;
  error?: string;
  from?: ProcessingStatus;
  to?: ProcessingStatus;
}

// ============================================
// Batch Processing
// ============================================

/**
 * Batch Processing Options - Configuration for batch processing
 */
export interface BatchProcessingOptions {
  /** Maximum concurrent operations */
  concurrency?: number;
  
  /** Respect user intent (skip ignored, prioritize priority) */
  respectUserIntent?: boolean;
  
  /** Stop entire batch on first error */
  stopOnError?: boolean;
  
  /** Filter to apply before processing */
  filter?: {
    statuses?: ProcessingStatus[];
    sections?: string[];
    domains?: string[];
  };
}

/**
 * Batch Processing Session - Active batch processing session
 */
export interface BatchProcessingSession {
  /** Unique session ID */
  id: string;
  
  /** URL IDs to process */
  urlIds: number[];
  
  /** Current index being processed */
  currentIndex: number;
  
  /** Successfully processed URL IDs */
  completed: number[];
  
  /** Failed URL IDs */
  failed: number[];
  
  /** Session status */
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  
  /** When session started */
  startedAt: Date;
  
  /** When session completed (if completed) */
  completedAt?: Date;
  
  /** Estimated completion time */
  estimatedCompletion: Date;
  
  /** Processing results */
  results?: ProcessingResult[];
}

// ============================================
// URL with Computed Fields
// ============================================

/**
 * URL with Processing Capability - URL with computed capability
 */
export interface UrlWithCapability {
  id: number;
  url: string;
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  capability: ProcessingCapability;
}

/**
 * URL with Processing History - URL with full processing history
 */
export interface UrlWithHistory {
  id: number;
  url: string;
  processingStatus: ProcessingStatus;
  processingAttempts: number;
  processingHistory: ProcessingAttempt[];
}

// ============================================
// Effective UI Status
// ============================================

/**
 * Effective Status - Computed status for UI display
 * Combines processingStatus, userIntent, and capability
 */
export type EffectiveStatus =
  | 'IGNORED'              // User intent: ignore/archive
  | 'STORED'               // Successfully stored
  | 'NEEDS_METADATA'       // Stored but incomplete citation
  | 'CUSTOM_ITEM'          // User-created custom item
  | 'PROCESSING'           // Currently processing
  | 'SELECT_IDENTIFIER'    // Awaiting user identifier selection
  | 'APPROVE_METADATA'     // Awaiting user metadata approval
  | 'MANUAL_NEEDED'        // Exhausted, needs manual creation
  | 'ERROR'                // URL inaccessible/error
  | 'READY_EXTRACT'        // Has identifiers, ready to process
  | 'READY_TRANSLATE'      // Has translators, ready to process
  | 'READY_LLM'            // Can use LLM extraction
  | 'UNKNOWN';             // Status unclear

// ============================================
// Suggestions
// ============================================

/**
 * Suggestion Priority - Priority level for suggestions
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Suggestion Type - Type of suggestion
 */
export type SuggestionType = 'error' | 'warning' | 'info';

/**
 * Suggestion - Smart suggestion for user action
 */
export interface Suggestion {
  type: SuggestionType;
  priority: SuggestionPriority;
  message: string;
  action?: {
    label: string;
    handler: string; // Function name to call
    params?: Record<string, unknown>;
  };
}

// ============================================
// Content Views
// ============================================

/**
 * Content Views - Different views of URL content for manual creation
 */
export interface ContentViews {
  /** Raw HTML content */
  raw?: string;
  
  /** Reader-mode cleaned content */
  reader?: string;
  
  /** Whether content is a PDF */
  isPDF: boolean;
  
  /** PDF URL (if PDF) */
  pdfUrl?: string;
  
  /** Cached content path */
  cachedPath?: string;
}

// ============================================
// Export Data
// ============================================

/**
 * URL Export Record - Single URL for export
 */
export interface UrlExportRecord {
  url: string;
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  processingAttempts: number;
  processingHistory: ProcessingAttempt[];
  zoteroItemKey?: string;
  finalStatus: ProcessingStatus;
  totalAttempts: number;
  errors: string[];
}

/**
 * Export Summary - Summary statistics for export
 */
export interface ExportSummary {
  totalUrls: number;
  successRate: number;
  mostCommonError: string;
  averageAttempts: number;
  statusDistribution: Record<ProcessingStatus, number>;
}

/**
 * Export Data - Complete export package
 */
export interface ExportData {
  urls: UrlExportRecord[];
  summary: ExportSummary;
  generatedAt: Date;
  filters?: Record<string, unknown>;
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a processing status is a final state
 */
export function isFinalStatus(status: ProcessingStatus): boolean {
  return ['stored', 'stored_incomplete', 'stored_custom', 'exhausted', 'ignored', 'archived'].includes(status);
}

/**
 * Check if a processing status is an active processing state
 */
export function isProcessingStatus(status: ProcessingStatus): boolean {
  return ['processing_zotero', 'processing_content', 'processing_llm'].includes(status);
}

/**
 * Check if a processing status requires user action
 */
export function requiresUserAction(status: ProcessingStatus): boolean {
  return ['awaiting_selection', 'awaiting_metadata', 'exhausted'].includes(status);
}

/**
 * Check if an error is retryable based on category
 */
export function isRetryableError(category: ErrorCategory): boolean {
  return ['network', 'http_server', 'rate_limit'].includes(category);
}

/**
 * Check if an error is permanent (should not retry)
 */
export function isPermanentError(category: ErrorCategory): boolean {
  return category === 'permanent';
}

