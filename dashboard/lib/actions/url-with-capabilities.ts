/**
 * URL Actions with New Processing System
 * 
 * Enhanced URL queries that include processing capabilities
 * and work with the new status system
 */

'use server';

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, urlContentCache, sections } from '../../drizzle/schema';
import { eq, and, like, sql, desc, asc, inArray } from 'drizzle-orm';
import { computeProcessingCapability } from '../orchestrator/processing-helpers';
import type { ProcessingStatus, UserIntent, ProcessingCapability } from '../types/url-processing';
import type { UrlForGuardCheck } from '../state-machine/state-guards';

/**
 * Enhanced URL with all new fields
 */
export interface UrlWithCapabilitiesAndStatus {
  // Base URL fields
  id: number;
  url: string;
  sectionId: number;
  domain: string | null;
  
  // Processing fields (NEW)
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  processingAttempts: number;
  processingHistory: any[];
  
  // Zotero fields
  zoteroItemKey: string | null;
  citationValidationStatus: string | null;
  citationValidationDetails: any;
  
  // Computed fields
  capability: ProcessingCapability;
  analysisData: any;
  enrichment: any;
  
  // Section info
  section?: any;
}

/**
 * Get URLs with capabilities and new status system
 * Enhanced version of getUrls that includes capability computation
 */
export async function getUrlsWithCapabilities(
  filters: {
    sectionId?: number;
    processingStatus?: ProcessingStatus;
    userIntent?: UserIntent;
    domain?: string;
    search?: string;
    citationStatus?: 'valid' | 'incomplete';
    minAttempts?: number;
    maxAttempts?: number;
  } = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 100 }
) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions = [];
    
    if (filters.sectionId) {
      whereConditions.push(eq(urls.sectionId, filters.sectionId));
    }
    
    if (filters.processingStatus) {
      whereConditions.push(eq(urls.processingStatus, filters.processingStatus));
    }
    
    if (filters.userIntent) {
      whereConditions.push(eq(urls.userIntent, filters.userIntent));
    }
    
    if (filters.domain) {
      whereConditions.push(eq(urls.domain, filters.domain));
    }
    
    if (filters.search) {
      whereConditions.push(like(urls.url, `%${filters.search}%`));
    }
    
    if (filters.citationStatus) {
      whereConditions.push(eq(urls.citationValidationStatus, filters.citationStatus));
    }
    
    if (filters.minAttempts !== undefined) {
      whereConditions.push(sql`${urls.processingAttempts} >= ${filters.minAttempts}`);
    }
    
    if (filters.maxAttempts !== undefined) {
      whereConditions.push(sql`${urls.processingAttempts} <= ${filters.maxAttempts}`);
    }
    
    // Query URLs with all related data
    const results = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .leftJoin(urlContentCache, eq(urls.id, urlContentCache.urlId))
      .leftJoin(sections, eq(urls.sectionId, sections.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(urls.createdAt))
      .limit(pageSize)
      .offset(offset);
    
    // Transform results with capabilities
    const urlsWithCapabilities: UrlWithCapabilitiesAndStatus[] = await Promise.all(
      results.map(async (row) => {
        const capability = await computeProcessingCapability(
          row.urls.id,
          row.urls,
          row.url_analysis_data,
          row.url_enrichments,
          row.url_content_cache
        );
        
        return {
          id: row.urls.id,
          url: row.urls.url,
          sectionId: row.urls.sectionId,
          domain: row.urls.domain,
          processingStatus: (row.urls.processingStatus || 'not_started') as ProcessingStatus,
          userIntent: (row.urls.userIntent || 'auto') as UserIntent,
          processingAttempts: row.urls.processingAttempts || 0,
          processingHistory: row.urls.processingHistory || [],
          zoteroItemKey: row.urls.zoteroItemKey,
          citationValidationStatus: row.urls.citationValidationStatus,
          citationValidationDetails: row.urls.citationValidationDetails,
          capability,
          analysisData: row.url_analysis_data,
          enrichment: row.url_enrichments,
          section: row.sections,
        };
      })
    );
    
    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(urls)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    const [{ count: totalCount }] = await countQuery;
    
    return {
      success: true,
      data: {
        urls: urlsWithCapabilities,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching URLs',
    };
  }
}

/**
 * Get single URL by ID with capabilities
 */
export async function getUrlWithCapabilitiesById(id: number) {
  try {
    const result = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .leftJoin(urlContentCache, eq(urls.id, urlContentCache.urlId))
      .leftJoin(sections, eq(urls.sectionId, sections.id))
      .where(eq(urls.id, id))
      .limit(1);
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    const row = result[0];
    
    const capability = await computeProcessingCapability(
      row.urls.id,
      row.urls,
      row.url_analysis_data,
      row.url_enrichments,
      row.url_content_cache
    );
    
    return {
      success: true,
      data: {
        id: row.urls.id,
        url: row.urls.url,
        sectionId: row.urls.sectionId,
        domain: row.urls.domain,
        processingStatus: (row.urls.processingStatus || 'not_started') as ProcessingStatus,
        userIntent: (row.urls.userIntent || 'auto') as UserIntent,
        processingAttempts: row.urls.processingAttempts || 0,
        processingHistory: row.urls.processingHistory || [],
        zoteroItemKey: row.urls.zoteroItemKey,
        citationValidationStatus: row.urls.citationValidationStatus,
        citationValidationDetails: row.urls.citationValidationDetails,
        capability,
        analysisData: row.url_analysis_data,
        enrichment: row.url_enrichments,
        section: row.sections,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching URL',
    };
  }
}

/**
 * Get URLs by processing status
 * Convenience function for common query
 */
export async function getUrlsByProcessingStatus(
  status: ProcessingStatus,
  limit: number = 100
) {
  return getUrlsWithCapabilities({ processingStatus: status }, { page: 1, pageSize: limit });
}

/**
 * Get URLs by user intent
 * Convenience function for common query
 */
export async function getUrlsByUserIntent(
  intent: UserIntent,
  limit: number = 100
) {
  return getUrlsWithCapabilities({ userIntent: intent }, { page: 1, pageSize: limit });
}

/**
 * Get status distribution statistics
 */
export async function getProcessingStatusDistribution() {
  try {
    const distribution = await db
      .select({
        status: urls.processingStatus,
        count: sql<number>`count(*)`,
      })
      .from(urls)
      .groupBy(urls.processingStatus)
      .orderBy(desc(sql`count(*)`));
    
    return {
      success: true,
      data: distribution.map(d => ({
        status: d.status as ProcessingStatus,
        count: d.count,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user intent distribution statistics
 */
export async function getUserIntentDistribution() {
  try {
    const distribution = await db
      .select({
        intent: urls.userIntent,
        count: sql<number>`count(*)`,
      })
      .from(urls)
      .groupBy(urls.userIntent)
      .orderBy(desc(sql`count(*)`));
    
    return {
      success: true,
      data: distribution.map(d => ({
        intent: d.intent as UserIntent,
        count: d.count,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

