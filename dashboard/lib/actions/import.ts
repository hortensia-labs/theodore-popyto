'use server';

import { db } from '../db/client';
import { sections, urls, urlAnalysisData, importHistory } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import {
  parseUrlsReport,
  calculateFileHash,
  transformUrlReportEntry,
  isValidUrlReportEntry,
  getUrlsReportPath,
  getFileModifiedTime,
  type UrlReportEntry
} from '../importers/urls-report';
import path from 'path';
import { readdir } from 'fs/promises';

export interface SyncResult {
  success: boolean;
  data?: {
    urlsImported: number;
    urlsUpdated: number;
    urlsSkipped: number;
    urlsInvalid: number;
    section: string;
    skippedEntries?: Array<{ url: string; reason: string }>;
  };
  error?: string;
}

export interface SyncStatus {
  success: boolean;
  data?: {
    needsSync: boolean;
    lastSyncedAt: Date | null;
    lastSyncHash: string | null;
    currentFileHash: string;
    fileModified: Date;
    changesSummary?: string;
  };
  error?: string;
}

export interface SyncAllResult {
  success: boolean;
  data?: {
    totalSynced: number;
    totalUrlsImported: number;
    totalUrlsUpdated: number;
    totalUrlsInvalid: number;
    sectionResults?: Array<{
      section: string;
      urlsImported: number;
      urlsUpdated: number;
      urlsSkipped: number;
      urlsInvalid: number;
    }>;
  };
  errors?: string[];
}

/**
 * Check if a section needs to be synced
 */
export async function checkSyncStatus(sectionName: string): Promise<SyncStatus> {
  try {
    // Get section path
    const sectionsRoot = path.join(process.cwd(), '..', 'sections');
    const sectionPath = path.join(sectionsRoot, sectionName);
    
    // Find URLs report file
    const reportPath = getUrlsReportPath(sectionPath);
    if (!reportPath) {
      return {
        success: false,
        error: `No urls-report.json found for section ${sectionName}`,
      };
    }
    
    // Calculate current file hash
    const currentHash = calculateFileHash(reportPath);
    const fileModified = getFileModifiedTime(reportPath);
    
    // Check if section exists in database
    const section = await db.query.sections.findFirst({
      where: eq(sections.name, sectionName),
    });
    
    if (!section) {
      return {
        success: true,
        data: {
          needsSync: true,
          lastSyncedAt: null,
          lastSyncHash: null,
          currentFileHash: currentHash,
          fileModified,
          changesSummary: 'Section never synced',
        },
      };
    }
    
    // Get last import
    const lastImport = await db.query.importHistory.findFirst({
      where: eq(importHistory.sectionId, section.id),
      orderBy: (importHistory, { desc }) => [desc(importHistory.importedAt)],
    });
    
    if (!lastImport) {
      return {
        success: true,
        data: {
          needsSync: true,
          lastSyncedAt: null,
          lastSyncHash: null,
          currentFileHash: currentHash,
          fileModified,
          changesSummary: 'Section never synced',
        },
      };
    }
    
    const needsSync = lastImport.fileHash !== currentHash;
    
    return {
      success: true,
      data: {
        needsSync,
        lastSyncedAt: new Date(lastImport.importedAt),
        lastSyncHash: lastImport.fileHash,
        currentFileHash: currentHash,
        fileModified,
        changesSummary: needsSync ? 'File has changed since last sync' : 'Up to date',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking sync status',
    };
  }
}

/**
 * Sync a section from its URLs report JSON file
 */
export async function syncSection(sectionName: string): Promise<SyncResult> {
  try {
    // Get section path
    const sectionsRoot = path.join(process.cwd(), '..', 'sections');
    const sectionPath = path.join(sectionsRoot, sectionName);
    
    // Find URLs report file
    const reportPath = getUrlsReportPath(sectionPath);
    if (!reportPath) {
      return {
        success: false,
        error: `No urls-report.json found for section ${sectionName}`,
      };
    }
    
    // Parse the report
    const reportEntries = parseUrlsReport(reportPath);
    const fileHash = calculateFileHash(reportPath);
    
    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create or get section
      let section = await tx.query.sections.findFirst({
        where: eq(sections.name, sectionName),
      });
      
      if (!section) {
        const [newSection] = await tx.insert(sections).values({
          name: sectionName,
          title: sectionName.replace(/-/g, ' ').replace(/^\d+\s*/, ''),
          path: sectionPath,
        }).returning();
        section = newSection;
      }
      
      let urlsImported = 0;
      let urlsUpdated = 0;
      let urlsSkipped = 0;
      let urlsInvalid = 0;
      const errors: string[] = [];
      const skippedEntries: Array<{ url: string; reason: string }> = [];

      // Process each URL entry
      for (const entry of reportEntries) {
        try {
          // Check if entry is valid before processing
          if (!isValidUrlReportEntry(entry)) {
            const reason = ('error' in entry && entry.error)
              ? String(entry.error)
              : 'Entry missing required fields or marked as unsuccessful';
            urlsInvalid++;
            urlsSkipped++;
            skippedEntries.push({ url: entry.url || 'unknown', reason });
            errors.push(`Invalid entry for ${entry.url}: ${reason}`);
            continue;
          }

          const { url: urlData, analysis: analysisData } = transformUrlReportEntry(entry);

          // Check if URL already exists
          const existingUrl = await tx.query.urls.findFirst({
            where: and(
              eq(urls.url, urlData.url),
              eq(urls.sectionId, section.id)
            ),
          });

          if (existingUrl) {
            // Update existing URL
            await tx.update(urls)
              .set({
                ...urlData,
                updatedAt: new Date(),
              })
              .where(eq(urls.id, existingUrl.id));

            // Update or create analysis data
            const existingAnalysis = await tx.query.urlAnalysisData.findFirst({
              where: eq(urlAnalysisData.urlId, existingUrl.id),
            });

            if (existingAnalysis) {
              await tx.update(urlAnalysisData)
                .set({
                  validIdentifiers: analysisData.validIdentifiers,
                  webTranslators: analysisData.webTranslators,
                  aiTranslation: analysisData.aiTranslation,
                  rawMetadata: analysisData.rawMetadata,
                  updatedAt: new Date(),
                })
                .where(eq(urlAnalysisData.id, existingAnalysis.id));
            } else {
              await tx.insert(urlAnalysisData).values({
                urlId: existingUrl.id,
                ...analysisData,
              });
            }

            urlsUpdated++;
          } else {
            // Insert new URL
            const [newUrl] = await tx.insert(urls).values({
              sectionId: section.id,
              ...urlData,
            }).returning();

            // Insert analysis data
            await tx.insert(urlAnalysisData).values({
              urlId: newUrl.id,
              ...analysisData,
            });

            urlsImported++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error processing URL ${entry.url}: ${errorMsg}`);
          urlsSkipped++;
          // Note: don't increment urlsInvalid here as this is a processing error, not a data validation error
        }
      }
      
      // Record import history
      await tx.insert(importHistory).values({
        sectionId: section.id,
        filePath: reportPath,
        fileHash,
        urlsImported,
        urlsUpdated,
        urlsSkipped,
        errors: errors.length > 0 ? errors : null,
      });

      return {
        urlsImported,
        urlsUpdated,
        urlsSkipped,
        urlsInvalid,
        section: sectionName,
        skippedEntries: skippedEntries.length > 0 ? skippedEntries : undefined,
      };
    });
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
    };
  }
}

/**
 * Get import history for a section
 */
export async function getSyncHistory(sectionName?: string) {
  try {
    if (sectionName) {
      const section = await db.query.sections.findFirst({
        where: eq(sections.name, sectionName),
      });
      
      if (!section) {
        return { success: false, error: 'Section not found' };
      }
      
      const history = await db.query.importHistory.findMany({
        where: eq(importHistory.sectionId, section.id),
        orderBy: (importHistory, { desc }) => [desc(importHistory.importedAt)],
      });
      
      return { success: true, data: history };
    } else {
      const history = await db.query.importHistory.findMany({
        with: {
          section: true,
        },
        orderBy: (importHistory, { desc }) => [desc(importHistory.importedAt)],
      });
      
      return { success: true, data: history };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching history',
    };
  }
}

/**
 * Sync all sections that have urls-report.json files
 */
export async function syncAllSections(): Promise<SyncAllResult> {
  try {
    const sectionsRoot = path.join(process.cwd(), '..', 'sections');
    const sectionsDir = await readdir(sectionsRoot, { withFileTypes: true });

    let totalSynced = 0;
    let totalUrlsImported = 0;
    let totalUrlsUpdated = 0;
    let totalUrlsInvalid = 0;
    const errors: string[] = [];
    const sectionResults: Array<{
      section: string;
      urlsImported: number;
      urlsUpdated: number;
      urlsSkipped: number;
      urlsInvalid: number;
    }> = [];

    for (const entry of sectionsDir) {
      if (entry.isDirectory()) {
        const sectionPath = path.join(sectionsRoot, entry.name);
        const reportPath = getUrlsReportPath(sectionPath);

        if (reportPath) {
          const result = await syncSection(entry.name);
          if (result.success && result.data) {
            totalSynced++;
            totalUrlsImported += result.data.urlsImported;
            totalUrlsUpdated += result.data.urlsUpdated;
            totalUrlsInvalid += result.data.urlsInvalid || 0;

            sectionResults.push({
              section: result.data.section,
              urlsImported: result.data.urlsImported,
              urlsUpdated: result.data.urlsUpdated,
              urlsSkipped: result.data.urlsSkipped,
              urlsInvalid: result.data.urlsInvalid || 0,
            });
          } else {
            errors.push(`${entry.name}: ${result.error || 'Unknown error'}`);
          }
        }
      }
    }

    return {
      success: true,
      data: {
        totalSynced,
        totalUrlsImported,
        totalUrlsUpdated,
        totalUrlsInvalid,
        sectionResults: sectionResults.length > 0 ? sectionResults : undefined,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error syncing all sections'],
    };
  }
}

/**
 * Preview what would be imported without actually importing
 */
export async function previewSync(sectionName: string) {
  try {
    const sectionsRoot = path.join(process.cwd(), '..', 'sections');
    const sectionPath = path.join(sectionsRoot, sectionName);
    
    const reportPath = getUrlsReportPath(sectionPath);
    if (!reportPath) {
      return {
        success: false,
        error: `No urls-report.json found for section ${sectionName}`,
      };
    }
    
    const reportEntries = parseUrlsReport(reportPath);
    
    // Get existing section and URLs
    const section = await db.query.sections.findFirst({
      where: eq(sections.name, sectionName),
    });
    
    if (!section) {
      return {
        success: true,
        data: {
          newUrls: reportEntries.length,
          updatedUrls: 0,
          totalUrls: reportEntries.length,
        },
      };
    }
    
    const existingUrls = await db.query.urls.findMany({
      where: eq(urls.sectionId, section.id),
    });
    
    const existingUrlSet = new Set(existingUrls.map(u => u.url));
    
    const newUrls = reportEntries.filter(entry => !existingUrlSet.has(entry.url));
    const updatedUrls = reportEntries.filter(entry => existingUrlSet.has(entry.url));
    
    return {
      success: true,
      data: {
        newUrls: newUrls.length,
        updatedUrls: updatedUrls.length,
        totalUrls: reportEntries.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error previewing sync',
    };
  }
}

