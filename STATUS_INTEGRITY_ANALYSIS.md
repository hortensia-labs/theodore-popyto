# URL Item Status Integrity Analysis & Strategy

## Problem Statement

URL items that have been linked to existing Zotero items via the "Link to Existing Item" action show incorrect status displays. Specifically:
- Items are **linked to Zotero items** (have a `zoteroItemKey` set)
- But their **`processingStatus` remains `'not_started'`** or shows other incorrect states
- Expected: Status should be `'stored_custom'` or reflect successful linking

This indicates a **state consistency problem** where the database state (item is linked) doesn't match the UI display state (processing status).

---

## Root Cause Analysis

### 1. **Multiple, Partially-Overlapping State Representations**

The system has **two state tracking mechanisms** that can diverge:

#### A. Legacy Zotero Processing Fields (Database)
- `zoteroItemKey` - presence indicates linkage
- `zoteroProcessedAt` - timestamp of linkage
- `zoteroProcessingStatus` - states: 'processing', 'stored', 'failed'
- `zoteroProcessingMethod` - how item was linked

#### B. New Processing Status System (Database)
- `processingStatus` - canonical states: 'not_started', 'processing_zotero', 'stored', 'stored_incomplete', 'stored_custom', 'exhausted', 'ignored', 'archived'
- `userIntent` - user's preference: 'auto', 'ignore', 'priority', 'manual_only', 'archive'
- `processingHistory` - JSON array of processing attempts
- `processingAttempts` - counter

**Problem:** When linking via "Link to Existing Item" ([zotero.ts:634-756](dashboard/lib/actions/zotero.ts#L634-L756)), the code:
1. ✅ **Correctly sets** `zoteroItemKey` to the linked item
2. ✅ **Correctly transitions** `processingStatus` to `'stored_custom'` via state machine
3. ✅ **Correctly sets** `zoteroProcessingStatus: 'stored_custom'`
4. ❌ **BUT** may not synchronize with computed/cached state in UI

### 2. **State Guard Assumptions**

The `StateGuards` class ([state-guards.ts](dashboard/lib/state-machine/state-guards.ts)) checks:
- `canLinkToItem()` ([line 441](dashboard/lib/state-machine/state-guards.ts#L441)) - blocks if `zoteroItemKey` exists
- `canUnlink()` ([line 131](dashboard/lib/state-machine/state-guards.ts#L131)) - only if in `'stored'`, `'stored_incomplete'`, or `'stored_custom'`
- `canEditCitation()` ([line 248](dashboard/lib/state-machine/state-guards.ts#L248)) - requires `zoteroItemKey` AND one of the stored states

**Problem:** Guards assume these two representations are always in sync. If `processingStatus` gets out of sync with `zoteroItemKey`, actions become unavailable or exhibit wrong behavior.

### 3. **UI Display Mechanism**

The table displays [URLTableNew.tsx:373-408](dashboard/components/urls/url-table/URLTableNew.tsx#L373-L408) uses:
- `url.processingStatus` for status display
- `url.zoteroItemKey` for determining available actions

If `processingStatus` is wrong but `zoteroItemKey` is correct:
- Status label shows wrong value
- Actions may still work (because guards check both fields)
- **User sees inconsistent/confusing status**

### 4. **The Race Condition Pattern**

The flow in `linkUrlToExistingZoteroItem()` [zotero.ts:668-741](dashboard/lib/actions/zotero.ts#L668-L741):

```
1. Get URL data with capabilities
2. Check StateGuards.canLinkToItem() ← Checks zoteroItemKey
3. Verify item exists in Zotero
4. Call URLProcessingStateMachine.transition(to='stored_custom')
5. Update database with zoteroItemKey + zoteroProcessingStatus='stored_custom'
6. Create link record
7. Update linkedUrlCount
8. Revalidate citation
```

**The vulnerability:** Between steps 4-5, if:
- The transition is recorded in history
- But the database update fails or is partial
- The state machine logs transition but DB doesn't update `processingStatus`

OR

- The UI fetches data **between** the transition call and the DB update
- Sees inconsistent state

---

## Current State Transitions Architecture

### StateGuards Validation Points

```typescript
// Line 44: canProcessWithZotero()
✓ Checks: userIntent NOT 'ignore'/'archive'/'manual_only'
✓ Checks: processingStatus in ['not_started', 'awaiting_selection']
✓ Missing: NO CHECK that if zoteroItemKey exists, status should be 'stored*'

// Line 441: canLinkToItem()
✓ Checks: userIntent NOT 'ignore'/'archive'
✓ Checks: zoteroItemKey is NULL
✓ Missing: Could verify processingStatus is compatible (not already stored)

// Line 131: canUnlink()
✓ Checks: processingStatus in ['stored', 'stored_incomplete', 'stored_custom']
✓ ASSUMES: If status is one of these, zoteroItemKey exists (not verified)
```

### State Machine Synchronization Points

[state-guards.ts](dashboard/lib/state-machine/state-guards.ts) and [zotero.ts](dashboard/lib/actions/zotero.ts) call `URLProcessingStateMachine.transition()` which:
1. Records transition in `processingHistory`
2. Updates `processingStatus` in DB
3. Returns result

But there's **no atomic transaction** ensuring both `processingStatus` AND related fields (`zoteroItemKey`, `zoteroProcessingStatus`) are consistent.

---

## Inconsistency Patterns That Can Occur

### Pattern 1: Orphaned Linked Items
```
Database state:
├─ zoteroItemKey: "ABC123XY" ← Item is linked
├─ zoteroProcessingStatus: "stored_custom" ← Processing side is correct
└─ processingStatus: "not_started" ← Display side is WRONG
```

### Pattern 2: Ghost Links
```
Database state:
├─ processingStatus: "stored_custom" ← State says linked
├─ zoteroItemKey: NULL ← But no item linked!
└─ zoteroProcessedAt: NULL
```

### Pattern 3: Partial Transitions
```
processingHistory shows transition to 'stored_custom'
BUT processingStatus still 'not_started'
(History updated, DB update failed or wasn't executed)
```

---

## Strategy for State Integrity

### Phase 1: Diagnostic & Monitoring (Immediate)

#### 1.1 Add Integrity Check Guard
```typescript
// In state-guards.ts

static getStateIntegrityIssues(url: UrlForGuardCheck): string[] {
  const issues: string[] = [];

  // Issue 1: Has item but not in stored state
  if (url.zoteroItemKey && !['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
    issues.push(`INCONSISTENT: Linked to item ${url.zoteroItemKey} but status is ${url.processingStatus}`);
  }

  // Issue 2: In stored state but no item
  if (['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus) && !url.zoteroItemKey) {
    issues.push(`INCONSISTENT: Status is ${url.processingStatus} but no zoteroItemKey found`);
  }

  // Issue 3: Ignored/archived but has item
  if ((url.processingStatus === 'ignored' || url.processingStatus === 'archived') && url.zoteroItemKey) {
    issues.push(`INCONSISTENT: Status is ${url.processingStatus} but linked to item ${url.zoteroItemKey}`);
  }

  return issues;
}
```

#### 1.2 Add Auto-Repair Mechanism
```typescript
// In state-guards.ts

static canAutoRepair(url: UrlForGuardCheck): boolean {
  const issues = this.getStateIntegrityIssues(url);
  return issues.length > 0;
}

static suggestRepairAction(url: UrlForGuardCheck): {action: string; reason: string} | null {
  const issues = this.getStateIntegrityIssues(url);
  if (issues.length === 0) return null;

  // Pattern 1: Has item but not in stored state
  if (url.zoteroItemKey && !['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus)) {
    return {
      action: 'transition_to_stored_custom',
      reason: `Item ${url.zoteroItemKey} is linked but status is ${url.processingStatus}`
    };
  }

  // Pattern 2: In stored state but no item
  if (['stored', 'stored_incomplete', 'stored_custom'].includes(url.processingStatus) && !url.zoteroItemKey) {
    return {
      action: 'transition_to_not_started',
      reason: `Status is ${url.processingStatus} but no item is actually linked`
    };
  }

  return null;
}
```

#### 1.3 Repair Action
```typescript
// In state-transitions.ts

export async function repairUrlStateIntegrity(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);
    if (!urlData) {
      return { success: false, error: 'URL not found' };
    }

    const repair = StateGuards.suggestRepairAction(urlData);
    if (!repair) {
      return { success: true, message: 'No repair needed' };
    }

    const currentStatus = urlData.processingStatus;
    let targetStatus: ProcessingStatus;

    if (repair.action === 'transition_to_stored_custom') {
      targetStatus = 'stored_custom';
    } else if (repair.action === 'transition_to_not_started') {
      targetStatus = 'not_started';
    } else {
      return { success: false, error: 'Unknown repair action' };
    }

    // Perform transition
    await URLProcessingStateMachine.transition(
      urlId,
      currentStatus,
      targetStatus,
      {
        reason: 'Auto-repair: ' + repair.reason,
        source: 'integrity_check'
      }
    );

    return {
      success: true,
      repaired: true,
      from: currentStatus,
      to: targetStatus,
      issue: repair.reason
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Phase 2: Synchronization Points (Short-term)

#### 2.1 Transaction-Safe Linking

Wrap the linking operation in a transaction to ensure atomicity:

```typescript
// In zotero.ts - MODIFY linkUrlToExistingZoteroItem()

export async function linkUrlToExistingZoteroItem(
  urlId: number,
  zoteroItemKey: string
) {
  try {
    // ... existing validation code ...

    // NEW: Wrap in a transaction
    const result = await db.transaction(async (trx) => {
      // Step 1: Verify item exists
      const itemData = await getItem(zoteroItemKey);
      if (!itemData.success) {
        throw new Error(`Zotero item not found: ${itemData.error?.message}`);
      }

      const currentStatus = urlData.processingStatus;

      // Step 2: Perform state transition (within transaction)
      await URLProcessingStateMachine.transition(
        urlId,
        currentStatus,
        'stored_custom',
        {
          reason: 'User linked to existing Zotero item',
          linkedItemKey: zoteroItemKey,
        }
      );

      // Step 3: Update all related fields atomically
      await trx
        .update(urls)
        .set({
          zoteroItemKey,
          zoteroProcessedAt: new Date(),
          zoteroProcessingStatus: 'stored_custom',
          zoteroProcessingMethod: 'manual_link_existing',
          processingStatus: 'stored_custom', // EXPLICIT sync
          createdByTheodore: false,
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      // Step 4: Create link record
      await trx.insert(zoteroItemLinks).values({
        urlId,
        itemKey: zoteroItemKey,
        createdByTheodore: false,
        userModified: false,
        linkedAt: new Date(),
        createdAt: new Date(),
      });

      // Step 5: Update linked count
      const existingLinks = await trx
        .select({ count: sql`COUNT(*)` })
        .from(zoteroItemLinks)
        .where(eq(zoteroItemLinks.itemKey, zoteroItemKey));

      const linkedUrlCount = Number(existingLinks[0]?.count || 1);

      await trx
        .update(urls)
        .set({
          linkedUrlCount,
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      // Step 6: Revalidate citation
      const validation = validateCitation(itemData);
      await trx
        .update(urls)
        .set({
          citationValidationStatus: validation.status,
          citationValidatedAt: new Date(),
          citationValidationDetails: { missingFields: validation.missingFields },
          updatedAt: new Date(),
        })
        .where(eq(urls.id, urlId));

      return {
        urlId,
        itemKey: zoteroItemKey,
        itemTitle: itemData.title || 'Item linked',
        citationValidationStatus: validation.status,
      };
    });

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### 2.2 Synchronization Hook in StateGuards

Add a synchronization step that ensures consistency **before** allowing actions:

```typescript
// In state-guards.ts

export async function validateAndSyncState(url: UrlForGuardCheck): Promise<{
  isValid: boolean;
  syncPerformed: boolean;
  issues: string[];
}> {
  const issues = this.getStateIntegrityIssues(url);

  if (issues.length === 0) {
    return { isValid: true, syncPerformed: false, issues: [] };
  }

  // Auto-sync if repairable
  const repair = this.suggestRepairAction(url);
  if (repair) {
    // Caller must handle the actual repair
    return { isValid: false, syncPerformed: false, issues };
  }

  return { isValid: false, syncPerformed: false, issues };
}
```

### Phase 3: Prevention & Validation (Medium-term)

#### 3.1 Enhanced StateGuards for Linking

```typescript
// In state-guards.ts - MODIFY canLinkToItem()

static canLinkToItem(url: UrlForGuardCheck): boolean {
  // User intent check
  if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
    return false;
  }

  // Must not already have a Zotero item linked
  if (url.zoteroItemKey) {
    console.log(`[canLinkToItem] URL with id ${url.id} already has a Zotero item linked (${url.zoteroItemKey}), returning false`);
    return false;
  }

  // NEW: Check for state inconsistency
  if (this.getStateIntegrityIssues(url).length > 0) {
    console.log(`[canLinkToItem] URL has state consistency issues, cannot link`);
    return false;
  }

  // Can't link while processing
  const activeProcessingStates: ProcessingStatus[] = [
    'processing_zotero',
    'processing_content',
    'processing_llm',
  ];

  if (activeProcessingStates.includes(url.processingStatus)) {
    return false;
  }

  return true;
}
```

#### 3.2 Enhanced Unlink to Verify State

```typescript
// In zotero.ts - MODIFY unlinkUrlFromZotero()

export async function unlinkUrlFromZotero(urlId: number) {
  try {
    const urlData = await getUrlWithCapabilities(urlId);

    if (!urlData) {
      return { success: false, error: 'URL not found' };
    }

    // NEW: Check state consistency FIRST
    const issues = StateGuards.getStateIntegrityIssues(urlData);
    if (issues.length > 0) {
      return {
        success: false,
        error: `Cannot unlink - state inconsistency: ${issues.join('; ')}`,
        consistencyIssues: issues,
        couldRepair: issues.some(i => i.includes('Linked to item') && i.includes('not in stored'))
      };
    }

    // Check if can unlink
    if (!StateGuards.canUnlink(urlData)) {
      return {
        success: false,
        error: `Cannot unlink URL (current status: ${urlData.processingStatus})`,
      };
    }

    // ... rest of unlink logic ...
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### 3.3 Batch Verification Endpoint

Create an endpoint to check and repair all URLs:

```typescript
// New file: dashboard/lib/actions/state-integrity.ts

export async function checkAndRepairAllUrls() {
  try {
    const allUrls = await db.query.urls.findMany();
    const results = {
      total: allUrls.length,
      withIssues: 0,
      repaired: 0,
      failures: 0,
      issues: [] as Array<{ urlId: number; issues: string[] }>,
    };

    for (const url of allUrls) {
      const urlForCheck: UrlForGuardCheck = {
        id: url.id,
        url: url.url,
        processingStatus: url.processingStatus as ProcessingStatus,
        userIntent: url.userIntent as UserIntent,
        zoteroItemKey: url.zoteroItemKey,
        createdByTheodore: url.createdByTheodore,
        userModifiedInZotero: url.userModifiedInZotero,
        linkedUrlCount: url.linkedUrlCount,
        processingAttempts: url.processingAttempts,
      };

      const issues = StateGuards.getStateIntegrityIssues(urlForCheck);
      if (issues.length > 0) {
        results.withIssues++;
        results.issues.push({ urlId: url.id, issues });

        // Attempt repair
        const repair = await repairUrlStateIntegrity(url.id);
        if (repair.success && repair.repaired) {
          results.repaired++;
        } else {
          results.failures++;
        }
      }
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getStateIntegrityReport() {
  try {
    const allUrls = await db.query.urls.findMany();
    const report = {
      totalUrls: allUrls.length,
      byStatus: {} as Record<ProcessingStatus, number>,
      withZoteroItems: 0,
      inconsistencies: [] as Array<{
        urlId: number;
        url: string;
        issues: string[];
      }>,
    };

    for (const url of allUrls) {
      // Count by status
      const status = url.processingStatus as ProcessingStatus;
      report.byStatus[status] = (report.byStatus[status] || 0) + 1;

      if (url.zoteroItemKey) {
        report.withZoteroItems++;
      }

      const urlForCheck: UrlForGuardCheck = {
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
        report.inconsistencies.push({
          urlId: url.id,
          url: url.url,
          issues,
        });
      }
    }

    return { success: true, report };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Phase 4: UI Enhancements (Long-term)

#### 4.1 Status Display with Consistency Indicators

```typescript
// In URLTableRow or status display component

function getEffectiveStatus(url: UrlWithCapabilitiesAndStatus): {
  displayStatus: string;
  severity: 'critical' | 'warning' | 'info' | 'ok';
  issues?: string[];
} {
  const issues = StateGuards.getStateIntegrityIssues(url);

  if (issues.length > 0) {
    return {
      displayStatus: 'INCONSISTENT',
      severity: 'critical',
      issues,
    };
  }

  // Map processingStatus to user-friendly name
  const statusMap: Record<ProcessingStatus, string> = {
    'not_started': 'Not Started',
    'processing_zotero': 'Processing...',
    'processing_content': 'Processing Content...',
    'processing_llm': 'Using LLM...',
    'awaiting_selection': 'Select Identifier',
    'awaiting_metadata': 'Approve Metadata',
    'stored': 'Stored in Zotero',
    'stored_incomplete': 'Stored (Incomplete)',
    'stored_custom': 'Linked to Item',
    'exhausted': 'No Method Available',
    'ignored': 'Ignored',
    'archived': 'Archived',
  };

  return {
    displayStatus: statusMap[url.processingStatus],
    severity: 'ok',
  };
}
```

#### 4.2 Auto-Repair UI Option

Add a UI button to repair individual URLs or batch repair:

```typescript
// In URLTableRow or detail panel

function RepairButton({ url }: { url: UrlWithCapabilitiesAndStatus }) {
  const issues = StateGuards.getStateIntegrityIssues(url);

  if (issues.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={() => repairUrlStateIntegrity(url.id)}
      variant="outline"
      size="sm"
      className="text-yellow-600"
    >
      🔧 Fix State ({issues.length} issue{issues.length > 1 ? 's' : ''})
    </Button>
  );
}
```

---

## Implementation Priority & Timeline

### Week 1: Diagnostic Phase
- ✅ Add `StateGuards.getStateIntegrityIssues()`
- ✅ Add `repairUrlStateIntegrity()` server action
- ✅ Create `getStateIntegrityReport()` endpoint
- **Manual run:** Check for existing inconsistencies

### Week 2: Transaction Safety
- ✅ Modify `linkUrlToExistingZoteroItem()` with transaction
- ✅ Enhance `canLinkToItem()` guard with consistency check
- ✅ Enhance `unlinkUrlFromZotero()` with verification
- **Testing:** Verify no new inconsistencies created

### Week 3: Prevention
- ✅ Add auto-repair endpoint for bulk fixing
- ✅ Add integrity check to other state transitions
- ✅ Add consistency validation to critical actions
- **Testing:** All state transitions maintain consistency

### Week 4: UI & Documentation
- ✅ Add status consistency indicator to table
- ✅ Add repair button to detail panel
- ✅ Document state consistency assumptions
- ✅ Update troubleshooting guide

---

## Testing Strategy

### Unit Tests for StateGuards

```typescript
describe('StateGuards.getStateIntegrityIssues', () => {
  it('detects orphaned linked items', () => {
    const url = {
      id: 1,
      url: 'https://example.com',
      processingStatus: 'not_started',
      zoteroItemKey: 'ABC123XY',
      // ... other fields
    };

    const issues = StateGuards.getStateIntegrityIssues(url);
    expect(issues).toContain(expect.stringContaining('Linked to item'));
    expect(issues).toContain(expect.stringContaining('not_started'));
  });

  it('detects ghost stored states', () => {
    const url = {
      id: 2,
      url: 'https://example.com',
      processingStatus: 'stored',
      zoteroItemKey: null,
      // ... other fields
    };

    const issues = StateGuards.getStateIntegrityIssues(url);
    expect(issues).toContain(expect.stringContaining('Status is stored'));
    expect(issues).toContain(expect.stringContaining('no zoteroItemKey'));
  });
});
```

### Integration Tests

```typescript
describe('linkUrlToExistingZoteroItem', () => {
  it('maintains state consistency', async () => {
    const urlId = 123;
    const itemKey = 'ABC123XY';

    const result = await linkUrlToExistingZoteroItem(urlId, itemKey);

    expect(result.success).toBe(true);

    // Verify consistency
    const url = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
    const issues = StateGuards.getStateIntegrityIssues(url);

    expect(issues).toHaveLength(0);
    expect(url.zoteroItemKey).toBe(itemKey);
    expect(url.processingStatus).toBe('stored_custom');
    expect(url.zoteroProcessingStatus).toBe('stored_custom');
  });
});
```

---

## Success Criteria

1. ✅ **No orphaned linked items:** Every URL with `zoteroItemKey` has appropriate processing status
2. ✅ **No ghost stored states:** Every URL with stored status has a valid `zoteroItemKey`
3. ✅ **Consistent display:** Status shown in UI matches actual database state
4. ✅ **Transaction safety:** Linking operations are atomic
5. ✅ **Auto-repair capability:** Inconsistencies can be detected and fixed automatically
6. ✅ **Guard validation:** All state guards validate consistency before allowing actions
7. ✅ **Audit trail:** All repairs are logged in `processingHistory`

---

## Risk Mitigation

### Risk: Breaking existing linked items during repair
**Mitigation:**
- Dry-run first with `getStateIntegrityReport()`
- Repair logic only transitions status to match actual state
- All repairs logged to history

### Risk: Database transaction support
**Mitigation:**
- Check SQLite transaction support in Drizzle ORM
- Fallback: Manual rollback logic if transactions unavailable

### Risk: Performance impact of consistency checks
**Mitigation:**
- Consistency checks only on specific actions (link, unlink, transition)
- Batch repair runs in background/async
- Add indexes if needed

---

## Files to Modify/Create

1. **Modify:** `dashboard/lib/state-machine/state-guards.ts`
   - Add `getStateIntegrityIssues()`
   - Add `suggestRepairAction()`
   - Enhance `canLinkToItem()`, `canUnlink()`, others

2. **Modify:** `dashboard/lib/actions/zotero.ts`
   - Wrap `linkUrlToExistingZoteroItem()` in transaction
   - Add consistency validation to unlinking

3. **Modify:** `dashboard/lib/actions/state-transitions.ts`
   - Add `repairUrlStateIntegrity()`

4. **Create:** `dashboard/lib/actions/state-integrity.ts`
   - Add `checkAndRepairAllUrls()`
   - Add `getStateIntegrityReport()`

5. **Modify:** `dashboard/components/urls/url-table/URLTableRow.tsx`
   - Add repair button
   - Enhance status display with consistency indicator

6. **Modify:** Test files as needed

---

## Validation Checklist

- [ ] All URLs with `zoteroItemKey` have status in `['stored', 'stored_incomplete', 'stored_custom']`
- [ ] All URLs with status in `['stored', 'stored_incomplete', 'stored_custom']` have `zoteroItemKey`
- [ ] All URLs with status `'ignored'` or `'archived'` have NO `zoteroItemKey`
- [ ] Linking a URL transitions it to `'stored_custom'` atomically
- [ ] Unlinking a URL transitions it to `'not_started'` atomically
- [ ] All transitions are recorded in `processingHistory`
- [ ] UI displays correct status matching database state
- [ ] No race conditions in linking/unlinking flow
