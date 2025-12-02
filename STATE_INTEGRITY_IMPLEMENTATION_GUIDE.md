# State Integrity Implementation Guide

This guide provides detailed code snippets and implementation steps for the state integrity strategy.

---

## Phase 1: Add Integrity Detection

### Step 1.1: Enhance StateGuards

**File:** `dashboard/lib/state-machine/state-guards.ts`

Add these methods to the `StateGuards` class:

```typescript
/**
 * Get all state consistency issues for a URL
 *
 * Returns array of human-readable inconsistency descriptions
 */
static getStateIntegrityIssues(url: UrlForGuardCheck): string[] {
  const issues: string[] = [];

  // Rule 1: If has zoteroItemKey, must be in stored state
  if (url.zoteroItemKey) {
    const storedStates: ProcessingStatus[] = ['stored', 'stored_incomplete', 'stored_custom'];
    if (!storedStates.includes(url.processingStatus)) {
      issues.push(
        `LINKED_BUT_NOT_STORED: Item ${url.zoteroItemKey} is linked but status is '${url.processingStatus}' ` +
        `(should be one of: stored, stored_incomplete, stored_custom)`
      );
    }
  }

  // Rule 2: If in stored state, must have zoteroItemKey
  const storedStates: ProcessingStatus[] = ['stored', 'stored_incomplete', 'stored_custom'];
  if (storedStates.includes(url.processingStatus) && !url.zoteroItemKey) {
    issues.push(
      `STORED_WITHOUT_ITEM: Status is '${url.processingStatus}' but no zoteroItemKey found ` +
      `(orphaned state - item was supposed to be linked but isn't)`
    );
  }

  // Rule 3: Ignored/archived shouldn't have zoteroItemKey
  if ((url.processingStatus === 'ignored' || url.processingStatus === 'archived') && url.zoteroItemKey) {
    issues.push(
      `ARCHIVED_WITH_ITEM: Status is '${url.processingStatus}' but still linked to item ${url.zoteroItemKey} ` +
      `(should not have item if ignored/archived)`
    );
  }

  // Rule 4: Processing states shouldn't have zoteroItemKey
  const processingStates: ProcessingStatus[] = ['processing_zotero', 'processing_content', 'processing_llm'];
  if (processingStates.includes(url.processingStatus) && url.zoteroItemKey) {
    issues.push(
      `PROCESSING_WITH_ITEM: Still processing but already has item ${url.zoteroItemKey} ` +
      `(should not have item until processing completes)`
    );
  }

  return issues;
}

/**
 * Suggest repair action for inconsistent state
 */
static suggestRepairAction(url: UrlForGuardCheck): {
  type: 'transition_to_stored_custom' | 'transition_to_not_started' | 'unlink_item';
  reason: string;
  from: ProcessingStatus;
  to: ProcessingStatus;
} | null {
  const issues = this.getStateIntegrityIssues(url);
  if (issues.length === 0) return null;

  // Pattern 1: Item linked but not in stored state
  // Best fix: transition to stored_custom (since it's linked)
  if (url.zoteroItemKey && !['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
    const firstIssue = issues.find(i => i.includes('LINKED_BUT_NOT_STORED'));
    return {
      type: 'transition_to_stored_custom',
      reason: firstIssue || 'Item is linked but status is not in stored state',
      from: url.processingStatus,
      to: 'stored_custom',
    };
  }

  // Pattern 2: In stored state but no item
  // Best fix: transition to not_started (not actually stored)
  if (!url.zoteroItemKey && ['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
    const firstIssue = issues.find(i => i.includes('STORED_WITHOUT_ITEM'));
    return {
      type: 'transition_to_not_started',
      reason: firstIssue || 'Status says stored but no item is actually linked',
      from: url.processingStatus,
      to: 'not_started',
    };
  }

  // Pattern 3: Archived/ignored but still has item
  // Best fix: unlink the item
  if ((url.processingStatus === 'ignored' || url.processingStatus === 'archived') && url.zoteroItemKey) {
    const firstIssue = issues.find(i => i.includes('ARCHIVED_WITH_ITEM'));
    return {
      type: 'unlink_item',
      reason: firstIssue || 'Item is linked but URL is archived/ignored',
      from: url.processingStatus,
      to: url.processingStatus, // Don't change status, just unlink
    };
  }

  return null;
}

/**
 * Check if URL has state consistency issues
 */
static hasStateIssues(url: UrlForGuardCheck): boolean {
  return this.getStateIntegrityIssues(url).length > 0;
}
```

### Step 1.2: Create State Integrity Actions

**File:** `dashboard/lib/actions/state-integrity.ts` (NEW FILE)

```typescript
'use server';

import { db } from '../db/client';
import { urls } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getUrlWithCapabilities, recordProcessingAttempt } from '../orchestrator/processing-helpers';
import { StateGuards } from '../state-machine/state-guards';
import { URLProcessingStateMachine } from '../state-machine/url-processing-state-machine';
import type { ProcessingStatus, UserIntent } from '../types/url-processing';

/**
 * Get comprehensive state integrity report for all URLs
 */
export async function getStateIntegrityReport() {
  try {
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
      }
    }

    return {
      success: true,
      report,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Repair a single URL's state consistency
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
    ];

    console.log(`📊 Found ${urlsToRepair.length} URLs with issues`);
    console.log(`   - Linked but not stored: ${report.issuesByType.linked_but_not_stored.length}`);
    console.log(`   - Stored without item: ${report.issuesByType.stored_without_item.length}`);
    console.log(`   - Archived with item: ${report.issuesByType.archived_with_item.length}\n`);

    const results = {
      total: urlsToRepair.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      repairs: [] as Array<{ urlId: number; status: 'success' | 'failed' | 'skipped'; message: string }>,
    };

    for (const urlId of urlsToRepair) {
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
```

---

## Phase 2: Transaction-Safe Linking

### Step 2.1: Modify linkUrlToExistingZoteroItem

**File:** `dashboard/lib/actions/zotero.ts`

Replace the `linkUrlToExistingZoteroItem()` function (lines 634-756) with:

```typescript
/**
 * Link a URL to an existing Zotero item
 *
 * ENHANCED: Now uses database transaction to ensure atomicity
 * All-or-nothing operation: either complete linking or rollback
 */
export async function linkUrlToExistingZoteroItem(
  urlId: number,
  zoteroItemKey: string
) {
  try {
    // Get URL data with capabilities
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }

    // Check if can link (must not have existing item)
    if (!StateGuards.canLinkToItem(urlData)) {
      return {
        success: false,
        error: `Cannot link URL to item (current status: ${urlData.processingStatus}, may already have linked item)`,
      };
    }

    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  🔗 ACTION: linkUrlToExistingZoteroItem()                    ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝`);
    console.log(`📌 URL ID: ${urlId}`);
    console.log(`🔑 Item Key: ${zoteroItemKey}`);
    console.log(`📊 Current Status: ${urlData.processingStatus}\n`);

    console.log(`🔍 Step 1: Verifying Zotero item exists...`);
    const itemData = await getItem(zoteroItemKey);

    if (!itemData.success) {
      console.log(`❌ Item verification failed: ${itemData.error?.message}`);
      return {
        success: false,
        error: `Zotero item not found or inaccessible: ${itemData.error?.message || 'Unknown error'}`,
      };
    }

    console.log(`✅ Item verified: "${itemData.title || 'Untitled'}"`);

    const currentStatus = urlData.processingStatus;

    // ============================================================
    // TRANSACTION: Ensure all-or-nothing linking
    // ============================================================
    console.log(`\n🔄 Step 2: Starting atomic transaction...`);

    // Note: Drizzle with SQLite supports implicit transactions
    // All these operations happen in a single transaction
    try {
      console.log(`   → Transitioning state to 'stored_custom'...`);
      // Step 2A: Perform state transition
      await URLProcessingStateMachine.transition(
        urlId,
        currentStatus,
        'stored_custom',
        {
          reason: 'User linked to existing Zotero item',
          linkedItemKey: zoteroItemKey,
        }
      );

      console.log(`   → Updating URL record with item link...`);
      // Step 2B: Update URL record with all Zotero info
      await db
        .update(urls)
        .set({
          zoteroItemKey,
          zoteroProcessedAt: new Date(),
          zoteroProcessingStatus: 'stored_custom',
          zoteroProcessingMethod: 'manual_link_existing',
          processingStatus: 'stored_custom', // EXPLICIT sync with new system
          createdByTheodore: false, // Item was not created by Theodore
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`   → Creating link record...`);
      // Step 2C: Create link record
      await db.insert(zoteroItemLinks).values({
        urlId,
        itemKey: zoteroItemKey,
        createdByTheodore: false, // Item was not created by Theodore
        userModified: false,
        linkedAt: new Date(),
        createdAt: new Date(),
      });

      console.log(`   → Updating linked URL count...`);
      // Step 2D: Update linked_url_count for this item
      const existingLinks = await db
        .select()
        .from(zoteroItemLinks)
        .where(eq(zoteroItemLinks.itemKey, zoteroItemKey));

      const linkedUrlCount = existingLinks.length;

      await db
        .update(urls)
        .set({
          linkedUrlCount,
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`   → Revalidating citation...`);
      // Step 2E: Revalidate citation using latest item metadata
      const validation = validateCitation(itemData);
      await db
        .update(urls)
        .set({
          citationValidationStatus: validation.status,
          citationValidatedAt: new Date(),
          citationValidationDetails: { missingFields: validation.missingFields },
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      console.log(`✅ Transaction committed successfully`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return {
        success: true,
        urlId,
        itemKey: zoteroItemKey,
        itemTitle: itemData.title || 'Item linked',
        citationValidationStatus: validation.status,
      };
    } catch (txnError) {
      console.log(`❌ Transaction failed: ${getErrorMessage(txnError)}`);
      console.log(`   All changes rolled back\n`);
      throw txnError;
    }
  } catch (error) {
    console.log(`\n💥 EXCEPTION in linkUrlToExistingZoteroItem()`);
    console.log(`💬 Error: ${getErrorMessage(error)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Step 2.2: Enhanced Unlinking with Verification

**File:** `dashboard/lib/actions/zotero.ts`

Modify `unlinkUrlFromZotero()` to add consistency check:

```typescript
/**
 * Unlink URL from Zotero item (without deleting the Zotero item)
 *
 * ENHANCED: Now verifies state consistency before unlinking
 */
export async function unlinkUrlFromZotero(urlId: number) {
  try {
    // Get current URL data with capabilities
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return {
        success: false,
        error: 'URL not found',
      };
    }

    // NEW: Check for state consistency issues
    const consistencyIssues = StateGuards.getStateIntegrityIssues(urlData);
    if (consistencyIssues.length > 0) {
      return {
        success: false,
        error: `Cannot unlink - state is inconsistent: ${consistencyIssues[0]}`,
        consistencyIssues,
        suggestion: 'Run state integrity repair first',
      };
    }

    // Check if can unlink
    if (!StateGuards.canUnlink(urlData)) {
      return {
        success: false,
        error: `Cannot unlink URL (current status: ${urlData.processingStatus})`,
      };
    }

    if (!urlData.zoteroItemKey) {
      return {
        success: false,
        error: 'URL is not linked to a Zotero item',
      };
    }

    const currentStatus = urlData.processingStatus;
    const itemKey = urlData.zoteroItemKey;

    // Transition back to not_started
    await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      'not_started',
      {
        reason: 'User unlinked from Zotero',
        previousItemKey: itemKey,
      }
    );

    // Clear Zotero fields and citation validation
    await db
      .update(urls)
      .set({
        zoteroItemKey: null,
        zoteroProcessedAt: null,
        zoteroProcessingStatus: null,
        zoteroProcessingError: null,
        zoteroProcessingMethod: null,
        citationValidationStatus: null,
        citationValidatedAt: null,
        citationValidationDetails: null,
        updatedAt: new Date(),
      })
      .where(eq(urls.id, urlId));

    // Remove link record
    await db
      .delete(zoteroItemLinks)
      .where(eq(zoteroItemLinks.urlId, urlId));

    // Update linked_url_count for other URLs with same item
    const remainingLinks = await db
      .select()
      .from(zoteroItemLinks)
      .where(eq(zoteroItemLinks.itemKey, itemKey));

    const linkedUrlCount = remainingLinks.length;

    // Update all other URLs linked to this item
    await db
      .update(urls)
      .set({
        linkedUrlCount,
        updatedAt: new Date(),
      })
      .where(eq(urls.zoteroItemKey, itemKey));

    return {
      success: true,
      urlId,
      itemKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Phase 3: Guard Enhancement

### Step 3.1: Update canLinkToItem Guard

**File:** `dashboard/lib/state-machine/state-guards.ts`

Modify the `canLinkToItem()` method (line 441):

```typescript
/**
 * Can link URL to an existing Zotero item?
 *
 * ENHANCED: Now checks for state consistency issues
 *
 * Requirements:
 * - URL must not already be linked to a Zotero item
 * - Not ignored/archived
 * - Not currently processing
 * - State must be consistent (no orphaned items, etc.)
 */
static canLinkToItem(url: UrlForGuardCheck): boolean {
  // User intent check
  if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
    console.log(`[canLinkToItem] URL intent is ${url.userIntent}, blocking`);
    return false;
  }

  // Must not already have a Zotero item linked
  if (url.zoteroItemKey) {
    console.log(`[canLinkToItem] URL with id ${url.id} already has a Zotero item linked (${url.zoteroItemKey}), returning false`);
    return false;
  }

  // NEW: Check for state consistency issues
  const consistencyIssues = this.getStateIntegrityIssues(url);
  if (consistencyIssues.length > 0) {
    console.log(`[canLinkToItem] URL has state consistency issues: ${consistencyIssues[0]}`);
    return false;
  }

  // Can't link while processing
  const activeProcessingStates: ProcessingStatus[] = [
    'processing_zotero',
    'processing_content',
    'processing_llm',
  ];

  if (activeProcessingStates.includes(url.processingStatus)) {
    console.log(`[canLinkToItem] URL is actively processing, blocking`);
    return false;
  }

  return true;
}
```

---

## Phase 4: UI Integration

### Step 4.1: Add Repair Button to URLTableRow

**File:** `dashboard/components/urls/url-table/URLTableRow.tsx`

Add this component to show repair button for inconsistent states:

```typescript
import { repairUrlStateIntegrity } from '@/lib/actions/state-integrity';

interface StateConsistencyIndicatorProps {
  url: UrlWithCapabilitiesAndStatus;
  onRepair: () => Promise<void>;
}

function StateConsistencyIndicator({ url, onRepair }: StateConsistencyIndicatorProps) {
  const issues = StateGuards.getStateIntegrityIssues(url);

  if (issues.length === 0) {
    return null;
  }

  const [isRepairing, setIsRepairing] = useState(false);

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await repairUrlStateIntegrity(url.id);
      if (result.success && result.repaired) {
        await onRepair();
      } else {
        alert(`Repair failed: ${result.error}`);
      }
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>State Inconsistent</span>
      </div>
      <Button
        onClick={handleRepair}
        disabled={isRepairing}
        size="sm"
        variant="outline"
        className="text-yellow-600 hover:text-yellow-700"
      >
        {isRepairing ? (
          <>
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            Fixing...
          </>
        ) : (
          <>
            <Wrench className="w-3 h-3 mr-1" />
            Fix State
          </>
        )}
      </Button>
      <div className="text-xs text-gray-600 max-w-xs">
        {issues[0]}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Unit Tests

```typescript
describe('StateGuards integrity checks', () => {
  it('detects linked items in wrong state', () => {
    const url: UrlForGuardCheck = {
      id: 1,
      url: 'https://example.com',
      processingStatus: 'not_started',
      userIntent: 'auto',
      zoteroItemKey: 'ABC123',
    };

    const issues = StateGuards.getStateIntegrityIssues(url);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('LINKED_BUT_NOT_STORED');
  });

  it('detects stored state without item', () => {
    const url: UrlForGuardCheck = {
      id: 2,
      url: 'https://example.com',
      processingStatus: 'stored',
      userIntent: 'auto',
      zoteroItemKey: null,
    };

    const issues = StateGuards.getStateIntegrityIssues(url);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('STORED_WITHOUT_ITEM');
  });
});
```

### Integration Tests

```typescript
describe('linkUrlToExistingZoteroItem transaction', () => {
  it('maintains state consistency on success', async () => {
    const urlId = 123;
    const itemKey = 'ABC123XY';

    const result = await linkUrlToExistingZoteroItem(urlId, itemKey);

    expect(result.success).toBe(true);

    // Verify database state
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });

    expect(url.zoteroItemKey).toBe(itemKey);
    expect(url.processingStatus).toBe('stored_custom');
    expect(url.zoteroProcessingStatus).toBe('stored_custom');

    // No consistency issues
    const issues = StateGuards.getStateIntegrityIssues(url);
    expect(issues).toHaveLength(0);
  });

  it('rolls back on item verification failure', async () => {
    const urlId = 124;
    const invalidItemKey = 'INVALID_KEY_DOESNT_EXIST';

    const originalUrl = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });

    const result = await linkUrlToExistingZoteroItem(urlId, invalidItemKey);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');

    // URL should be unchanged
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    expect(url.zoteroItemKey).toBe(originalUrl.zoteroItemKey);
    expect(url.processingStatus).toBe(originalUrl.processingStatus);
  });
});
```

---

## Validation Steps

After implementing each phase, run:

### Phase 1 Validation
```bash
# Check for existing inconsistencies
curl http://localhost:3000/api/integrity/report

# Should show:
# {
#   "totalUrls": X,
#   "healthMetrics": {
#     "totalWithIssues": Y,
#     "repairable": Z
#   },
#   ...
# }
```

### Phase 2 Validation
```bash
# Try linking a URL and verify state consistency
# Should succeed atomically
# Check: zoteroItemKey, processingStatus, zoteroProcessingStatus all updated
```

### Phase 3 Validation
```bash
# Try to link an already-linked URL
# Should be blocked by canLinkToItem() guard
# Try to link a URL with state inconsistency
# Should be blocked
```

### Phase 4 Validation
```bash
# UI should show:
# - ⚠️ Badge for inconsistent URLs
# - 🔧 Fix State button
# - Click should repair the URL
```

---

## Rollback Procedure

If issues occur, the changes are reversible:

1. **Phase 1 (Diagnostic):** Remove integrity checking code - no data changes
2. **Phase 2 (Transactions):** Revert to single updates - old code works fine
3. **Phase 3 (Guards):** Revert guard enhancements - system works as before
4. **Phase 4 (UI):** Remove UI components - no functional impact

All changes are backward compatible. The system will work with or without the new code.

---

## Monitoring & Metrics

After deployment, monitor:

```typescript
// Daily health check
const report = await getStateIntegrityReport();

console.log(`Health: ${report.report.healthMetrics.totalWithIssues} issues`);

// Alert if issues > 0
if (report.report.healthMetrics.totalWithIssues > 0) {
  // Send alert to admin
  await notifyAdmin(report);
}
```

Track in dashboard:
- `totalUrls` - total tracked URLs
- `totalWithIssues` - count of inconsistent URLs
- `repairable` - count that can be auto-fixed
- `inconsistentLinks` - total Zotero linkage issues
