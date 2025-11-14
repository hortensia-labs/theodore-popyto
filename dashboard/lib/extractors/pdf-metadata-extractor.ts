/**
 * PDF Metadata Extractor
 * 
 * Extracts bibliographic metadata from PDF files using Zotero's preview response
 */

import type { ExtractedMetadata, Creator } from './html-metadata-extractor';
import { extractIdentifiersFromPdf } from './pdf-identifier-extractor';

/**
 * Extract metadata from PDF buffer using Zotero
 */
export async function extractMetadataFromPdf(
  pdfContent: Buffer,
  url: string,
  filename: string = 'document.pdf',
  urlId?: number
): Promise<ExtractedMetadata> {
  const metadata: ExtractedMetadata = {
    url,
    accessDate: new Date().toISOString(),
    extractionSources: {},
    itemType: 'document', // Default for PDFs
  };

  try {
    // Use Zotero's PDF preview to extract
    const result = await extractIdentifiersFromPdf(pdfContent, filename, urlId);

    // Extract from PDF metadata
    if (result.metadata) {
      if (result.metadata.title) {
        metadata.title = result.metadata.title;
        metadata.extractionSources.title = 'pdf_metadata';
      }

      if (result.metadata.author) {
        metadata.creators = parseAuthorString(result.metadata.author);
        metadata.extractionSources.creators = 'pdf_metadata';
      }
    }

    // Extract from text sample if metadata is incomplete
    if (result.rawData?.pages && (!metadata.title || !metadata.creators)) {
      const textMetadata = extractFromPdfText(result.rawData.pages);

      if (textMetadata.title && !metadata.title) {
        metadata.title = textMetadata.title;
        metadata.extractionSources.title = 'pdf_text_analysis';
      }

      if (textMetadata.authors && !metadata.creators) {
        metadata.creators = textMetadata.authors;
        metadata.extractionSources.creators = 'pdf_text_analysis';
      }

      if (textMetadata.date && !metadata.date) {
        metadata.date = textMetadata.date;
        metadata.extractionSources.date = 'pdf_text_analysis';
      }
    }
  } catch (error) {
    console.error('PDF metadata extraction failed:', error);
    // Return what we have
  }

  return metadata;
}

/**
 * Extract metadata from PDF with LLM fallback
 * Uses Zotero/text extraction first, falls back to LLM if incomplete
 */
export async function extractMetadataFromPdfWithLlmFallback(
  pdfContent: Buffer,
  url: string,
  filename: string = 'document.pdf',
  urlId?: number
): Promise<{
  metadata: ExtractedMetadata;
  extractionMethod: 'structured' | 'llm' | 'hybrid';
  llmResult?: import('./llm/providers/types').LlmExtractionResult;
}> {
  // First try structured extraction
  const structuredMetadata = await extractMetadataFromPdf(pdfContent, url, filename, urlId);

  // Check if metadata is complete
  const isComplete =
    structuredMetadata.title &&
    structuredMetadata.creators &&
    structuredMetadata.creators.length > 0 &&
    structuredMetadata.date &&
    structuredMetadata.itemType;

  if (isComplete) {
    return {
      metadata: structuredMetadata,
      extractionMethod: 'structured',
    };
  }

  // Try LLM extraction as fallback using cached PDF text
  try {
    // Get cached PDF text if available
    const { getCachedPdfText } = await import('../content-cache');
    const cachedText = urlId ? await getCachedPdfText(urlId) : null;

    if (!cachedText) {
      console.log('[PDF Extractor] No cached PDF text available for LLM extraction');
      return {
        metadata: structuredMetadata,
        extractionMethod: 'structured',
      };
    }

    const { extractMetadataWithLlm } = await import('./llm/llm-metadata-extractor');

    const llmResult = await extractMetadataWithLlm({
      text: cachedText,
      contentType: 'pdf',
      url,
      metadata: {
        domain: new URL(url).hostname,
        title: structuredMetadata.title,
      },
    });

    if (!llmResult.success) {
      console.log('[PDF Extractor] LLM extraction failed:', llmResult.error);
      return {
        metadata: structuredMetadata,
        extractionMethod: 'structured',
        llmResult,
      };
    }

    // Merge results
    const mergedMetadata: ExtractedMetadata = {
      ...structuredMetadata,
    };

    if (!mergedMetadata.itemType && llmResult.metadata?.itemType) {
      mergedMetadata.itemType = llmResult.metadata.itemType;
      mergedMetadata.extractionSources.itemType = 'llm';
    }

    if (!mergedMetadata.title && llmResult.metadata?.title) {
      mergedMetadata.title = llmResult.metadata.title;
      mergedMetadata.extractionSources.title = 'llm';
    }

    if (
      (!mergedMetadata.creators || mergedMetadata.creators.length === 0) &&
      llmResult.metadata?.creators
    ) {
      mergedMetadata.creators = llmResult.metadata.creators;
      mergedMetadata.extractionSources.creators = 'llm';
    }

    if (!mergedMetadata.date && llmResult.metadata?.date) {
      mergedMetadata.date = llmResult.metadata.date;
      mergedMetadata.extractionSources.date = 'llm';
    }

    // Determine extraction method
    const usedLlmData =
      (!structuredMetadata.itemType && llmResult.metadata?.itemType) ||
      (!structuredMetadata.title && llmResult.metadata?.title) ||
      ((!structuredMetadata.creators || structuredMetadata.creators.length === 0) &&
        llmResult.metadata?.creators) ||
      (!structuredMetadata.date && llmResult.metadata?.date);

    const extractionMethod = usedLlmData ? 'hybrid' : 'structured';

    return {
      metadata: mergedMetadata,
      extractionMethod,
      llmResult,
    };
  } catch (error) {
    console.error('[PDF Extractor] LLM extraction error:', error);
    return {
      metadata: structuredMetadata,
      extractionMethod: 'structured',
    };
  }
}

/**
 * Parse author string from PDF metadata
 */
function parseAuthorString(authorString: string): Creator[] {
  const creators: Creator[] = [];
  
  // Split by semicolon or comma
  const parts = authorString.split(/[;,]\s*/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Try to parse name
    const names = parseName(trimmed);
    creators.push({
      creatorType: 'author',
      ...names,
    });
  }
  
  return creators;
}

/**
 * Parse name into first/last
 */
function parseName(name: string): { firstName?: string; lastName?: string; name?: string } {
  const trimmed = name.trim();
  
  // "Last, First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    return {
      lastName: parts[0],
      firstName: parts[1] || '',
    };
  }
  
  // "First Last" format
  const words = trimmed.split(/\s+/);
  if (words.length === 2) {
    return {
      firstName: words[0],
      lastName: words[1],
    };
  } else if (words.length > 2) {
    return {
      firstName: words.slice(0, -1).join(' '),
      lastName: words[words.length - 1],
    };
  }
  
  return { name: trimmed };
}

/**
 * Extract metadata from PDF text (first few pages)
 */
function extractFromPdfText(pages: any[]): {
  title?: string;
  authors?: Creator[];
  date?: string;
} {
  const metadata: any = {};
  
  if (!pages || pages.length === 0) return metadata;
  
  // Extract text from first 2 pages
  const firstPageText = extractTextFromPage(pages[0]);
  const secondPageText = pages.length > 1 ? extractTextFromPage(pages[1]) : '';
  
  const combinedText = firstPageText + '\n' + secondPageText;
  const lines = combinedText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Heuristic: Title is usually one of the first large text blocks
  if (lines.length > 0 && !metadata.title) {
    // Find longest line in first 5 lines
    const titleCandidates = lines.slice(0, 5).filter(line => line.length > 20);
    if (titleCandidates.length > 0) {
      metadata.title = titleCandidates.reduce((a, b) => a.length > b.length ? a : b);
    }
  }
  
  // Look for author patterns
  const authorPatterns = [
    /^(?:by|author[s]?|written by)[:\s]+(.+)$/im,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s*,\s*[A-Z][a-z]+\s+[A-Z][a-z]+)*)$/m,
  ];
  
  for (const pattern of authorPatterns) {
    const match = pattern.exec(firstPageText);
    if (match) {
      metadata.authors = parseAuthorString(match[1]);
      break;
    }
  }
  
  // Look for date patterns
  const datePatterns = [
    /\b((?:19|20)\d{2})\b/,
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = pattern.exec(firstPageText);
    if (match) {
      metadata.date = match[1];
      break;
    }
  }
  
  return metadata;
}

/**
 * Extract text from PDF page data
 */
function extractTextFromPage(pageData: any): string {
  if (!pageData || !Array.isArray(pageData)) return '';
  
  // Page data format: [pageNum, [width, height], [[x, y, width, height, text, ...], ...]]
  const textBlocks = pageData[2];
  if (!Array.isArray(textBlocks)) return '';
  
  return textBlocks
    .map((block: any) => {
      // Extract text (usually at index 4)
      return Array.isArray(block) && block.length > 4 ? block[4] : '';
    })
    .filter(Boolean)
    .join(' ');
}

