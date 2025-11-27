/**
 * URL Processing Hook
 * 
 * Manages processing operations for URLs including:
 * - Single URL processing
 * - Batch processing with progress
 * - Error/success message handling
 * - Loading states
 * - Processing history
 */

'use client';

import { useState, useCallback, useTransition } from 'react';
import { processUrlWithZotero } from '@/lib/actions/zotero';
import { startBatchProcessing, getBatchStatus, pauseBatch, resumeBatch, cancelBatch } from '@/lib/actions/batch-actions';
import { ignoreUrl, unignoreUrl, archiveUrl } from '@/lib/actions/state-transitions';
import { resetProcessingState } from '@/lib/actions/state-transitions';
import type { ProcessingResult } from '@/lib/types/url-processing';
import type { BatchProcessingSession } from '@/lib/types/url-processing';

export interface ProcessingLog {
  urlId: number;
  url: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  itemKey?: string;
  error?: string;
  timestamp: number;
}

/**
 * Custom hook for managing URL processing operations
 * 
 * Features:
 * - Process single URLs
 * - Batch processing with progress tracking
 * - Error and success message handling
 * - Loading states
 * - Action history
 */
export function useURLProcessing() {
  const [isPending, startTransition] = useTransition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([]);
  
  // Batch processing state
  const [batchSession, setBatchSession] = useState<BatchProcessingSession | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  /**
   * Process a single URL
   */
  const processSingle = useCallback(async (urlId: number, url: string) => {
    clearMessages();
    setIsProcessing(true);
    
    // Add to logs
    setProcessingLogs(prev => [...prev, {
      urlId,
      url,
      status: 'processing',
      timestamp: Date.now(),
    }]);
    
    try {
      const result = await processUrlWithZotero(urlId);
      
      // Update log
      setProcessingLogs(prev => prev.map(log =>
        log.urlId === urlId
          ? {
              ...log,
              status: result.success ? 'success' : 'failed',
              itemKey: result.itemKey,
              error: result.error,
            }
          : log
      ));
      
      if (result.success) {
        setSuccessMessage('URL processed successfully');
      } else {
        setError(result.error || 'Processing failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      
      setProcessingLogs(prev => prev.map(log =>
        log.urlId === urlId
          ? { ...log, status: 'failed', error: errorMsg }
          : log
      ));
      
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [clearMessages]);

  /**
   * Process multiple URLs in batch
   */
  const processBatch = useCallback(async (
    urlIds: number[],
    options?: {
      concurrency?: number;
      respectUserIntent?: boolean;
      onProgress?: (progress: typeof batchProgress) => void;
    }
  ) => {
    clearMessages();
    setIsProcessing(true);

    // Initialize session with empty progress (polling will update it)
    const initialProgress = {
      current: 0,
      total: urlIds.length,
      percentage: 0,
      succeeded: 0,
      failed: 0,
    };

    setBatchProgress(initialProgress);

    try {
      // Start batch session (returns immediately, processing happens in background)
      const session = await startBatchProcessing(urlIds, {
        concurrency: options?.concurrency || 5,
        respectUserIntent: options?.respectUserIntent !== false,
      });

      setBatchSession(session);

      // Start polling IMMEDIATELY after session is created
      // This will begin tracking progress as soon as processing starts
      const pollInterval = setInterval(async () => {
        const statusResult = await getBatchStatus(session.id);

        if (statusResult.success && statusResult.data) {
          const status = statusResult.data;

          const progress = {
            current: status.currentIndex,
            total: status.urlIds.length,
            percentage: status.urlIds.length > 0 ? (status.currentIndex / status.urlIds.length) * 100 : 0,
            succeeded: status.completed.length,
            failed: status.failed.length,
          };

          setBatchProgress(progress);
          options?.onProgress?.(progress);

          // Update session in state to reflect current server state
          setBatchSession(status);

          // Check if completed
          if (status.status === 'completed' || status.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsProcessing(false);

            if (status.status === 'completed') {
              setSuccessMessage(
                `Batch complete: ${status.completed.length} succeeded, ${status.failed.length} failed`
              );
            } else {
              setError('Batch processing was cancelled');
            }
          }
        }
      }, 500); // Increased frequency from 1000ms to 500ms for more responsive UI

      return session;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsProcessing(false);
      return null;
    }
  }, [clearMessages]);

  /**
   * Pause current batch
   */
  const pauseCurrentBatch = useCallback(async () => {
    if (!batchSession) return;
    
    const result = await pauseBatch(batchSession.id);
    if (result.success && batchSession) {
      setBatchSession({ ...batchSession, status: 'paused' });
    }
  }, [batchSession]);

  /**
   * Resume current batch
   */
  const resumeCurrentBatch = useCallback(async () => {
    if (!batchSession) return;
    
    const result = await resumeBatch(batchSession.id);
    if (result.success && batchSession) {
      setBatchSession({ ...batchSession, status: 'running' });
    }
  }, [batchSession]);

  /**
   * Cancel current batch
   */
  const cancelCurrentBatch = useCallback(async () => {
    if (!batchSession) return;
    
    const result = await cancelBatch(batchSession.id);
    if (result.success) {
      setIsProcessing(false);
      setBatchSession(null);
      setError('Batch processing cancelled');
    }
  }, [batchSession]);

  /**
   * Ignore a URL
   */
  const ignore = useCallback(async (urlId: number) => {
    startTransition(async () => {
      clearMessages();
      const result = await ignoreUrl(urlId);
      
      if (result.success) {
        setSuccessMessage('URL marked as ignored');
      } else {
        setError(result.error || 'Failed to ignore URL');
      }
    });
  }, [clearMessages]);

  /**
   * Unignore a URL
   */
  const unignore = useCallback(async (urlId: number) => {
    startTransition(async () => {
      clearMessages();
      const result = await unignoreUrl(urlId);
      
      if (result.success) {
        setSuccessMessage('URL unignored');
      } else {
        setError(result.error || 'Failed to unignore URL');
      }
    });
  }, [clearMessages]);

  /**
   * Archive a URL
   */
  const archive = useCallback(async (urlId: number) => {
    startTransition(async () => {
      clearMessages();
      const result = await archiveUrl(urlId);
      
      if (result.success) {
        setSuccessMessage('URL archived');
      } else {
        setError(result.error || 'Failed to archive URL');
      }
    });
  }, [clearMessages]);

  /**
   * Reset processing state
   */
  const reset = useCallback(async (urlId: number) => {
    startTransition(async () => {
      clearMessages();
      const result = await resetProcessingState(urlId);
      
      if (result.success) {
        setSuccessMessage('Processing state reset');
      } else {
        setError(result.error || 'Failed to reset state');
      }
    });
  }, [clearMessages]);

  /**
   * Clear processing logs
   */
  const clearLogs = useCallback(() => {
    setProcessingLogs([]);
  }, []);

  return {
    // State
    isProcessing: isProcessing || isPending,
    error,
    successMessage,
    processingLogs,
    batchSession,
    batchProgress,
    
    // Single URL operations
    processSingle,
    ignore,
    unignore,
    archive,
    reset,
    
    // Batch operations
    processBatch,
    pauseCurrentBatch,
    resumeCurrentBatch,
    cancelCurrentBatch,
    
    // Utilities
    clearMessages,
    clearLogs,
  };
}

