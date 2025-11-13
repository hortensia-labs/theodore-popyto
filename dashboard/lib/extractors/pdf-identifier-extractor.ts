/**
 * PDF Identifier Extractor
 * 
 * Extracts identifiers from PDF files using Zotero's /previewpdf endpoint
 * and custom text-based extraction running in parallel
 */

import type { Identifier, IdentifierType } from './html-identifier-extractor';
import { normalizeIdentifier, REGEX_PATTERNS, deduplicateIdentifiers } from './html-identifier-extractor';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';

export interface PdfIdentifierResult {
  identifiers: Identifier[];
  metadata?: {
    title?: string;
    author?: string;
    pageCount?: number;
    textLength?: number;
    hasText?: boolean;
  };
  rawData?: {
    pages?: unknown[];
    metadata?: Record<string, unknown>;
  };
  cachedText?: string; // Cached PDF text for LLM fallback
  error?: string;
}

export interface PdfTextExtractionResult {
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
}

export interface ZoteroPdfPreviewResponse {
  success: boolean;
  mode?: string;
  message?: string;
  timestamp?: string;
  fileInfo?: {
    filename: string;
    size: number;
    contentType: string;
  };
  extraction?: {
    pageCount: number;
    pagesAnalyzed: number;
    textLength: number;
    hasText: boolean;
    textSample?: string;
  };
  identifiers?: Array<{
    type: string;
    value: string;
    location: string;
    confidence: string;
  }>;
  rawData?: {
    pages?: unknown[];
    metadata?: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Extract text from PDF buffer (first N pages for performance)
 */
async function extractPdfText(
  pdfContent: Buffer,
  maxPages: number = 3
): Promise<PdfTextExtractionResult> {
  try {
    const data = await pdfParse(pdfContent);
    const totalPages = data.numpages;
    const fullText = data.text;
    
    // Estimate text per page (rough approximation)
    const avgCharsPerPage = fullText.length / totalPages;
    const maxChars = Math.min(fullText.length, avgCharsPerPage * maxPages);
    const limitedText = fullText.substring(0, maxChars);
    
    // Split text into pages (rough approximation by splitting on double newlines)
    // This is not perfect but gives us a reasonable page structure
    const textChunks = limitedText.split(/\n\s*\n/);
    const pages: Array<{ pageNumber: number; text: string }> = [];
    
    // Group chunks into pages (roughly)
    const chunksPerPage = Math.max(1, Math.ceil(textChunks.length / maxPages));
    for (let i = 0; i < maxPages && i * chunksPerPage < textChunks.length; i++) {
      const startIdx = i * chunksPerPage;
      const endIdx = Math.min(startIdx + chunksPerPage, textChunks.length);
      const pageText = textChunks.slice(startIdx, endIdx).join('\n\n');
      if (pageText.trim()) {
        pages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }
    }
    
    return {
      text: limitedText,
      pageCount: Math.min(totalPages, maxPages),
      pages,
    };
  } catch (error) {
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract identifiers from PDF text using regex patterns (with pre-extracted text)
 */
async function extractIdentifiersFromPdfTextWithResult(
  extractionResult: PdfTextExtractionResult
): Promise<Identifier[]> {
  const identifiers: Identifier[] = [];
  
  // Search in each page
  for (const page of extractionResult.pages) {
    const pageText = page.text;
    
    // Apply regex patterns for each identifier type
    for (const [type, pattern] of Object.entries(REGEX_PATTERNS)) {
      const matches = pageText.matchAll(pattern);
      
      for (const match of matches) {
        const value = match[1] || match[0];
        const normalized = normalizeIdentifier(value, type as IdentifierType);
        
        if (normalized) {
          // Determine confidence based on position in page
          const position = match.index || 0;
          const pageLength = pageText.length;
          const relativePosition = position / pageLength;
          
          let confidence: 'high' | 'medium' | 'low' = 'low';
          if (relativePosition < 0.1) {
            confidence = 'high'; // Top 10% of page
          } else if (relativePosition < 0.3) {
            confidence = 'medium'; // Top 30% of page
          }
          
          identifiers.push({
            type: type as IdentifierType,
            value: normalized,
            source: `pdf_text:page_${page.pageNumber}`,
            confidence,
          });
        }
      }
    }
  }
  
  return identifiers;
}

/**
 * Extract identifiers from PDF text using regex patterns
 */
async function extractIdentifiersFromPdfText(
  pdfContent: Buffer,
  maxPages: number = 3
): Promise<Identifier[]> {
  try {
    const extractionResult = await extractPdfText(pdfContent, maxPages);
    return extractIdentifiersFromPdfTextWithResult(extractionResult);
  } catch (error) {
    console.error('PDF text identifier extraction error:', error);
    return [];
  }
}

/**
 * Extract identifiers from PDF buffer using Zotero and custom extraction in parallel
 */
export async function extractIdentifiersFromPdf(
  pdfContent: Buffer,
  filename: string = 'document.pdf',
  urlId?: number
): Promise<PdfIdentifierResult> {
  // First, extract PDF text (for caching and custom extraction)
  let pdfTextResult: PdfTextExtractionResult | null = null;
  let cachedText: string | undefined;
  
  try {
    pdfTextResult = await extractPdfText(pdfContent, 3);
    // Format text for caching
    cachedText = JSON.stringify({
      pages: pdfTextResult.pages,
      extractedAt: new Date().toISOString(),
    });
    
    // Cache the text if urlId is provided
    if (urlId && cachedText) {
      try {
        const { cachePdfText } = await import('../content-cache');
        await cachePdfText(urlId, cachedText);
      } catch (cacheError) {
        console.error('Failed to cache PDF text:', cacheError);
        // Don't fail extraction if caching fails
      }
    }
  } catch (textError) {
    console.error('PDF text extraction failed (continuing with Zotero only):', textError);
    // Continue with Zotero extraction even if text extraction fails
  }
  
  // Run Zotero and custom extraction in parallel
  const [zoteroResult, customIdentifiers] = await Promise.allSettled([
    // Zotero extraction
    (async () => {
      try {
        const form = new FormData();
        const uint8Array = new Uint8Array(pdfContent);
        const blob = new Blob([uint8Array], { type: 'application/pdf' });
        form.append('pdf', blob, filename);
        
        const response = await fetch(`${ZOTERO_API_BASE_URL}/citationlinker/previewpdf`, {
          method: 'POST',
          body: form,
        });
        
        if (!response.ok) {
          throw new Error(`Zotero PDF preview failed: ${response.status} ${response.statusText}`);
        }
        
        const data: ZoteroPdfPreviewResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'PDF processing failed');
        }
        
        return data;
      } catch (error) {
        throw error;
      }
    })(),
    // Custom text-based extraction (reuse already extracted text if available)
    pdfTextResult 
      ? extractIdentifiersFromPdfTextWithResult(pdfTextResult)
      : extractIdentifiersFromPdfText(pdfContent, 3),
  ]);
  
  // Process Zotero results
  const zoteroIdentifiers: Identifier[] = [];
  let metadata: PdfIdentifierResult['metadata'] | undefined;
  let rawData: PdfIdentifierResult['rawData'] | undefined;
  let zoteroError: string | undefined;
  
  if (zoteroResult.status === 'fulfilled') {
    const data = zoteroResult.value;
    
    if (data.identifiers && data.identifiers.length > 0) {
      for (const id of data.identifiers) {
        const identifierType = id.type as 'DOI' | 'PMID' | 'ARXIV' | 'ISBN';
        const normalized = normalizeIdentifier(id.value, identifierType);
        if (normalized) {
          zoteroIdentifiers.push({
            type: identifierType,
            value: normalized,
            source: `zotero_pdf:${id.location}`,
            confidence: mapZoteroConfidence(id.confidence),
          });
        }
      }
    }
    
    metadata = {
      title: data.rawData?.metadata?.title as string | undefined,
      author: data.rawData?.metadata?.author as string | undefined,
      pageCount: data.extraction?.pageCount,
      textLength: data.extraction?.textLength,
      hasText: data.extraction?.hasText,
    };
    
    rawData = data.rawData;
  } else {
    zoteroError = zoteroResult.reason instanceof Error 
      ? zoteroResult.reason.message 
      : String(zoteroResult.reason);
    console.error('Zotero PDF extraction failed:', zoteroError);
  }
  
  // Process custom extraction results
  const customIds = customIdentifiers.status === 'fulfilled' 
    ? customIdentifiers.value 
    : [];
  
  if (customIdentifiers.status === 'rejected') {
    console.error('Custom PDF extraction failed:', customIdentifiers.reason);
  }
  
  // Merge and deduplicate identifiers
  const allIdentifiers = [...zoteroIdentifiers, ...customIds];
  const mergedIdentifiers = deduplicateIdentifiers(allIdentifiers);
  
  // Determine overall error (only if both methods failed)
  const error = mergedIdentifiers.length === 0 && zoteroError && customIdentifiers.status === 'rejected'
    ? `Both extraction methods failed. Zotero: ${zoteroError}, Custom: ${customIdentifiers.reason instanceof Error ? customIdentifiers.reason.message : String(customIdentifiers.reason)}`
    : undefined;
  
  return {
    identifiers: mergedIdentifiers,
    metadata,
    rawData,
    cachedText,
    error,
  };
}

/**
 * Map Zotero confidence level to our system
 */
function mapZoteroConfidence(zoteroConfidence: string): 'high' | 'medium' | 'low' {
  const lower = zoteroConfidence.toLowerCase();
  if (lower === 'high') return 'high';
  if (lower === 'medium') return 'medium';
  return 'low';
}

/**
 * Check if Zotero is available
 */
export async function isZoteroAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${ZOTERO_API_BASE_URL}/connector/ping`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

