import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

/**
 * URL report entry structure from the JSON file
 */
export interface UrlReportEntry {
  url: string;
  success: boolean;
  timestamp: string;
  itemKey: string | null;
  identifiers: string[];
  validIdentifiers: string[];
  webTranslators: string[];
  status: string;
  processingRecommendation: string;
  urlAccessible: boolean;
  contentType: string;
  httpStatusCode: number | null;
  errors: string[];
  disambiguationUsed: boolean;
  aiTranslation: boolean;
  finalUrl?: string;
  redirectCount?: number;
  // Additional fields that might be present
  [key: string]: any;
}

/**
 * Parse URLs report JSON file
 */
export function parseUrlsReport(filePath: string): UrlReportEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('Invalid URLs report format: expected array');
  }
  
  return data;
}

/**
 * Calculate SHA256 hash of a file
 */
export function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if URLs report file exists for a section
 */
export function getUrlsReportPath(sectionPath: string): string | null {
  const reportPath = path.join(sectionPath, 'references', 'urls-report.json');
  
  if (fs.existsSync(reportPath)) {
    return reportPath;
  }
  
  return null;
}

/**
 * Get file modification time
 */
export function getFileModifiedTime(filePath: string): Date {
  const stats = fs.statSync(filePath);
  return stats.mtime;
}

/**
 * Prepare URL data for database insertion
 */
export interface PreparedUrlData {
  url: string;
  domain: string | null;
  statusCode: number | null;
  contentType: string;
  finalUrl: string | null;
  redirectCount: number | null;
  isAccessible: boolean;
  success: boolean;
  hasErrors: boolean;
  discoveredAt: Date;
  lastCheckedAt: Date;
}

/**
 * Prepare analysis data for database insertion
 */
export interface PreparedAnalysisData {
  validIdentifiers: string[];
  webTranslators: string[];
  aiTranslation: boolean;
  rawMetadata: Record<string, any>;
}

/**
 * Check if a URL report entry is valid (has successful analysis data, not just an error)
 */
export function isValidUrlReportEntry(entry: UrlReportEntry): boolean {
  // If entry has an 'error' field at the top level, it failed analysis
  if ('error' in entry && entry.error) {
    return false;
  }

  // Entry must have been successful
  if (!entry.success) {
    return false;
  }

  // Entry should have a valid URL
  if (!entry.url) {
    return false;
  }

  // Entry should have analysis data (at minimum, check required fields exist)
  if (!entry.status) {
    return false;
  }

  return true;
}

/**
 * Transform URL report entry into database-ready format
 *
 * @throws Error if the entry is invalid
 */
export function transformUrlReportEntry(
  entry: UrlReportEntry
): { url: PreparedUrlData; analysis: PreparedAnalysisData } {
  // Validate the entry before processing
  if (!isValidUrlReportEntry(entry)) {
    const error = ('error' in entry && entry.error)
      ? entry.error
      : 'Entry missing required fields or marked as unsuccessful';
    throw new Error(`Invalid URL report entry for ${entry.url}: ${error}`);
  }

  const url: PreparedUrlData = {
    url: entry.url,
    domain: extractDomain(entry.url),
    statusCode: entry.httpStatusCode,
    contentType: entry.contentType || 'unknown',
    finalUrl: entry.finalUrl || null,
    redirectCount: entry.redirectCount || null,
    isAccessible: entry.urlAccessible,
    success: entry.success,
    hasErrors: entry.errors && entry.errors.length > 0,
    discoveredAt: new Date(entry.timestamp),
    lastCheckedAt: new Date(entry.timestamp),
  };

  const analysis: PreparedAnalysisData = {
    validIdentifiers: entry.validIdentifiers || [],
    webTranslators: entry.webTranslators || [],
    aiTranslation: entry.aiTranslation || false,
    rawMetadata: {
      itemKey: entry.itemKey,
      identifiers: entry.identifiers,
      status: entry.status,
      processingRecommendation: entry.processingRecommendation,
      disambiguationUsed: entry.disambiguationUsed,
      errors: entry.errors,
    },
  };

  return { url, analysis };
}

