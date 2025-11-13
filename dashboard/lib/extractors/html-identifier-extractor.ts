/**
 * HTML Identifier Extractor
 * 
 * Extracts bibliographic identifiers (DOI, PMID, ArXiv, ISBN) from HTML content
 * using multiple strategies: meta tags, JSON-LD, OpenGraph, and content regex
 */

export type IdentifierType = 'DOI' | 'PMID' | 'ARXIV' | 'ISBN';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Identifier {
  type: IdentifierType;
  value: string;
  source: string; // Where it was found
  confidence: ConfidenceLevel;
}

// Meta tag patterns for each identifier type
const META_TAG_PATTERNS: Record<IdentifierType, string[]> = {
  DOI: [
    'citation_doi',
    'dc.identifier.doi',
    'dc.identifier',
    'prism.doi',
    'bepress_citation_doi',
    'rft.id',
  ],
  PMID: [
    'citation_pmid',
    'dc.identifier.pmid',
  ],
  ARXIV: [
    'citation_arxiv_id',
  ],
  ISBN: [
    'citation_isbn',
    'dc.identifier.isbn',
    'prism.isbn',
  ],
};

// Regex patterns for content extraction
export const REGEX_PATTERNS: Record<IdentifierType, RegExp> = {
  DOI: /\b(10\.\d{4,9}\/[-._;()\/:a-zA-Z0-9]+)\b/g,
  PMID: /\b(?:PMID|pubmed)[:\s]+(\d{7,8})\b/gi,
  ARXIV: /\b(?:arXiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)\b/g,
  ISBN: /\bISBN[-\s]?(?:13)?[:\s]*(\d{3}[-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d)\b/gi,
};

/**
 * Extract identifiers from HTML content
 */
export async function extractIdentifiersFromHtml(
  htmlContent: string,
  url: string
): Promise<Identifier[]> {
  const identifiers: Identifier[] = [];
  
  // Strategy 1: Meta tags (highest confidence)
  identifiers.push(...extractFromMetaTags(htmlContent));
  
  // Strategy 2: JSON-LD structured data
  identifiers.push(...extractFromJsonLd(htmlContent));
  
  // Strategy 3: OpenGraph tags
  identifiers.push(...extractFromOpenGraph(htmlContent));
  
  // Strategy 4: Content regex (lowest confidence)
  identifiers.push(...extractFromContent(htmlContent));
  
  // Deduplicate and normalize
  const deduplicated = deduplicateIdentifiers(identifiers);
  
  // Validate identifiers
  const validated = deduplicated.filter(id => validateIdentifier(id));
  
  return validated;
}

/**
 * Extract identifiers from meta tags
 */
function extractFromMetaTags(htmlContent: string): Identifier[] {
  const identifiers: Identifier[] = [];
  
  // Extract all meta tags
  const metaTagRegex = /<meta\s+([^>]+)>/gi;
  let match;
  
  while ((match = metaTagRegex.exec(htmlContent)) !== null) {
    const metaContent = match[1];
    
    // Extract name and content attributes
    const nameMatch = /name=["']([^"']+)["']/i.exec(metaContent);
    const contentMatch = /content=["']([^"']+)["']/i.exec(metaContent);
    
    if (!nameMatch || !contentMatch) continue;
    
    const name = nameMatch[1].toLowerCase();
    const content = contentMatch[1].trim();
    
    if (!content) continue;
    
    // Check each identifier type
    for (const [type, patterns] of Object.entries(META_TAG_PATTERNS)) {
      for (const pattern of patterns) {
        if (name === pattern.toLowerCase()) {
          const normalized = normalizeIdentifier(content, type as IdentifierType);
          if (normalized) {
            identifiers.push({
              type: type as IdentifierType,
              value: normalized,
              source: `meta[name="${name}"]`,
              confidence: 'high',
            });
          }
        }
      }
    }
  }
  
  return identifiers;
}

/**
 * Extract identifiers from JSON-LD structured data
 */
function extractFromJsonLd(htmlContent: string): Identifier[] {
  const identifiers: Identifier[] = [];
  
  // Find JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdRegex.exec(htmlContent)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      
      // Handle arrays
      const items = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      for (const item of items) {
        // Check for identifier field
        if (item.identifier) {
          const id = extractIdentifierFromValue(item.identifier);
          if (id) {
            identifiers.push({
              ...id,
              source: 'JSON-LD @type:' + (item['@type'] || 'unknown'),
              confidence: 'high',
            });
          }
        }
        
        // Check for DOI in sameAs
        if (item.sameAs) {
          const sameAsArray = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
          for (const url of sameAsArray) {
            if (typeof url === 'string' && url.includes('doi.org')) {
              const doi = url.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '');
              if (doi) {
                identifiers.push({
                  type: 'DOI',
                  value: normalizeIdentifier(doi, 'DOI') || doi,
                  source: 'JSON-LD sameAs',
                  confidence: 'high',
                });
              }
            }
          }
        }
        
        // Check for ISBN
        if (item.isbn) {
          const isbn = normalizeIdentifier(item.isbn, 'ISBN');
          if (isbn) {
            identifiers.push({
              type: 'ISBN',
              value: isbn,
              source: 'JSON-LD isbn',
              confidence: 'high',
            });
          }
        }
      }
    } catch (error) {
      // Invalid JSON, skip
    }
  }
  
  return identifiers;
}

/**
 * Extract identifier from JSON-LD identifier value
 */
function extractIdentifierFromValue(identifier: any): Identifier | null {
  if (typeof identifier === 'string') {
    // Check if it's a DOI URL
    if (identifier.includes('doi.org')) {
      const doi = identifier.replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '');
      if (doi) {
        return {
          type: 'DOI',
          value: normalizeIdentifier(doi, 'DOI') || doi,
          source: 'JSON-LD identifier',
          confidence: 'high',
        };
      }
    }
    
    // Check if it starts with known prefixes
    if (identifier.startsWith('10.')) {
      return {
        type: 'DOI',
        value: normalizeIdentifier(identifier, 'DOI') || identifier,
        source: 'JSON-LD identifier',
        confidence: 'high',
      };
    }
  } else if (typeof identifier === 'object' && identifier !== null) {
    // Handle structured identifier
    if (identifier['@type'] === 'PropertyValue') {
      const propertyID = identifier.propertyID?.toLowerCase();
      const value = identifier.value;
      
      if (propertyID === 'doi' && value) {
        return {
          type: 'DOI',
          value: normalizeIdentifier(value, 'DOI') || value,
          source: 'JSON-LD PropertyValue',
          confidence: 'high',
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract identifiers from OpenGraph tags
 */
function extractFromOpenGraph(htmlContent: string): Identifier[] {
  const identifiers: Identifier[] = [];
  
  // Find og: meta tags
  const ogRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  
  while ((match = ogRegex.exec(htmlContent)) !== null) {
    const property = match[1].toLowerCase();
    const content = match[2].trim();
    
    // Check for identifier-related properties
    if (property.includes('identifier') || property.includes('doi')) {
      const doi = normalizeIdentifier(content, 'DOI');
      if (doi) {
        identifiers.push({
          type: 'DOI',
          value: doi,
          source: `og:${property}`,
          confidence: 'medium',
        });
      }
    }
  }
  
  return identifiers;
}

/**
 * Extract identifiers from page content using regex
 */
function extractFromContent(htmlContent: string): Identifier[] {
  const identifiers: Identifier[] = [];
  
  // Remove script and style tags
  const cleanContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Extract first 2000 characters (identifiers are usually near the top)
  const contentStart = cleanContent.substring(0, 2000);
  
  // Apply regex patterns
  for (const [type, pattern] of Object.entries(REGEX_PATTERNS)) {
    const matches = contentStart.matchAll(pattern);
    
    for (const match of matches) {
      const value = match[1] || match[0];
      const normalized = normalizeIdentifier(value, type as IdentifierType);
      
      if (normalized) {
        // Determine confidence based on position
        const position = match.index || 0;
        const confidence: ConfidenceLevel = position < 500 ? 'medium' : 'low';
        
        identifiers.push({
          type: type as IdentifierType,
          value: normalized,
          source: `content_regex (pos:${position})`,
          confidence,
        });
      }
    }
  }
  
  return identifiers;
}

/**
 * Normalize identifier value
 */
export function normalizeIdentifier(value: string, type: IdentifierType): string | null {
  if (!value) return null;
  
  let normalized = value.trim();
  
  switch (type) {
    case 'DOI':
      // Remove common prefixes
      normalized = normalized
        .replace(/^doi:\s*/i, '')
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .toLowerCase();
      
      // Validate format
      if (!/^10\.\d{4,9}\/[-._;()\/:a-zA-Z0-9]+$/.test(normalized)) {
        return null;
      }
      break;
      
    case 'PMID':
      // Remove prefix and get digits only
      normalized = normalized.replace(/^(?:PMID|pubmed)[:\s]*/i, '').replace(/\D/g, '');
      
      // Validate length (7-8 digits)
      if (!/^\d{7,8}$/.test(normalized)) {
        return null;
      }
      break;
      
    case 'ARXIV':
      // Remove prefix
      normalized = normalized.replace(/^arxiv:\s*/i, '').toLowerCase();
      
      // Validate format
      if (!/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(normalized)) {
        return null;
      }
      break;
      
    case 'ISBN':
      // Remove all non-digit and non-X characters
      normalized = normalized.replace(/[^0-9X]/gi, '').toUpperCase();
      
      // Validate length (10 or 13 digits)
      if (!/^(?:\d{10}|\d{13})$/.test(normalized)) {
        return null;
      }
      
      // TODO: Validate checksum
      break;
  }
  
  return normalized;
}

/**
 * Validate identifier format
 */
function validateIdentifier(identifier: Identifier): boolean {
  const normalized = normalizeIdentifier(identifier.value, identifier.type);
  return normalized !== null;
}

/**
 * Deduplicate identifiers
 */
export function deduplicateIdentifiers(identifiers: Identifier[]): Identifier[] {
  const seen = new Map<string, Identifier>();
  
  for (const id of identifiers) {
    const normalized = normalizeIdentifier(id.value, id.type);
    if (!normalized) continue;
    
    const key = `${id.type}:${normalized}`;
    const existing = seen.get(key);
    
    // Keep the one with highest confidence
    if (!existing || getConfidenceScore(id.confidence) > getConfidenceScore(existing.confidence)) {
      seen.set(key, {
        ...id,
        value: normalized,
      });
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Get numeric score for confidence level
 */
function getConfidenceScore(confidence: ConfidenceLevel): number {
  const scores = { high: 3, medium: 2, low: 1 };
  return scores[confidence];
}

/**
 * Sort identifiers by priority and confidence
 */
export function sortIdentifiersByPriority(identifiers: Identifier[]): Identifier[] {
  const typePriority: Record<IdentifierType, number> = {
    DOI: 4,
    PMID: 3,
    ARXIV: 2,
    ISBN: 1,
  };
  
  return identifiers.sort((a, b) => {
    // Primary: Type priority
    const typeDiff = typePriority[b.type] - typePriority[a.type];
    if (typeDiff !== 0) return typeDiff;
    
    // Secondary: Confidence
    return getConfidenceScore(b.confidence) - getConfidenceScore(a.confidence);
  });
}

