/**
 * HTML Metadata Extractor
 * 
 * Extracts bibliographic metadata from HTML content using multiple strategies:
 * - Citation meta tags
 * - JSON-LD structured data
 * - OpenGraph tags
 * - HTML structure heuristics
 */

export interface Creator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ExtractedMetadata {
  title?: string;
  creators?: Creator[];
  date?: string;
  itemType?: string;
  abstractNote?: string;
  publicationTitle?: string;
  url?: string;
  accessDate?: string;
  language?: string;
  
  // Additional fields
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  
  // Extraction metadata
  extractionSources: Record<string, string>; // field -> source mapping
}

const CITATION_META_FIELDS: Record<string, string[]> = {
  title: ['citation_title', 'dc.title', 'og:title', 'twitter:title'],
  author: ['citation_author', 'dc.creator', 'article:author', 'author'],
  date: [
    'citation_publication_date',
    'citation_date',
    'dc.date',
    'article:published_time',
    'datePublished',
    'pubdate'
  ],
  publicationTitle: [
    'citation_journal_title',
    'citation_conference_title',
    'dc.source',
    'og:site_name'
  ],
  abstract: [
    'citation_abstract',
    'dc.description',
    'og:description',
    'twitter:description',
    'description'
  ],
  volume: ['citation_volume'],
  issue: ['citation_issue'],
  pages: ['citation_firstpage', 'citation_lastpage'],
  publisher: ['citation_publisher', 'dc.publisher'],
  doi: ['citation_doi', 'dc.identifier.doi'],
  isbn: ['citation_isbn', 'dc.identifier.isbn'],
  language: ['citation_language', 'dc.language', 'language'],
};

/**
 * Extract metadata from HTML content
 */
export async function extractMetadataFromHtml(
  htmlContent: string,
  url: string
): Promise<ExtractedMetadata> {
  const metadata: ExtractedMetadata = {
    url,
    accessDate: new Date().toISOString(),
    extractionSources: {},
  };
  
  // Strategy 1: Citation meta tags (highest priority)
  const metaTagData = extractFromMetaTags(htmlContent);
  Object.assign(metadata, metaTagData.metadata);
  Object.assign(metadata.extractionSources, metaTagData.sources);
  
  // Strategy 2: JSON-LD structured data
  const jsonLdData = extractFromJsonLd(htmlContent);
  mergeMetadata(metadata, jsonLdData.metadata, jsonLdData.sources);
  
  // Strategy 3: OpenGraph tags
  const ogData = extractFromOpenGraph(htmlContent);
  mergeMetadata(metadata, ogData.metadata, ogData.sources);
  
  // Strategy 4: HTML structure heuristics
  const structureData = extractFromHtmlStructure(htmlContent);
  mergeMetadata(metadata, structureData.metadata, structureData.sources);
  
  // Detect item type
  metadata.itemType = detectItemType(metadata, url);
  
  // Parse creators if they're strings
  if (metadata.creators && metadata.creators.length === 0) {
    metadata.creators = parseCreatorsFromString(metaTagData.metadata.authors);
  }
  
  return metadata;
}

/**
 * Extract from meta tags
 */
function extractFromMetaTags(htmlContent: string): {
  metadata: Partial<ExtractedMetadata> & { authors?: string };
  sources: Record<string, string>;
} {
  const metadata: any = {};
  const sources: Record<string, string> = {};
  const authors: string[] = [];
  
  // Extract all meta tags
  const metaTagRegex = /<meta\s+([^>]+)>/gi;
  let match;
  
  while ((match = metaTagRegex.exec(htmlContent)) !== null) {
    const metaContent = match[1];
    
    // Extract name and content attributes
    const nameMatch = /(?:name|property)=["']([^"']+)["']/i.exec(metaContent);
    const contentMatch = /content=["']([^"']+)["']/i.exec(metaContent);
    
    if (!nameMatch || !contentMatch) continue;
    
    const name = nameMatch[1].toLowerCase();
    const content = contentMatch[1].trim();
    
    if (!content) continue;
    
    // Check each field
    for (const [field, patterns] of Object.entries(CITATION_META_FIELDS)) {
      for (const pattern of patterns) {
        if (name === pattern.toLowerCase()) {
          if (field === 'author') {
            authors.push(content);
            sources['creators'] = `meta[name="${name}"]`;
          } else {
            if (!metadata[field]) { // Don't overwrite if already found
              metadata[field] = content;
              sources[field] = `meta[name="${name}"]`;
            }
          }
        }
      }
    }
  }
  
  if (authors.length > 0) {
    metadata.authors = authors.join('; ');
  }
  
  return { metadata, sources };
}

/**
 * Extract from JSON-LD
 */
function extractFromJsonLd(htmlContent: string): {
  metadata: Partial<ExtractedMetadata>;
  sources: Record<string, string>;
} {
  const metadata: any = {};
  const sources: Record<string, string> = {};
  
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  
  while ((match = jsonLdRegex.exec(htmlContent)) !== null) {
    try {
      const jsonData = JSON.parse(match[1]);
      const items = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      for (const item of items) {
        const type = item['@type'];
        
        // Title
        if (item.headline && !metadata.title) {
          metadata.title = item.headline;
          sources.title = `JSON-LD @type:${type}`;
        } else if (item.name && !metadata.title) {
          metadata.title = item.name;
          sources.title = `JSON-LD @type:${type}`;
        }
        
        // Authors
        if (item.author && !metadata.creators) {
          metadata.creators = parseJsonLdAuthors(item.author);
          sources.creators = `JSON-LD @type:${type}`;
        }
        
        // Date
        if (item.datePublished && !metadata.date) {
          metadata.date = item.datePublished;
          sources.date = `JSON-LD @type:${type}`;
        } else if (item.dateCreated && !metadata.date) {
          metadata.date = item.dateCreated;
          sources.date = `JSON-LD @type:${type}`;
        }
        
        // Abstract
        if (item.description && !metadata.abstractNote) {
          metadata.abstractNote = item.description;
          sources.abstractNote = `JSON-LD @type:${type}`;
        }
        
        // Publication
        if (item.publisher && !metadata.publicationTitle) {
          if (typeof item.publisher === 'string') {
            metadata.publicationTitle = item.publisher;
          } else if (item.publisher.name) {
            metadata.publicationTitle = item.publisher.name;
          }
          sources.publicationTitle = `JSON-LD @type:${type}`;
        }
        
        // Language
        if (item.inLanguage && !metadata.language) {
          metadata.language = typeof item.inLanguage === 'string' 
            ? item.inLanguage 
            : item.inLanguage.name || item.inLanguage['@value'];
          sources.language = `JSON-LD @type:${type}`;
        }
      }
    } catch (error) {
      // Invalid JSON, skip
    }
  }
  
  return { metadata, sources };
}

/**
 * Extract from OpenGraph tags
 */
function extractFromOpenGraph(htmlContent: string): {
  metadata: Partial<ExtractedMetadata>;
  sources: Record<string, string>;
} {
  const metadata: any = {};
  const sources: Record<string, string> = {};
  
  const ogRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  
  while ((match = ogRegex.exec(htmlContent)) !== null) {
    const property = match[1].toLowerCase();
    const content = match[2].trim();
    
    if (property === 'title' && !metadata.title) {
      metadata.title = content;
      sources.title = 'og:title';
    } else if (property === 'description' && !metadata.abstractNote) {
      metadata.abstractNote = content;
      sources.abstractNote = 'og:description';
    } else if (property === 'site_name' && !metadata.publicationTitle) {
      metadata.publicationTitle = content;
      sources.publicationTitle = 'og:site_name';
    } else if (property === 'published_time' && !metadata.date) {
      metadata.date = content;
      sources.date = 'og:published_time';
    } else if ((property === 'article:author' || property === 'author') && !metadata.creators) {
      metadata.creators = parseCreatorsFromString(content);
      sources.creators = `og:${property}`;
    }
  }
  
  return { metadata, sources };
}

/**
 * Extract from HTML structure
 */
function extractFromHtmlStructure(htmlContent: string): {
  metadata: Partial<ExtractedMetadata>;
  sources: Record<string, string>;
} {
  const metadata: any = {};
  const sources: Record<string, string> = {};
  
  // Remove script and style tags
  const cleanContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Extract title from <title> tag if not found
  if (!metadata.title) {
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(cleanContent);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
      sources.title = '<title> tag';
    }
  }
  
  // Extract from <h1> if not found
  if (!metadata.title) {
    const h1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(cleanContent);
    if (h1Match) {
      metadata.title = h1Match[1].trim();
      sources.title = '<h1> tag';
    }
  }
  
  // Extract author from author tags
  if (!metadata.creators) {
    const authorMatch = /<(?:span|div|a)[^>]*(?:class|rel)=["'][^"']*author[^"']*["'][^>]*>([^<]+)</i.exec(cleanContent);
    if (authorMatch) {
      metadata.creators = parseCreatorsFromString(authorMatch[1]);
      sources.creators = 'author element';
    }
  }
  
  // Extract date from <time> tag
  if (!metadata.date) {
    const timeMatch = /<time[^>]*datetime=["']([^"']+)["']/i.exec(cleanContent);
    if (timeMatch) {
      metadata.date = timeMatch[1];
      sources.date = '<time> tag';
    }
  }
  
  return { metadata, sources };
}

/**
 * Parse JSON-LD authors
 */
function parseJsonLdAuthors(author: any): Creator[] {
  const creators: Creator[] = [];
  const authors = Array.isArray(author) ? author : [author];
  
  for (const a of authors) {
    if (typeof a === 'string') {
      creators.push(...parseCreatorsFromString(a));
    } else if (a.name) {
      const names = parseName(a.name);
      creators.push({
        creatorType: 'author',
        ...names,
      });
    }
  }
  
  return creators;
}

/**
 * Parse creators from string (handles "First Last", "Last, First", etc.)
 */
function parseCreatorsFromString(authorString?: string): Creator[] {
  if (!authorString) return [];
  
  const creators: Creator[] = [];
  
  // Split by common separators
  const authorParts = authorString.split(/[;,]\s*(?:and\s+)?|(?:\s+and\s+)/i);
  
  for (const part of authorParts) {
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
 * Parse a single name into first/last or single field
 */
function parseName(name: string): { firstName?: string; lastName?: string; name?: string } {
  const trimmed = name.trim();
  
  // Check for "Last, First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    return {
      lastName: parts[0],
      firstName: parts[1] || '',
    };
  }
  
  // Check for "First Last" format
  const words = trimmed.split(/\s+/);
  if (words.length === 2) {
    return {
      firstName: words[0],
      lastName: words[1],
    };
  } else if (words.length > 2) {
    // Assume last word is last name, rest is first name
    return {
      firstName: words.slice(0, -1).join(' '),
      lastName: words[words.length - 1],
    };
  }
  
  // Single word or organizational name
  return { name: trimmed };
}

/**
 * Detect item type from metadata and URL
 */
export function detectItemType(metadata: Partial<ExtractedMetadata>, url: string): string {
  // Check for explicit type in metadata
  // (some sites include this in meta tags)
  
  // Check domain patterns
  const domain = new URL(url).hostname.toLowerCase();
  
  const DOMAIN_PATTERNS: Record<string, string> = {
    'arxiv.org': 'preprint',
    'biorxiv.org': 'preprint',
    'medium.com': 'blogPost',
    'substack.com': 'blogPost',
    'github.com': 'webpage',
    'youtube.com': 'videoRecording',
    'wikipedia.org': 'encyclopediaArticle',
  };
  
  for (const [pattern, type] of Object.entries(DOMAIN_PATTERNS)) {
    if (domain.includes(pattern)) {
      return type;
    }
  }
  
  // Check for academic indicators
  if (metadata.publicationTitle && (
    metadata.volume || metadata.issue || metadata.pages
  )) {
    return 'journalArticle';
  }
  
  // Check for conference paper indicators
  if (metadata.publicationTitle && metadata.publicationTitle.toLowerCase().includes('conference')) {
    return 'conferencePaper';
  }
  
  // Check for blog post indicators
  if (domain.includes('blog') || url.includes('/blog/')) {
    return 'blogPost';
  }
  
  // Default fallback
  return 'webpage';
}

/**
 * Merge metadata, only if target field is not set
 */
function mergeMetadata(
  target: ExtractedMetadata,
  source: Partial<ExtractedMetadata>,
  sourceSources: Record<string, string>
): void {
  for (const [key, value] of Object.entries(source)) {
    if (value && !target[key as keyof ExtractedMetadata]) {
      (target as any)[key] = value;
      if (sourceSources[key]) {
        target.extractionSources[key] = sourceSources[key];
      }
    }
  }
}

/**
 * Clean extracted title (remove site name suffixes)
 */
export function cleanTitle(title: string): string {
  // Remove common suffixes
  const suffixes = [
    / \| .+$/,     // " | Site Name"
    / - .+$/,      // " - Site Name"
    / :: .+$/,     // " :: Site Name"
    / > .+$/,      // " > Site Name"
  ];
  
  let cleaned = title;
  for (const suffix of suffixes) {
    cleaned = cleaned.replace(suffix, '');
  }
  
  return cleaned.trim();
}

/**
 * Normalize date to ISO format or year
 */
export function normalizeDate(date: string): string {
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.substring(0, 10); // YYYY-MM-DD
  }

  // Extract year
  const yearMatch = /\b(19|20)\d{2}\b/.exec(date);
  if (yearMatch) {
    return yearMatch[0];
  }

  // Try to parse as date
  try {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }
  } catch (error) {
    // Not a valid date
  }

  return date;
}

/**
 * Extract metadata with LLM fallback
 * Uses structured extraction first, falls back to LLM if incomplete
 */
export async function extractMetadataFromHtmlWithLlmFallback(
  htmlContent: string,
  url: string
): Promise<{
  metadata: ExtractedMetadata;
  extractionMethod: 'structured' | 'llm' | 'hybrid';
  llmResult?: import('./llm/providers/types').LlmExtractionResult;
}> {
  // First try structured extraction
  const structuredMetadata = await extractMetadataFromHtml(htmlContent, url);

  // Check if metadata is complete (has title, creators, date, itemType)
  const isComplete =
    structuredMetadata.title &&
    structuredMetadata.creators &&
    structuredMetadata.creators.length > 0 &&
    structuredMetadata.date &&
    structuredMetadata.itemType;

  if (isComplete) {
    // Structured extraction succeeded
    return {
      metadata: structuredMetadata,
      extractionMethod: 'structured',
    };
  }

  // Try LLM extraction as fallback
  try {
    const { extractMetadataWithLlm } = await import('./llm/llm-metadata-extractor');

    const llmResult = await extractMetadataWithLlm({
      text: htmlContent,
      contentType: 'html',
      url,
      metadata: {
        domain: new URL(url).hostname,
        title: structuredMetadata.title,
      },
    });

    if (!llmResult.success) {
      // LLM extraction failed, return structured results
      console.log('[HTML Extractor] LLM extraction failed:', llmResult.error);
      return {
        metadata: structuredMetadata,
        extractionMethod: 'structured',
        llmResult,
      };
    }

    // Merge results (prefer high-confidence structured data)
    const mergedMetadata: ExtractedMetadata = {
      ...structuredMetadata,
    };

    // Use LLM data for missing fields or low-confidence structured data
    if (!mergedMetadata.itemType && llmResult.metadata?.itemType) {
      mergedMetadata.itemType = llmResult.metadata.itemType;
    }

    if (!mergedMetadata.title && llmResult.metadata?.title) {
      mergedMetadata.title = llmResult.metadata.title;
    }

    if (
      (!mergedMetadata.creators || mergedMetadata.creators.length === 0) &&
      llmResult.metadata?.creators
    ) {
      mergedMetadata.creators = llmResult.metadata.creators;
    }

    if (!mergedMetadata.date && llmResult.metadata?.date) {
      mergedMetadata.date = llmResult.metadata.date;
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
    // LLM extraction errored, return structured results
    console.error('[HTML Extractor] LLM extraction error:', error);
    return {
      metadata: structuredMetadata,
      extractionMethod: 'structured',
    };
  }
}

