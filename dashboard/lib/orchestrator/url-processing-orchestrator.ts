/**
 * URL Processing Orchestrator
 * 
 * Orchestrates the complete URL processing workflow with automatic cascading
 * through multiple stages when one fails.
 * 
 * Processing Flow:
 * 1. Zotero Processing (identifier or URL)
 * 2. Content Processing (fetch + extract identifiers)
 * 3. LLM Processing (extract metadata with AI)
 * 4. Manual Creation (user creates item)
 * 
 * Based on PRD Section 7: Processing Orchestrator
 */

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { StateGuards } from '../state-machine/state-guards';
import {
  categorizeError,
  isPermanentError,
  getErrorMessage,
  createProcessingError,
} from '../error-handling';
import type {
  ProcessingResult,
  ProcessingAttempt,
  ProcessingStatus,
} from '../types/url-processing';

/**
 * URL Processing Orchestrator
 * 
 * Main entry point for processing URLs through the multi-stage workflow
 */
export class URLProcessingOrchestrator {
  /**
   * Main entry point for processing a URL
   * Handles the complete workflow with auto-cascading
   * 
   * @param urlId - URL ID to process
   * @returns Processing result
   */
  static async processUrl(urlId: number): Promise<ProcessingResult> {
    try {
      const url = await this.getUrlWithCapabilities(urlId);
      
      if (!url) {
        return {
          success: false,
          urlId,
          error: 'URL not found',
        };
      }

      // Check user intent
      if (!StateGuards.canProcessWithZotero(url)) {
        return {
          success: false,
          urlId,
          error: 'URL cannot be processed (user intent or state restriction)',
        };
      }

      // Determine starting stage based on capabilities
      if (url.capability.hasIdentifiers || url.capability.hasWebTranslators) {
        return await this.attemptZoteroProcessing(urlId);
      } else if (url.capability.hasContent) {
        return await this.attemptContentProcessing(urlId);
      } else {
        // Need to fetch content first
        return await this.attemptContentFetching(urlId);
      }
    } catch (error) {
      return {
        success: false,
        urlId,
        error: getErrorMessage(error),
        errorCategory: categorizeError(error),
      };
    }
  }

  /**
   * Stage 1: Zotero Processing
   * Attempts to process URL with Zotero (via identifier or URL translator)
   */
  private static async attemptZoteroProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      return { success: false, urlId, error: 'URL not found' };
    }

    // Transition to processing state
    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_zotero'
    );

    // Record attempt start
    await this.recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'zotero_identifier', // Will be determined by actual method
      success: false, // Update on completion
    });

    try {
      // Import Zotero processing action
      // This is a placeholder - actual implementation would import from zotero actions
      // const result = await processUrlWithZotero(urlId);
      
      // For now, simulate the call structure
      // TODO: Replace with actual implementation when integrating
      const result = await this.callZoteroProcessing(urlId);

      if (result.success) {
        // Success! Validate citation
        const validation = await this.validateCitation(result.itemKey!);
        
        const finalStatus: ProcessingStatus = validation.isComplete 
          ? 'stored' 
          : 'stored_incomplete';

        await URLProcessingStateMachine.transition(
          urlId,
          'processing_zotero',
          finalStatus,
          {
            itemKey: result.itemKey,
            zoteroItemKey: result.itemKey,
            zoteroProcessedAt: new Date(),
            citationValidationStatus: validation.status,
          }
        );

        // Update processing history with success
        await this.updateLastAttempt(urlId, {
          success: true,
          itemKey: result.itemKey,
        });

        // Auto-trigger metadata extraction if incomplete
        if (finalStatus === 'stored_incomplete') {
          await this.attemptMetadataExtraction(urlId);
        }

        return {
          success: true,
          urlId,
          status: finalStatus,
          itemKey: result.itemKey,
        };
      } else {
        // Failed - handle failure
        return await this.handleZoteroFailure(urlId, result.error || 'Unknown error');
      }
    } catch (error) {
      return await this.handleZoteroFailure(
        urlId,
        getErrorMessage(error)
      );
    }
  }

  /**
   * Handle Zotero processing failure
   * Determines if we should auto-cascade or mark as exhausted
   */
  private static async handleZoteroFailure(
    urlId: number,
    errorMessage: string
  ): Promise<ProcessingResult> {
    const errorCategory = categorizeError(errorMessage);
    
    // Update last attempt with failure
    await this.updateLastAttempt(urlId, {
      success: false,
      error: errorMessage,
      errorCategory,
    });

    // Increment processing attempts
    await db.execute(`
      UPDATE urls 
      SET processing_attempts = processing_attempts + 1 
      WHERE id = ${urlId}
    `);

    // Check if error is permanent
    if (isPermanentError(errorMessage)) {
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        'exhausted'
      );
      
      return {
        success: false,
        urlId,
        status: 'exhausted',
        error: errorMessage,
        errorCategory,
      };
    }

    // Auto-cascade to content processing
    console.log(`URL ${urlId}: Zotero failed, auto-cascading to content processing`);
    return await this.attemptContentProcessing(urlId);
  }

  /**
   * Stage 2: Content Processing
   * Fetches content and extracts identifiers
   */
  private static async attemptContentProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      return { success: false, urlId, error: 'URL not found' };
    }

    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_content'
    );

    // Record attempt
    await this.recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'content_extraction',
      success: false,
    });

    try {
      // Import content processing action
      // const result = await processSingleUrl(urlId);
      
      // Placeholder - TODO: Replace with actual implementation
      const result = await this.callContentProcessing(urlId);

      if (result.identifierCount && result.identifierCount > 0) {
        // Found identifiers - await user selection
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_content',
          'awaiting_selection'
        );

        await this.updateLastAttempt(urlId, {
          success: true,
          metadata: { identifierCount: result.identifierCount },
        });

        return {
          success: true,
          urlId,
          status: 'awaiting_selection',
          identifierCount: result.identifierCount,
        };
      } else {
        // No identifiers - try LLM
        console.log(`URL ${urlId}: No identifiers found, auto-cascading to LLM`);
        return await this.attemptLLMProcessing(urlId);
      }
    } catch (error) {
      return await this.handleContentFailure(
        urlId,
        getErrorMessage(error)
      );
    }
  }

  /**
   * Handle content processing failure
   */
  private static async handleContentFailure(
    urlId: number,
    errorMessage: string
  ): Promise<ProcessingResult> {
    const errorCategory = categorizeError(errorMessage);

    await this.updateLastAttempt(urlId, {
      success: false,
      error: errorMessage,
      errorCategory,
    });

    await db.execute(`
      UPDATE urls 
      SET processing_attempts = processing_attempts + 1 
      WHERE id = ${urlId}
    `);

    // Try LLM as last resort
    console.log(`URL ${urlId}: Content processing failed, trying LLM`);
    return await this.attemptLLMProcessing(urlId);
  }

  /**
   * Stage 3: LLM Processing
   * Extracts metadata using LLM
   */
  private static async attemptLLMProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      return { success: false, urlId, error: 'URL not found' };
    }

    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_llm'
    );

    await this.recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'llm',
      success: false,
    });

    try {
      // Import LLM extraction action
      // const result = await extractMetadataWithLLM(urlId);
      
      // Placeholder - TODO: Replace with actual implementation
      const result = await this.callLLMExtraction(urlId);

      if (result.success && result.qualityScore > 70) {
        // High quality extraction - await user approval
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_llm',
          'awaiting_metadata'
        );

        await this.updateLastAttempt(urlId, {
          success: true,
          metadata: { qualityScore: result.qualityScore },
        });

        return {
          success: true,
          urlId,
          status: 'awaiting_metadata',
          metadata: { qualityScore: result.qualityScore },
        };
      } else {
        // Low quality or failed - exhausted
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_llm',
          'exhausted'
        );

        await this.updateLastAttempt(urlId, {
          success: false,
          error: 'LLM extraction failed or low quality',
        });

        return {
          success: false,
          urlId,
          status: 'exhausted',
          error: 'LLM extraction failed or low quality',
        };
      }
    } catch (error) {
      // LLM failed - mark as exhausted
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_llm',
        'exhausted'
      );

      await this.updateLastAttempt(urlId, {
        success: false,
        error: getErrorMessage(error),
      });

      return {
        success: false,
        urlId,
        status: 'exhausted',
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Fetch content for a URL (preliminary step if content not available)
   */
  private static async attemptContentFetching(
    urlId: number
  ): Promise<ProcessingResult> {
    try {
      // Import content fetching action
      // const result = await processSingleUrl(urlId);
      
      // Placeholder
      const result = await this.callContentProcessing(urlId);

      if (result.success) {
        // Content fetched, now process it
        return await this.attemptContentProcessing(urlId);
      } else {
        // Failed to fetch - exhausted
        await URLProcessingStateMachine.transition(
          urlId,
          'not_started',
          'exhausted'
        );

        return {
          success: false,
          urlId,
          status: 'exhausted',
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        urlId,
        status: 'exhausted',
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Auto-trigger metadata extraction for incomplete citations
   */
  private static async attemptMetadataExtraction(
    urlId: number
  ): Promise<void> {
    try {
      // Attempt to fetch content and extract metadata
      // This will be available for user to fill in missing fields
      // const result = await processSingleUrl(urlId);
      console.log(`URL ${urlId}: Triggering metadata extraction for incomplete citation`);
      // Metadata will be stored and available in UI
    } catch (error) {
      console.error(`Metadata extraction failed for URL ${urlId}:`, error);
      // Non-blocking - don't fail if this doesn't work
    }
  }

  // ============================================
  // Helper Methods & Placeholders
  // ============================================

  /**
   * Get URL with computed capabilities
   */
  private static async getUrlWithCapabilities(urlId: number) {
    const result = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(eq(urls.id, urlId))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    const analysisData = row.url_analysis_data;
    const enrichment = row.url_enrichments;

    // Compute capability
    const capability = {
      hasIdentifiers: !!(
        (analysisData?.validIdentifiers && analysisData.validIdentifiers.length > 0) ||
        (enrichment?.customIdentifiers && enrichment.customIdentifiers.length > 0)
      ),
      hasWebTranslators: !!(analysisData?.webTranslators && analysisData.webTranslators.length > 0),
      hasContent: false, // Would check content cache
      isAccessible: row.urls.isAccessible || false,
      canUseLLM: false, // Would check content availability
      isPDF: row.urls.contentType?.includes('pdf') || false,
      manualCreateAvailable: true,
    };

    return {
      ...row.urls,
      capability,
      userIntent: row.urls.userIntent as any,
      processingStatus: row.urls.processingStatus as ProcessingStatus,
    };
  }

  /**
   * Record a processing attempt
   */
  private static async recordProcessingAttempt(
    urlId: number,
    attempt: Partial<ProcessingAttempt>
  ): Promise<void> {
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) return;

    const history: ProcessingAttempt[] = url.processingHistory || [];
    history.push(attempt as ProcessingAttempt);

    await db.update(urls)
      .set({ processingHistory: history })
      .where(eq(urls.id, urlId));
  }

  /**
   * Update the last processing attempt
   */
  private static async updateLastAttempt(
    urlId: number,
    updates: Partial<ProcessingAttempt>
  ): Promise<void> {
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) return;

    const history: ProcessingAttempt[] = url.processingHistory || [];
    if (history.length === 0) return;

    // Update last entry
    history[history.length - 1] = {
      ...history[history.length - 1],
      ...updates,
    };

    await db.update(urls)
      .set({ processingHistory: history })
      .where(eq(urls.id, urlId));
  }

  /**
   * Validate citation completeness
   * TODO: Implement actual citation validation
   */
  private static async validateCitation(itemKey: string) {
    // Placeholder
    return {
      isComplete: true,
      status: 'valid',
      missingFields: [],
    };
  }

  /**
   * Call Zotero processing
   * TODO: Replace with actual import when integrating
   */
  private static async callZoteroProcessing(urlId: number) {
    // Placeholder
    return {
      success: false,
      error: 'Not implemented - will use actual processUrlWithZotero',
    };
  }

  /**
   * Call content processing
   * TODO: Replace with actual import when integrating
   */
  private static async callContentProcessing(urlId: number) {
    // Placeholder
    return {
      success: false,
      identifierCount: 0,
      error: 'Not implemented - will use actual processSingleUrl',
    };
  }

  /**
   * Call LLM extraction
   * TODO: Replace with actual import when integrating
   */
  private static async callLLMExtraction(urlId: number) {
    // Placeholder
    return {
      success: false,
      qualityScore: 0,
      error: 'Not implemented - will use actual extractMetadataWithLLM',
    };
  }
}

