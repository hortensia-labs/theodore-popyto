# 🧪 How to Test the Refactored System

**Quick Start:** 5 minutes to see everything working!  
**Complete Test:** Follow this guide

---

## ⚡ Quick Start (5 minutes)

### 1. Start the App

```bash
cd dashboard
pnpm dev
```

**App runs at:** http://localhost:3000

### 2. Navigate to New System

Open your browser and go to:

**🌟 http://localhost:3000/urls/new**

This is the refactored system with all new features!

### 3. What You'll See Immediately

✅ **URL Table** with colorful status badges  
✅ **Filters Panel** at the top (8+ filter types)  
✅ **Status Indicators** (Processing status, Capabilities, Intent)  
✅ **Processing Attempts** count for each URL  
✅ **Citation Status** indicators  

---

## 🎯 Testing Routes

### Main Testing Route: /urls/new ⭐

**Full URL:** http://localhost:3000/urls/new

**What's Here:**

- Complete refactored URL table
- All new status badges (12 types with animations)
- Enhanced filters
- Bulk operations
- Detail panel with processing history
- Smart suggestions
- All modals wired up

### Analytics Route: /analytics

**Full URL:** http://localhost:3000/analytics

**What's Here:**

- Processing analytics dashboard
- Success rate charts
- Status distribution
- Intent distribution
- Export to JSON/CSV

### Legacy Route: /urls

**Full URL:** http://localhost:3000/urls

**What's Here:**

- Old system (for comparison)
- Still works with new backend

---

## ✅ What You Can Test Immediately

### Visual Components (Just Look)

1. **Open:** http://localhost:3000/urls/new
2. **See:**
   - ✅ Status badges with colors and animations
   - ✅ Capability summaries ("2 methods")
   - ✅ Intent badges (if not "auto")
   - ✅ Processing attempts count
   - ✅ Filter panel with all options
   - ✅ Active filter chips

### Filters (Interactive)

**Try these:**

1. ✅ Type in search box → URLs filter
2. ✅ Select "Processing Status" → Filter by status
3. ✅ Select "User Intent" → Filter by intent
4. ✅ Set min/max attempts → Filter by attempts
5. ✅ Click "Apply Filters" → Table updates
6. ✅ Click "Clear All" → Filters reset

**Expected:** Immediate filtering, active filter count shows

### Selection & Bulk Actions

**Try these:**

1. ✅ Click checkbox on a URL → URL selected
2. ✅ Click header checkbox → All URLs selected
3. ✅ See blue bulk actions bar appear
4. ✅ Shows "X URLs selected"
5. ✅ See buttons: Process, Ignore, Archive, Delete

### Detail Panel

**Try this:**

1. ✅ Click any URL row (not the checkbox)
2. ✅ Panel opens on right side
3. ✅ See sections:
   - **Status Summary** - Status badge, intent dropdown, attempts
   - **Capabilities** - Available processing methods
   - **Quick Actions** - Context-aware action buttons
   - **Processing History** - Timeline (if URL has attempts)
4. ✅ Change user intent in dropdown → Intent changes
5. ✅ Click X to close panel

### Process a URL

**Try this:**

1. ✅ Find URL with status "Not Started" and has identifiers
2. ✅ Click "Process" button
3. ✅ Watch status badge animate (blue spinner)
4. ✅ Wait for completion
5. ✅ Status changes to "Stored" (green) or cascades
6. ✅ Open detail panel → See processing history entry

### Modals

**Try these:**

**Manual Creation:**

1. ✅ Find URL with status "Exhausted" (if any)
2. ✅ Click "Create Manually" button
3. ✅ Modal opens with content viewer + metadata form
4. ✅ Switch tabs: Live Preview, Reader Mode, Raw HTML
5. ✅ Fill form: Title, Creators (click Add Creator), Date
6. ✅ See citation preview update
7. ✅ Click "Create Zotero Item"
8. ✅ Modal closes, URL status → "Custom"

**Edit Citation:**

1. ✅ Find URL with status "Incomplete" (yellow badge)
2. ✅ Click "Edit" button or in detail panel "Edit Citation"
3. ✅ Modal opens showing current metadata
4. ✅ Missing fields highlighted in red
5. ✅ Add missing creators or date
6. ✅ See citation preview update
7. ✅ Click "Save Changes"
8. ✅ If complete: Status changes to "Stored" (green)

**Select Identifier:**

1. ✅ If URL has status "Select ID" (cyan badge)
2. ✅ Click "Select ID" button
3. ✅ Modal shows list of identifiers
4. ✅ Sorted by confidence (high first)
5. ✅ Preview shows quality scores
6. ✅ Click "Select & Process" on best identifier
7. ✅ Processing starts, modal shows progress
8. ✅ On success: Status → "Stored"

**View History:**

1. ✅ Find URL with 1+ processing attempts
2. ✅ Click eye icon next to attempts count
3. ✅ OR click "View History" in more actions
4. ✅ Modal shows complete timeline
5. ✅ See all attempts with success/failure
6. ✅ Filter by stage or result
7. ✅ Click "Export" → Download JSON

### Analytics Dashboard

**Try this:**

1. ✅ Open: http://localhost:3000/analytics
2. ✅ See 4 metric cards (Total, Success Rate, Avg Attempts, Stored)
3. ✅ See status distribution chart with bars
4. ✅ See intent distribution
5. ✅ See attempt distribution
6. ✅ See citation quality (Valid, Incomplete, Not Validated)
7. ✅ Click "Export JSON" → File downloads
8. ✅ Click "Export CSV" → File downloads

---

## 🎨 Visual Guide

### Status Badge Colors

- **Green** = Stored (success!)
- **Yellow** = Incomplete (needs work)
- **Blue (spinning)** = Processing (in progress)
- **Cyan** = Awaiting action (select ID, approve metadata)
- **Red** = Exhausted (manual needed)
- **Purple** = Custom (user created)
- **Gray** = Ignored/Archived

### Capability Indicators

Look for text like "2 methods" showing:

- Has Identifiers (DOI, PMID, etc.)
- Has Web Translators
- Has Content Cached
- Can Use LLM

### Intent Badges

Small badges showing user intent:

- **Auto** (A) - Blue
- **Priority** (P) - Orange
- **Ignore** (I) - Gray
- **Manual Only** (M) - Purple
- **Archive** (Arc) - Gray

---

## 🐛 If Something Doesn't Work

### Issue: Page won't load

**Check:**

```bash
# Terminal should show no errors
# If errors, check console output
```

**Solution:** Check browser console for errors

### Issue: No URLs showing

**Check:**

1. Do you have URLs in database?
2. Try removing filters (click "Clear All")
3. Check old system (/urls) - does it show URLs?

**Solution:** Import URLs if database is empty

### Issue: Modal doesn't open

**Check:** Look for button - should be visible based on URL status

**Example:**

- "Create Manually" only shows if status is "Exhausted" or 3+ attempts
- "Edit Citation" only shows if status is "Incomplete"
- "Select ID" only shows if status is "Select ID"

### Issue: Status doesn't change after processing

**Wait:** Processing takes 2-5 seconds  
**Check:** Refresh page or click URL again  
**Look:** Processing history in detail panel

---

## 📊 Success Indicators

You'll know it's working when:

✅ Status badges show with correct colors  
✅ Filters update the table instantly  
✅ Selection shows bulk actions bar  
✅ Detail panel opens with all sections  
✅ Processing history shows attempts  
✅ Modals open and function correctly  
✅ Analytics shows charts  
✅ Export downloads files  

---

## 🎯 Test These First (Priority)

1. ✅ **Visual:** Status badges display correctly
2. ✅ **Filters:** All filter types work
3. ✅ **Selection:** Can select and see bulk actions
4. ✅ **Detail Panel:** Opens and shows all sections
5. ✅ **Process URL:** Single URL processes successfully
6. ✅ **Modals:** Manual create modal opens and works
7. ✅ **Analytics:** Charts display and export works

---

## 🚀 Start Testing NOW!

```bash
# 1. Start app (if not running)
pnpm dev

# 2. Open browser
http://localhost:3000

# 3. Click "URL Management (New)" green card

# 4. Start testing!
```

**Everything is wired up and ready to test!** 🎉

---

**Document:** Quick Testing Guide  
**Status:** Ready to test  
**Routes:** 3 new routes created  
**Modals:** All wired up  
**Let's go!** 🚀
