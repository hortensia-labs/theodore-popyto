/**
 * Content Cache Manager
 * 
 * Manages file system caching of downloaded URL content
 */

import { promises as fs } from 'fs';
import path from 'path';
import { calculateContentHash } from './content-fetcher';
import type { FetchContentResult } from './content-fetcher';
import { db } from './db/client';
import { urlContentCache, urls } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Configuration
const CACHE_BASE_DIR = process.env.CONTENT_CACHE_DIR || path.join(process.cwd(), 'data', 'content_cache');
const DEFAULT_MAX_AGE_DAYS = parseInt(process.env.CONTENT_CACHE_MAX_AGE_DAYS || '30', 10);
const MAX_AGE_MS = DEFAULT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export interface CacheOptions {
  cacheDir?: string;
  maxAge?: number; // milliseconds
}

export interface CachedContent {
  content: Buffer;
  metadata: {
    contentType: string;
    contentHash: string;
    statusCode: number;
    size: number;
    fetchedAt: Date;
    headers: Record<string, string>;
  };
  age: number; // milliseconds since cached
}

/**
 * Initialize cache directories
 */
export async function initializeCacheDirectories(): Promise<void> {
  const dirs = [
    CACHE_BASE_DIR,
    path.join(CACHE_BASE_DIR, 'raw', 'html'),
    path.join(CACHE_BASE_DIR, 'raw', 'pdf'),
    path.join(CACHE_BASE_DIR, 'processed'),
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Cache URL content
 */
export async function cacheContent(
  urlId: number,
  content: Buffer,
  metadata: FetchContentResult
): Promise<string> {
  await initializeCacheDirectories();
  
  const contentHash = calculateContentHash(content);
  const contentType = metadata.contentType;
  
  // Determine subdirectory based on content type
  let subdir = 'html';
  let extension = 'html';
  
  if (contentType.includes('pdf')) {
    subdir = 'pdf';
    extension = 'pdf';
  } else if (contentType.includes('xml')) {
    extension = 'xml';
  } else if (contentType.includes('json')) {
    extension = 'json';
  }
  
  // Create file path
  const filename = `${contentHash}.${extension}`;
  const rawContentPath = path.join(CACHE_BASE_DIR, 'raw', subdir, filename);
  
  // Write file atomically (write to temp, then rename)
  const tempPath = `${rawContentPath}.tmp`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, rawContentPath);
  
  // Calculate expiry (30 days from now)
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  
  // Store metadata in database
  await db.insert(urlContentCache)
    .values({
      urlId,
      contentHash,
      contentType,
      contentSize: content.length,
      rawContentPath,
      statusCode: metadata.statusCode,
      redirectChain: metadata.redirectChain,
      responseHeaders: metadata.headers,
      fetchedAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt,
    })
    .onConflictDoUpdate({
      target: urlContentCache.urlId,
      set: {
        contentHash,
        contentType,
        contentSize: content.length,
        rawContentPath,
        statusCode: metadata.statusCode,
        redirectChain: metadata.redirectChain,
        responseHeaders: metadata.headers,
        fetchedAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt,
        updatedAt: new Date(),
      },
    });
  
  return contentHash;
}

/**
 * Get cached content for URL
 */
export async function getCachedContent(
  urlId: number
): Promise<CachedContent | null> {
  // Get cache metadata from database
  const cacheRecord = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cacheRecord) {
    return null;
  }
  
  // Check if cache is expired
  if (cacheRecord.expiresAt && cacheRecord.expiresAt < new Date()) {
    // Cache expired, delete it
    await invalidateCache(urlId);
    return null;
  }
  
  // Read content from file
  try {
    const content = await fs.readFile(cacheRecord.rawContentPath);
    
    // Update last accessed time
    await db.update(urlContentCache)
      .set({ lastAccessedAt: new Date() })
      .where(eq(urlContentCache.id, cacheRecord.id));
    
    const age = Date.now() - cacheRecord.fetchedAt.getTime();
    
    return {
      content,
      metadata: {
        contentType: cacheRecord.contentType,
        contentHash: cacheRecord.contentHash,
        statusCode: cacheRecord.statusCode,
        size: cacheRecord.contentSize,
        fetchedAt: cacheRecord.fetchedAt,
        headers: cacheRecord.responseHeaders || {},
      },
      age,
    };
  } catch (error) {
    // File not found or read error - invalidate cache record
    console.error(`Failed to read cached content for URL ${urlId}:`, error);
    await invalidateCache(urlId);
    return null;
  }
}

/**
 * Invalidate cache for URL
 */
export async function invalidateCache(urlId: number): Promise<void> {
  // Get cache record
  const cacheRecord = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cacheRecord) {
    return;
  }
  
  // Delete file if it exists
  try {
    await fs.unlink(cacheRecord.rawContentPath);
  } catch (error) {
    // File might not exist, ignore
  }
  
  // Delete processed file if it exists
  if (cacheRecord.processedContentPath) {
    try {
      await fs.unlink(cacheRecord.processedContentPath);
    } catch (error) {
      // File might not exist, ignore
    }
  }
  
  // Delete database record
  await db.delete(urlContentCache)
    .where(eq(urlContentCache.id, cacheRecord.id));
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache(): Promise<{
  filesDeleted: number;
  bytesFreed: number;
}> {
  let filesDeleted = 0;
  let bytesFreed = 0;
  
  // Find expired cache entries
  const expiredEntries = await db.query.urlContentCache.findMany({
    where: (cache, { and, lt, isNotNull }) => 
      and(
        isNotNull(cache.expiresAt),
        lt(cache.expiresAt, new Date())
      ),
  });
  
  for (const entry of expiredEntries) {
    try {
      // Delete raw file
      await fs.unlink(entry.rawContentPath);
      bytesFreed += entry.contentSize;
      filesDeleted++;
    } catch (error) {
      // File might not exist
    }
    
    // Delete processed file if exists
    if (entry.processedContentPath) {
      try {
        await fs.unlink(entry.processedContentPath);
        filesDeleted++;
      } catch (error) {
        // File might not exist
      }
    }
    
    // Delete database record
    await db.delete(urlContentCache)
      .where(eq(urlContentCache.id, entry.id));
  }
  
  return { filesDeleted, bytesFreed };
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  const allEntries = await db.query.urlContentCache.findMany();
  
  const totalEntries = allEntries.length;
  const totalSize = allEntries.reduce((sum, entry) => sum + entry.contentSize, 0);
  
  const expiredEntries = allEntries.filter(
    entry => entry.expiresAt && entry.expiresAt < new Date()
  ).length;
  
  const dates = allEntries.map(entry => entry.fetchedAt.getTime());
  const oldestEntry = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const newestEntry = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  
  return {
    totalEntries,
    totalSize,
    expiredEntries,
    oldestEntry,
    newestEntry,
  };
}

/**
 * Check if URL has cached content
 */
export async function hasCachedContent(urlId: number): Promise<boolean> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  return !!cache && (!cache.expiresAt || cache.expiresAt > new Date());
}

/**
 * Get cache path for URL
 */
export async function getCachePath(urlId: number): Promise<string | null> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  return cache?.rawContentPath || null;
}

/**
 * Store processed content
 */
export async function cacheProcessedContent(
  urlId: number,
  processedContent: Buffer | string
): Promise<void> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cache) {
    throw new Error('No cache entry found for URL');
  }
  
  await initializeCacheDirectories();
  
  const filename = `${cache.contentHash}.json`;
  const processedPath = path.join(CACHE_BASE_DIR, 'processed', filename);
  
  const content = typeof processedContent === 'string' 
    ? processedContent 
    : processedContent.toString('utf8');
  
  await fs.writeFile(processedPath, content, 'utf8');
  
  await db.update(urlContentCache)
    .set({ processedContentPath: processedPath })
    .where(eq(urlContentCache.id, cache.id));
}

/**
 * Get processed content
 */
export async function getProcessedContent(
  urlId: number
): Promise<string | null> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cache || !cache.processedContentPath) {
    return null;
  }
  
  try {
    return await fs.readFile(cache.processedContentPath, 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Cache PDF text content (for LLM fallback)
 */
export async function cachePdfText(
  urlId: number,
  pdfTextJson: string
): Promise<void> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cache) {
    throw new Error('No cache entry found for URL');
  }
  
  await initializeCacheDirectories();
  
  const filename = `${cache.contentHash}_pdf_text.json`;
  const processedPath = path.join(CACHE_BASE_DIR, 'processed', filename);
  
  await fs.writeFile(processedPath, pdfTextJson, 'utf8');
  
  await db.update(urlContentCache)
    .set({ processedContentPath: processedPath })
    .where(eq(urlContentCache.id, cache.id));
}

/**
 * Get cached PDF text content
 */
export async function getCachedPdfText(
  urlId: number
): Promise<string | null> {
  const cache = await db.query.urlContentCache.findFirst({
    where: eq(urlContentCache.urlId, urlId),
  });
  
  if (!cache || !cache.processedContentPath) {
    return null;
  }
  
  // Check if it's a PDF text cache file
  if (!cache.processedContentPath.includes('_pdf_text.json')) {
    return null;
  }
  
  try {
    return await fs.readFile(cache.processedContentPath, 'utf8');
  } catch (error) {
    return null;
  }
}

