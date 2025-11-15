# Testing Guide - Refactored URL Processing System

**Purpose:** How to test all new features  
**Duration:** ~1 week of testing  
**Status:** Ready to test!

---

## 🚀 Quick Start (5 minutes)

### 1. Start the Application

```bash
cd dashboard
pnpm dev
```

Application starts at: **http://localhost:3000**

### 2. Available Routes

| Route | Description | What to Test |
|-------|-------------|--------------|
| **http://localhost:3000/urls/new** | **New System** ⭐ | All refactored features |
| **http://localhost:3000/urls** | Old System | Comparison/backward compat |
| **http://localhost:3000/analytics** | Analytics Dashboard | Charts and export |
| **http://localhost:3000** | Main Dashboard | Overall navigation |

---

## 🎯 Testing the New System

### Step 1: Open New URL Management

**URL:** http://localhost:3000/urls/new

**What You'll See:**
- ✅ URL table with new status badges (12 types)
- ✅ Enhanced filters (processing status, user intent, attempts)
- ✅ Bulk actions bar (when URLs selected)
- ✅ Processing status with animations
- ✅ Capability indicators
- ✅ Intent badges

### Step 2: Test Filters

**Location:** Top of page - Filter panel

**Test:**
1. ✅ Search by URL text
2. ✅ Filter by Processing Status (dropdown)
3. ✅ Filter by User Intent (dropdown)
4. ✅ Filter by Section
5. ✅ Filter by Domain
6. ✅ Filter by Citation Status
7. ✅ Filter by Processing Attempts (min/max)
8. ✅ Click "Apply Filters"
9. ✅ Click "Clear All"
10. ✅ Verify filter chips appear with active filters

**Expected:** Table updates, active filter count shows

### Step 3: Test Selection

**Location:** Table checkboxes

**Test:**
1. ✅ Click checkbox to select individual URL
2. ✅ Click header checkbox to select all
3. ✅ Bulk actions bar appears
4. ✅ Selection count displays correctly

**Expected:** Bulk actions bar shows: "X URLs selected"

### Step 4: Test Single URL Processing

**Location:** Click "Process" button on any URL with status "Not Started"

**Test:**
1. ✅ Click "Process" on a URL with identifiers
2. ✅ Watch status change (with animation)
3. ✅ If successful: Status → "Stored"
4. ✅ If failed: Should auto-cascade to content extraction
5. ✅ Open detail panel (click the URL row)
6. ✅ Check processing history section

**Expected:** Processing completes, history recorded

### Step 5: Test Batch Processing

**Location:** Select multiple URLs, click "Process" in bulk actions

**Test:**
1. ✅ Select 5-10 URLs
2. ✅ Click "Process" in bulk actions bar
3. ✅ Confirm in dialog
4. ✅ Watch progress (would show in processing modal if implemented)
5. ✅ Wait for completion
6. ✅ Verify all processed

**Expected:** All URLs process, some succeed, some may cascade

### Step 6: Test Detail Panel

**Location:** Click any URL row to open

**Test:**
1. ✅ Panel opens on right side
2. ✅ See new sections:
   - Status Summary (status, intent selector, attempts)
   - Capabilities (available methods)
   - Quick Actions (context-aware buttons)
   - Processing History (timeline if attempts > 0)
3. ✅ Change user intent (dropdown)
4. ✅ Click quick actions
5. ✅ Close panel (X button)

**Expected:** All sections display correctly

### Step 7: Test Smart Suggestions

**Location:** Detail panel - Suggestions section

**Test:**
1. ✅ Find URL with incomplete citation (stored_incomplete)
2. ✅ Open detail panel
3. ✅ See suggestion: "Citation is missing critical fields"
4. ✅ Click "Edit Citation" action button

**Note:** Modal will open (if wired) or show TODO

**Expected:** Suggestions appear based on URL state

### Step 8: Test Modals (When Wired)

**Modals to Test:**

1. **Manual Creation Modal**
   - URL with status: exhausted
   - Click "Create Manually"
   - Should open modal with content viewer + form

2. **Edit Citation Modal**
   - URL with status: stored_incomplete
   - Click "Edit Citation"
   - Should open modal with citation preview + editor

3. **Identifier Selection Modal**
   - URL with status: awaiting_selection
   - Click "Select Identifier"
   - Should show list of identifiers

4. **Processing History Modal**
   - URL with processingAttempts > 0
   - Click "View History"
   - Should show complete timeline

**Current Status:** Modals exist but need wiring in URLTableNew

### Step 9: Test Analytics Dashboard

**URL:** http://localhost:3000/analytics

**Test:**
1. ✅ Page loads
2. ✅ Key metrics cards display (Total, Success Rate, Avg Attempts, Stored)
3. ✅ Status distribution chart shows
4. ✅ Intent distribution shows
5. ✅ Attempt distribution shows
6. ✅ Citation quality shows
7. ✅ Click "Export JSON"
8. ✅ Click "Export CSV"
9. ✅ Files download correctly

**Expected:** Charts display, exports work

### Step 10: Test Keyboard Shortcuts

**Location:** Anywhere in /urls/new page

**Test:**
1. ✅ Select some URLs
2. ✅ Press `p` → Should trigger process
3. ✅ Press `i` → Should trigger ignore
4. ✅ Press `a` → Should trigger archive
5. ✅ Press `?` → Should show shortcuts help
6. ✅ Press `Escape` → Should clear selection
7. ✅ Press `Cmd/Ctrl + A` → Should select all

**Current Status:** Hook exists, needs wiring in URLTableNew

---

## 🔧 Integration Status

### ✅ What Works Now (Can Test Immediately)

**Routes Created:**
- ✅ `/urls/new` - New system (URLTableNew)
- ✅ `/analytics` - Analytics dashboard

**Components Working:**
- ✅ URLTableNew - Table with filters
- ✅ Status badges - All 12 types
- ✅ Filters - All filter types
- ✅ Bulk actions - Selection and actions
- ✅ Detail panel sections - Status, capabilities, history
- ✅ Analytics - Charts and export

### ⚠️ What Needs Wiring (5 minute fix each)

**In URLTableNew.tsx:**
1. Modal state management (add useState for each modal)
2. Modal trigger handlers (wire TODO comments)
3. Keyboard shortcuts (add useKeyboardShortcuts hook)
4. Smart suggestions (add to detail panel)

**Estimated Time:** 30 minutes to wire everything up

---

## 📝 Quick Integration Steps

### Option 1: Test What Works Now (Recommended)

**You can test immediately:**
1. ✅ Go to http://localhost:3000/urls/new
2. ✅ Test filters, selection, bulk actions
3. ✅ Test detail panel (status, capabilities, history)
4. ✅ Test processing single URLs
5. ✅ Go to http://localhost:3000/analytics
6. ✅ Test analytics and export

**This covers ~70% of features!**

### Option 2: Wire Up Modals (30 minutes)

I can provide the exact code to add to URLTableNew.tsx to wire up all modals and make everything testable.

### Option 3: Switch Main Route (5 minutes)

Replace old system with new in main `/urls` route.

---

## 🎯 What to Test First (Priority Order)

### Priority 1: Core Features (Work Now) ✅

1. **New URL Table** - http://localhost:3000/urls/new
   - Displays URLs with new status badges
   - Filters work
   - Selection works
   - Detail panel opens
   - Processing history shows (if URL has attempts)

2. **Analytics Dashboard** - http://localhost:3000/analytics
   - Charts display
   - Export works

### Priority 2: Processing Workflows

**Test in /urls/new:**
1. Click "Process" on a single URL
2. Watch it process (delegates to existing zotero actions)
3. Check status changes
4. Verify history recorded

### Priority 3: Modals (Need Wiring)

Would you like me to:
1. **Wire up all the modals now** (30 min) so you can test everything?
2. **Provide integration code** for you to add?
3. **Create a complete wired version** of URLTableNew?

---

## 🔍 Verification Checklist

### Can Test Right Now ✅

- [ ] Open /urls/new
- [ ] See URLs with new status badges
- [ ] Filter by processing status
- [ ] Select URLs
- [ ] See bulk actions bar
- [ ] Click URL to open detail panel
- [ ] See status summary, capabilities, quick actions
- [ ] See processing history (if URL has attempts)
- [ ] Open /analytics
- [ ] See charts and metrics
- [ ] Export to JSON/CSV

### Needs Modal Wiring ⚠️

- [ ] Manual creation modal
- [ ] Edit citation modal
- [ ] Identifier selection modal
- [ ] Metadata approval modal
- [ ] Processing history modal (full view)
- [ ] Keyboard shortcuts

---

## 💡 Recommended Testing Path

### Path 1: Quick Test (30 minutes)

1. Start app: `pnpm dev`
2. Open: http://localhost:3000/urls/new
3. Test filters, selection, basic viewing
4. Open: http://localhost:3000/analytics
5. Test analytics and export
6. ✅ Verify core functionality works

### Path 2: Full Test (2 hours - after wiring)

1. Wire up modals in URLTableNew
2. Test all workflows from REFACTOR_FINAL_SUMMARY.md
3. Test all modals
4. Test keyboard shortcuts
5. ✅ Complete feature testing

---

## 🚀 **Quick Answer to Your Question**

**How to test NOW:**

```bash
# 1. Start app
pnpm dev

# 2. Open in browser:
http://localhost:3000/urls/new    # New system!
http://localhost:3000/analytics   # Analytics!

# 3. Test what works:
# - Filters
# - Selection
# - Detail panel
# - Processing (uses existing actions)
# - Analytics and export
```

**What needs wiring for full testing:**
- Modals (I can do this in 30 min if you want)
- Keyboard shortcuts
- Smart suggestions in detail panel

**Would you like me to wire up the modals now so you can test everything?** 🚀

---

**Status:** Routes created, ~70% testable now  
**Missing:** Modal triggers (30 min to add)  
**Recommendation:** Test what works now, then I'll wire modals  

Let me know if you want me to complete the modal wiring! 💪

