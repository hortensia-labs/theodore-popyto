# Phase 2: Testing Guide

**Date:** December 2, 2024
**Status:** Ready for Testing
**Scope:** All Phase 2 enhancements

---

## Test Overview

This document provides comprehensive testing procedures for Phase 2 (Transaction-Safe Linking) implementation.

### Test Categories

1. **Unit Tests** - Individual function behavior
2. **Integration Tests** - Phase 1 + Phase 2 together
3. **Edge Case Tests** - Boundary conditions and error scenarios
4. **State Verification Tests** - Consistency checks

---

## Unit Tests

### Test 1.1: StateGuards.canLinkToItem() - Consistency Check

**Objective:** Verify guard blocks linking when state is inconsistent

**Setup:**
```typescript
const inconsistentUrl: UrlForGuardCheck = {
  id: 1,
  url: 'https://example.com',
  processingStatus: 'processing_zotero',  // Processing but...
  zoteroItemKey: 'ABC123',                 // ...already has item (inconsistent!)
  userIntent: 'auto',
  capability: undefined,
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(inconsistentUrl);
expect(canLink).toBe(false);  // Should block
```

**Expected Result:**
- `canLink` returns `false`
- Console logs: "URL has state consistency issues"

**Pass Criteria:** ✓ Guard prevents linking to broken state

---

### Test 1.2: StateGuards.canLinkToItem() - Consistent State

**Objective:** Verify guard allows linking when state is clean

**Setup:**
```typescript
const consistentUrl: UrlForGuardCheck = {
  id: 2,
  url: 'https://example.com',
  processingStatus: 'not_started',  // Clean state
  zoteroItemKey: null,               // No existing item
  userIntent: 'auto',
  capability: undefined,
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(consistentUrl);
expect(canLink).toBe(true);  // Should allow
```

**Expected Result:**
- `canLink` returns `true`
- No console warnings

**Pass Criteria:** ✓ Guard allows linking to clean state

---

### Test 1.3: linkUrlToExistingZoteroItem() - Guard Check Integration

**Objective:** Verify function respects canLinkToItem guard

**Setup:**
```typescript
const urlId = 123;
const itemKey = 'DEF456';
// URL has broken state (linking attempt should fail)
```

**Test:**
```typescript
const result = await linkUrlToExistingZoteroItem(urlId, itemKey);
expect(result.success).toBe(false);
expect(result.error).toContain('inconsistent');
```

**Expected Result:**
- `success` is `false`
- Error message indicates state inconsistency
- No database modifications

**Pass Criteria:** ✓ Function respects guard

---

### Test 1.4: linkUrlToExistingZoteroItem() - Successful Linking

**Objective:** Verify successful linking with clean state

**Setup:**
```typescript
const urlId = 124;
const itemKey = 'GHI789';
// URL in 'not_started' state (clean)
// Item exists in Zotero
```

**Test:**
```typescript
const result = await linkUrlToExistingZoteroItem(urlId, itemKey);
expect(result.success).toBe(true);
expect(result.itemKey).toBe(itemKey);
```

**Expected Result:**
- `success` is `true`
- Returned `itemKey` matches input
- Database updated with:
  - `zoteroItemKey` set to `itemKey`
  - `processingStatus` set to `'stored_custom'`
  - `zoteroProcessingStatus` set to `'stored_custom'`
  - Link record created
  - Citation validation performed

**Pass Criteria:** ✓ Successful linking with proper state sync

---

### Test 1.5: linkUrlToExistingZoteroItem() - Item Not Found

**Objective:** Verify error handling when item doesn't exist

**Setup:**
```typescript
const urlId = 125;
const itemKey = 'INVALID_KEY_THAT_DOESNT_EXIST';
// URL in clean state, but item doesn't exist in Zotero
```

**Test:**
```typescript
const result = await linkUrlToExistingZoteroItem(urlId, itemKey);
expect(result.success).toBe(false);
expect(result.error).toContain('not found');
```

**Expected Result:**
- `success` is `false`
- Error mentions item not found
- No database modifications

**Pass Criteria:** ✓ Proper error handling for missing items

---

### Test 1.6: unlinkUrlFromZotero() - Consistency Check

**Objective:** Verify guard blocks unlinking when state is broken

**Setup:**
```typescript
const urlId = 126;
// URL in broken state (e.g., archived but still has item)
```

**Test:**
```typescript
const result = await unlinkUrlFromZotero(urlId);
expect(result.success).toBe(false);
expect(result.consistencyIssues?.length).toBeGreaterThan(0);
```

**Expected Result:**
- `success` is `false`
- `consistencyIssues` array contains issue descriptions
- `repairSuggestion` included in response
- No database modifications

**Pass Criteria:** ✓ Unlinking blocked with repair suggestion

---

### Test 1.7: unlinkUrlFromZotero() - Successful Unlinking

**Objective:** Verify successful unlinking with clean state

**Setup:**
```typescript
const urlId = 127;
// URL in 'stored_custom' state with zoteroItemKey set
```

**Test:**
```typescript
const result = await unlinkUrlFromZotero(urlId);
expect(result.success).toBe(true);
expect(result.newStatus).toBe('not_started');
```

**Expected Result:**
- `success` is `true`
- `newStatus` is `'not_started'`
- Database updated with:
  - `zoteroItemKey` cleared (null)
  - `processingStatus` set to `'not_started'`
  - `zoteroProcessingStatus` cleared (null)
  - Link record deleted
  - Zotero fields cleared

**Pass Criteria:** ✓ Successful unlinking with state reset

---

## Integration Tests

### Test 2.1: Link + Unlink Cycle

**Objective:** Verify complete link → unlink cycle maintains consistency

**Procedure:**
1. Start with URL in 'not_started' state
2. Link to valid Zotero item
3. Verify state is 'stored_custom'
4. Unlink from Zotero item
5. Verify state returned to 'not_started'

**Expected Result:**
- All transitions succeed
- State remains consistent throughout
- Data properly created and removed

**Pass Criteria:** ✓ Complete cycle works correctly

---

### Test 2.2: Repair Then Link

**Objective:** Verify Phase 1 repair enables Phase 2 linking

**Procedure:**
1. Create URL with broken state (e.g., linked_but_not_stored)
2. Attempt to link → should fail with repair suggestion
3. Use Phase 1 `repairUrlStateIntegrity()` to fix state
4. Attempt to link → should now succeed

**Expected Result:**
- First link attempt fails appropriately
- Repair succeeds
- Second link attempt succeeds
- Final state is consistent

**Pass Criteria:** ✓ Repair path works end-to-end

---

### Test 2.3: Phase 1 Detection After Phase 2 Operations

**Objective:** Verify Phase 1 detection sees clean state after Phase 2 operations

**Procedure:**
1. Link URL using `linkUrlToExistingZoteroItem()`
2. Run `getStateIntegrityReport()` from Phase 1
3. Check that linked URL is in healthy state
4. Unlink using `unlinkUrlFromZotero()`
5. Run report again
6. Verify no issues

**Expected Result:**
- After linking: No inconsistencies detected
- After unlinking: No inconsistencies detected
- Both operations create clean state

**Pass Criteria:** ✓ Phase 1 and 2 maintain consistency

---

## Edge Case Tests

### Test 3.1: Linking to Archived URL

**Objective:** Verify cannot link to archived URLs

**Setup:**
```typescript
const archiveUrl: UrlForGuardCheck = {
  userIntent: 'archive',
  processingStatus: 'archived',
  zoteroItemKey: null,
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(archiveUrl);
expect(canLink).toBe(false);
```

**Pass Criteria:** ✓ Guard blocks linking to archived URLs

---

### Test 3.2: Linking to Ignored URL

**Objective:** Verify cannot link to ignored URLs

**Setup:**
```typescript
const ignoredUrl: UrlForGuardCheck = {
  userIntent: 'ignore',
  processingStatus: 'ignored',
  zoteroItemKey: null,
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(ignoredUrl);
expect(canLink).toBe(false);
```

**Pass Criteria:** ✓ Guard blocks linking to ignored URLs

---

### Test 3.3: Linking While Processing

**Objective:** Verify cannot link while URL is being processed

**Setup:**
```typescript
const processingUrl: UrlForGuardCheck = {
  processingStatus: 'processing_zotero',
  zoteroItemKey: null,
  userIntent: 'auto',
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(processingUrl);
expect(canLink).toBe(false);
```

**Pass Criteria:** ✓ Guard blocks linking during active processing

---

### Test 3.4: Unlinking Non-Linked URL

**Objective:** Verify error when unlinking URL without item

**Setup:**
```typescript
const notLinkedUrl = 128;  // URL with zoteroItemKey = null
```

**Test:**
```typescript
const result = await unlinkUrlFromZotero(notLinkedUrl);
expect(result.success).toBe(false);
expect(result.error).toContain('not linked');
```

**Pass Criteria:** ✓ Proper error for unlinking non-linked URLs

---

### Test 3.5: Double Link Prevention

**Objective:** Verify cannot link URL that already has item

**Setup:**
```typescript
const linkedUrl: UrlForGuardCheck = {
  processingStatus: 'stored_custom',
  zoteroItemKey: 'ABC123',
  userIntent: 'auto',
};
```

**Test:**
```typescript
const canLink = StateGuards.canLinkToItem(linkedUrl);
expect(canLink).toBe(false);
```

**Pass Criteria:** ✓ Guard prevents double-linking

---

## State Verification Tests

### Test 4.1: Dual State Synchronization After Link

**Objective:** Verify both state systems stay synchronized

**Procedure:**
1. Link URL to item
2. Read database record directly
3. Verify both `processingStatus` AND `zoteroProcessingStatus` are set

**Expected Result:**
```typescript
const record = // fetch from database
expect(record.processingStatus).toBe('stored_custom');
expect(record.zoteroProcessingStatus).toBe('stored_custom');
```

**Pass Criteria:** ✓ Both state fields synchronized

---

### Test 4.2: Dual State Synchronization After Unlink

**Objective:** Verify both state systems cleared after unlink

**Procedure:**
1. Start with linked URL
2. Unlink from Zotero
3. Read database record directly
4. Verify both state fields cleared/reset

**Expected Result:**
```typescript
const record = // fetch from database
expect(record.processingStatus).toBe('not_started');
expect(record.zoteroProcessingStatus).toBeNull();
```

**Pass Criteria:** ✓ Both state fields properly reset

---

### Test 4.3: Link Record Creation

**Objective:** Verify link records created correctly

**Procedure:**
1. Link URL to item
2. Query `zoteroItemLinks` table
3. Verify record exists with correct fields

**Expected Result:**
```typescript
const linkRecord = // query from zoteroItemLinks
expect(linkRecord.urlId).toBe(urlId);
expect(linkRecord.itemKey).toBe(itemKey);
expect(linkRecord.linkedAt).toBeDefined();
```

**Pass Criteria:** ✓ Link records created properly

---

### Test 4.4: Link Record Deletion

**Objective:** Verify link records deleted after unlink

**Procedure:**
1. Start with linked URL (link record exists)
2. Unlink from Zotero
3. Query `zoteroItemLinks` for that URL
4. Verify record is gone

**Expected Result:**
```typescript
const linkRecord = // query from zoteroItemLinks
expect(linkRecord).toBeUndefined();
```

**Pass Criteria:** ✓ Link records deleted properly

---

### Test 4.5: Linked URL Count Update

**Objective:** Verify linked_url_count stays accurate

**Procedure:**
1. Create Zotero item in test data
2. Link multiple URLs (3) to same item
3. Verify each URL shows `linkedUrlCount: 3`
4. Unlink one URL
5. Verify remaining URLs show `linkedUrlCount: 2`

**Expected Result:**
- Count accurate after each operation
- No orphaned counts
- Properly reflects current state

**Pass Criteria:** ✓ Count updates correctly

---

## Automated Test Script

### Example Test Suite

```typescript
describe('Phase 2: Transaction-Safe Linking', () => {
  describe('StateGuards.canLinkToItem()', () => {
    it('blocks linking to inconsistent state', () => {
      const url = createInconsistentUrl();
      expect(StateGuards.canLinkToItem(url)).toBe(false);
    });

    it('allows linking to consistent state', () => {
      const url = createConsistentUrl();
      expect(StateGuards.canLinkToItem(url)).toBe(true);
    });
  });

  describe('linkUrlToExistingZoteroItem()', () => {
    it('respects guard checks', async () => {
      const urlId = 1; // inconsistent
      const result = await linkUrlToExistingZoteroItem(urlId, 'ABC123');
      expect(result.success).toBe(false);
    });

    it('links successfully to clean state', async () => {
      const urlId = 2; // clean state
      const result = await linkUrlToExistingZoteroItem(urlId, 'DEF456');
      expect(result.success).toBe(true);
    });

    it('synchronizes dual state', async () => {
      const urlId = 3;
      await linkUrlToExistingZoteroItem(urlId, 'GHI789');
      const record = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
      expect(record.processingStatus).toBe('stored_custom');
      expect(record.zoteroProcessingStatus).toBe('stored_custom');
    });
  });

  describe('unlinkUrlFromZotero()', () => {
    it('blocks unlinking broken state', async () => {
      const urlId = 4; // broken state
      const result = await unlinkUrlFromZotero(urlId);
      expect(result.success).toBe(false);
      expect(result.consistencyIssues).toBeDefined();
    });

    it('unlinks successfully from clean state', async () => {
      const urlId = 5; // linked, clean state
      const result = await unlinkUrlFromZotero(urlId);
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('not_started');
    });

    it('clears dual state on unlink', async () => {
      const urlId = 6;
      await unlinkUrlFromZotero(urlId);
      const record = await db.query.urls.findFirst({ where: eq(urls.id, urlId) });
      expect(record.processingStatus).toBe('not_started');
      expect(record.zoteroProcessingStatus).toBeNull();
    });
  });
});
```

---

## Test Data Setup

### Required Test Fixtures

```typescript
// Clean URL (safe to link)
{
  id: 1,
  processingStatus: 'not_started',
  zoteroItemKey: null,
  zoteroProcessingStatus: null,
  userIntent: 'auto',
}

// Broken URL (linked but wrong status)
{
  id: 2,
  processingStatus: 'processing_zotero',
  zoteroItemKey: 'ABC123',
  zoteroProcessingStatus: 'processing_zotero',
  userIntent: 'auto',
}

// Linked URL (clean, can unlink)
{
  id: 3,
  processingStatus: 'stored_custom',
  zoteroItemKey: 'DEF456',
  zoteroProcessingStatus: 'stored_custom',
  userIntent: 'auto',
}

// Archived URL (cannot link)
{
  id: 4,
  processingStatus: 'archived',
  zoteroItemKey: null,
  zoteroProcessingStatus: null,
  userIntent: 'archive',
}
```

---

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Unit | 7 | Ready |
| Integration | 3 | Ready |
| Edge Cases | 5 | Ready |
| State Verification | 5 | Ready |
| **Total** | **20** | **Ready** |

---

## Success Criteria

Phase 2 testing is successful when:

✅ **All unit tests pass**
- Guard checks work correctly
- Linking succeeds on clean state
- Unlinking succeeds on clean state
- Error messages are clear

✅ **All integration tests pass**
- Complete cycles work end-to-end
- Phase 1 and 2 work together
- No inconsistencies remain

✅ **All edge cases pass**
- Proper rejections
- Clear error messages
- No silent failures

✅ **State verification passes**
- Dual system stays synchronized
- Records created/deleted correctly
- Counts accurate

---

## Testing Timeline

- **Unit Tests:** 1-2 hours
- **Integration Tests:** 1-2 hours
- **Edge Case Tests:** 1 hour
- **State Verification:** 1 hour
- **Total:** 4-6 hours

---

## Sign-Off

Phase 2 testing complete when all 20 tests pass with no failures.

---

**Status:** Ready for Testing
**Date:** December 2, 2024
