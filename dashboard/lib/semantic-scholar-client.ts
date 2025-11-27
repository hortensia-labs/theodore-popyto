/**
 * Semantic Scholar API Client
 *
 * Provides a clean interface to fetch paper metadata from Semantic Scholar API.
 * Replaces HTML scraping approach which was blocked by AWS WAF.
 *
 * API Documentation: https://www.semanticscholar.org/product/api
 */

import type { ZoteroItemData, ZoteroCreator } from './zotero-client';
import { globalRateLimiter } from './rate-limiter';

// ============================================================================
// TYPE DEFINITIONS (matches Semantic Scholar API response)
// ============================================================================

export interface SemanticScholarAuthor {
  authorId: string;
  name: string;
}

export interface SemanticScholarExternalIds {
  DOI?: string;
  DBLP?: string;
  PubMedCentral?: string;
  PubMed?: string;
  MAG?: string;
  ACL?: string;
  ARXIV?: string;
}

export interface SemanticScholarVenue {
  name?: string;
  type?: string;
  alternate_names?: string[];
  issn?: string;
  url?: string;
}

export interface SemanticScholarOpenAccessPdf {
  url?: string;
  status?: string; // 'OPEN', 'CLOSED', 'GREEN', 'GOLD'
}

export interface SemanticScholarPaper {
  paperId: string;
  externalIds: SemanticScholarExternalIds;
  title: string;
  abstract?: string;
  authors: SemanticScholarAuthor[];
  year?: number;
  venue?: string;
  publicationVenue?: SemanticScholarVenue;
  openAccessPdf?: SemanticScholarOpenAccessPdf;
  citationCount?: number;
  fieldsOfStudy?: string[];
  publicationTypes?: string[];
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export enum SemanticScholarErrorCode {
  INVALID_URL = 'INVALID_URL',
  INVALID_PAPER_ID = 'INVALID_PAPER_ID',
  PAPER_NOT_FOUND = 'PAPER_NOT_FOUND',
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
}

export class SemanticScholarError extends Error {
  constructor(
    public code: SemanticScholarErrorCode,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SemanticScholarError';
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const PAPER_ENDPOINT = `${API_BASE_URL}/paper`;
const REQUEST_TIMEOUT = 10000; // 10 seconds
const USER_AGENT = 'Theodore/1.0 (+https://github.com/anthropics/claude-code)';

// Fields to request from API (controls response completeness)
const PAPER_FIELDS = [
  'paperId',
  'externalIds',
  'title',
  'abstract',
  'authors',
  'year',
  'venue',
  'publicationVenue',
  'openAccessPdf',
  'citationCount',
  'fieldsOfStudy',
  'publicationTypes',
].join(',');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract paper ID from various Semantic Scholar URL formats
 *
 * Supports:
 * - https://www.semanticscholar.org/paper/ID
 * - https://www.semanticscholar.org/paper/TITLE-ID
 * - https://www.semanticscholar.org/paper/TITLE/ID
 */
export function extractPaperIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Must be semanticscholar.org domain
    if (!urlObj.hostname.includes('semanticscholar.org')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Find 'paper' segment
    const paperIndex = pathParts.indexOf('paper');
    if (paperIndex === -1) {
      return null;
    }

    // Paper ID is either:
    // 1. Next segment after 'paper' (format: /paper/ID)
    // 2. Last segment if multi-part path (format: /paper/TITLE-ID or /paper/TITLE/ID)

    if (paperIndex + 1 < pathParts.length) {
      const potentialId = pathParts[paperIndex + 1];

      // Extract ID from formats like "Exploring-creative-Carlson/ID" or just "ID"
      if (potentialId.includes('-')) {
        // Format: TITLE-ID (last hyphen-separated part is usually the ID)
        const parts = potentialId.split('-');
        const lastPart = parts[parts.length - 1];
        if (isValidPaperId(lastPart)) {
          return lastPart;
        }
      } else if (isValidPaperId(potentialId)) {
        // Direct ID
        return potentialId;
      }
    }

    // Try last segment in path
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (isValidPaperId(lastPart)) {
        return lastPart;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate paper ID format (40-character hex string)
 */
function isValidPaperId(id: string): boolean {
  return /^[a-f0-9]{40}$/i.test(id);
}

/**
 * Classify HTTP status code to error enum
 */
function statusCodeToErrorCode(statusCode: number): SemanticScholarErrorCode {
  switch (statusCode) {
    case 400:
      return SemanticScholarErrorCode.INVALID_PAPER_ID;
    case 404:
      return SemanticScholarErrorCode.PAPER_NOT_FOUND;
    case 429:
      return SemanticScholarErrorCode.RATE_LIMITED;
    case 408:
    case 504:
      return SemanticScholarErrorCode.TIMEOUT;
    case 500:
    case 502:
    case 503:
      return SemanticScholarErrorCode.API_ERROR;
    default:
      return SemanticScholarErrorCode.NETWORK_ERROR;
  }
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 * Prevents thundering herd by adding randomness
 * Delays: 2s, 4s, 8s, 16s, 32s, 64s with jitter
 */
function getExponentialBackoffDelay(attemptNumber: number): number {
  const baseDelay = 2000; // 2 seconds base (more aggressive API = longer waits)
  const maxDelay = 64000; // 64 seconds max (compared to 32s before)

  // Exponential: 2, 4, 8, 16, 32, 64
  const delay = baseDelay * Math.pow(2, attemptNumber);
  const cappedDelay = Math.min(delay, maxDelay);

  // Add jitter: ±10% randomness to prevent synchronized requests
  const jitter = cappedDelay * 0.1 * (Math.random() - 0.5);
  const finalDelay = Math.max(baseDelay, cappedDelay + jitter);

  return Math.round(finalDelay);
}

// ============================================================================
// MAIN API CLIENT
// ============================================================================

/**
 * Fetch paper metadata from Semantic Scholar API with aggressive rate limiting and exponential backoff
 *
 * Accepts:
 * - Paper ID (40-char hex string)
 * - Semantic Scholar URL (any format)
 *
 * Features:
 * - Aggressive rate limiting via token bucket (0.5 req/sec = 1 request every 2 seconds)
 * - Exponential backoff with jitter on 429/5xx errors (up to 5 retries)
 * - Backoff delays: 2s, 4s, 8s, 16s, 32s, 64s (with ±10% jitter)
 * - Request timeout protection
 * - Server error (5xx) recovery
 */
export async function fetchPaperFromSemanticScholar(
  paperIdOrUrl: string
): Promise<SemanticScholarPaper> {
  let paperId: string | null = paperIdOrUrl;

  // If it looks like a URL, extract the paper ID
  if (paperIdOrUrl.startsWith('http')) {
    paperId = extractPaperIdFromUrl(paperIdOrUrl);
    if (!paperId) {
      throw new SemanticScholarError(
        SemanticScholarErrorCode.INVALID_URL,
        `Could not extract paper ID from URL: ${paperIdOrUrl}`
      );
    }
  }

  // Validate paper ID format
  if (!isValidPaperId(paperId)) {
    throw new SemanticScholarError(
      SemanticScholarErrorCode.INVALID_PAPER_ID,
      `Invalid paper ID format: ${paperId}. Expected 40-character hex string.`
    );
  }

  const url = `${PAPER_ENDPOINT}/${paperId}?fields=${PAPER_FIELDS}`;
  const maxRetries = 5; // Increased from 3 to 5 for more aggressive APIs
  let lastError: SemanticScholarError | null = null;

  // Retry loop with exponential backoff for rate limit errors
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply rate limiting via token bucket
      await globalRateLimiter.waitForToken(url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorCode = statusCodeToErrorCode(response.status);
          let errorMessage = `Semantic Scholar API error: ${response.status}`;

          if (response.status === 404) {
            errorMessage = `Paper not found in Semantic Scholar: ${paperId}`;
          } else if (response.status === 429) {
            errorMessage = 'Semantic Scholar API rate limit exceeded';
          } else if (response.status >= 500) {
            errorMessage = 'Semantic Scholar API is temporarily unavailable';
          }

          const error = new SemanticScholarError(errorCode, errorMessage, response.status);

          // If rate limited (429) or server error (5xx) and we have retries left, backoff and retry
          const isRetryable = (response.status === 429 || response.status >= 500) && attempt < maxRetries;

          if (isRetryable) {
            lastError = error;
            const backoffDelay = getExponentialBackoffDelay(attempt);
            const errorType = response.status === 429 ? 'Rate limited' : 'Server error';
            console.warn(
              `${errorType} (attempt ${attempt + 1}/${maxRetries + 1}). ` +
              `Retrying after ${backoffDelay}ms...`
            );
            await sleep(backoffDelay);
            continue; // Retry
          }

          // Non-retryable error or exhausted retries
          throw error;
        }

        const paper: SemanticScholarPaper = await response.json();

        // Validate response structure
        if (!paper.paperId || !paper.title) {
          throw new SemanticScholarError(
            SemanticScholarErrorCode.INVALID_RESPONSE,
            'API response missing required fields (paperId or title)'
          );
        }

        // Success - log if we had retries
        if (attempt > 0) {
          console.log(`Successfully fetched paper after ${attempt} retry/retries`);
        }

        return paper;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof SemanticScholarError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new SemanticScholarError(
            SemanticScholarErrorCode.TIMEOUT,
            `Request timeout after ${REQUEST_TIMEOUT}ms`
          );
        }

        throw new SemanticScholarError(
          SemanticScholarErrorCode.NETWORK_ERROR,
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } catch (error) {
      // If this is the last attempt or not a retryable error, throw
      if (!(error instanceof SemanticScholarError) || attempt === maxRetries) {
        if (error instanceof SemanticScholarError) {
          throw error;
        }
        throw new SemanticScholarError(
          SemanticScholarErrorCode.NETWORK_ERROR,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      // For non-rate-limit errors, throw immediately
      if (error instanceof SemanticScholarError && error.code !== SemanticScholarErrorCode.RATE_LIMITED) {
        throw error;
      }

      lastError = error instanceof SemanticScholarError ? error : null;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new SemanticScholarError(
    SemanticScholarErrorCode.API_ERROR,
    'Failed to fetch paper after retries'
  );
}

// ============================================================================
// FORMAT CONVERSION (to Zotero schema)
// ============================================================================

/**
 * Infer Zotero item type from Semantic Scholar paper data
 */
function inferItemType(paper: SemanticScholarPaper): string {
  // Try publication venue type first
  if (paper.publicationVenue?.type) {
    const typeMap: Record<string, string> = {
      'conference': 'conferencePaper',
      'journal': 'journalArticle',
      'workshop': 'conferencePaper',
      'dataset': 'dataset',
      'preprint': 'preprint',
      'report': 'report',
      'book': 'book',
    };

    const mapped = typeMap[paper.publicationVenue.type.toLowerCase()];
    if (mapped) return mapped;
  }

  // Check publication types (from API)
  if (paper.publicationTypes && paper.publicationTypes.length > 0) {
    const type = paper.publicationTypes[0].toLowerCase();
    if (type.includes('conference')) return 'conferencePaper';
    if (type.includes('journal')) return 'journalArticle';
    if (type.includes('book')) return 'book';
  }

  // Default to journal article if has DOI
  if (paper.externalIds?.DOI) {
    return 'journalArticle';
  }

  // Default fallback
  return 'document';
}

/**
 * Parse authors from Semantic Scholar format to Zotero format
 */
function parseSemanticScholarAuthors(
  authors: SemanticScholarAuthor[]
): ZoteroCreator[] {
  return authors.map((author) => {
    // Try to split name on last space (First Last format)
    const parts = author.name.trim().split(/\s+/);

    if (parts.length === 1) {
      // Single name
      return {
        creatorType: 'author',
        lastName: parts[0],
      };
    }

    // Assume last part is surname, rest is first name
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');

    return {
      creatorType: 'author',
      firstName,
      lastName,
    };
  });
}

/**
 * Convert Semantic Scholar paper to Zotero item format
 */
export async function convertPaperToZoteroFormat(
  paper: SemanticScholarPaper,
  sourceUrl?: string
): Promise<ZoteroItemData> {
  const itemType = inferItemType(paper);
  const creators = parseSemanticScholarAuthors(paper.authors);

  const zoteroItem: ZoteroItemData = {
    itemType,
    title: paper.title.trim(),
    creators,
  };

  // Add year if available
  if (paper.year) {
    zoteroItem.date = String(paper.year);
  }

  // Add abstract
  if (paper.abstract) {
    zoteroItem.abstractNote = paper.abstract.trim();
  }

  // Add DOI if available
  if (paper.externalIds?.DOI) {
    zoteroItem.DOI = paper.externalIds.DOI;
  }

  // Add publication title (journal or conference)
  if (paper.publicationVenue?.name) {
    if (itemType === 'conferencePaper') {
      zoteroItem.proceedingsTitle = paper.publicationVenue.name;
    } else {
      zoteroItem.publicationTitle = paper.publicationVenue.name;
    }
  } else if (paper.venue) {
    zoteroItem.publicationTitle = paper.venue;
  }

  // Add URL (prefer OA PDF, fallback to Semantic Scholar page)
  if (paper.openAccessPdf?.url) {
    zoteroItem.url = paper.openAccessPdf.url;
  } else {
    const semanticScholarUrl = `https://www.semanticscholar.org/paper/${paper.paperId}`;
    zoteroItem.url = sourceUrl || semanticScholarUrl;
  }

  return zoteroItem;
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * All-in-one: fetch paper and convert to Zotero format
 *
 * Usage:
 *   const zoteroItem = await fetchAndConvertPaper(url);
 */
export async function fetchAndConvertPaper(
  paperIdOrUrl: string
): Promise<ZoteroItemData> {
  const paper = await fetchPaperFromSemanticScholar(paperIdOrUrl);
  return convertPaperToZoteroFormat(paper, paperIdOrUrl);
}
