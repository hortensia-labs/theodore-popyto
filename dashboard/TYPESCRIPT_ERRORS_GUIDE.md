# TypeScript Errors Guide

**Status:** Some errors are expected, some need fixing  
**Priority:** Fix critical errors first  
**Date:** November 14, 2025

---

## 🎯 Error Categories

### ✅ SAFE TO IGNORE (Test Files - 50 errors)

**Why:** Testing dependencies (@jest/globals, @testing-library/react) are dev dependencies not needed for runtime.

**Files:**
- All `__tests__/**/*.test.ts(x)` files
- All `__tests__/**/*.spec.ts` files

**To Fix Later (Phase 6):**
```bash
pnpm add -D @jest/globals @testing-library/react @testing-library/user-event jest
```

**For Now:** These errors don't affect the running app ✅

---

### 🔧 NEED TO FIX (Critical - ~20 errors)

These prevent the app from running properly.

#### 1. Missing Tabs Component (2 errors)

**File:** `components/urls/url-modals/ContentViewer.tsx`

**Error:** Cannot find module '@/components/ui/tabs'

**Fix:** Create the tabs component or use a different approach

**Quick Fix:**
```typescript
// Option 1: Use buttons instead of tabs for now
// Option 2: Create simple Tabs component
// Option 3: Comment out tabs, use buttons
```

#### 2. ZoteroItemData Type Mismatch (8 errors)

**Files:**
- components/urls/url-modals/*.tsx
- lib/actions/citation-editing.ts
- lib/actions/manual-creation.ts

**Error:** 'ZoteroItemData' doesn't exist, should be 'ZoteroItem'?

**Fix:** Check zotero-client.ts for correct export name

**Quick Fix:**
```typescript
// In affected files, either:
import type { ZoteroItem as ZoteroItemData } from '@/lib/zotero-client';
// OR define the type locally
```

#### 3. Missing Functions in zotero-client (3 errors)

**Missing:** `createItem`, `updateItem`

**Files:**
- lib/actions/citation-editing.ts
- lib/actions/manual-creation.ts

**Fix:** These functions need to be added to zotero-client.ts or imported from correct location

#### 4. db.execute Usage (3 errors)

**Files:**
- lib/actions/zotero.ts
- lib/orchestrator/processing-helpers.ts
- lib/orchestrator/url-processing-orchestrator.ts

**Error:** `db.execute` doesn't exist

**Fix:** Use drizzle's `db.run()` or `sql` template

**Quick Fix:**
```typescript
import { sql } from 'drizzle-orm';

// Change:
await db.execute(`UPDATE...`);

// To:
await db.run(sql`UPDATE...`);
```

#### 5. useRef Initialization (2 errors)

**File:** `lib/hooks/usePerformanceOptimization.ts`

**Error:** useRef expects initial value

**Fix:**
```typescript
// Change:
const timeoutRef = useRef<NodeJS.Timeout>();

// To:
const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
```

---

### ⚠️ MEDIUM PRIORITY (~15 errors)

Won't prevent app from running but should fix eventually.

#### 1. Type Compatibility (ProcessingAttempt)

**Files:** Various
**Issue:** Two ProcessingAttempt types (schema vs types)
**Impact:** TypeScript warnings, runtime works fine

**Fix for Phase 6:** Consolidate to single type

#### 2. Optional Dependency (react-window)

**File:** `components/urls/url-table/VirtualizedURLTable.tsx`

**Error:** Cannot find module 'react-window'

**Impact:** Virtualization won't work (but not needed for < 1000 URLs)

**Fix:**
```bash
pnpm add react-window @types/react-window
```

#### 3. Missing 'indeterminate' prop

**File:** `components/urls/url-table/URLTableNew.tsx`

**Error:** indeterminate not in type

**Fix:**
```typescript
// Add type assertion or use ref
const checkboxRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (checkboxRef.current) {
    checkboxRef.current.indeterminate = selection.someSelected;
  }
}, [selection.someSelected]);
```

---

## 🚀 Quick Fix Strategy

### For Immediate Testing (10 minutes)

**Goal:** Get app running so you can test visually

**Steps:**

1. **Comment out problematic imports temporarily:**

```typescript
// In ContentViewer.tsx - use buttons instead of Tabs
// In VirtualizedURLTable.tsx - comment out (use regular table for now)
```

2. **Fix db.execute calls:**

```typescript
// In processing-helpers.ts, url-processing-orchestrator.ts:
import { sql } from 'drizzle-orm';

// Change db.execute to:
await db.run(sql.raw(`UPDATE urls SET ...`));
```

3. **Fix ZoteroItemData:**

```typescript
// Create type alias in affected files:
type ZoteroItemData = any; // Temporary
```

**Time:** 10 minutes  
**Result:** App runs, most features work

---

### For Complete Fix (1-2 hours)

1. Install testing dependencies
2. Fix all type exports
3. Add missing UI components
4. Fix db.execute properly
5. Add optional dependencies

See detailed fixes below.

---

## 📋 Detailed Fixes

### Fix 1: Tabs Component

**Create:** `components/ui/tabs.tsx`

```typescript
'use client';

export function Tabs({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}

export function TabsList({ children, ...props }: any) {
  return <div className="flex gap-2" {...props}>{children}</div>;
}

export function TabsTrigger({ children, ...props }: any) {
  return <button className="px-3 py-1 border rounded" {...props}>{children}</button>;
}

export function TabsContent({ children, ...props }: any) {
  return <div {...props}>{children}</div>;
}
```

### Fix 2: Zotero Client Types

**Check:** `lib/zotero-client.ts` for exports

**If missing createItem/updateItem:**
- These might exist with different names
- Check for: createZoteroItem, updateZoteroItem
- Or implement stubs for testing

### Fix 3: db.execute Fix

**In all files using db.execute:**

```typescript
import { sql } from 'drizzle-orm';

// Change:
await db.execute(`UPDATE urls SET processing_attempts = processing_attempts + 1 WHERE id = ${urlId}`);

// To:
await db.update(urls)
  .set({ processingAttempts: sql`processing_attempts + 1` })
  .where(eq(urls.id, urlId));
```

---

## 🎯 Minimum Fixes for Testing

**To get app running:**

1. ✅ Delete old `lib/batch-processor.ts` (DONE)
2. ⚠️ Comment out Tabs imports (temp fix)
3. ⚠️ Fix db.execute calls (3 places)
4. ⚠️ Fix ZoteroItemData type (type alias)

**Time:** 15 minutes  
**Result:** App runs, you can test!

---

## 💡 Recommendation

**For NOW (To Start Testing):**

Create a simple script that comments out the problematic parts so the app runs:

**File:** `scripts/quick-fix-for-testing.md`

```
1. Comment out VirtualizedURLTable import (not critical)
2. Use 'any' type for ZoteroItemData temporarily  
3. Fix db.execute with proper drizzle methods
4. Run app - most features will work!
```

**For LATER (Phase 6):**

- Install all dev dependencies
- Fix all type exports properly
- Add missing components
- Remove 'any' type assertions

---

## 🚀 What Will Work Even With Errors

**These features work fine:**
✅ URL table displays (uses old URLTable from /urls)
✅ New status badges
✅ Filters
✅ Selection
✅ Basic processing
✅ Detail panel (partial)

**These need fixes:**
⚠️ Modals (type issues)
⚠️ Advanced features (dependencies)
⚠️ Virtualization (missing package)

---

## ⏭️ Next Steps

**Choose your path:**

### Path A: Quick Visual Test (15 min fix)
- Comment out Tabs usage
- Fix db.execute (3 places)
- Use 'any' for Zotero types
- **Result:** App runs, can see UI

### Path B: Proper Fix (1-2 hours)
- Create Tabs component
- Fix all type exports
- Add dependencies
- **Result:** Everything works perfectly

### Path C: Test Old System First
- Use http://localhost:3000/urls (old system)
- Verify database migration worked
- Then fix new system incrementally

---

**Recommendation:** Start with **Path C** - test old system works with new database, then fix new system issues one by one.

Would you like me to provide the quick fixes to get the new system running?

