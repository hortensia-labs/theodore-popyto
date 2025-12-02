import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/db';
import { urls } from '@/drizzle/schema';
import { StateGuards } from '@/lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

/**
 * GET /api/state-integrity/issues
 *
 * Get all URLs with state consistency issues.
 *
 * Query parameters:
 * - issueType: Filter by specific issue type (e.g., LINKED_BUT_NOT_STORED)
 * - severity: Filter by severity (error, warning)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 *
 * Returns:
 * - issues: Array of URLs with issues
 * - total: Total count of URLs with issues
 * - page: Current page
 * - totalPages: Total number of pages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issueType = searchParams.get('issueType');
    const severity = searchParams.get('severity');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Fetch all URLs from database
    const allUrls = await db.select().from(urls);

    // Filter URLs with issues
    const urlsWithIssues = allUrls
      .map(url => {
        const guardCheckUrl: UrlForGuardCheck = {
          id: url.id,
          url: url.url,
          processingStatus: url.processingStatus as any,
          zoteroItemKey: url.zoteroItemKey,
          zoteroProcessingStatus: url.zoteroProcessingStatus as any,
          userIntent: url.userIntent as any,
          capability: url.capability as any,
        };

        const issues = StateGuards.getStateIntegrityIssues(guardCheckUrl);
        const repairSuggestion = StateGuards.suggestRepairAction(guardCheckUrl);

        return {
          urlId: url.id,
          url: url.url,
          processingStatus: url.processingStatus,
          zoteroItemKey: url.zoteroItemKey,
          userIntent: url.userIntent,
          issues,
          repairSuggestion,
          severity: issues.some(i => i.includes('STORED') || i.includes('LINKED'))
            ? 'error'
            : 'warning',
        };
      })
      .filter(item => item.issues.length > 0)
      // Apply filters
      .filter(item => {
        if (issueType && !item.issues.includes(issueType)) {
          return false;
        }
        if (severity && item.severity !== severity) {
          return false;
        }
        return true;
      });

    // Paginate results
    const total = urlsWithIssues.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedIssues = urlsWithIssues.slice(startIdx, endIdx);

    return NextResponse.json({
      issues: paginatedIssues,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching state integrity issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
