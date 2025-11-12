'use server';

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, sections } from '../db/schema';
import { eq, and, like, sql, desc, asc } from 'drizzle-orm';
import { addUrlStatus, type UrlStatus, type UrlWithStatus } from '../db/computed';

/**
 * Filters for URL queries
 */
export interface UrlFilters {
  sectionId?: number;
  status?: UrlStatus;
  domain?: string;
  hasEnrichment?: boolean;
  search?: string;
  citationStatus?: 'valid' | 'incomplete';
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Sort params
 */
export interface SortParams {
  field: 'url' | 'domain' | 'statusCode' | 'createdAt';
  direction: 'asc' | 'desc';
}

/**
 * Get URLs with pagination and filters
 */
export async function getUrls(
  filters: UrlFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 100 },
  sort: SortParams = { field: 'createdAt', direction: 'desc' }
) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions = [];
    
    if (filters.sectionId) {
      whereConditions.push(eq(urls.sectionId, filters.sectionId));
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
    
    // Apply sorting
    const sortField = {
      url: urls.url,
      domain: urls.domain,
      statusCode: urls.statusCode,
      createdAt: urls.createdAt,
    }[sort.field];
    
    const orderByClause = sort.direction === 'asc' ? asc(sortField) : desc(sortField);
    
    // Query URLs with analysis data and enrichments
    const results = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);
    
    // Transform results to include computed status
    const urlsWithStatus: UrlWithStatus[] = results.map(row => 
      addUrlStatus(row.urls, row.url_analysis_data, row.url_enrichments)
    );
    
    // Filter by status if requested (post-query since it's computed)
    const filteredUrls = filters.status
      ? urlsWithStatus.filter(url => url.status === filters.status)
      : urlsWithStatus;
    
    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(urls)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    const [{ count: totalCount }] = await countQuery;
    
    return {
      success: true,
      data: {
        urls: filteredUrls,
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
 * Get a single URL by ID with all related data
 */
export async function getUrlById(id: number) {
  try {
    const result = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
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
    const urlWithStatus = addUrlStatus(row.urls, row.url_analysis_data, row.url_enrichments);
    
    return {
      success: true,
      data: {
        ...urlWithStatus,
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
 * Get URLs by section
 */
export async function getUrlsBySection(
  sectionName: string,
  pagination: PaginationParams = { page: 1, pageSize: 100 }
) {
  try {
    // Find section
    const section = await db.query.sections.findFirst({
      where: eq(sections.name, sectionName),
    });
    
    if (!section) {
      return {
        success: false,
        error: `Section ${sectionName} not found`,
      };
    }
    
    return getUrls({ sectionId: section.id }, pagination);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching URLs by section',
    };
  }
}

/**
 * Search URLs
 */
export async function searchUrls(
  query: string,
  pagination: PaginationParams = { page: 1, pageSize: 100 }
) {
  return getUrls({ search: query }, pagination);
}

/**
 * Delete multiple URLs
 */
export async function deleteUrls(urlIds: number[]) {
  try {
    if (urlIds.length === 0) {
      return {
        success: false,
        error: 'No URLs provided for deletion',
      };
    }
    
    const result = await db.transaction(async (tx) => {
      // Delete URLs (cascade will handle related data)
      await tx.delete(urls).where(
        sql`${urls.id} IN (${sql.join(urlIds.map(id => sql`${id}`), sql`, `)})`
      );
      
      return { deleted: urlIds.length };
    });
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting URLs',
    };
  }
}

/**
 * Get all unique domains from URLs
 */
export async function getUniqueDomains() {
  try {
    const result = await db
      .selectDistinct({ domain: urls.domain })
      .from(urls)
      .where(sql`${urls.domain} IS NOT NULL`)
      .orderBy(asc(urls.domain));
    
    return {
      success: true,
      data: result.map(r => r.domain).filter(Boolean) as string[],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching domains',
    };
  }
}

/**
 * Get all sections
 */
export async function getSections() {
  try {
    const result = await db.query.sections.findMany({
      orderBy: (sections, { asc }) => [asc(sections.name)],
    });
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching sections',
    };
  }
}

