/**
 * Shared type definitions for LLM metadata extraction providers
 */

/**
 * Creator (author, editor, contributor)
 */
export interface Creator {
  creatorType: 'author' | 'editor' | 'contributor';
  firstName?: string;
  lastName?: string;
  name?: string; // For single-field names (organizations, etc.)
}

/**
 * Extracted bibliographic metadata
 */
export interface ExtractedMetadata {
  itemType?: string; // 'journalArticle', 'blogPost', 'book', 'videoRecording', 'webpage', etc.
  title?: string;
  creators?: Creator[];
  date?: string; // ISO format YYYY-MM-DD or just YYYY
}

/**
 * LLM extraction request
 */
export interface LlmExtractionRequest {
  text: string; // Pre-extracted and preprocessed text
  contentType: 'html' | 'pdf' | 'docx';
  url?: string; // Optional context
  metadata?: {
    // Any existing metadata to provide context
    domain?: string;
    title?: string;
  };
}

/**
 * Confidence scores for each extracted field
 */
export interface ConfidenceScores {
  itemType?: number; // 0.0 - 1.0
  title?: number;
  creators?: number;
  date?: number;
  overall?: number; // Average of all fields
}

/**
 * LLM extraction result
 */
export interface LlmExtractionResult {
  success: boolean;
  metadata?: ExtractedMetadata;
  confidence: ConfidenceScores;
  providerUsed: string; // e.g., 'ollama:llama3.2', 'anthropic:claude-3-5-haiku'
  tokensUsed?: number;
  processingTimeMs: number;
  extractionNotes?: string; // LLM's explanation of uncertainties
  error?: string;
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  available: boolean;
  checkedAt: Date;
  error?: string;
  responseTimeMs?: number;
}

/**
 * LLM provider capabilities
 */
export interface ProviderCapabilities {
  name: string; // e.g., 'ollama', 'anthropic'
  models: string[]; // Available models
  supportsStreaming: boolean;
  costPerRequest?: number; // Estimated cost in USD (if API-based)
}

/**
 * Raw LLM response (before validation)
 */
export interface RawLlmResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Validated metadata response from LLM
 * This matches what we expect the LLM to return
 */
export interface LlmMetadataResponse {
  itemType?: string;
  title?: string;
  creators?: Creator[];
  date?: string;
  confidence: {
    itemType?: number;
    title?: number;
    creators?: number;
    date?: number;
  };
  extractionNotes?: string;
}
