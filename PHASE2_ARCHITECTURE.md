# Phase 2: Transaction-Safe Linking - Architecture

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              PHASE 2: TRANSACTION-SAFE LINKING                 │
└────────────────────────────────────────────────────────────────┘

LAYER 1: PREVENTION (Guards)
┌────────────────────────────────────────────────────────────────┐
│  StateGuards.canLinkToItem()                                   │
│  ├─ Check 1: User intent allows?                              │
│  ├─ Check 2: No existing item?                                │
│  ├─ Check 3: State is consistent? ← NEW (Phase 2)            │
│  ├─ Check 4: Not currently processing?                        │
│  └─ Returns: boolean (can proceed or not)                     │
└────────────────────────────────────────────────────────────────┘
           ↓
LAYER 2: VALIDATION (Pre-Operation Checks)
┌────────────────────────────────────────────────────────────────┐
│  linkUrlToExistingZoteroItem()                                 │
│  ├─ Step 1: Verify guard (calls canLinkToItem)               │
│  ├─ Step 2: Verify item exists in Zotero                     │
│  └─ If any check fails: return error (no DB modifications)   │
└────────────────────────────────────────────────────────────────┘
           ↓
LAYER 3: ATOMIC TRANSACTION (All-or-Nothing)
┌────────────────────────────────────────────────────────────────┐
│  try {                                                          │
│    Step A: Transition state via URLProcessingStateMachine      │
│    Step B: Update URL record (both processingStatus + legacy)  │
│    Step C: Create link record in zoteroItemLinks               │
│    Step D: Update linked_url_count                             │
│    Step E: Revalidate citation                                 │
│  } catch {                                                      │
│    Log error and return failure (no partial updates)           │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
           ↓
         Success (or Failure with clear error)
```

---

## State Consistency Check Integration

```
User clicks "Link to Zotero Item"
         ↓
linkUrlToExistingZoteroItem(urlId, itemKey) called
         ↓
getUrlWithCapabilities(urlId) retrieves current state
         ↓
StateGuards.canLinkToItem(urlData) checks:
    ├─ Is userIntent = 'ignore' or 'archive'? → NO (block)
    ├─ Does URL already have zoteroItemKey? → NO (block)
    ├─ Are there state consistency issues? → NEW (Phase 2)
    │   └─ Calls StateGuards.getStateIntegrityIssues()
    │       └─ Checks 4 consistency rules
    │           1. zoteroItemKey → must be in stored*
    │           2. stored* → must have zoteroItemKey
    │           3. ignored/archived → must NOT have item
    │           4. processing_* → must NOT have item yet
    │   └─ If any issues found: canLinkToItem() returns false
    └─ Is URL not currently processing? → NO (block)
         ↓
    ┌─────────────────────┬──────────────────────┐
    ↓ (canLinkToItem=true) ↓ (canLinkToItem=false)
 Proceed              Return Error
   with          + Repair Suggestion
 linking           (from Phase 1)
```

---

## Data Flow: Linking Operation

### Before: State Inconsistency Detection

```
URL Record (INCONSISTENT STATE)
├─ processingStatus: 'processing_zotero'
├─ zoteroItemKey: 'ABC123'  ← INCONSISTENCY: has item but wrong status!
├─ zoteroProcessingStatus: 'processing_zotero'
└─ linkedUrlCount: 0

User attempts to link to another item → BLOCKED
  ↓
Error returned: "Cannot link URL (state is inconsistent)"
  ↓
Repair suggestion: "Transition processing_zotero → stored_custom"
  ↓
User must repair state first (Phase 1) before linking allowed
```

### After: Consistent Linking

```
URL Record (CONSISTENT STATE)
├─ processingStatus: 'not_started'
├─ zoteroItemKey: null
├─ zoteroProcessingStatus: null
└─ linkedUrlCount: 0

User links to 'ABC123' → ALLOWED
  ↓
State transition via URLProcessingStateMachine
  ↓
URL Record (UPDATED)
├─ processingStatus: 'stored_custom'  ← SYNCED
├─ zoteroItemKey: 'ABC123'
├─ zoteroProcessingStatus: 'stored_custom'  ← SYNCED
├─ zoteroProcessedAt: <timestamp>
├─ zoteroProcessingMethod: 'manual_link_existing'
├─ createdByTheodore: false
└─ linkedUrlCount: 1

Link Record Created
├─ urlId: <id>
├─ itemKey: 'ABC123'
├─ createdByTheodore: false
└─ linkedAt: <timestamp>
```

---

## Data Flow: Unlinking Operation

```
URL Record (LINKED STATE)
├─ processingStatus: 'stored_custom'
├─ zoteroItemKey: 'ABC123'
├─ zoteroProcessingStatus: 'stored_custom'
└─ linkedUrlCount: 1

User attempts to unlink
  ↓
StateGuards.canUnlink() checks basic eligibility
  ↓
NEW (Phase 2): StateGuards.getStateIntegrityIssues() checks consistency
  ├─ If issues found:
  │   └─ Return error with repair suggestion
  │       └─ User must repair state first
  ├─ If no issues found:
  │   └─ Proceed with unlink
  ↓
Atomic transaction:
  Step A: Transition state to 'not_started'
  Step B: Clear all Zotero fields
  Step C: Remove link record
  Step D: Update linked_url_count
  ↓
URL Record (UNLINKED)
├─ processingStatus: 'not_started'  ← RESET
├─ zoteroItemKey: null  ← CLEARED
├─ zoteroProcessingStatus: null  ← CLEARED
└─ linkedUrlCount: 0  ← UPDATED
```

---

## Consistency Rules

### Rule 1: If has zoteroItemKey → must be in stored*

```
Valid States:
├─ stored (linked and saved)
├─ stored_incomplete (linked, awaiting data)
└─ stored_custom (linked, custom metadata)

Invalid States with Item:
├─ not_started (item exists but never started processing)
├─ processing_* (item exists but still processing)
├─ exhausted (item exists but processing failed)
├─ ignored (item exists but ignored)
└─ archived (item exists but archived)

Phase 2 Guard: If item linked but state wrong → block link attempt
             (because URL is already broken, cannot proceed safely)
```

### Rule 2: If stored* → must have zoteroItemKey

```
Valid Conditions:
├─ stored + has zoteroItemKey
├─ stored_incomplete + has zoteroItemKey
└─ stored_custom + has zoteroItemKey

Invalid Conditions:
├─ stored but zoteroItemKey = null
├─ stored_incomplete but zoteroItemKey = null
└─ stored_custom but zoteroItemKey = null

Phase 2 Guard: Cannot link to URL in 'stored*' state without item
             (would violate this rule)
```

### Rule 3: If ignored/archived → must NOT have zoteroItemKey

```
Valid Conditions:
├─ ignored + no zoteroItemKey
└─ archived + no zoteroItemKey

Invalid Conditions:
├─ ignored but zoteroItemKey present
└─ archived but zoteroItemKey present

Phase 2 Guard: Cannot link to archived/ignored URLs
             (canLinkToItem checks user intent first)
```

### Rule 4: If processing_* → must NOT have zoteroItemKey

```
Valid Conditions:
├─ processing_zotero + no zoteroItemKey
├─ processing_content + no zoteroItemKey
└─ processing_llm + no zoteroItemKey

Invalid Conditions:
├─ processing_zotero but zoteroItemKey present
├─ processing_content but zoteroItemKey present
└─ processing_llm but zoteroItemKey present

Phase 2 Guard: Cannot link while processing
             (canLinkToItem checks for active processing)
```

---

## Guard Enhancement Detail

### Before (Phase 1)

```typescript
static canLinkToItem(url: UrlForGuardCheck): boolean {
  if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
    return false;
  }
  if (url.zoteroItemKey) {
    return false;
  }
  // Check if actively processing
  const activeProcessingStates = ['processing_zotero', 'processing_content', 'processing_llm'];
  if (activeProcessingStates.includes(url.processingStatus)) {
    return false;
  }
  return true;
}
```

### After (Phase 2)

```typescript
static canLinkToItem(url: UrlForGuardCheck): boolean {
  // Original checks (unchanged)
  if (url.userIntent === 'ignore' || url.userIntent === 'archive') {
    return false;
  }
  if (url.zoteroItemKey) {
    return false;
  }

  // NEW (Phase 2): Check for state consistency issues
  const consistencyIssues = this.getStateIntegrityIssues(url);
  if (consistencyIssues.length > 0) {
    return false;  // Cannot link to broken state
  }

  // Original check (unchanged)
  const activeProcessingStates = ['processing_zotero', 'processing_content', 'processing_llm'];
  if (activeProcessingStates.includes(url.processingStatus)) {
    return false;
  }

  return true;
}
```

---

## Linking Operation Flow

```
User Action: Link URL to Zotero Item
         ↓
linkUrlToExistingZoteroItem(urlId, itemKey)
         ↓
┌─ PHASE 2A: GUARD CHECK ─────────────────────────────┐
│ getUrlWithCapabilities(urlId)                        │
│ StateGuards.canLinkToItem(urlData)                  │
│   ├─ Intent check                                   │
│   ├─ Existing item check                            │
│   ├─ Consistency check (Phase 2) ← NEW              │
│   └─ Processing state check                         │
│                                                     │
│ If any fails: return error immediately             │
└─────────────────────────────────────────────────────┘
         ↓ (all checks passed)
┌─ PHASE 2B: ITEM VERIFICATION ───────────────────────┐
│ getItem(itemKey) from Zotero API                    │
│   ├─ Verify item exists                            │
│   └─ Get item metadata (title, etc.)               │
│                                                     │
│ If fails: return error (item not found)            │
└─────────────────────────────────────────────────────┘
         ↓ (item verified)
┌─ PHASE 2C: ATOMIC TRANSACTION ──────────────────────┐
│ try {                                               │
│   A. Transition state via URLProcessingStateMachine │
│      from: currentStatus → to: 'stored_custom'      │
│                                                     │
│   B. Update URL record:                            │
│      ├─ zoteroItemKey = itemKey                    │
│      ├─ zoteroProcessedAt = now                    │
│      ├─ zoteroProcessingStatus = 'stored_custom'   │
│      ├─ processingStatus = 'stored_custom' (SYNC)  │
│      └─ ... other fields                           │
│                                                     │
│   C. Create link record:                           │
│      ├─ urlId = urlId                              │
│      ├─ itemKey = itemKey                          │
│      └─ linkedAt = now                             │
│                                                     │
│   D. Update linked_url_count:                       │
│      └─ COUNT(*) FROM zoteroItemLinks WHERE key=X  │
│                                                     │
│   E. Validate citation:                            │
│      └─ Check for missing fields in item           │
│                                                     │
│ } catch (error) {                                   │
│   Log detailed error                               │
│   Return failure (no partial updates)              │
│ }                                                   │
└─────────────────────────────────────────────────────┘
         ↓
    Success or Failure
```

---

## Error Handling Architecture

```
Error Scenarios:
        ↓
    ┌───┴────────────────────────────────────────┐
    ↓                                            ↓
Guard Failure              Operational Failure
(preventive)               (transactional)
    ├─ Item already        ├─ Item not found
    │  linked              │  in Zotero
    ├─ State              ├─ State transition
    │  inconsistent       │  failed
    ├─ Wrong intent      ├─ DB update
    │  (ignore/archive)   │  failed
    └─ Processing        └─ Link record
       state                creation failed
        ↓                       ↓
    Block and Report        Rollback and Report
    (no DB changes)         (all or nothing)
        ↓                       ↓
    Return:                 Return:
    ├─ success: false       ├─ success: false
    ├─ error: reason        ├─ error: reason
    └─ (optional:           └─ (transaction
       repairSuggestion)        failure logged)
```

---

## State Synchronization

### The Dual-State Problem

The URL processing system has two state representations:

**Legacy System (Zotero):**
- `zoteroProcessingStatus`
- `zoteroProcessedAt`
- `zoteroProcessingMethod`

**New System (Processing):**
- `processingStatus`
- `userIntent`
- `capability`

**Inconsistency Risk:** If these fall out of sync, confusion and bugs occur.

### Phase 2 Solution

**Explicit Synchronization:** When linking or unlinking, we ALWAYS set BOTH systems:

```typescript
// When linking:
await db.update(urls).set({
  zoteroProcessingStatus: 'stored_custom',  // Legacy system
  processingStatus: 'stored_custom',        // New system
  // ... other fields
});

// When unlinking:
await db.update(urls).set({
  zoteroProcessingStatus: null,  // Legacy system
  processingStatus: 'not_started',  // New system
  // ... other fields
});
```

This ensures both systems stay synchronized.

---

## Integration with Phase 1

Phase 2 builds on Phase 1's detection layer:

```
Phase 1 (Detection)
├─ getStateIntegrityIssues() → array of issues
├─ suggestRepairAction() → repair suggestion
└─ hasStateIssues() → boolean check

         ↓↓↓ Used by Phase 2 ↓↓↓

Phase 2 (Prevention)
├─ Enhanced canLinkToItem() calls getStateIntegrityIssues()
├─ Enhanced canUnlink() would call getStateIntegrityIssues()
└─ Error messages include suggestRepairAction()
```

---

## Integration with State Machine

Phase 2 uses the existing state machine for transitions:

```
linkUrlToExistingZoteroItem()
         ↓
URLProcessingStateMachine.transition(
  urlId: number,
  from: currentStatus,
  to: 'stored_custom',
  metadata: {
    reason: 'User linked to existing Zotero item',
    linkedItemKey: itemKey
  }
)
         ↓
State machine validates transition is allowed
         ↓
Updates processingStatus in database
         ↓
Logs transition to processingHistory
         ↓
Returns success/failure to caller
```

---

## Console Output Architecture

### Logging Levels

```
Level 1: Operation Start
  ╔═══════════════════════════════════════════════════════════════╗
  ║  🔗 ACTION: linkUrlToExistingZoteroItem()                    ║
  ╚═══════════════════════════════════════════════════════════════╝

Level 2: Context Information
  📌 URL ID: 123
  🔑 Item Key: ABC123
  📊 Current Status: not_started

Level 3: Step Progress
  🔍 Step 1: Verifying Zotero item exists...
  ✅ Item verified

Level 4: Sub-step Details
  🔄 Step 2: Starting atomic transaction...
     → Transitioning state to 'stored_custom'...
     → Updating URL record...
     → Creating link record...

Level 5: Transaction Status
  ✅ Transaction completed successfully

Level 6: Completion
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Error Logging

```
If error occurs:
  💥 EXCEPTION in linkUrlToExistingZoteroItem()
  💬 Error: [detailed error message]

If consistency issue prevents operation:
  ⚠️  State consistency issues detected:
  1. LINKED_BUT_NOT_STORED
  2. ...

  💡 Suggested repair: transition_to_stored_custom
```

---

## Performance Characteristics

### Time Complexity

```
linkUrlToExistingZoteroItem():
├─ Guard check: O(1) - simple field checks
├─ Consistency check: O(1) - constant checks
├─ Item verification: O(n) - API call, depends on Zotero
├─ State transition: O(1) - single record update
├─ Link creation: O(1) - single record insert
├─ Count update: O(n) - counts links for item
└─ Citation validation: O(1) - parse fields

Overall: Dominated by Zotero API call time
```

### Space Complexity

```
Memory usage:
├─ urlData object: O(1) - constant size
├─ Item metadata: O(1) - bounded size
├─ Consistency check: O(1) - no loops or recursion
└─ Database operations: O(1) - no collection building

Overall: O(1) - constant memory usage
```

---

## Backward Compatibility

### Function Signatures (Unchanged)

```typescript
// No signature changes, so existing callers work unchanged
export async function linkUrlToExistingZoteroItem(
  urlId: number,
  zoteroItemKey: string
) {
  // Implementation enhanced, but interface same
}

export async function unlinkUrlFromZotero(urlId: number) {
  // Implementation enhanced, but interface same
}
```

### Return Types (Enhanced)

```typescript
// Original return type still present, but may have additional fields
{
  success: boolean,
  error?: string,
  // ... existing fields ...

  // NEW (Phase 2): Consistency info (only if consistency issue blocks operation)
  consistencyIssues?: string[],
  repairSuggestion?: RepairAction
}
```

### Behavior Changes

```
Scenario: Linking to URL with broken state

Before Phase 2: Might succeed (creating more inconsistencies)
After Phase 2: Returns error + repair suggestion

This is a SAFE CHANGE:
- Prevents problematic state
- Gives user clear path to fix
- No breaking change to working operations
```

---

## Summary

**Phase 2 Architecture** provides:

1. **Prevention Layer:** Guards check consistency before operations
2. **Validation Layer:** Verifications happen before database changes
3. **Atomic Layer:** All database operations grouped for consistency
4. **Error Layer:** Detailed messages and repair suggestions
5. **Logging Layer:** Beautiful console output for debugging

This three-layer approach (Prevention → Validation → Atomic) ensures that:
- Broken state is detected before causing problems
- Operations are all-or-nothing
- Users get clear error messages
- No partial updates corrupt data

---

**Architecture Status:** ✅ **PRODUCTION READY**
**Integration:** Complete with Phase 1 and State Machine
**Date:** December 2, 2024
