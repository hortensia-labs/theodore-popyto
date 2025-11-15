/**
 * State Transition Actions
 * 
 * Server actions for managing URL processing state transitions,
 * user intent, and processing state resets.
 */

'use server';

import { db } from '../db/client';
import { urls } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import { StateGuards } from '../state-machine/state-guards';
import { getUrlWithCapabilities, resetUrlProcessingState as resetProcessingStateHelper, setUserIntent as setUserIntentHelper } from '../orchestrator/processing-helpers';
import type { ProcessingStatus, UserIntent, TransitionMetadata, TransitionResult } from '../types/url-processing';

/**
 * Transition a URL's processing status
 * 
 * @param urlId - URL ID
 * @param toStatus - Desired new status
 * @param metadata - Optional metadata for the transition
 * @returns Transition result
 */
export async function transitionProcessingState(
  urlId: number,
  toStatus: ProcessingStatus,
  metadata?: TransitionMetadata
): Promise<TransitionResult> {
  try {
    // Get current URL data
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    const currentStatus = urlData.processingStatus;
    
    // Perform transition using state machine
    const result = await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      toStatus,
      metadata
    );
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reset URL processing state
 * Clears all processing history and returns URL to not_started state
 * 
 * @param urlId - URL ID to reset
 * @returns Result
 */
export async function resetProcessingState(urlId: number) {
  try {
    // Get current URL
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if can reset
    if (!StateGuards.canReset(urlData)) {
      return {
        success: false,
        error: `Cannot reset URL (currently ${urlData.processingStatus})`,
      };
    }
    
    // Use helper to reset
    await resetProcessingStateHelper(urlId);
    
    return {
      success: true,
      message: 'Processing state reset successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Set user intent for a URL
 * 
 * @param urlId - URL ID
 * @param intent - New user intent
 * @returns Result
 */
export async function setUserIntent(
  urlId: number,
  intent: UserIntent
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate intent
    const validIntents: UserIntent[] = ['auto', 'ignore', 'priority', 'manual_only', 'archive'];
    if (!validIntents.includes(intent)) {
      return {
        success: false,
        error: `Invalid intent: ${intent}`,
      };
    }
    
    // Use helper to set intent
    await setUserIntentHelper(urlId, intent);
    
    // If setting to ignore/archive, transition to appropriate state
    const urlData = await getUrlWithCapabilities(urlId);
    if (urlData) {
      if (intent === 'ignore' && urlData.processingStatus !== 'ignored') {
        await URLProcessingStateMachine.transition(
          urlId,
          urlData.processingStatus,
          'ignored',
          { reason: 'User set intent to ignore' }
        );
      } else if (intent === 'archive' && urlData.processingStatus !== 'archived') {
        await URLProcessingStateMachine.transition(
          urlId,
          urlData.processingStatus,
          'archived',
          { reason: 'User set intent to archive' }
        );
      }
    }
    
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Ignore a URL (mark to skip processing)
 * 
 * @param urlId - URL ID
 * @returns Result
 */
export async function ignoreUrl(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return { success: false, error: 'URL not found' };
    }
    
    if (!StateGuards.canIgnore(urlData)) {
      return {
        success: false,
        error: `Cannot ignore URL (currently ${urlData.processingStatus})`,
      };
    }
    
    // Transition to ignored state
    await URLProcessingStateMachine.transition(
      urlId,
      urlData.processingStatus,
      'ignored',
      { reason: 'User ignored URL' }
    );
    
    // Set user intent
    await setUserIntentHelper(urlId, 'ignore');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Un-ignore a URL (remove ignore state)
 * 
 * @param urlId - URL ID
 * @returns Result
 */
export async function unignoreUrl(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return { success: false, error: 'URL not found' };
    }
    
    if (!StateGuards.canUnignore(urlData)) {
      return {
        success: false,
        error: `Cannot un-ignore URL (currently ${urlData.processingStatus})`,
      };
    }
    
    // Transition to not_started
    await URLProcessingStateMachine.transition(
      urlId,
      urlData.processingStatus,
      'not_started',
      { reason: 'User un-ignored URL' }
    );
    
    // Set user intent back to auto
    await setUserIntentHelper(urlId, 'auto');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Archive a URL (permanent ignore)
 * 
 * @param urlId - URL ID
 * @returns Result
 */
export async function archiveUrl(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);
    
    if (!urlData) {
      return { success: false, error: 'URL not found' };
    }
    
    if (!StateGuards.canArchive(urlData)) {
      return {
        success: false,
        error: `Cannot archive URL (currently ${urlData.processingStatus})`,
      };
    }
    
    // Transition to archived state
    await URLProcessingStateMachine.transition(
      urlId,
      urlData.processingStatus,
      'archived',
      { reason: 'User archived URL' }
    );
    
    // Set user intent
    await setUserIntentHelper(urlId, 'archive');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk ignore URLs
 * 
 * @param urlIds - Array of URL IDs
 * @returns Batch result
 */
export async function bulkIgnoreUrls(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => ignoreUrl(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Bulk archive URLs
 * 
 * @param urlIds - Array of URL IDs
 * @returns Batch result
 */
export async function bulkArchiveUrls(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => archiveUrl(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

/**
 * Bulk reset processing states
 * 
 * @param urlIds - Array of URL IDs
 * @returns Batch result
 */
export async function bulkResetProcessingState(urlIds: number[]) {
  const results = await Promise.all(
    urlIds.map(urlId => resetProcessingState(urlId))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    total: urlIds.length,
    successful,
    failed,
    results,
  };
}

