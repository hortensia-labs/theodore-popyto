/**
 * PDF Demo Server Actions
 * 
 * Server actions for the PDF identifier extraction demo page
 */

'use server';

import { extractIdentifiersFromPdf, type PdfIdentifierResult } from '../extractors/pdf-identifier-extractor';
import { invalidateCache } from '../content-cache';
import { db } from '../db/client';
import { urlContentCache } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface PdfDemoResult {
  success: boolean;
  cachedText?: {
    pages: Array<{ pageNumber: number; text: string }>;
    extractedAt: string;
  };
  customExtraction?: {
    identifiers: Array<{
      type: string;
      value: string;
      source: string;
      confidence: string;
    }>;
  };
  zoteroExtraction?: {
    identifiers: Array<{
      type: string;
      value: string;
      source: string;
      confidence: string;
    }>;
    metadata?: {
      title?: string;
      author?: string;
      pageCount?: number;
      textLength?: number;
      hasText?: boolean;
    };
  };
  mergedIdentifiers?: Array<{
    type: string;
    value: string;
    source: string;
    confidence: string;
  }>;
  error?: string;
}

/**
 * Process uploaded PDF file
 */
export async function processPdfDemo(formData: FormData): Promise<PdfDemoResult> {
  try {
    const file = formData.get('pdf') as File | null;
    
    if (!file) {
      return {
        success: false,
        error: 'No PDF file provided',
      };
    }
    
    if (!file.type.includes('pdf')) {
      return {
        success: false,
        error: 'File must be a PDF',
      };
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a temporary URL ID for caching (we'll use a demo ID)
    const demoUrlId = 999999; // Special demo ID
    
    // Extract identifiers
    const result: PdfIdentifierResult = await extractIdentifiersFromPdf(
      buffer,
      file.name,
      demoUrlId
    );
    
    // Parse cached text
    let cachedTextData: PdfDemoResult['cachedText'] | undefined;
    if (result.cachedText) {
      try {
        cachedTextData = JSON.parse(result.cachedText);
      } catch {
        // If parsing fails, create a simple structure
        cachedTextData = {
          pages: [],
          extractedAt: new Date().toISOString(),
        };
      }
    }
    
    // Separate custom and Zotero identifiers by source prefix
    const customIdentifiers = result.identifiers.filter(id => 
      id.source.startsWith('pdf_text:')
    );
    const zoteroIdentifiers = result.identifiers.filter(id => 
      id.source.startsWith('zotero_pdf:')
    );
    
    return {
      success: true,
      cachedText: cachedTextData,
      customExtraction: {
        identifiers: customIdentifiers.map(id => ({
          type: id.type,
          value: id.value,
          source: id.source,
          confidence: id.confidence,
        })),
      },
      zoteroExtraction: {
        identifiers: zoteroIdentifiers.map(id => ({
          type: id.type,
          value: id.value,
          source: id.source,
          confidence: id.confidence,
        })),
        metadata: result.metadata,
      },
      mergedIdentifiers: result.identifiers.map(id => ({
        type: id.type,
        value: id.value,
        source: id.source,
        confidence: id.confidence,
      })),
      error: result.error,
    };
  } catch (error) {
    console.error('PDF demo processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing PDF',
    };
  }
}

/**
 * Clear demo cache
 */
export async function clearDemoCache(): Promise<{ success: boolean; error?: string }> {
  try {
    const demoUrlId = 999999;
    
    // Invalidate cache
    await invalidateCache(demoUrlId);
    
    // Also try to delete any cache records directly
    const cacheRecord = await db.query.urlContentCache.findFirst({
      where: eq(urlContentCache.urlId, demoUrlId),
    });
    
    if (cacheRecord) {
      await db.delete(urlContentCache)
        .where(eq(urlContentCache.id, cacheRecord.id));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing demo cache:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clearing cache',
    };
  }
}

