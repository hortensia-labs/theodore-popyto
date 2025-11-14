/**
 * LLM Extraction Server Actions
 * 
 * Triggers LLM-based metadata extraction and manages results
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlExtractedMetadata } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getCachedContent } from '../content-cache';
import type { ExtractedMetadata } from '../extractors/html-metadata-extractor';

export interface LlmExtractionResult {
  success: boolean;
  metadata?: ExtractedMetadata;
  confidence?: Record<string, number>;
  providerUsed?: string;
  extractionMethod?: 'structured' | 'llm' | 'hybrid';
  error?: string;
  duration?: number;
}

/**
 * Trigger LLM extraction for a URL
 */
export async function triggerLlmExtraction(
  urlId: number
): Promise<LlmExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Get URL record
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Get cached content
    const cached = await getCachedContent(urlId);
    
    if (!cached) {
      return {
        success: false,
        error: 'No cached content available. Please process the URL first.',
      };
    }
    
    const contentType = cached.metadata.contentType;
    const isHtml = contentType.includes('html') || contentType.includes('xml');
    const isPdf = contentType.includes('pdf');
    
    let result: any;
    
    if (isHtml) {
      // Extract from HTML with LLM fallback
      const { extractMetadataFromHtmlWithLlmFallback } = await import(
        '../extractors/html-metadata-extractor'
      );
      
      const htmlContent = cached.content.toString('utf8');
      result = await extractMetadataFromHtmlWithLlmFallback(
        htmlContent,
        urlRecord.url
      );
    } else if (isPdf) {
      // Extract from PDF with LLM fallback
      const { extractMetadataFromPdfWithLlmFallback } = await import(
        '../extractors/pdf-metadata-extractor'
      );
      
      result = await extractMetadataFromPdfWithLlmFallback(
        cached.content,
        urlRecord.url,
        urlRecord.url.split('/').pop() || 'document.pdf',
        urlId
      );
    } else {
      return {
        success: false,
        error: `Unsupported content type: ${contentType}`,
      };
    }
    
    if (!result || !result.metadata) {
      return {
        success: false,
        error: 'Extraction failed to return metadata',
      };
    }
    
    // Validate the metadata
    const { validateExtractedMetadata } = await import('../metadata-validator');
    const validation = validateExtractedMetadata(result.metadata);
    
    // Store in database
    await db
      .insert(urlExtractedMetadata)
      .values({
        urlId,
        title: result.metadata.title,
        creators: result.metadata.creators,
        date: result.metadata.date,
        itemType: result.metadata.itemType,
        abstractNote: result.metadata.abstractNote,
        publicationTitle: result.metadata.publicationTitle,
        url: result.metadata.url,
        accessDate: result.metadata.accessDate,
        language: result.metadata.language,
        extractionMethod: result.extractionMethod || 'llm',
        extractionSources: result.metadata.extractionSources,
        qualityScore: validation.score,
        validationStatus: validation.status,
        validationErrors: validation.errors,
        missingFields: validation.missingFields,
        confidenceScores: result.llmResult?.confidence,
        llmProvider: result.llmResult?.providerUsed,
      })
      .onConflictDoUpdate({
        target: urlExtractedMetadata.urlId,
        set: {
          title: result.metadata.title,
          creators: result.metadata.creators,
          date: result.metadata.date,
          itemType: result.metadata.itemType,
          abstractNote: result.metadata.abstractNote,
          publicationTitle: result.metadata.publicationTitle,
          extractionMethod: result.extractionMethod || 'llm',
          extractionSources: result.metadata.extractionSources,
          qualityScore: validation.score,
          validationStatus: validation.status,
          validationErrors: validation.errors,
          missingFields: validation.missingFields,
          confidenceScores: result.llmResult?.confidence,
          llmProvider: result.llmResult?.providerUsed,
          updatedAt: new Date(),
        },
      });
    
    // Update URL status
    await db.update(urls)
      .set({
        hasExtractedMetadata: true,
        zoteroProcessingStatus: result.extractionMethod === 'llm' ? 'llm_extracted' : 'no_identifiers',
        llmExtractionStatus: 'completed',
        llmExtractionProvider: result.llmResult?.providerUsed,
        llmExtractedAt: new Date(),
        llmExtractionAttempts: (await db.query.urls.findFirst({
          where: eq(urls.id, urlId),
        }))?.llmExtractionAttempts || 0 + 1,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    revalidatePath('/urls');
    revalidatePath(`/urls/${urlId}/llm-extract`);
    
    return {
      success: true,
      metadata: result.metadata,
      confidence: result.llmResult?.confidence,
      providerUsed: result.llmResult?.providerUsed,
      extractionMethod: result.extractionMethod,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('LLM extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check if LLM extraction is available (any provider configured)
 */
export async function checkLlmAvailability(): Promise<{
  available: boolean;
  providers: Array<{ name: string; available: boolean; error?: string }>;
}> {
  try {
    const {
      getProvidersHealthStatus,
    } = await import('../extractors/llm/llm-metadata-extractor');
    
    const healthStatus = await getProvidersHealthStatus();
    
    const providers = Array.from(healthStatus.entries()).map(([name, status]) => ({
      name,
      available: status.available,
      error: status.error,
    }));
    
    const available = providers.some(p => p.available);
    
    return {
      available,
      providers,
    };
  } catch (error) {
    console.error('Error checking LLM availability:', error);
    return {
      available: false,
      providers: [],
    };
  }
}

/**
 * Get LLM extraction data for a URL (if exists)
 */
export async function getLlmExtractionData(urlId: number) {
  const metadata = await db.query.urlExtractedMetadata.findFirst({
    where: eq(urlExtractedMetadata.urlId, urlId),
  });
  
  return metadata;
}

