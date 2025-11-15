/**
 * Batch Processor
 * 
 * Handles concurrent processing of multiple URLs with:
 * - Concurrency control
 * - Pause/Resume functionality
 * - Progress tracking
 * - User intent respect
 * - Session management
 * 
 * Based on PRD Section 7.2: Batch Processing
 */

import pLimit from 'p-limit';
import { URLProcessingOrchestrator } from './url-processing-orchestrator';
import { getUrlWithCapabilities } from './processing-helpers';
import type {
  BatchProcessingSession,
  BatchProcessingOptions,
  ProcessingResult,
} from '../types/url-processing';

/**
 * Batch Processor
 * Manages concurrent processing of multiple URLs
 */
export class BatchProcessor {
  /**
   * Active processing sessions
   * Stored in memory - will be lost on server restart
   * TODO: Consider persisting to database for production
   */
  private static sessions: Map<string, BatchProcessingSession> = new Map();

  /**
   * Process multiple URLs concurrently
   * 
   * @param urlIds - Array of URL IDs to process
   * @param options - Processing options
   * @returns Processing session
   */
  static async processBatch(
    urlIds: number[],
    options: BatchProcessingOptions = {}
  ): Promise<BatchProcessingSession> {
    const sessionId = this.generateSessionId();
    
    // Filter URLs based on user intent if requested
    let filteredIds = urlIds;
    if (options.respectUserIntent) {
      filteredIds = await this.filterByUserIntent(urlIds);
    }
    
    // Create session
    const session: BatchProcessingSession = {
      id: sessionId,
      urlIds: filteredIds,
      currentIndex: 0,
      completed: [],
      failed: [],
      status: 'running',
      startedAt: new Date(),
      estimatedCompletion: this.estimateCompletion(filteredIds.length),
      results: [],
    };
    
    this.sessions.set(sessionId, session);
    
    // Create concurrency limiter
    const concurrency = options.concurrency || 5;
    const limit = pLimit(concurrency);
    
    console.log(`Starting batch processing session ${sessionId}: ${filteredIds.length} URLs with concurrency ${concurrency}`);
    
    // Process URLs with concurrency control
    const promises = filteredIds.map((urlId, index) =>
      limit(async () => {
        // Check if session is paused
        await this.waitIfPaused(sessionId);
        
        // Check if session is cancelled
        if (session.status === 'cancelled') {
          console.log(`Session ${sessionId} cancelled, skipping URL ${urlId}`);
          return;
        }
        
        try {
          const startTime = Date.now();
          const result = await URLProcessingOrchestrator.processUrl(urlId);
          const duration = Date.now() - startTime;
          
          // Update session
          if (result.success) {
            session.completed.push(urlId);
          } else {
            session.failed.push(urlId);
          }
          
          session.currentIndex = index + 1;
          session.results?.push({ ...result, urlId, metadata: { ...result.metadata, duration } });
          
          // Update estimated completion
          const avgDuration = this.calculateAverageDuration(session);
          session.estimatedCompletion = this.estimateCompletion(
            filteredIds.length - session.currentIndex,
            avgDuration
          );
          
          // Stop on error if requested
          if (!result.success && options.stopOnError) {
            console.log(`Stopping batch ${sessionId} due to error on URL ${urlId}`);
            session.status = 'cancelled';
          }
          
          console.log(`Batch ${sessionId}: Processed ${session.currentIndex}/${filteredIds.length} (${result.success ? '✓' : '✗'})`);
        } catch (error) {
          console.error(`Error processing URL ${urlId} in batch ${sessionId}:`, error);
          session.failed.push(urlId);
          session.currentIndex = index + 1;
          
          if (options.stopOnError) {
            session.status = 'cancelled';
          }
        }
      })
    );
    
    // Wait for all to complete
    await Promise.all(promises);
    
    // Mark session as completed
    session.status = session.status === 'cancelled' ? 'cancelled' : 'completed';
    session.completedAt = new Date();
    
    console.log(`Batch ${sessionId} finished: ${session.completed.length} succeeded, ${session.failed.length} failed`);
    
    return session;
  }

  /**
   * Pause a batch processing session
   */
  static pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'paused';
      console.log(`Batch ${sessionId} paused`);
    }
  }

  /**
   * Resume a paused session
   */
  static resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'running';
      console.log(`Batch ${sessionId} resumed`);
    }
  }

  /**
   * Cancel a session
   */
  static cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && (session.status === 'running' || session.status === 'paused')) {
      session.status = 'cancelled';
      console.log(`Batch ${sessionId} cancelled`);
    }
  }

  /**
   * Get session status
   */
  static getSession(sessionId: string): BatchProcessingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  static getAllSessions(): BatchProcessingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up completed sessions older than 1 hour
   */
  static cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [id, session] of this.sessions.entries()) {
      if (
        session.status === 'completed' &&
        session.completedAt &&
        session.completedAt.getTime() < oneHourAgo
      ) {
        this.sessions.delete(id);
        console.log(`Cleaned up old session ${id}`);
      }
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Wait while session is paused
   */
  private static async waitIfPaused(sessionId: string): Promise<void> {
    while (true) {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'paused') {
        break;
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Filter URLs by user intent
   * Removes ignored and archived URLs
   */
  private static async filterByUserIntent(urlIds: number[]): Promise<number[]> {
    const filtered: number[] = [];
    
    for (const urlId of urlIds) {
      const url = await getUrlWithCapabilities(urlId);
      if (url && url.userIntent !== 'ignore' && url.userIntent !== 'archive') {
        filtered.push(urlId);
      }
    }
    
    return filtered;
  }

  /**
   * Estimate completion time
   */
  private static estimateCompletion(
    remaining: number,
    avgDurationPerUrl: number = 3000
  ): Date {
    const estimatedMs = remaining * avgDurationPerUrl;
    return new Date(Date.now() + estimatedMs);
  }

  /**
   * Calculate average duration from session results
   */
  private static calculateAverageDuration(session: BatchProcessingSession): number {
    if (!session.results || session.results.length === 0) {
      return 3000; // Default 3 seconds
    }
    
    const durations = session.results
      .map(r => r.metadata?.duration as number)
      .filter(d => typeof d === 'number');
    
    if (durations.length === 0) {
      return 3000;
    }
    
    const total = durations.reduce((sum, d) => sum + d, 0);
    return total / durations.length;
  }
}

