/**
 * Cache Server Actions
 * 
 * Server-side wrappers for cache operations that can be called from client components
 */

'use server';

import { hasCachedContent, getCachedPdfText } from '../content-cache';

/**
 * Check if URL has cached content (server action wrapper)
 */
export async function checkHasCachedContent(urlId: number): Promise<boolean> {
  return await hasCachedContent(urlId);
}

/**
 * Get cached PDF text (server action wrapper)
 */
export async function getCachedPdfTextAction(urlId: number): Promise<string | null> {
  return await getCachedPdfText(urlId);
}

