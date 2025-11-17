/**
 * Extract Semantic Scholar BibTeX Citation Server Action
 * 
 * Fetches Semantic Scholar article pages and extracts BibTeX metadata
 * to create Zotero items directly.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlEnrichments, zoteroItemLinks } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as cheerio from 'cheerio';
import { createItem, getItem, validateCitation } from '../zotero-client';
import type { ZoteroItemData, ZoteroCreator } from '../zotero-client';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { recordProcessingAttempt } from '../orchestrator/processing-helpers';
import type { ProcessingStatus } from '../types/url-processing';

/**
 * Result of BibTeX extraction
 */
export interface ExtractSemanticScholarBibTeXResult {
  success: boolean;
  itemKey?: string;
  extractedFields: string[];
  message: string;
  error?: string;
}

/**
 * Simple BibTeX entry structure
 */
interface BibTeXEntry {
  type: string; // @article, @inproceedings, etc.
  key: string; // Citation key
  fields: Record<string, string>; // Field name -> value
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Parse BibTeX string into structured data
 */
function parseBibTeX(bibtexText: string): BibTeXEntry | null {
  try {
    // Remove leading/trailing whitespace
    bibtexText = bibtexText.trim();
    
    // Extract entry type (@article, @inproceedings, etc.)
    const typeMatch = bibtexText.match(/@(\w+)\s*\{/);
    if (!typeMatch) {
      return null;
    }
    
    const type = typeMatch[1].toLowerCase();
    
    // Extract citation key (first word after opening brace)
    const keyMatch = bibtexText.match(/\{\s*([^,\s]+)/);
    const key = keyMatch ? keyMatch[1] : '';
    
    // Extract fields (key = value,)
    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g;
    let match;
    
    while ((match = fieldRegex.exec(bibtexText)) !== null) {
      const fieldName = match[1].toLowerCase();
      let fieldValue = match[2];
      
      // Remove common BibTeX formatting
      fieldValue = fieldValue
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\&/g, '&')
        .replace(/\\{/g, '{')
        .replace(/\\}/g, '}')
        .replace(/\\n/g, ' ')
        .trim();
      
      fields[fieldName] = fieldValue;
    }
    
    return {
      type,
      key,
      fields,
    };
  } catch (error) {
    console.error('BibTeX parsing error:', error);
    return null;
  }
}

/**
 * Parse BibTeX author string into Zotero creators array
 * Format: "Last, First" or "First Last" or "Last, First and Last, First"
 */
function parseAuthors(authorString: string): ZoteroCreator[] {
  const creators: ZoteroCreator[] = [];
  
  if (!authorString || authorString.trim().length === 0) {
    return creators;
  }
  
  // Split by " and " to handle multiple authors
  const authorParts = authorString.split(/\s+and\s+/i);
  
  for (const authorPart of authorParts) {
    const trimmed = authorPart.trim();
    if (!trimmed) continue;
    
    // Check if format is "Last, First"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        creators.push({
          creatorType: 'author',
          lastName: parts[0],
          firstName: parts[1],
        });
      } else if (parts.length === 1) {
        creators.push({
          creatorType: 'author',
          lastName: parts[0],
        });
      }
    } else {
      // Format is "First Last" - try to split on last space
      const lastSpaceIndex = trimmed.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        creators.push({
          creatorType: 'author',
          firstName: trimmed.substring(0, lastSpaceIndex).trim(),
          lastName: trimmed.substring(lastSpaceIndex + 1).trim(),
        });
      } else {
        // Single word - treat as last name
        creators.push({
          creatorType: 'author',
          lastName: trimmed,
        });
      }
    }
  }
  
  return creators;
}

/**
 * Map BibTeX entry type to Zotero item type
 */
function mapBibTeXTypeToZoteroType(bibtexType: string): string {
  const typeMap: Record<string, string> = {
    'article': 'journalArticle',
    'inproceedings': 'conferencePaper',
    'conference': 'conferencePaper',
    'book': 'book',
    'inbook': 'bookSection',
    'incollection': 'bookSection',
    'phdthesis': 'thesis',
    'mastersthesis': 'thesis',
    'techreport': 'report',
    'misc': 'document',
    'unpublished': 'manuscript',
  };
  
  return typeMap[bibtexType.toLowerCase()] || 'document';
}

/**
 * Validate critical fields from BibTeX entry
 */
function validateBibTeXFields(entry: BibTeXEntry): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  // Must have title
  const title = entry.fields.title || entry.fields['title'] || '';
  if (!title || title.trim().length === 0 || 
      ['Untitled', 'No title', 'Unknown'].includes(title.trim())) {
    missingFields.push('title');
  }
  
  // Must have author or authors
  const author = entry.fields.author || entry.fields['author'] || 
                 entry.fields.authors || entry.fields['authors'] || '';
  if (!author || author.trim().length === 0) {
    missingFields.push('author');
  }
  
  // Must have year
  const year = entry.fields.year || entry.fields['year'] || '';
  if (!year || !/^\d{4}$/.test(year.trim())) {
    missingFields.push('year');
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Transform BibTeX entry to Zotero item data
 */
function transformBibTeXToZotero(entry: BibTeXEntry, sourceUrl: string): ZoteroItemData {
  const itemType = mapBibTeXTypeToZoteroType(entry.type);
  
  // Extract core fields
  const title = entry.fields.title || entry.fields['title'] || '';
  const author = entry.fields.author || entry.fields['author'] || 
                 entry.fields.authors || entry.fields['authors'] || '';
  const year = entry.fields.year || entry.fields['year'] || '';
  const url = entry.fields.url || entry.fields['url'] || sourceUrl;
  
  // Parse authors
  const creators = parseAuthors(author);
  
  // Build Zotero item
  const zoteroItem: ZoteroItemData = {
    itemType,
    title: title.trim(),
    creators,
    date: year ? year.trim() : undefined,
    url: url.trim() || sourceUrl,
  };
  
  // Add optional fields
  if (entry.fields.doi || entry.fields['doi']) {
    zoteroItem.DOI = entry.fields.doi || entry.fields['doi'];
  }
  
  if (entry.fields.journal || entry.fields['journal']) {
    zoteroItem.publicationTitle = entry.fields.journal || entry.fields['journal'];
  }
  
  if (entry.fields.booktitle || entry.fields['booktitle']) {
    zoteroItem.bookTitle = entry.fields.booktitle || entry.fields['booktitle'];
  }
  
  if (entry.fields.volume || entry.fields['volume']) {
    zoteroItem.volume = entry.fields.volume || entry.fields['volume'];
  }
  
  if (entry.fields.pages || entry.fields['pages']) {
    zoteroItem.pages = entry.fields.pages || entry.fields['pages'];
  }
  
  if (entry.fields.abstract || entry.fields['abstract']) {
    zoteroItem.abstractNote = entry.fields.abstract || entry.fields['abstract'];
  }
  
  if (entry.fields.publisher || entry.fields['publisher']) {
    zoteroItem.publisher = entry.fields.publisher || entry.fields['publisher'];
  }
  
  return zoteroItem;
}

/**
 * Extract BibTeX citation from Semantic Scholar page
 */
export async function extractSemanticScholarBibTeX(
  urlId: number,
  url: string
): Promise<ExtractSemanticScholarBibTeXResult> {
  const startTime = Date.now();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 SEMANTIC SCHOLAR BIBTEX EXTRACTION START');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📌 URL ID:', urlId);
  console.log('🌐 URL:', url);
  
  try {
    // 1. Input Validation
    const domain = extractDomain(url);
    if (!domain || !domain.includes('semanticscholar.org')) {
      const error = 'URL must be from semanticscholar.org domain';
      console.log('❌ Validation failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        extractedFields: [],
        message: error,
        error,
      };
    }
    
    // 2. Fetch Page Content
    console.log('📥 Fetching page content...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        const error = 'Request timeout - page took too long to load';
        console.log('❌ Fetch timeout:', error);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        await recordProcessingAttempt(urlId, {
          timestamp: startTime,
          stage: 'semantic_scholar_bibtex',
          method: 'semantic_scholar_bibtex',
          success: false,
          error,
          duration: Date.now() - startTime,
        });
        
        return {
          success: false,
          extractedFields: [],
          message: error,
          error,
        };
      }
      
      throw fetchError;
    }
    
    if (!response.ok) {
      const error = `Failed to fetch page: ${response.status} ${response.statusText}`;
      console.log('❌ Fetch failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        extractedFields: [],
        message: error,
        error,
      };
    }
    
    const html = await response.text();
    console.log('✅ Page fetched successfully');
    
    // 3. Extract BibTeX
    console.log('🔍 Extracting BibTeX from HTML...');
    const $ = cheerio.load(html);
    
    // Look for BibTeX citation in <pre> tag with class containing "bibtex"
    const bibtexElement = $('pre[class*="bibtex"], pre[class*="citation"], pre.bibtex-citation').first();
    
    if (bibtexElement.length === 0) {
      const error = 'BibTeX citation not found on page';
      console.log('❌ BibTeX not found:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        extractedFields: [],
        message: error,
        error,
      };
    }
    
    const bibtexText = bibtexElement.text().trim();
    console.log('✅ BibTeX found:', bibtexText.substring(0, 200) + '...');
    
    // 4. Parse BibTeX
    console.log('📝 Parsing BibTeX...');
    const bibtexEntry = parseBibTeX(bibtexText);
    
    if (!bibtexEntry) {
      const error = 'Failed to parse BibTeX format';
      console.log('❌ Parse failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
        metadata: {
          bibtexText: bibtexText.substring(0, 500),
        },
      });
      
      return {
        success: false,
        extractedFields: [],
        message: error,
        error,
      };
    }
    
    console.log('✅ BibTeX parsed:', {
      type: bibtexEntry.type,
      key: bibtexEntry.key,
      fields: Object.keys(bibtexEntry.fields),
    });
    
    // 5. Validate Critical Fields
    console.log('✔️  Validating critical fields...');
    const validation = validateBibTeXFields(bibtexEntry);
    
    if (!validation.valid) {
      const error = `Missing critical fields: ${validation.missingFields.join(', ')}`;
      console.log('❌ Validation failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
        metadata: {
          missingFields: validation.missingFields,
          extractedFields: Object.keys(bibtexEntry.fields),
        },
      });
      
      return {
        success: false,
        extractedFields: Object.keys(bibtexEntry.fields),
        message: error,
        error,
      };
    }
    
    console.log('✅ Validation passed');
    
    // 6. Transform to Zotero Format
    console.log('🔄 Transforming to Zotero format...');
    const zoteroItem = transformBibTeXToZotero(bibtexEntry, url);
    console.log('✅ Transformation complete:', {
      itemType: zoteroItem.itemType,
      title: zoteroItem.title?.substring(0, 60),
      creators: zoteroItem.creators?.length || 0,
    });
    
    // 7. Create Zotero Item
    console.log('💾 Creating Zotero item...');
    const createResult = await createItem(zoteroItem);
    
    if (!createResult.success || !createResult.successful) {
      const error = createResult.error?.message || 'Failed to create Zotero item';
      console.log('❌ Zotero creation failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
        metadata: {
          extractedFields: Object.keys(bibtexEntry.fields),
        },
      });
      
      return {
        success: false,
        extractedFields: Object.keys(bibtexEntry.fields),
        message: error,
        error,
      };
    }
    
    // Extract item key from response
    const itemKey = createResult.successful?.['0']?.key || null;
    
    if (!itemKey) {
      const error = 'Zotero item created but item key not returned';
      console.log('❌ Item key missing:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      await recordProcessingAttempt(urlId, {
        timestamp: startTime,
        stage: 'semantic_scholar_bibtex',
        method: 'semantic_scholar_bibtex',
        success: false,
        error,
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        extractedFields: Object.keys(bibtexEntry.fields),
        message: error,
        error,
      };
    }
    
    console.log('✅ Zotero item created:', itemKey);
    
    // 8. Validate citation
    let validationStatus: 'valid' | 'incomplete' = 'valid';
    let missingFields: string[] = [];
    
    try {
      const itemMetadata = await getItem(itemKey);
      const citationValidation = validateCitation(itemMetadata);
      validationStatus = citationValidation.status;
      missingFields = citationValidation.missingFields || [];
    } catch (error) {
      console.warn('Citation validation failed:', error);
      missingFields = ['title', 'creators', 'date'];
    }
    
    // Determine final status
    const finalStatus: ProcessingStatus = validationStatus === 'valid' ? 'stored' : 'stored_incomplete';
    
    // 9. Update Database
    console.log('💾 Updating database...');
    
    // Get current status for transition
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      throw new Error(`URL ${urlId} not found`);
    }
    
    const currentStatus = urlRecord.processingStatus as ProcessingStatus;
    
    // Transition to processing_zotero first (required intermediate state)
    // This follows the same pattern as other actions like process-custom-identifier
    if (currentStatus !== 'processing_zotero') {
      await URLProcessingStateMachine.transition(
        urlId,
        currentStatus,
        'processing_zotero',
        {
          reason: 'Starting Semantic Scholar BibTeX extraction',
          method: 'semantic_scholar_bibtex',
        }
      );
    }
    
    // Then transition to final status
    await URLProcessingStateMachine.transition(
      urlId,
      'processing_zotero',
      finalStatus,
      {
        itemKey,
        validationStatus,
        missingFields,
        method: 'semantic_scholar_bibtex',
      }
    );
    
    // Update URL record
    await db.update(urls)
      .set({
        zoteroItemKey: itemKey,
        zoteroProcessedAt: new Date(),
        zoteroProcessingStatus: 'stored',
        zoteroProcessingMethod: 'semantic_scholar_bibtex',
        citationValidationStatus: validationStatus,
        citationValidatedAt: new Date(),
        citationValidationDetails: { missingFields },
        createdByTheodore: true,
        linkedUrlCount: 1,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Create link record
    await db.insert(zoteroItemLinks).values({
      itemKey,
      urlId,
      createdByTheodore: true,
      userModified: false,
      linkedAt: new Date(),
    }).onConflictDoNothing();
    
    // Update enrichment with processing notes
    const enrichment = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    if (enrichment) {
      await db.update(urlEnrichments)
        .set({
          notes: enrichment.notes 
            ? `${enrichment.notes}\n\nExtracted BibTeX citation from Semantic Scholar (${new Date().toISOString()})`
            : `Extracted BibTeX citation from Semantic Scholar (${new Date().toISOString()})`,
          updatedAt: new Date(),
        })
        .where(eq(urlEnrichments.urlId, urlId));
    } else {
      await db.insert(urlEnrichments).values({
        urlId,
        notes: `Extracted BibTeX citation from Semantic Scholar (${new Date().toISOString()})`,
        customIdentifiers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    }
    
    // Record successful attempt
    const duration = Date.now() - startTime;
    await recordProcessingAttempt(urlId, {
      timestamp: startTime,
      stage: 'semantic_scholar_bibtex',
      method: 'semantic_scholar_bibtex',
      success: true,
      itemKey,
      duration,
      metadata: {
        extractedFields: Object.keys(bibtexEntry.fields),
        bibtexType: bibtexEntry.type,
        validationStatus,
        missingFields,
      },
    });
    
    console.log('✅ Database updated successfully');
    console.log('⏱️  Total duration:', `${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    revalidatePath('/urls');
    
    return {
      success: true,
      itemKey,
      extractedFields: Object.keys(bibtexEntry.fields),
      message: `Citation extracted and linked to Zotero (${itemKey})`,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.log('💥 EXCEPTION:', errorMessage);
    console.log('⏱️  Duration before error:', `${duration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await recordProcessingAttempt(urlId, {
      timestamp: startTime,
      stage: 'semantic_scholar_bibtex',
      method: 'semantic_scholar_bibtex',
      success: false,
      error: errorMessage,
      duration,
    });
    
    return {
      success: false,
      extractedFields: [],
      message: errorMessage,
      error: errorMessage,
    };
  }
}

