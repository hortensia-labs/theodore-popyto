/**
 * Batch Processing Actions
 * 
 * Server actions for batch URL processing with session management
 */

'use server';

import { BatchProcessor } from '../orchestrator/batch-processor';
import type { BatchProcessingSession, BatchProcessingOptions } from '../types/url-processing';

/**
 * Start a batch processing session (non-blocking)
 *
 * Returns immediately with a session object. Batch processing happens
 * in the background on the server without blocking the client.
 *
 * The returned session contains the initial state. As processing continues,
 * polling with getBatchStatus() will return updated progress.
 *
 * @param urlIds - Array of URL IDs to process
 * @param options - Processing options
 * @returns Session object with initial state (processing starts immediately in background)
 */
export async function startBatchProcessing(
  urlIds: number[],
  options?: BatchProcessingOptions
): Promise<BatchProcessingSession> {
  try {
    if (urlIds.length === 0) {
      throw new Error('No URLs provided for batch processing');
    }

    console.log(`Starting batch processing: ${urlIds.length} URLs (non-blocking)`);

    // Use BatchProcessor to create and initialize the session
    // This returns immediately after session creation
    const session = BatchProcessor.createAndStartSession(urlIds, {
      concurrency: options?.concurrency || 5,
      respectUserIntent: options?.respectUserIntent !== false,
      stopOnError: options?.stopOnError || false,
      ...options,
    });

    return session;
  } catch (error) {
    throw new Error(`Failed to start batch processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Pause a batch processing session
 * 
 * @param sessionId - Session ID to pause
 * @returns Success result
 */
export async function pauseBatch(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    BatchProcessor.pauseSession(sessionId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resume a paused batch processing session
 * 
 * @param sessionId - Session ID to resume
 * @returns Success result
 */
export async function resumeBatch(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    BatchProcessor.resumeSession(sessionId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a batch processing session
 * 
 * @param sessionId - Session ID to cancel
 * @returns Success result
 */
export async function cancelBatch(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    BatchProcessor.cancelSession(sessionId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get batch processing session status
 * 
 * @param sessionId - Session ID
 * @returns Session or null if not found
 */
export async function getBatchStatus(
  sessionId: string
): Promise<{ success: boolean; data?: BatchProcessingSession; error?: string }> {
  try {
    const session = BatchProcessor.getSession(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }
    
    return {
      success: true,
      data: session,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all active batch processing sessions
 * 
 * @returns Array of all sessions
 */
export async function getAllBatchSessions(): Promise<{
  success: boolean;
  data?: BatchProcessingSession[];
  error?: string;
}> {
  try {
    const sessions = BatchProcessor.getAllSessions();
    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up old completed sessions
 * 
 * @returns Number of sessions cleaned up
 */
export async function cleanupOldSessions(): Promise<{ success: boolean; cleaned?: number }> {
  try {
    const beforeCount = BatchProcessor.getAllSessions().length;
    BatchProcessor.cleanupOldSessions();
    const afterCount = BatchProcessor.getAllSessions().length;
    const cleaned = beforeCount - afterCount;
    
    return {
      success: true,
      cleaned,
    };
  } catch (error) {
    return {
      success: false,
    };
  }
}

