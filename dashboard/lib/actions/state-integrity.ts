'use server';

/**
 * State Integrity Actions
 *
 * Server actions for detecting, reporting, and repairing state consistency issues
 * in the URL processing system.
 *
 * Phase 1: Diagnostic & Monitoring
 * - getStateIntegrityReport() - Comprehensive scan of all URLs
 * - repairUrlStateIntegrity() - Repair individual URL state
 * - repairAllUrlStateIssues() - Batch repair all broken states
 */

import { db } from '../db/client';
import { urls } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getUrlWithCapabilities } from '../orchestrator/processing-helpers';
import { StateGuards } from '../state-machine/state-guards';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import type { ProcessingStatus, UserIntent } from '../types/url-processing';

/**
 * Get comprehensive state integrity report for all URLs
 *
 * Scans all URLs in the database and identifies state consistency issues
 * Returns detailed report with health metrics and issue categorization
 */
export async function getStateIntegrityReport() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  📊 STATE INTEGRITY REPORT - Scanning all URLs...            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const allUrls = await db.query.urls.findMany();

    const report = {
      generatedAt: new Date(),
      totalUrls: allUrls.length,
      healthMetrics: {
        totalWithIssues: 0,
        repairable: 0,
        criticalIssues: 0,
      },
      statusDistribution: {} as Record<ProcessingStatus, number>,
      zoteroLinkingStats: {
        totalLinked: 0,
        linkedByStatus: {} as Record<ProcessingStatus, number>,
        inconsistentLinks: 0,
      },
      issuesByType: {
        linked_but_not_stored: [] as Array<{ urlId: number; url: string; itemKey: string; currentStatus: ProcessingStatus }>,
        stored_without_item: [] as Array<{ urlId: number; url: string; currentStatus: ProcessingStatus }>,
        archived_with_item: [] as Array<{ urlId: number; url: string; itemKey: string }>,
        processing_with_item: [] as Array<{ urlId: number; url: string; itemKey: string; currentStatus: ProcessingStatus }>,
      },
    };

    for (const url of allUrls) {
      // Count by status
      const status = url.processingStatus as ProcessingStatus;
      report.statusDistribution[status] = (report.statusDistribution[status] || 0) + 1;

      // Count Zotero linked items
      if (url.zoteroItemKey) {
        report.zoteroLinkingStats.totalLinked++;
        report.zoteroLinkingStats.linkedByStatus[status] = (report.zoteroLinkingStats.linkedByStatus[status] || 0) + 1;
      }

      // Check consistency
      const urlForCheck = {
        id: url.id,
        url: url.url,
        processingStatus: status,
        userIntent: url.userIntent as UserIntent,
        zoteroItemKey: url.zoteroItemKey,
        createdByTheodore: url.createdByTheodore,
        userModifiedInZotero: url.userModifiedInZotero,
        linkedUrlCount: url.linkedUrlCount,
        processingAttempts: url.processingAttempts,
      };

      const issues = StateGuards.getStateIntegrityIssues(urlForCheck);

      if (issues.length > 0) {
        report.healthMetrics.totalWithIssues++;

        const repair = StateGuards.suggestRepairAction(urlForCheck);
        if (repair) {
          report.healthMetrics.repairable++;
        } else {
          report.healthMetrics.criticalIssues++;
        }

        report.zoteroLinkingStats.inconsistentLinks++;

        // Categorize issues
        if (issues.some(i => i.includes('LINKED_BUT_NOT_STORED'))) {
          report.issuesByType.linked_but_not_stored.push({
            urlId: url.id,
            url: url.url,
            itemKey: url.zoteroItemKey!,
            currentStatus: status,
          });
        }

        if (issues.some(i => i.includes('STORED_WITHOUT_ITEM'))) {
          report.issuesByType.stored_without_item.push({
            urlId: url.id,
            url: url.url,
            currentStatus: status,
          });
        }

        if (issues.some(i => i.includes('ARCHIVED_WITH_ITEM'))) {
          report.issuesByType.archived_with_item.push({
            urlId: url.id,
            url: url.url,
            itemKey: url.zoteroItemKey!,
          });
        }

        if (issues.some(i => i.includes('PROCESSING_WITH_ITEM'))) {
          report.issuesByType.processing_with_item.push({
            urlId: url.id,
            url: url.url,
            itemKey: url.zoteroItemKey!,
            currentStatus: status,
          });
        }
      }
    }

    console.log('📈 SUMMARY:');
    console.log(`   Total URLs: ${report.totalUrls}`);
    console.log(`   With Issues: ${report.healthMetrics.totalWithIssues}`);
    console.log(`   Repairable: ${report.healthMetrics.repairable}`);
    console.log(`   Critical: ${report.healthMetrics.criticalIssues}\n`);

    if (report.healthMetrics.totalWithIssues > 0) {
      console.log('🔴 ISSUE BREAKDOWN:');
      console.log(`   - Linked but not stored: ${report.issuesByType.linked_but_not_stored.length}`);
      console.log(`   - Stored without item: ${report.issuesByType.stored_without_item.length}`);
      console.log(`   - Archived with item: ${report.issuesByType.archived_with_item.length}`);
      console.log(`   - Processing with item: ${report.issuesByType.processing_with_item.length}\n`);
    } else {
      console.log('✅ ALL URLS HAVE CONSISTENT STATE!\n');
    }

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error('\n❌ Error generating integrity report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Repair a single URL's state consistency
 *
 * Detects inconsistencies and applies the suggested repair action
 * All repairs are logged to processingHistory
 */
export async function repairUrlStateIntegrity(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
        repaired: false,
      };
    }

    const repair = StateGuards.suggestRepairAction(urlData);

    if (!repair) {
      return {
        success: true,
        message: 'No repair needed - state is consistent',
        repaired: false,
        urlId,
      };
    }

    console.log(`\n🔧 Repairing URL ${urlId}:`);
    console.log(`   Issue: ${repair.reason}`);
    console.log(`   Action: ${repair.type}`);
    console.log(`   Transition: ${repair.from} → ${repair.to}`);

    // Perform the transition
    const transitionResult = await URLProcessingStateMachine.transition(
      urlId,
      repair.from,
      repair.to,
      {
        reason: `Auto-repair: ${repair.reason}`,
        source: 'state_integrity_repair',
        originalStatus: repair.from,
      }
    );

    if (!transitionResult.success) {
      return {
        success: false,
        error: `Failed to transition: ${transitionResult.error}`,
        repaired: false,
        urlId,
      };
    }

    return {
      success: true,
      repaired: true,
      urlId,
      from: repair.from,
      to: repair.to,
      action: repair.type,
      reason: repair.reason,
    };
  } catch (error) {
    console.error(`\n❌ Error repairing URL ${urlId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      repaired: false,
      urlId,
    };
  }
}

/**
 * Repair all URLs with state consistency issues
 *
 * Performs batch repair on all identified inconsistencies
 * Returns summary of repairs performed
 */
export async function repairAllUrlStateIssues() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔧 BATCH REPAIR: State Integrity Issues                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const reportResult = await getStateIntegrityReport();

    if (!reportResult.success || !reportResult.report) {
      return {
        success: false,
        error: 'Failed to generate report',
      };
    }

    const report = reportResult.report;
    const urlsToRepair = [
      ...report.issuesByType.linked_but_not_stored.map(u => u.urlId),
      ...report.issuesByType.stored_without_item.map(u => u.urlId),
      ...report.issuesByType.archived_with_item.map(u => u.urlId),
      ...report.issuesByType.processing_with_item.map(u => u.urlId),
    ];

    // Deduplicate
    const uniqueUrlIds = Array.from(new Set(urlsToRepair));

    console.log(`📊 Found ${uniqueUrlIds.length} URLs with issues`);
    console.log(`   - Linked but not stored: ${report.issuesByType.linked_but_not_stored.length}`);
    console.log(`   - Stored without item: ${report.issuesByType.stored_without_item.length}`);
    console.log(`   - Archived with item: ${report.issuesByType.archived_with_item.length}`);
    console.log(`   - Processing with item: ${report.issuesByType.processing_with_item.length}\n`);

    const results = {
      total: uniqueUrlIds.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      repairs: [] as Array<{ urlId: number; status: 'success' | 'failed' | 'skipped'; message: string }>,
    };

    for (const urlId of uniqueUrlIds) {
      const repairResult = await repairUrlStateIntegrity(urlId);

      if (repairResult.success && repairResult.repaired) {
        results.successful++;
        results.repairs.push({
          urlId,
          status: 'success',
          message: `Repaired: ${repairResult.from} → ${repairResult.to}`,
        });
      } else if (repairResult.success && !repairResult.repaired) {
        results.skipped++;
        results.repairs.push({
          urlId,
          status: 'skipped',
          message: repairResult.message || 'No repair needed',
        });
      } else {
        results.failed++;
        results.repairs.push({
          urlId,
          status: 'failed',
          message: repairResult.error || 'Unknown error',
        });
      }
    }

    console.log('\n🏁 Repair Summary:');
    console.log(`   ✅ Successful: ${results.successful}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed: ${results.failed}\n`);

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('\n💥 Batch repair error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get detailed information about a specific URL's state integrity
 *
 * Useful for debugging individual URLs
 */
export async function getUrlStateIntegrityInfo(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }

    const issues = StateGuards.getStateIntegrityIssues(urlData);
    const repair = StateGuards.suggestRepairAction(urlData);

    return {
      success: true,
      urlId,
      url: urlData.url,
      currentState: {
        processingStatus: urlData.processingStatus,
        userIntent: urlData.userIntent,
        zoteroItemKey: urlData.zoteroItemKey || null,
        createdByTheodore: urlData.createdByTheodore,
        userModifiedInZotero: urlData.userModifiedInZotero,
        linkedUrlCount: urlData.linkedUrlCount,
      },
      integrity: {
        isConsistent: issues.length === 0,
        issues,
      },
      repair: repair ? {
        type: repair.type,
        reason: repair.reason,
        from: repair.from,
        to: repair.to,
      } : null,
    };
  } catch (error) {
    console.error(`Error getting state integrity info for URL ${urlId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
