import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/db';
import { urls } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { StateGuards } from '@/lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

/**
 * GET /api/state-integrity/check/[urlId]
 *
 * Check the state integrity of a specific URL.
 *
 * Returns:
 * - urlId: The URL ID checked
 * - url: The URL string
 * - isConsistent: Whether state is consistent
 * - issues: Array of detected issues
 * - repairSuggestion: Suggested repair action (if issues exist)
 * - severity: 'healthy' | 'warning' | 'error'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { urlId: string } }
) {
  try {
    const urlId = parseInt(params.urlId, 10);

    if (isNaN(urlId)) {
      return NextResponse.json(
        { error: 'Invalid URL ID' },
        { status: 400 }
      );
    }

    // Fetch the URL from database
    const urlRecord = await db
      .select()
      .from(urls)
      .where(eq(urls.id, urlId))
      .limit(1);

    if (urlRecord.length === 0) {
      return NextResponse.json(
        { error: 'URL not found' },
        { status: 404 }
      );
    }

    const url = urlRecord[0];

    // Prepare UrlForGuardCheck object
    const guardCheckUrl: UrlForGuardCheck = {
      id: url.id,
      url: url.url,
      processingStatus: url.processingStatus as any,
      zoteroItemKey: url.zoteroItemKey,
      zoteroProcessingStatus: url.zoteroProcessingStatus as any,
      userIntent: url.userIntent as any,
      capability: url.capability as any,
    };

    // Check state integrity
    const issues = StateGuards.getStateIntegrityIssues(guardCheckUrl);
    const repairSuggestion = StateGuards.suggestRepairAction(guardCheckUrl);

    // Determine severity
    const severity = issues.length === 0
      ? 'healthy'
      : issues.some(i => i.includes('STORED') || i.includes('LINKED'))
        ? 'error'
        : 'warning';

    return NextResponse.json({
      urlId,
      url: url.url,
      isConsistent: issues.length === 0,
      issues,
      repairSuggestion,
      severity,
      currentState: {
        processingStatus: url.processingStatus,
        zoteroItemKey: url.zoteroItemKey,
        zoteroProcessingStatus: url.zoteroProcessingStatus,
        userIntent: url.userIntent,
      },
    });
  } catch (error) {
    console.error('Error checking state integrity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
