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
import { eq, sql } from 'drizzle-orm';
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
// Import actual processing functions (NOT from actions/zotero.ts to avoid circular dependency)
import { processIdentifier, processUrl, validateCitation as validateCitationMetadata, getItem } from '../zotero-client';
import { processSingleUrl } from '../actions/process-url-action';
import { extractSemanticScholarBibTeX } from '../actions/extract-semantic-scholar-bibtex';
import { isSemanticScholarPaperUrl } from './semantic-scholar-helpers';

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
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ORCHESTRATOR ENTRY: processUrl()                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    console.log('⏰ Started at:', new Date().toISOString());
    
    try {
      console.log('📂 Fetching URL with capabilities...');
      const url = await this.getUrlWithCapabilities(urlId);
      
      if (!url) {
        console.log('❌ URL not found');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return {
          success: false,
          urlId,
          error: 'URL not found',
        };
      }

      console.log('✅ URL loaded:', url.url);
      console.log('📊 Processing status:', url.processingStatus);
      console.log('🎯 User intent:', url.userIntent);
      console.log('📋 Capabilities:');
      console.log('   Has identifiers:', url.capability.hasIdentifiers);
      console.log('   Has web translators:', url.capability.hasWebTranslators);
      console.log('   Has content:', url.capability.hasContent);
      console.log('   Is accessible:', url.capability.isAccessible);
      console.log('   Can use LLM:', url.capability.canUseLLM);

      // Check user intent
      console.log('\n🔍 Checking if URL can be processed...');
      if (!StateGuards.canProcessWithZotero(url)) {
        console.log('❌ Cannot process URL');
        console.log('   Reason: User intent or state restriction');
        console.log('   Current status:', url.processingStatus);
        console.log('   User intent:', url.userIntent);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return {
          success: false,
          urlId,
          error: 'URL cannot be processed (user intent or state restriction)',
        };
      }
      
      console.log('✅ URL can be processed');

      // Determine starting stage based on domain and capabilities
      console.log('\n🎯 DETERMINING STARTING STAGE');

      // Check for Semantic Scholar domain first (highest priority)
      console.log('🔍 Checking if URL is Semantic Scholar...');
      console.log('   URL:', url.url);
      const isSemanticScholar = isSemanticScholarPaperUrl(url.url);
      console.log('   Is Semantic Scholar:', isSemanticScholar);

      if (isSemanticScholar) {
        console.log('✅ Decision: START WITH SEMANTIC SCHOLAR API PROCESSING');
        console.log('   Reason: URL is from semanticscholar.org domain');
        console.log('🚀 Calling attemptSemanticScholarProcessing()...\n');
        return await this.attemptSemanticScholarProcessing(urlId);
      } else if (url.capability.hasIdentifiers || url.capability.hasWebTranslators) {
        console.log('✅ Decision: START WITH ZOTERO PROCESSING');
        console.log('   Reason: Has identifiers or web translators');
        console.log('🚀 Calling attemptZoteroProcessing()...\n');
        return await this.attemptZoteroProcessing(urlId);
      } else if (url.capability.hasContent) {
        console.log('✅ Decision: START WITH CONTENT PROCESSING');
        console.log('   Reason: Has cached content, no identifiers/translators');
        console.log('🚀 Calling attemptContentProcessing()...\n');
        return await this.attemptContentProcessing(urlId);
      } else {
        console.log('✅ Decision: START WITH CONTENT FETCHING');
        console.log('   Reason: No content cached yet');
        console.log('🚀 Calling attemptContentFetching()...\n');
        // Need to fetch content first
        return await this.attemptContentFetching(urlId);
      }
    } catch (error) {
      console.log('\n💥 EXCEPTION in processUrl() entry point');
      console.log('🏷️  Error type:', error?.constructor?.name);
      console.log('💬 Error message:', getErrorMessage(error));
      
      if (error instanceof Error) {
        console.log('📜 Stack trace:');
        console.log(error.stack);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        success: false,
        urlId,
        error: getErrorMessage(error),
        errorCategory: categorizeError(error),
      };
    }
  }

  /**
   * Stage 0: Semantic Scholar Processing (highest priority)
   * Uses the official Semantic Scholar API for semanticscholar.org URLs
   */
  private static async attemptSemanticScholarProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   STAGE 0: attemptSemanticScholarProcessing()               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);

    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      console.log('❌ URL not found in database');
      return { success: false, urlId, error: 'URL not found' };
    }

    console.log('📊 Current state:', url.processingStatus);
    console.log('🌐 URL:', url.url);
    console.log('🎯 Transitioning to: processing_zotero');

    // Transition to processing state (using processing_zotero since SS is an advanced Zotero method)
    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_zotero'
    );

    console.log('✅ State transition complete');

    // Record attempt start
    const attemptStartTime = Date.now();
    await this.recordProcessingAttempt(urlId, {
      timestamp: attemptStartTime,
      stage: 'content_extraction',
      method: 'extract_semantic_scholar_api',
      success: false,
    });

    console.log('📝 Processing attempt recorded');

    try {
      console.log('🎬 Starting Semantic Scholar API processing...');

      // Call Semantic Scholar extraction
      const result = await extractSemanticScholarBibTeX(urlId, url.url);

      const processingDuration = Date.now() - attemptStartTime;
      console.log('\n📊 Semantic Scholar API result:');
      console.log('Success:', result.success);
      console.log('Duration:', `${processingDuration}ms`);

      if (result.success && result.itemKey) {
        console.log('✅ Semantic Scholar processing succeeded');
        console.log('🔑 Item key:', result.itemKey);
        console.log('📦 Extracted fields:', result.extractedFields.length);

        // Update processing history with success
        console.log('📝 Updating processing history with success...');
        await this.updateLastAttempt(urlId, {
          success: true,
          itemKey: result.itemKey,
          method: 'extract_semantic_scholar_api',
        });

        console.log('✅ STAGE 0 COMPLETE - SUCCESS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
          success: true,
          urlId,
          status: 'stored',
          itemKey: result.itemKey,
        };
      } else {
        console.log('❌ Semantic Scholar processing returned failure');
        console.log('💬 Error:', result.error);
        console.log('🔄 Calling handleSemanticScholarFailure()...');

        // Failed - handle failure
        return await this.handleSemanticScholarFailure(urlId, result.error || 'Unknown error');
      }
    } catch (error) {
      console.log('\n💥 EXCEPTION caught in attemptSemanticScholarProcessing()');
      console.log('🏷️  Error type:', error?.constructor?.name);
      console.log('💬 Error message:', getErrorMessage(error));

      if (error instanceof Error) {
        console.log('📜 Stack trace:');
        console.log(error.stack);
      }

      console.log('🔄 Calling handleSemanticScholarFailure()...');

      return await this.handleSemanticScholarFailure(
        urlId,
        getErrorMessage(error)
      );
    }
  }

  /**
   * Handle Semantic Scholar processing failure
   * Falls back to Zotero processing
   */
  private static async handleSemanticScholarFailure(
    urlId: number,
    errorMessage: string
  ): Promise<ProcessingResult> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║    FAILURE HANDLER: handleSemanticScholarFailure()           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    console.log('💬 Error message:', errorMessage);

    const errorCategory = categorizeError(errorMessage);
    console.log('🏷️  Error category:', errorCategory);

    // Update last attempt with failure
    console.log('📝 Updating last processing attempt with failure info...');
    await this.updateLastAttempt(urlId, {
      success: false,
      error: errorMessage,
      errorCategory,
    });

    // Increment processing attempts
    console.log('🔢 Incrementing processing attempts counter...');
    await db.update(urls)
      .set({
        processingAttempts: sql`${urls.processingAttempts} + 1`,
      })
      .where(eq(urls.id, urlId));

    // Get updated attempt count
    const updatedUrl = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
      columns: { processingAttempts: true },
    });
    console.log('📊 Processing attempts now:', updatedUrl?.processingAttempts || 0);

    // Check if error is permanent
    if (isPermanentError(errorMessage)) {
      console.log('🛑 PERMANENT ERROR DETECTED');
      console.log('❌ No auto-cascade - transitioning to exhausted');
      console.log('🎯 Transition: processing_zotero → exhausted');

      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        'exhausted'
      );

      console.log('✅ Transitioned to exhausted state');
      console.log('💡 Suggestion: User should try manual creation');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return {
        success: false,
        urlId,
        status: 'exhausted',
        error: errorMessage,
        errorCategory,
      };
    }

    // Auto-cascade to Zotero processing
    console.log('🔄 AUTO-CASCADE DECISION');
    console.log('✅ Error is retryable (not permanent)');
    console.log('🎯 Next stage: Zotero Processing');
    console.log('📍 Reason: Semantic Scholar API processing failed, trying Zotero');
    console.log('🚀 Calling attemptZoteroProcessing()...\n');

    return await this.attemptZoteroProcessing(urlId);
  }

  /**
   * Stage 1: Zotero Processing
   * Attempts to process URL with Zotero (via identifier or URL translator)
   */
  private static async attemptZoteroProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   STAGE 1: attemptZoteroProcessing()                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      console.log('❌ URL not found in database');
      return { success: false, urlId, error: 'URL not found' };
    }

    console.log('📊 Current state:', url.processingStatus);
    console.log('🎯 Transitioning to: processing_zotero');
    
    // Transition to processing state
    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_zotero'
    );
    
    console.log('✅ State transition complete');

    // Record attempt start
    const attemptStartTime = Date.now();
    await this.recordProcessingAttempt(urlId, {
      timestamp: attemptStartTime,
      stage: 'zotero_identifier', // Will be determined by actual method
      success: false, // Update on completion
    });
    
    console.log('📝 Processing attempt recorded');

    try {
      console.log('🎬 Starting Zotero processing...');
      
      // Call actual Zotero processing
      const result = await this.callZoteroProcessing(urlId);
      
      const processingDuration = Date.now() - attemptStartTime;
      console.log('\n📊 Zotero processing result:');
      console.log('Success:', result.success);
      console.log('Duration:', `${processingDuration}ms`);

      if (result.success && 'items' in result) {
        console.log('✅ Zotero processing succeeded');
        
        // Extract item key from response
        // Zotero returns items array, we want the first item's key
        const itemKey = result.items?.[0]?.key || result.items?.[0]?._meta?.itemKey;
        
        console.log('🔑 Extracted item key:', itemKey || 'NONE');
        console.log('📦 Items array length:', result.items?.length || 0);
        if (result.items && result.items.length > 0) {
          console.log('📄 First item structure:', JSON.stringify(result.items[0], null, 2));
        }
        
        if (!itemKey) {
          console.log('❌ No item key found in response - this is unusual');
          console.log('🔄 Calling handleZoteroFailure()...');
          return await this.handleZoteroFailure(
            urlId,
            'Zotero processing succeeded but no item key returned'
          );
        }
        
        console.log('🔍 Validating citation for item:', itemKey);
        // Validate citation
        const validation = await this.validateCitation(itemKey);
        
        console.log('📋 Citation validation result:');
        console.log('   Is complete:', validation.isComplete);
        console.log('   Status:', validation.status);
        console.log('   Missing fields:', validation.missingFields);
        
        const finalStatus: ProcessingStatus = validation.isComplete 
          ? 'stored' 
          : 'stored_incomplete';
        
        console.log('🎯 Final status determined:', finalStatus);
        console.log('🔄 Transitioning: processing_zotero →', finalStatus);

        await URLProcessingStateMachine.transition(
          urlId,
          'processing_zotero',
          finalStatus,
          {
            zoteroItemKey: itemKey,
            zoteroProcessedAt: new Date(),
            citationValidationStatus: validation.status,
            citationValidationDetails: {
              missingFields: validation.missingFields,
            },
          }
        );
        
        console.log('✅ State transition complete');

        // Update processing history with success
        console.log('📝 Updating processing history with success...');
        await this.updateLastAttempt(urlId, {
          success: true,
          itemKey: itemKey,
          method: result.method,
        });

        // Auto-trigger metadata extraction if incomplete
        if (finalStatus === 'stored_incomplete') {
          console.log('⚠️  Citation incomplete - triggering metadata extraction');
          await this.attemptMetadataExtraction(urlId);
        }

        console.log('✅ STAGE 1 COMPLETE - SUCCESS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        return {
          success: true,
          urlId,
          status: finalStatus,
          itemKey: itemKey,
          // method: result.method,
        };
      } else {
        console.log('❌ Zotero processing returned failure');
        console.log('💬 Error:', result.error);
        console.log('🔄 Calling handleZoteroFailure()...');
        
        // Failed - handle failure
        return await this.handleZoteroFailure(urlId, result.error?.toString() || 'Unknown error');
      }
    } catch (error) {
      console.log('\n💥 EXCEPTION caught in attemptZoteroProcessing()');
      console.log('🏷️  Error type:', error?.constructor?.name);
      console.log('💬 Error message:', getErrorMessage(error));
      
      if (error instanceof Error) {
        console.log('📜 Stack trace:');
        console.log(error.stack);
      }
      
      console.log('🔄 Calling handleZoteroFailure()...');
      
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
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║    FAILURE HANDLER: handleZoteroFailure()                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    console.log('💬 Error message:', errorMessage);
    
    const errorCategory = categorizeError(errorMessage);
    console.log('🏷️  Error category:', errorCategory);
    console.log('🔍 Is permanent error:', isPermanentError(errorMessage));
    
    // Update last attempt with failure
    console.log('📝 Updating last processing attempt with failure info...');
    await this.updateLastAttempt(urlId, {
      success: false,
      error: errorMessage,
      errorCategory,
    });

    // Increment processing attempts
    console.log('🔢 Incrementing processing attempts counter...');
    await db.update(urls)
      .set({
        processingAttempts: sql`${urls.processingAttempts} + 1`,
      })
      .where(eq(urls.id, urlId));
    
    // Get updated attempt count
    const updatedUrl = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
      columns: { processingAttempts: true },
    });
    console.log('📊 Processing attempts now:', updatedUrl?.processingAttempts || 0);

    // Check if error is permanent
    if (isPermanentError(errorMessage)) {
      console.log('🛑 PERMANENT ERROR DETECTED');
      console.log('❌ No auto-cascade - transitioning to exhausted');
      console.log('🎯 Transition: processing_zotero → exhausted');
      
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        'exhausted'
      );
      
      console.log('✅ Transitioned to exhausted state');
      console.log('💡 Suggestion: User should try manual creation');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      return {
        success: false,
        urlId,
        status: 'exhausted',
        error: errorMessage,
        errorCategory,
      };
    }

    // Auto-cascade to content processing
    console.log('🔄 AUTO-CASCADE DECISION');
    console.log('✅ Error is retryable (not permanent)');
    console.log('🎯 Next stage: Content Processing');
    console.log('📍 Reason: Zotero processing failed, trying alternative method');
    console.log('🚀 Calling attemptContentProcessing()...\n');
    
    return await this.attemptContentProcessing(urlId);
  }

  /**
   * Stage 2: Content Processing
   * Fetches content and extracts identifiers
   */
  private static async attemptContentProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   STAGE 2: attemptContentProcessing()                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    if (!url) {
      console.log('❌ URL not found');
      return { success: false, urlId, error: 'URL not found' };
    }

    console.log('📊 Current state:', url.processingStatus);
    console.log('🎯 Transitioning to: processing_content');
    
    await URLProcessingStateMachine.transition(
      urlId,
      url.processingStatus as ProcessingStatus,
      'processing_content'
    );
    
    console.log('✅ State transition complete');

    // Record attempt
    const attemptStartTime = Date.now();
    await this.recordProcessingAttempt(urlId, {
      timestamp: attemptStartTime,
      stage: 'content_extraction',
      success: false,
    });
    
    console.log('📝 Processing attempt recorded');

    try {
      console.log('🎬 Starting content processing...');
      
      // Call content processing
      const result = await this.callContentProcessing(urlId);
      
      const duration = Date.now() - attemptStartTime;
      console.log('\n📊 Content processing result:');
      console.log('Success:', result.success);
      console.log('State:', result.state);
      console.log('Identifier count:', result.identifierCount);
      console.log('Duration:', `${duration}ms`);

      if (result.identifierCount && result.identifierCount > 0) {
        console.log('✅ Identifiers found:', result.identifierCount);
        console.log('🎯 Transitioning: processing_content → awaiting_selection');
        
        // Found identifiers - await user selection
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_content',
          'awaiting_selection'
        );
        
        console.log('✅ State transition complete');

        await this.updateLastAttempt(urlId, {
          success: true,
          metadata: { identifierCount: result.identifierCount },
        });
        
        console.log('📝 Processing history updated');
        console.log('✅ STAGE 2 COMPLETE - AWAITING USER SELECTION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
          success: true,
          urlId,
          status: 'awaiting_selection',
          identifierCount: result.identifierCount,
        };
      } else {
        console.log('❌ No identifiers found');
        console.log('🔄 AUTO-CASCADE: Content → LLM Processing');
        console.log('🚀 Calling attemptLLMProcessing()...\n');
        
        // No identifiers - try LLM
        return await this.attemptLLMProcessing(urlId);
      }
    } catch (error) {
      console.log('\n💥 EXCEPTION in attemptContentProcessing()');
      console.log('💬 Error:', getErrorMessage(error));
      
      if (error instanceof Error) {
        console.log('📜 Stack:', error.stack);
      }
      
      console.log('🔄 Calling handleContentFailure()...');
      
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

    await db.update(urls)
      .set({
        processingAttempts: sql`${urls.processingAttempts} + 1`,
      })
      .where(eq(urls.id, urlId));

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

    const history: ProcessingAttempt[] = (url.processingHistory || []) as ProcessingAttempt[];
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

    const history: ProcessingAttempt[] = (url.processingHistory || []) as ProcessingAttempt[];
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
   * Uses the Zotero client validation
   */
  private static async validateCitation(itemKey: string) {
    try {
      // First fetch the item metadata
      const itemMetadata = await getItem(itemKey);
      
      // Then validate the citation using the imported function
      const result = validateCitationMetadata(itemMetadata);
      return {
        isComplete: result.status === 'valid',
        status: result.status,
        missingFields: result.missingFields || [],
      };
    } catch (error) {
      console.error(`Failed to validate citation for ${itemKey}:`, error);
      // On validation error, assume incomplete
      return {
        isComplete: false,
        status: 'incomplete',
        missingFields: ['validation_error'],
      };
    }
  }

  /**
   * Call Zotero processing
   * Determines best strategy (identifier vs URL) and processes accordingly
   */
  private static async callZoteroProcessing(urlId: number) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ORCHESTRATOR: callZoteroProcessing()                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('📌 URL ID:', urlId);
    
    try {
      // Get URL and related data
      console.log('📂 Loading URL record and related data...');
      const urlRecord = await db.query.urls.findFirst({
        where: eq(urls.id, urlId),
      });
      
      if (!urlRecord) {
        console.log('❌ URL record not found in database');
        return { success: false, error: 'URL not found' };
      }
      
      console.log('✅ URL record loaded:', urlRecord.url);
      console.log('📊 Current processing status:', urlRecord.processingStatus);
      console.log('🔢 Processing attempts:', urlRecord.processingAttempts);
      
      // Get analysis data for identifiers
      const analysisData = await db.query.urlAnalysisData.findFirst({
        where: eq(urlAnalysisData.urlId, urlId),
      });
      
      console.log('📊 Analysis data loaded:', analysisData ? 'Yes' : 'No');
      if (analysisData) {
        console.log('   Valid identifiers:', analysisData.validIdentifiers);
        console.log('   Web translators:', analysisData.webTranslators?.length || 0);
        console.log('   AI translation:', analysisData.aiTranslation);
      }
      
      // Get enrichments for custom identifiers
      const enrichment = await db.query.urlEnrichments.findFirst({
        where: eq(urlEnrichments.urlId, urlId),
      });
      
      console.log('📝 Enrichment data loaded:', enrichment ? 'Yes' : 'No');
      if (enrichment) {
        console.log('   Custom identifiers:', enrichment.customIdentifiers);
        console.log('   Has notes:', !!enrichment.notes);
      }
      
      // Strategy 1: Try valid identifiers from analysis (highest priority)
      if (analysisData?.validIdentifiers && Array.isArray(analysisData.validIdentifiers) && analysisData.validIdentifiers.length > 0) {
        const identifier = analysisData.validIdentifiers[0];
        console.log('\n🎯 STRATEGY 1: Using valid identifier from analysis');
        console.log('🔑 Identifier:', identifier);
        console.log('📚 Available identifiers:', analysisData.validIdentifiers.join(', '));
        console.log('🚀 Calling processIdentifier()...\n');
        
        const result = await processIdentifier(identifier);
        
        console.log('\n✅ STRATEGY 1 completed');
        console.log('Success:', result.success);
        console.log('Method returned:', result.method);
        return {
          ...result,
          method: 'identifier',
          identifier,
        };
      }
      
      // Strategy 2: Try custom identifiers from enrichment
      if (enrichment?.customIdentifiers && Array.isArray(enrichment.customIdentifiers) && enrichment.customIdentifiers.length > 0) {
        const identifier = enrichment.customIdentifiers[0];
        console.log('\n🎯 STRATEGY 2: Using custom identifier from enrichment');
        console.log('🔑 Custom identifier:', identifier);
        console.log('📚 Available custom IDs:', enrichment.customIdentifiers.join(', '));
        console.log('🚀 Calling processIdentifier()...\n');
        
        const result = await processIdentifier(identifier);
        
        console.log('\n✅ STRATEGY 2 completed');
        console.log('Success:', result.success);
        console.log('Method returned:', result.method);
        return {
          ...result,
          method: 'custom_identifier',
          identifier,
        };
      }
      
      // Strategy 3: Fall back to URL processing (web translators)
      console.log('\n🎯 STRATEGY 3: Using URL translator');
      console.log('🌐 URL:', urlRecord.url);
      console.log('🔧 Web translators available:', analysisData?.webTranslators?.length || 0);
      if (analysisData?.webTranslators && analysisData.webTranslators.length > 0) {
        console.log('   Translators:', JSON.stringify(analysisData.webTranslators, null, 2));
      }
      console.log('🚀 Calling processUrl()...\n');
      
      const result = await processUrl(urlRecord.url);
      
      console.log('\n✅ STRATEGY 3 completed');
      console.log('Success:', result.success);
      console.log('Method returned:', result.method);
      return {
        ...result,
        method: 'url',
      };
    } catch (error) {
      console.log('\n💥 EXCEPTION in callZoteroProcessing()');
      console.log('Error type:', error?.constructor?.name);
      console.log('Error message:', getErrorMessage(error));
      if (error instanceof Error && error.stack) {
        console.log('Stack trace:', error.stack);
      }
      console.log('Returning failure result');
      
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Call content processing
   * Fetches content and extracts identifiers
   */
  private static async callContentProcessing(urlId: number) {
    try {
      console.log(`URL ${urlId}: Fetching content and extracting identifiers`);
      const result = await processSingleUrl(urlId);
      return result;
    } catch (error) {
      return {
        success: false,
        state: 'failed_fetch' as const,
        identifierCount: 0,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Call LLM extraction
   * TODO: Implement LLM metadata extraction
   * For now, this returns failure to transition to exhausted state
   */
  private static async callLLMExtraction(urlId: number) {
    // LLM extraction not yet implemented
    // This allows the cascade to complete properly by reaching exhausted state
    console.log(`URL ${urlId}: LLM extraction not yet implemented, will transition to exhausted`);
    return {
      success: false,
      qualityScore: 0,
      error: 'LLM extraction not yet implemented',
    };
  }
}

