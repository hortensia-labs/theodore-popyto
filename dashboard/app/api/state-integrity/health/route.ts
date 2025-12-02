import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/db';
import { urls } from '@/drizzle/schema';
import { StateGuards } from '@/lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

/**
 * GET /api/state-integrity/health
 *
 * Get overall state integrity health metrics.
 *
 * Returns:
 * - totalUrls: Total number of URLs
 * - healthyUrls: Number of URLs with no issues
 * - issueUrls: Number of URLs with issues
 * - healthPercentage: Percentage of healthy URLs
 * - issueDistribution: Count of each issue type
 * - errorCount: Number of critical issues
 * - warningCount: Number of warning issues
 * - recentlyRepaired: Number of URLs repaired in last 7 days (requires activity log)
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all URLs
    const allUrls = await db.select().from(urls);

    const metrics = {
      totalUrls: 0,
      healthyUrls: 0,
      issueUrls: 0,
      healthPercentage: 0,
      issueDistribution: {} as Record<string, number>,
      errorCount: 0,
      warningCount: 0,
      recentlyRepaired: 0, // TODO: calculate from activity log when implemented
    };

    metrics.totalUrls = allUrls.length;

    // Analyze each URL
    allUrls.forEach(url => {
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

      if (issues.length === 0) {
        metrics.healthyUrls++;
      } else {
        metrics.issueUrls++;

        // Determine severity
        const isCritical = issues.some(i => i.includes('STORED') || i.includes('LINKED'));
        if (isCritical) {
          metrics.errorCount++;
        } else {
          metrics.warningCount++;
        }

        // Count issue types
        issues.forEach(issue => {
          metrics.issueDistribution[issue] = (metrics.issueDistribution[issue] || 0) + 1;
        });
      }
    });

    // Calculate health percentage
    metrics.healthPercentage = metrics.totalUrls > 0
      ? Math.round((metrics.healthyUrls / metrics.totalUrls) * 100)
      : 0;

    // Sort issue distribution by count (descending)
    const sortedDistribution = Object.entries(metrics.issueDistribution)
      .sort(([, countA], [, countB]) => countB - countA)
      .reduce((acc, [issue, count]) => {
        acc[issue] = count;
        return acc;
      }, {} as Record<string, number>);

    metrics.issueDistribution = sortedDistribution;

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error calculating state integrity health:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
