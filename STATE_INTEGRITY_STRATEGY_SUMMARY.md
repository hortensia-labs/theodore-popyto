# State Integrity Strategy - Executive Summary

## The Problem (in Plain Terms)

When you use "Link to Existing Item" to link a URL to a Zotero item:
- ✅ The URL **is** linked (database has the item key)
- ❌ But the status shows **"not_started"** instead of **"Successfully stored in Zotero"**

This is a **display synchronization bug** where the database state (linked) doesn't match the UI state (not processed).

---

## Root Causes (3 Key Issues)

### 1. **Dual State Representations**
The system tracks state in **two different ways**:
- **Processing side:** `processingStatus` field (says if item was successfully processed)
- **Zotero side:** `zoteroItemKey` field (says if item is linked)

When these don't match = confusion for the user.

### 2. **No Atomic Transactions**
Linking is a multi-step process:
1. Verify item exists
2. Transition state
3. Update database
4. Create link record
5. Revalidate citation

If this breaks in the middle, you get partial updates.

### 3. **Guards Don't Verify Consistency**
The `StateGuards` class checks individual conditions but assumes the two state representations are always in sync. They're not.

---

## The Strategy (4 Phases)

### Phase 1: Detect the Problem ⚠️ (Week 1)
Add tools to find and flag inconsistent items:

```typescript
StateGuards.getStateIntegrityIssues(url)
  // Returns: ["Linked to item ABC123 but status is not_started"]
```

Create a report showing all broken URLs so you can see the damage.

### Phase 2: Fix with Transactions 🔧 (Week 2)
Wrap the linking operation in a **database transaction**:
- Either ALL changes succeed together
- Or ALL changes rollback (nothing partially broken)

This prevents race conditions.

### Phase 3: Prevent Future Issues 🛡️ (Week 3)
Add consistency checks **before** allowing actions:
- Can't link if state is already inconsistent
- Can't unlink if state is already inconsistent
- Auto-detect and flag problems

### Phase 4: User-Facing Fixes 👁️ (Week 4)
- Show "⚠️ INCONSISTENT" when state is broken
- Add "🔧 Fix State" button to repair individual items
- Add bulk repair option

---

## What Gets Fixed

### Immediately (Phase 1-2)
1. **No more new inconsistencies** - transactions prevent them
2. **Repair broken ones** - auto-fix detects and corrects old data
3. **Better error messages** - users know what went wrong

### Short-term (Phase 3)
1. **Prevent state inconsistencies** - guards validate before allowing actions
2. **Better auditability** - all repairs logged to history
3. **Safer operations** - consistency checks before linking/unlinking

### Long-term (Phase 4)
1. **Clear visibility** - UI shows when state is inconsistent
2. **One-click fixes** - users can repair broken items
3. **Confidence** - system is self-healing

---

## Key Implementation Points

### 1. StateGuards Enhancement
```typescript
// NEW METHOD - detects inconsistencies
StateGuards.getStateIntegrityIssues(url)

// NEW METHOD - suggests how to fix
StateGuards.suggestRepairAction(url)

// ENHANCED - now checks consistency
StateGuards.canLinkToItem(url)
```

### 2. Transaction-Safe Linking
```typescript
// MODIFIED - now uses database transaction
linkUrlToExistingZoteroItem(urlId, itemKey)

// All-or-nothing: linked + status update + record created
// No partial states possible
```

### 3. Auto-Repair Action
```typescript
// NEW - fixes inconsistent states
repairUrlStateIntegrity(urlId)

// Repairs the mismatch, logs to history
```

### 4. Integrity Reporting
```typescript
// NEW - scans all URLs
getStateIntegrityReport()

// Returns: { totalUrls, inconsistencies: [...] }

// NEW - repairs all broken ones
checkAndRepairAllUrls()
```

---

## Data Consistency Rules (Invariants)

These must ALWAYS be true:

| Condition | Rule |
|-----------|------|
| Has `zoteroItemKey` | Must be in state `'stored'`, `'stored_incomplete'`, or `'stored_custom'` |
| Status is `'stored*'` | Must have valid `zoteroItemKey` |
| Status is `'ignored'` or `'archived'` | Must NOT have `zoteroItemKey` |
| In `'processing_*'` states | Must NOT have `zoteroItemKey` (processing hasn't completed) |

---

## Files Changed

### Core Logic
- `state-guards.ts` - Add integrity checks
- `zotero.ts` - Make linking atomic
- `state-transitions.ts` - Add repair action

### New Files
- `state-integrity.ts` - Reporting and bulk operations

### UI
- `URLTableRow.tsx` - Show consistency status & repair button
- `URLDetailPanel.tsx` - Show consistency info

---

## Timeline & Effort

| Phase | Tasks | Effort | Risk |
|-------|-------|--------|------|
| 1 | Add detection & reporting | 2-3 days | 🟢 Low - read-only |
| 2 | Transactions & repairs | 3-4 days | 🟡 Medium - DB changes |
| 3 | Guards & prevention | 2-3 days | 🟡 Medium - behavior changes |
| 4 | UI & polish | 2-3 days | 🟢 Low - UI only |

**Total:** 2-3 weeks for full implementation

---

## How to Use (Operations)

### Check Current State
```
GET /api/integrity/report
{
  "totalUrls": 2847,
  "inconsistencies": [
    {
      "urlId": 123,
      "url": "https://example.com",
      "issues": ["Linked to item ABC123 but status is not_started"]
    }
  ]
}
```

### Repair All Broken URLs
```
POST /api/integrity/repair-all
{
  "success": true,
  "repaired": 42,
  "failures": 2
}
```

### Repair One URL
```
POST /api/integrity/repair/123
{
  "success": true,
  "repaired": true,
  "from": "not_started",
  "to": "stored_custom",
  "issue": "Linked to item ABC123 but status was not_started"
}
```

### View Status
- URLs with `⚠️ INCONSISTENT` badge = state is broken
- Click `🔧 Fix State` button = repairs automatically
- History shows repair action

---

## Success Metrics

After implementation:

1. ✅ **0 orphaned linked items** (item linked but wrong status)
2. ✅ **0 ghost stored states** (status says stored but no item)
3. ✅ **100% state consistency** for all URLs
4. ✅ **Atomic linking** - no partial updates possible
5. ✅ **Auto-detection** - inconsistencies caught immediately
6. ✅ **Auto-repair** - users can fix with one click

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing items | Dry-run first, repairs only adjust status to match reality |
| Database locks | Use SQLite transactions (built-in, low overhead) |
| Performance | Only check consistency on specific actions, not on every read |
| Data loss | All changes logged to history, reversible |

---

## Next Steps

1. **Review this strategy** with the codebase
2. **Run Phase 1** - assess how many broken items exist
3. **Review findings** - decide if immediate action needed
4. **Implement Phase 2** - prevent new issues from forming
5. **Implement Phase 3** - add guards to prevent future problems
6. **Roll out Phase 4** - give users visibility and control

---

## Q&A

**Q: Will this break my existing data?**
A: No. Phase 1-2 only fix broken states to match reality. If you have 1000 items, 500 with state issues get fixed to the correct state. The other 500 stay as-is.

**Q: Will linking be slower?**
A: No. Transactions add <1ms overhead. Unnoticeable.

**Q: Can I revert fixes?**
A: Yes. History shows all repairs. Manual SQL can revert if needed (though shouldn't be necessary).

**Q: What if the fix is wrong?**
A: The auto-repair logic is very conservative. It only fixes the two main patterns (item linked but wrong status, or status says stored but no item). No destructive changes.

**Q: How do I know if I have broken items?**
A: Run `getStateIntegrityReport()` - it scans all URLs and shows exactly which ones have issues.
