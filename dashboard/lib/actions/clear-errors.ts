/**
 * Clear Errors Action
 * 
 * Clears error data from analysis metadata and optionally resets processing state
 * to allow URLs to be reprocessed after clearing errors
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db/client';
import { urls, urlAnalysisData } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import type { ProcessingStatus } from '../types/url-processing';

export interface ClearErrorsResult {
  success: boolean;
  message?: string;
  error?: string;
  clearedErrors?: number;
  resetState?: boolean;
}

/**
 * Clear analysis errors and optionally reset processing state
 * 
 * This clears errors from the ZOTERO Analysis Response section
 * and allows the URL to be processed again
 * 
 * @param urlId - URL ID
 * @param resetProcessingState - If true, also resets processing status to not_started
 * @returns Result with success status
 */
export async function clearAnalysisErrors(
  urlId: number,
  resetProcessingState: boolean = true
): Promise<ClearErrorsResult> {
  try {
    // Get URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Get current analysis data
    const analysisRecord = await db.query.urlAnalysisData.findFirst({
      where: eq(urlAnalysisData.urlId, urlId),
    });
    
    if (!analysisRecord) {
      return {
        success: false,
        error: 'No analysis data found for this URL',
      };
    }
    
    // Extract current rawMetadata
    const currentRawMetadata = analysisRecord.rawMetadata as Record<string, any> || {};
    const errorsCount = Array.isArray(currentRawMetadata.errors) ? currentRawMetadata.errors.length : 0;
    
    if (errorsCount === 0) {
      return {
        success: false,
        error: 'No errors to clear',
      };
    }
    
    // Create new rawMetadata without errors
    const { errors: removedErrors, ...cleanedMetadata } = currentRawMetadata;
    
    // Update analysis data
    await db.update(urlAnalysisData)
      .set({
        rawMetadata: cleanedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(urlAnalysisData.urlId, urlId));
    
    // Clear error flags on URL
    await db.update(urls)
      .set({
        hasErrors: false,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    // Record in processing history
    await recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'manual',
      method: 'clear_errors',
      success: true,
      metadata: {
        action: 'clear_errors',
        errorsCleared: errorsCount,
        resetState: resetProcessingState,
      },
    });
    
    // Optionally reset processing state
    if (resetProcessingState) {
      const currentStatus = urlData.processingStatus;
      
      // If in a failed or exhausted state, reset to not_started
      if (
        currentStatus === 'exhausted' ||
        currentStatus.startsWith('processing_')
      ) {
        // Get full URL record
        const urlRecord = await db.query.urls.findFirst({
          where: eq(urls.id, urlId),
        });
        
        if (urlRecord) {
          // Get existing history
          const existingHistory = urlRecord.processingHistory || [];
          
          // Add reset event
          const resetEvent = {
            timestamp: Date.now(),
            stage: 'manual' as const,
            method: 'clear_errors_reset',
            success: true,
            metadata: {
              action: 'clear_errors_and_reset',
              previousStatus: currentStatus,
              reason: 'Errors cleared, ready to retry',
              errorsCleared: errorsCount,
            },
            transition: {
              from: currentStatus,
              to: 'not_started' as ProcessingStatus,
            },
          };
          
          const updatedHistory = [...existingHistory, resetEvent];
          
          // Reset state
          await db.update(urls)
            .set({
              processingStatus: 'not_started',
              processingAttempts: 0,
              processingHistory: updatedHistory,
              zoteroProcessingStatus: null,
              zoteroProcessingError: null,
              updatedAt: new Date(),
            })
            .where(eq(urls.id, urlId));
        }
      }
    }
    
    revalidatePath('/urls');
    
    return {
      success: true,
      message: resetProcessingState 
        ? `Cleared ${errorsCount} error(s) and reset processing state`
        : `Cleared ${errorsCount} error(s)`,
      clearedErrors: errorsCount,
      resetState: resetProcessingState,
    };
  } catch (error) {
    console.error('Error clearing analysis errors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear only Zotero processing errors (not analysis errors)
 * 
 * @param urlId - URL ID
 * @returns Result
 */
export async function clearZoteroProcessingError(urlId: number): Promise<ClearErrorsResult> {
  try {
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    if (!urlRecord.zoteroProcessingError) {
      return {
        success: false,
        error: 'No Zotero processing error to clear',
      };
    }
    
    // Clear the error
    await db.update(urls)
      .set({
        zoteroProcessingError: null,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));
    
    revalidatePath('/urls');
    
    return {
      success: true,
      message: 'Zotero processing error cleared',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

