/**
 * Metadata Validator
 * 
 * Validates and scores extracted bibliographic metadata
 */

import type { ExtractedMetadata } from './extractors/html-metadata-extractor';

export interface ValidationResult {
  status: 'valid' | 'incomplete' | 'invalid';
  score: number; // 0-100
  missingFields: string[];
  warnings: string[];
  errors: string[];
}

const MINIMUM_REQUIRED_FIELDS = ['title', 'creators', 'date', 'itemType'];
const RECOMMENDED_FIELDS = ['publicationTitle', 'abstractNote'];

/**
 * Validate extracted metadata
 */
export function validateExtractedMetadata(
  metadata: ExtractedMetadata
): ValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check required fields
  if (!metadata.title || metadata.title.trim().length === 0) {
    missingFields.push('title');
    errors.push('Title is required');
  } else if (metadata.title.length < 10) {
    warnings.push('Title is very short (< 10 characters)');
  } else if (metadata.title.length > 500) {
    warnings.push('Title is very long (> 500 characters)');
  }
  
  // Check for placeholder titles
  const placeholderTitles = [
    'untitled',
    'no title',
    'unknown',
    'page not found',
    '404',
    'error',
  ];
  
  if (metadata.title && placeholderTitles.some(p => 
    metadata.title!.toLowerCase().includes(p)
  )) {
    errors.push('Title appears to be a placeholder value');
  }
  
  // Check creators
  if (!metadata.creators || metadata.creators.length === 0) {
    missingFields.push('creators');
    errors.push('At least one creator is required');
  } else {
    // Validate creator names
    for (const creator of metadata.creators) {
      const name = creator.name || `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
      if (name.length === 0) {
        warnings.push('One or more creators have empty names');
      }
      
      // Check for suspicious creator names
      if (name.includes('@') || name.includes('http')) {
        warnings.push('Creator name looks suspicious (contains @ or http)');
      }
    }
  }
  
  // Check date
  if (!metadata.date || metadata.date.trim().length === 0) {
    missingFields.push('date');
    errors.push('Date is required');
  } else {
    // Validate date format
    const year = extractYear(metadata.date);
    if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
      warnings.push('Date appears invalid or out of reasonable range');
    }
  }
  
  // Check item type
  if (!metadata.itemType) {
    missingFields.push('itemType');
    errors.push('Item type is required');
  }
  
  // Check recommended fields
  if (!metadata.publicationTitle) {
    warnings.push('Publication title is recommended for better citations');
  }
  
  if (!metadata.abstractNote) {
    warnings.push('Abstract is recommended but not required');
  }
  
  // Calculate quality score
  const score = calculateMetadataQualityScore(metadata);
  
  // Determine overall status
  let status: 'valid' | 'incomplete' | 'invalid';
  if (errors.length > 0) {
    status = 'invalid';
  } else if (missingFields.length > 0) {
    status = 'incomplete';
  } else {
    status = 'valid';
  }
  
  return {
    status,
    score,
    missingFields,
    warnings,
    errors,
  };
}

/**
 * Calculate quality score for extracted metadata
 */
export function calculateMetadataQualityScore(metadata: ExtractedMetadata): number {
  let score = 0;
  
  // Title (30 points)
  if (metadata.title && metadata.title.length > 0) {
    score += 20;
    if (metadata.title.length > 20 && metadata.title.length < 300) {
      score += 10; // Reasonable length
    }
  }
  
  // Creators (30 points)
  if (metadata.creators && metadata.creators.length > 0) {
    score += 20;
    if (metadata.creators.length > 1) score += 5;
    
    // Check if creators have first and last names
    const hasFullNames = metadata.creators.some(
      c => c.firstName && c.lastName
    );
    if (hasFullNames) score += 5;
  }
  
  // Date (20 points)
  if (metadata.date) {
    score += 15;
    
    // Check date specificity
    if (/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
      score += 5; // Full date YYYY-MM-DD
    } else if (/^\d{4}-\d{2}$/.test(metadata.date)) {
      score += 3; // Year and month
    }
  }
  
  // Item Type (10 points)
  if (metadata.itemType && metadata.itemType !== 'webpage') {
    score += 10;
  } else if (metadata.itemType === 'webpage') {
    score += 5; // Half points for generic type
  }
  
  // Abstract (5 points)
  if (metadata.abstractNote && metadata.abstractNote.length > 100) {
    score += 5;
  }
  
  // Publication Title (5 points)
  if (metadata.publicationTitle) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Extract year from date string
 */
function extractYear(date: string): number | null {
  // ISO format
  if (/^\d{4}/.test(date)) {
    return parseInt(date.substring(0, 4), 10);
  }
  
  // Find any 4-digit year
  const yearMatch = /\b(19|20)\d{2}\b/.exec(date);
  if (yearMatch) {
    return parseInt(yearMatch[0], 10);
  }
  
  return null;
}

/**
 * Extract metadata from PDF text pages
 */
function extractFromPdfText(pages: any[]): {
  title?: string;
  authors?: Creator[];
  date?: string;
} {
  const metadata: any = {};
  
  if (!pages || pages.length === 0) return metadata;
  
  // Get text from first page
  const firstPageText = extractPageText(pages[0]);
  const lines = firstPageText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Title heuristic: Often the longest line in first few lines
  const titleCandidates = lines.slice(0, 10).filter(line => 
    line.length > 20 && 
    line.length < 300 &&
    !/^\d+$/.test(line) && // Not just numbers
    !line.toLowerCase().startsWith('page ') // Not page numbers
  );
  
  if (titleCandidates.length > 0) {
    metadata.title = titleCandidates.reduce((a, b) => 
      a.length > b.length ? a : b
    );
  }
  
  // Author patterns
  const authorPatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)(?:\s*,\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+))*$/m,
    /^(?:by|author[s]?)[:\s]+(.+)$/im,
  ];
  
  for (const pattern of authorPatterns) {
    const match = pattern.exec(firstPageText);
    if (match) {
      const authorString = match[1] || match[0];
      metadata.authors = parseAuthorString(authorString);
      break;
    }
  }
  
  // Date patterns
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
 * Extract text from single page data
 */
function extractPageText(pageData: any): string {
  if (!pageData || !Array.isArray(pageData) || pageData.length < 3) return '';
  
  const textBlocks = pageData[2];
  if (!Array.isArray(textBlocks)) return '';
  
  return textBlocks
    .map((block: any) => Array.isArray(block) && block.length > 4 ? block[4] : '')
    .filter(Boolean)
    .join('\n');
}

/**
 * Parse author string helper
 */
function parseAuthorString(authorString: string): Creator[] {
  const creators: Creator[] = [];
  const parts = authorString.split(/[;,]\s*(?:and\s+)?/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const names = parseName(trimmed);
    creators.push({
      creatorType: 'author',
      ...names,
    });
  }
  
  return creators;
}

/**
 * Parse single name
 */
function parseName(name: string): { firstName?: string; lastName?: string; name?: string } {
  const trimmed = name.trim();
  
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    return { lastName: parts[0], firstName: parts[1] || '' };
  }
  
  const words = trimmed.split(/\s+/);
  if (words.length === 2) {
    return { firstName: words[0], lastName: words[1] };
  } else if (words.length > 2) {
    return {
      firstName: words.slice(0, -1).join(' '),
      lastName: words[words.length - 1],
    };
  }
  
  return { name: trimmed };
}

