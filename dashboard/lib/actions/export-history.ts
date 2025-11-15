/**
 * Export Processing History Actions
 * 
 * Server actions for exporting processing history and analytics data
 * Supports JSON and CSV formats
 */

'use server';

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, sections } from '../../drizzle/schema';
import { eq, inArray, and } from 'drizzle-orm';
import type { ExportData, UrlExportRecord, ExportSummary, ProcessingStatus } from '../types/url-processing';

/**
 * Export processing history for URLs
 * 
 * @param filters - Optional filters to apply
 * @param format - Export format ('json' or 'csv')
 * @returns Export data
 */
export async function exportProcessingHistory(
  filters?: {
    urlIds?: number[];
    sectionId?: number;
    processingStatus?: ProcessingStatus;
    minAttempts?: number;
  },
  format: 'json' | 'csv' = 'json'
): Promise<{ success: boolean; data?: ExportData | string; error?: string }> {
  try {
    // Build query
    const whereConditions = [];
    
    if (filters?.urlIds && filters.urlIds.length > 0) {
      whereConditions.push(inArray(urls.id, filters.urlIds));
    }
    
    if (filters?.sectionId) {
      whereConditions.push(eq(urls.sectionId, filters.sectionId));
    }
    
    if (filters?.processingStatus) {
      whereConditions.push(eq(urls.processingStatus, filters.processingStatus));
    }

    // Fetch URLs
    const urlRecords = await db
      .select()
      .from(urls)
      .leftJoin(sections, eq(urls.sectionId, sections.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Filter by attempts if specified
    let filtered = urlRecords;
    if (filters?.minAttempts !== undefined) {
      filtered = urlRecords.filter(r => (r.urls.processingAttempts || 0) >= (filters.minAttempts || 0));
    }

    // Transform to export records
    const exportRecords: UrlExportRecord[] = filtered.map(row => {
      const url = row.urls;
      const history = url.processingHistory || [];
      const errors = history
        .filter(h => h.error)
        .map(h => h.error!)
        .filter((e, i, arr) => arr.indexOf(e) === i); // Deduplicate

      return {
        url: url.url,
        processingStatus: (url.processingStatus || 'not_started') as ProcessingStatus,
        userIntent: (url.userIntent || 'auto') as any,
        processingAttempts: url.processingAttempts || 0,
        processingHistory: history as any, // Type compatibility - both ProcessingAttempt types
        zoteroItemKey: url.zoteroItemKey || undefined,
        finalStatus: (url.processingStatus || 'not_started') as ProcessingStatus,
        totalAttempts: history.length,
        errors,
      };
    });

    // Calculate summary
    const summary = calculateExportSummary(exportRecords);

    const exportData: ExportData = {
      urls: exportRecords,
      summary,
      generatedAt: new Date(),
      filters,
    };

    // Format based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportRecords);
      return {
        success: true,
        data: csv,
      };
    }

    return {
      success: true,
      data: exportData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate summary statistics for export
 */
function calculateExportSummary(records: UrlExportRecord[]): ExportSummary {
  const totalUrls = records.length;
  const successfulUrls = records.filter(r =>
    r.finalStatus.startsWith('stored')
  ).length;

  const successRate = totalUrls > 0 ? (successfulUrls / totalUrls) * 100 : 0;

  // Calculate average attempts
  const totalAttempts = records.reduce((sum, r) => sum + r.totalAttempts, 0);
  const averageAttempts = totalUrls > 0 ? totalAttempts / totalUrls : 0;

  // Find most common error
  const errorCounts: Record<string, number> = {};
  records.forEach(r => {
    r.errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
  });

  const mostCommonError = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  // Status distribution
  const statusDistribution = records.reduce((acc, r) => {
    acc[r.finalStatus] = (acc[r.finalStatus] || 0) + 1;
    return acc;
  }, {} as Record<ProcessingStatus, number>);

  return {
    totalUrls,
    successRate,
    mostCommonError,
    averageAttempts,
    statusDistribution,
  };
}

/**
 * Convert export records to CSV format
 */
function convertToCSV(records: UrlExportRecord[]): string {
  const headers = [
    'URL',
    'Processing Status',
    'User Intent',
    'Attempts',
    'Zotero Item Key',
    'Final Status',
    'Errors',
  ];

  const rows = records.map(r => [
    r.url,
    r.processingStatus,
    r.userIntent,
    r.processingAttempts.toString(),
    r.zoteroItemKey || '',
    r.finalStatus,
    r.errors.join('; '),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Export processing history for specific URLs
 * 
 * @param urlIds - Array of URL IDs to export
 * @returns Export data
 */
export async function exportProcessingHistoryForUrls(
  urlIds: number[]
): Promise<Array<{
  urlId: number;
  url: string;
  processingStatus: string;
  attempts: number;
  history: any[];
}>> {
  try {
    const exportData = [];

    for (const urlId of urlIds) {
      const url = await db.query.urls.findFirst({
        where: eq(urls.id, urlId),
      });

      if (url) {
        exportData.push({
          urlId: url.id,
          url: url.url,
          processingStatus: url.processingStatus || 'not_started',
          attempts: url.processingAttempts || 0,
          history: url.processingHistory || [],
        });
      }
    }

    return exportData;
  } catch (error) {
    console.error('Failed to export processing history:', error);
    throw error;
  }
}

/**
 * Export analytics data
 */
export async function exportAnalytics() {
  try {
    const allUrls = await db.select().from(urls);

    // Calculate various metrics
    const metrics = {
      totalUrls: allUrls.length,
      
      statusDistribution: allUrls.reduce((acc, url) => {
        const status = (url.processingStatus || 'not_started') as ProcessingStatus;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      intentDistribution: allUrls.reduce((acc, url) => {
        const intent = url.userIntent || 'auto';
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      attemptDistribution: {
        none: allUrls.filter(u => (u.processingAttempts || 0) === 0).length,
        one_to_two: allUrls.filter(u => {
          const attempts = u.processingAttempts || 0;
          return attempts >= 1 && attempts <= 2;
        }).length,
        three_plus: allUrls.filter(u => (u.processingAttempts || 0) >= 3).length,
      },

      citationDistribution: {
        valid: allUrls.filter(u => u.citationValidationStatus === 'valid').length,
        incomplete: allUrls.filter(u => u.citationValidationStatus === 'incomplete').length,
        not_validated: allUrls.filter(u => !u.citationValidationStatus).length,
      },

      successRate: allUrls.length > 0
        ? (allUrls.filter(u => (u.processingStatus || '').startsWith('stored')).length / allUrls.length) * 100
        : 0,

      averageAttempts: allUrls.length > 0
        ? allUrls.reduce((sum, u) => sum + (u.processingAttempts || 0), 0) / allUrls.length
        : 0,
    };

    return {
      success: true,
      data: metrics,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

