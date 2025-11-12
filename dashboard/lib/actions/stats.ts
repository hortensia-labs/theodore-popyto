'use server';

import { db } from '../db/client';
import { urls, urlAnalysisData, urlEnrichments, sections } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { computeUrlStatus, type UrlStatus } from '../db/computed';

/**
 * Get overview stats for the dashboard
 */
export async function getOverviewStats() {
  try {
    // Get total URLs
    const [{ totalUrls }] = await db
      .select({ totalUrls: sql<number>`count(*)` })
      .from(urls);
    
    // Get all URLs with analysis data to compute statuses
    const allUrls = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId));
    
    // Compute status distribution
    const statusCounts: Record<UrlStatus, number> = {
      stored: 0,
      error: 0,
      extractable: 0,
      translatable: 0,
      resolvable: 0,
      unknown: 0,
    };
    
    allUrls.forEach(row => {
      const status = computeUrlStatus(row.urls, row.url_analysis_data, row.url_enrichments);
      statusCounts[status]++;
    });
    
    // Get total sections
    const [{ totalSections }] = await db
      .select({ totalSections: sql<number>`count(*)` })
      .from(sections);
    
    // Get enrichment stats
    const [{ totalEnriched }] = await db
      .select({ totalEnriched: sql<number>`count(*)` })
      .from(urlEnrichments);
    
    const [{ totalWithNotes }] = await db
      .select({ totalWithNotes: sql<number>`count(*)` })
      .from(urlEnrichments)
      .where(sql`${urlEnrichments.notes} IS NOT NULL AND ${urlEnrichments.notes} != ''`);
    
    const [{ totalWithCustomIds }] = await db
      .select({ totalWithCustomIds: sql<number>`count(*)` })
      .from(urlEnrichments)
      .where(sql`json_array_length(${urlEnrichments.customIdentifiers}) > 0`);
    
    return {
      success: true,
      data: {
        totalUrls,
        totalSections,
        statusDistribution: statusCounts,
        enrichment: {
          totalEnriched,
          totalWithNotes,
          totalWithCustomIds,
          percentageEnriched: totalUrls > 0 ? (totalEnriched / totalUrls) * 100 : 0,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching overview stats',
    };
  }
}

/**
 * Get stats for a specific section
 */
export async function getSectionStats(sectionId: number) {
  try {
    // Get section
    const section = await db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    });
    
    if (!section) {
      return {
        success: false,
        error: 'Section not found',
      };
    }
    
    // Get total URLs in section
    const [{ totalUrls }] = await db
      .select({ totalUrls: sql<number>`count(*)` })
      .from(urls)
      .where(eq(urls.sectionId, sectionId));
    
    // Get all URLs with analysis data for this section
    const sectionUrls = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(eq(urls.sectionId, sectionId));
    
    // Compute status distribution
    const statusCounts: Record<UrlStatus, number> = {
      stored: 0,
      error: 0,
      extractable: 0,
      translatable: 0,
      resolvable: 0,
      unknown: 0,
    };
    
    sectionUrls.forEach(row => {
      const status = computeUrlStatus(row.urls, row.url_analysis_data, row.url_enrichments);
      statusCounts[status]++;
    });
    
    // Get enrichment stats for this section
    const [{ totalEnriched }] = await db
      .select({ totalEnriched: sql<number>`count(*)` })
      .from(urlEnrichments)
      .innerJoin(urls, eq(urlEnrichments.urlId, urls.id))
      .where(eq(urls.sectionId, sectionId));
    
    return {
      success: true,
      data: {
        section,
        totalUrls,
        statusDistribution: statusCounts,
        enrichment: {
          totalEnriched,
          percentageEnriched: totalUrls > 0 ? (totalEnriched / totalUrls) * 100 : 0,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching section stats',
    };
  }
}

/**
 * Get domain breakdown with counts
 */
export async function getDomainBreakdown(sectionId?: number) {
  try {
    const whereConditions = [sql`${urls.domain} IS NOT NULL`];
    
    if (sectionId) {
      whereConditions.push(eq(urls.sectionId, sectionId));
    }
    
    const result = await db
      .select({
        domain: urls.domain,
        count: sql<number>`count(*)`,
      })
      .from(urls)
      .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      .groupBy(urls.domain)
      .orderBy(sql`count(*) DESC`);
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching domain breakdown',
    };
  }
}

/**
 * Get status distribution stats
 */
export async function getStatusDistribution(sectionId?: number) {
  try {
    // Get all URLs with analysis data
    const allUrls = await db
      .select()
      .from(urls)
      .leftJoin(urlAnalysisData, eq(urls.id, urlAnalysisData.urlId))
      .leftJoin(urlEnrichments, eq(urls.id, urlEnrichments.urlId))
      .where(sectionId ? eq(urls.sectionId, sectionId) : undefined);
    
    // Compute status distribution
    const statusCounts: Record<UrlStatus, number> = {
      stored: 0,
      error: 0,
      extractable: 0,
      translatable: 0,
      resolvable: 0,
      unknown: 0,
    };
    
    allUrls.forEach(row => {
      const status = computeUrlStatus(row.urls, row.url_analysis_data, row.url_enrichments);
      statusCounts[status]++;
    });
    
    // Convert to array format
    const distribution = Object.entries(statusCounts).map(([status, count]) => ({
      status: status as UrlStatus,
      count,
    }));
    
    return {
      success: true,
      data: distribution,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching status distribution',
    };
  }
}

/**
 * Get enrichment progress stats
 */
export async function getEnrichmentProgress(sectionId?: number) {
  try {
    // Get total URLs
    const [{ totalUrls }] = await db
      .select({ totalUrls: sql<number>`count(*)` })
      .from(urls)
      .where(sectionId ? eq(urls.sectionId, sectionId) : undefined);
    
    // Get enriched URLs
    const enrichedWhere = sectionId ? eq(urls.sectionId, sectionId) : undefined;
    const [{ totalEnriched }] = await db
      .select({ totalEnriched: sql<number>`count(*)` })
      .from(urlEnrichments)
      .innerJoin(urls, eq(urlEnrichments.urlId, urls.id))
      .where(enrichedWhere);
    
    // Get URLs with notes
    const notesWhereConditions = [sql`${urlEnrichments.notes} IS NOT NULL AND ${urlEnrichments.notes} != ''`];
    if (sectionId) {
      notesWhereConditions.push(eq(urls.sectionId, sectionId));
    }
    
    const [{ totalWithNotes }] = await db
      .select({ totalWithNotes: sql<number>`count(*)` })
      .from(urlEnrichments)
      .innerJoin(urls, eq(urlEnrichments.urlId, urls.id))
      .where(notesWhereConditions.length > 1 ? and(...notesWhereConditions) : notesWhereConditions[0]);
    
    // Get URLs with custom identifiers
    const customIdsWhereConditions = [sql`json_array_length(${urlEnrichments.customIdentifiers}) > 0`];
    if (sectionId) {
      customIdsWhereConditions.push(eq(urls.sectionId, sectionId));
    }
    
    const [{ totalWithCustomIds }] = await db
      .select({ totalWithCustomIds: sql<number>`count(*)` })
      .from(urlEnrichments)
      .innerJoin(urls, eq(urlEnrichments.urlId, urls.id))
      .where(customIdsWhereConditions.length > 1 ? and(...customIdsWhereConditions) : customIdsWhereConditions[0]);
    
    return {
      success: true,
      data: {
        totalUrls,
        totalEnriched,
        totalWithNotes,
        totalWithCustomIds,
        percentageEnriched: totalUrls > 0 ? (totalEnriched / totalUrls) * 100 : 0,
        percentageWithNotes: totalUrls > 0 ? (totalWithNotes / totalUrls) * 100 : 0,
        percentageWithCustomIds: totalUrls > 0 ? (totalWithCustomIds / totalUrls) * 100 : 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching enrichment progress',
    };
  }
}
