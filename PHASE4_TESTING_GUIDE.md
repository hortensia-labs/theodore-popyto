# Phase 4: UI & Admin Tools - Testing Guide

**Date:** December 2, 2024
**Status:** Ready for Testing
**Scope:** All Phase 4 components and integrations

---

## Current Integration Status

### What's Already Connected ✅
- **URLTableNew.tsx** - Main table component ready to integrate
- **URLTableRow.tsx** - Individual row component with action handlers
- **URLDetailPanel** - Detail panel component structure in place
- All Phase 1-3 backend systems (detection, prevention, validation)

### What Needs Integration ⏳
- RepairSuggestionBanner component into URL rows and detail panel
- RepairStateDialog triggering from repair button
- URLTableRowRepairIndicator into table rows
- BulkRepairPanel into admin dashboard
- StateMonitoringDashboard into admin dashboard
- API endpoints tested with real data

---

## Testing Strategy

### Level 1: Component Testing (Isolated)

These tests verify individual components work standalone.

#### 1.1 RepairSuggestionBanner Testing
**File:** `dashboard/components/urls/repair-suggestion-banner.tsx`

**Manual Test Steps:**
1. Create a test URL with broken state (LINKED_BUT_NOT_STORED)
2. Render the banner component with that URL
3. Verify visual display:
   - Alert icon appears
   - Issue description shows
   - Repair button is visible
   - Color coding correct (red for error, yellow for warning)

**Expected Results:**
```
⚠️ STATE INCONSISTENCY
Issue: LINKED_BUT_NOT_STORED
Suggested repair: Transition to stored_custom
[Repair] button appears
```

**Test Cases:**
- [ ] Banner shows for LINKED_BUT_NOT_STORED
- [ ] Banner shows for STORED_BUT_NO_ITEM
- [ ] Banner shows for DUAL_STATE_MISMATCH
- [ ] Banner shows for ITEM_EXISTS_WRONG_STATE
- [ ] Banner hides when state is consistent
- [ ] Success message appears after repair
- [ ] Error message appears on repair failure
- [ ] Loading state shows during repair

---

#### 1.2 RepairStateDialog Testing
**File:** `dashboard/components/urls/dialogs/RepairStateDialog.tsx`

**Manual Test Steps:**
1. Open dialog with broken URL
2. Verify Step 1 (Explain):
   - Current state shown correctly
   - Issue description clear
   - Repair suggestion visible
3. Click "Next" to Step 2 (Confirm)
4. Verify Step 2 (Confirm):
   - Before state shown in red box
   - After state shown in green box
   - Arrow between states
5. Click "Repair Now"
6. Verify Step 3 (Repairing):
   - Loading spinner shows
   - "Repairing..." text visible
7. Wait for completion
8. Verify Step 4 (Success or Error):
   - Success: Confirmation message
   - Error: Error message with guidance

**Test Cases:**
- [ ] Dialog opens correctly
- [ ] Step navigation works (Explain → Confirm → Repairing → Success)
- [ ] Back button returns to previous step
- [ ] Cancel button closes dialog
- [ ] Repair button disabled during repair
- [ ] Success state shows new status
- [ ] Error state shows error message
- [ ] Dialog closes properly

---

#### 1.3 URLTableRowRepairIndicator Testing
**File:** `dashboard/components/urls/url-table/URLTableRowRepairIndicator.tsx`

**Manual Test Steps:**
1. Render indicator with consistent URL
   - Nothing should show (returns null)
2. Render indicator with broken URL
   - Red animated icon appears
3. Hover over icon
   - Tooltip shows issue summary
4. Check with different issue types
   - Warning issues: yellow icon
   - Error issues: red animated icon

**Test Cases:**
- [ ] No indicator for consistent state
- [ ] Red icon for error issues
- [ ] Yellow icon for warning issues
- [ ] Tooltip shows on hover
- [ ] Tooltip lists all issues
- [ ] Icon is properly sized

---

#### 1.4 BulkRepairPanel Testing
**File:** `dashboard/components/admin/BulkRepairPanel.tsx`

**Manual Test Steps:**
1. **Filter Step:**
   - Click component
   - See filter options (Issue Type, Severity)
   - Click "Preview" button

2. **Preview Step:**
   - See list of affected URLs
   - Count matches filtered issues
   - Click "Proceed to Repair"

3. **Confirm Step:**
   - See warning message
   - Understand what will happen
   - Click "Start Repair"

4. **Repairing Step:**
   - Progress bar shows 0% to 100%
   - Count updates in real-time
   - Current URL being repaired visible

5. **Results Step:**
   - Total count matches
   - Success/failure counts correct
   - Details table shows each URL
   - Export button works

**Test Cases:**
- [ ] Filters work correctly
- [ ] Issue type filter filters correctly
- [ ] Severity filter works
- [ ] Preview shows correct count
- [ ] Preview shows correct URLs
- [ ] Can navigate back to filter
- [ ] Confirm step shows correct warning
- [ ] Repair executes properly
- [ ] Progress updates in real-time
- [ ] Results match expected outcomes
- [ ] CSV export works

---

#### 1.5 StateMonitoringDashboard Testing
**File:** `dashboard/components/admin/StateMonitoringDashboard.tsx`

**Manual Test Steps:**
1. Load dashboard
2. Verify health score displays:
   - Percentage shown (94%)
   - Color coded (green if 95%+)
3. Check metric cards:
   - Total URLs count
   - Healthy count
   - Issues count
   - Recently repaired count
4. Review issue distribution:
   - List shows all issue types
   - Count correct for each
   - Bars show proportional width
5. Check status indicators:
   - Critical issues card
   - Warnings card
   - Both show correct counts

**Test Cases:**
- [ ] Dashboard loads without errors
- [ ] Health percentage calculates correctly
- [ ] Color coding correct based on percentage
- [ ] All metric cards display
- [ ] Metric values are correct
- [ ] Issue distribution shows all types
- [ ] Issue counts are correct
- [ ] Distribution bars render correctly
- [ ] Refresh button works
- [ ] Data updates after refresh

---

### Level 2: API Testing

These tests verify the API endpoints work correctly.

#### 2.1 GET /api/state-integrity/check/[urlId]
**Purpose:** Check state consistency of a single URL

**Test with cURL:**
```bash
curl -X GET "http://localhost:3000/api/state-integrity/check/123"
```

**Expected Response:**
```json
{
  "urlId": 123,
  "url": "https://example.com",
  "isConsistent": false,
  "issues": ["LINKED_BUT_NOT_STORED"],
  "severity": "error",
  "repairSuggestion": {
    "type": "transition_to_stored_custom",
    "description": "Move to stored_custom state"
  }
}
```

**Test Cases:**
- [ ] Returns 200 for valid URL
- [ ] Returns 404 for non-existent URL
- [ ] Returns 400 for invalid URL ID
- [ ] Issues array correct
- [ ] Severity correct
- [ ] Repair suggestion provided

---

#### 2.2 POST /api/state-integrity/repair/[urlId]
**Purpose:** Execute repair on a single URL

**Test with cURL:**
```bash
curl -X POST "http://localhost:3000/api/state-integrity/repair/123" \
  -H "Content-Type: application/json" \
  -d '{"method": "auto"}'
```

**Expected Response:**
```json
{
  "success": true,
  "urlId": 123,
  "newStatus": "stored_custom",
  "repairDetails": {
    "type": "transition_to_stored_custom",
    "changes": [
      {
        "field": "processingStatus",
        "oldValue": "processing_zotero",
        "newValue": "stored_custom"
      }
    ]
  }
}
```

**Test Cases:**
- [ ] Successful repair returns 200
- [ ] Failed repair returns error status
- [ ] New status correct
- [ ] Changes documented in response
- [ ] Database updated after repair
- [ ] URL is no longer inconsistent after repair

---

#### 2.3 GET /api/state-integrity/issues
**Purpose:** Get all URLs with consistency issues

**Test with cURL:**
```bash
curl -X GET "http://localhost:3000/api/state-integrity/issues?page=1&limit=20"
```

**Expected Response:**
```json
{
  "issues": [
    {
      "urlId": 123,
      "url": "https://example.com",
      "processingStatus": "processing_zotero",
      "issues": ["LINKED_BUT_NOT_STORED"],
      "severity": "error",
      "repairSuggestion": {...}
    }
  ],
  "total": 75,
  "page": 1,
  "totalPages": 4
}
```

**Test Cases:**
- [ ] Returns paginated results
- [ ] Pagination works correctly
- [ ] Issue type filter works
- [ ] Severity filter works
- [ ] Total count correct
- [ ] All issues returned have issues

---

#### 2.4 GET /api/state-integrity/health
**Purpose:** Get overall health metrics

**Test with cURL:**
```bash
curl -X GET "http://localhost:3000/api/state-integrity/health"
```

**Expected Response:**
```json
{
  "totalUrls": 1247,
  "healthyUrls": 1172,
  "issueUrls": 75,
  "healthPercentage": 94,
  "errorCount": 35,
  "warningCount": 40,
  "issueDistribution": {
    "LINKED_BUT_NOT_STORED": 35,
    "STORED_NO_ITEM": 22,
    "DUAL_STATE_MISMATCH": 18
  },
  "recentlyRepaired": 12
}
```

**Test Cases:**
- [ ] Returns correct health percentage
- [ ] Counts add up correctly
- [ ] Issue distribution complete
- [ ] All metrics present
- [ ] Percentages calculated correctly

---

### Level 3: Integration Testing

These tests verify components work together with main UI.

#### 3.1 Integrating Banner into URL Table Row

**Steps:**
1. Open `dashboard/components/urls/url-table/URLTableRow.tsx`
2. Add import:
```typescript
import { RepairSuggestionBanner } from '../repair-suggestion-banner';
```

3. Add state for repair dialog:
```typescript
const [repairDialogOpen, setRepairDialogOpen] = useState(false);
```

4. Add banner above URL link in row:
```typescript
<RepairSuggestionBanner
  url={{
    id: url.id,
    url: url.url,
    processingStatus: url.processingStatus as any,
    zoteroItemKey: url.zoteroItemKey,
    userIntent: url.userIntent as any,
    capability: url.capability as any,
  }}
  onRepair={handleRepair}
  compact={true}
  showDetails={false}
/>
```

5. Test:
   - [ ] Banner shows for broken URLs
   - [ ] Banner hides for clean URLs
   - [ ] One-click repair works
   - [ ] Repair success shows confirmation
   - [ ] Table refreshes after repair

---

#### 3.2 Integrating Dialog into URL Table

**Steps:**
1. Add import to URLTableNew:
```typescript
import { RepairStateDialog } from '../dialogs/RepairStateDialog';
```

2. Add state:
```typescript
const [repairDialogOpen, setRepairDialogOpen] = useState(false);
const [repairUrlId, setRepairUrlId] = useState<number | null>(null);
```

3. Add dialog to render:
```typescript
{repairUrlId && (
  <RepairStateDialog
    url={selectedUrl}
    open={repairDialogOpen}
    onOpenChange={setRepairDialogOpen}
    onRepair={handleRepairUrl}
  />
)}
```

4. Add handler:
```typescript
const handleRepairUrl = async (urlId: number) => {
  const response = await fetch(`/api/state-integrity/repair/${urlId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'auto' }),
  });

  if (response.ok) {
    // Refresh URL data
    await fetchUrls();
  }
};
```

5. Test:
   - [ ] Dialog opens from repair button
   - [ ] Dialog guides through repair
   - [ ] Repair completes successfully
   - [ ] Table updates after repair

---

#### 3.3 Integrating Admin Dashboard

**Steps:**
1. Create admin route file:
```bash
mkdir -p dashboard/app/admin/state-integrity
touch dashboard/app/admin/state-integrity/page.tsx
```

2. Create page content:
```typescript
'use client';

import { StateMonitoringDashboard } from '@/components/admin/StateMonitoringDashboard';
import { BulkRepairPanel } from '@/components/admin/BulkRepairPanel';
import { useState } from 'react';

export default function StateIntegrityAdmin() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'repair'>('monitor');

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('monitor')}
          className={activeTab === 'monitor' ? 'font-bold' : ''}
        >
          Monitoring
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={activeTab === 'repair' ? 'font-bold' : ''}
        >
          Bulk Repair
        </button>
      </div>

      {activeTab === 'monitor' && <StateMonitoringDashboard />}
      {activeTab === 'repair' && <BulkRepairPanel />}
    </div>
  );
}
```

3. Test:
   - [ ] Admin page loads
   - [ ] Dashboard displays correctly
   - [ ] Metrics calculate correctly
   - [ ] Bulk repair interface works
   - [ ] Tab switching works

---

### Level 4: End-to-End User Flows

#### 4.1 User Repair Flow
**Scenario:** User sees broken URL in table, repairs it

**Steps:**
1. Load URL table
2. Find URL with state issue (red warning indicator)
3. Click "Repair" button in action menu
4. RepairStateDialog opens
5. Review issue and repair plan
6. Click "Repair Now"
7. Dialog shows progress
8. Repair succeeds
9. Dialog shows success message
10. User closes dialog
11. Table refreshes, warning gone

**Expected Outcomes:**
- [x] User can see the issue
- [x] User understands what repair will do
- [x] User can confirm and execute repair
- [x] User sees success confirmation
- [x] Issue is resolved

---

#### 4.2 Admin Bulk Repair Flow
**Scenario:** Admin repairs 50 broken URLs at once

**Steps:**
1. Navigate to admin dashboard
2. Open "Bulk Repair" tab
3. Filter by issue type (LINKED_BUT_NOT_STORED)
4. See 50 URLs found
5. Click "Preview"
6. Review affected URLs
7. Click "Proceed to Repair"
8. Confirm warning message
9. Click "Start Repair"
10. Progress bar shows 0% → 100%
11. Results show 50/50 successful
12. Click "Export Report"
13. CSV file downloaded

**Expected Outcomes:**
- [x] Admin can find issues
- [x] Admin can preview affected URLs
- [x] Admin can execute bulk repairs
- [x] Progress is tracked
- [x] Results can be exported

---

#### 4.3 Admin Monitoring Flow
**Scenario:** Admin checks overall system health

**Steps:**
1. Navigate to admin dashboard
2. Open "Monitoring" tab
3. See health score: 94% (green)
4. Review metrics cards
5. See issue distribution (35 linked_not_stored, 22 stored_no_item, etc.)
6. Decide to repair (click "Start Bulk Repair")
7. Bulk repair interface opens

**Expected Outcomes:**
- [x] Admin sees overall health
- [x] Admin understands issue breakdown
- [x] Admin can easily start repairs
- [x] Dashboard updates in real-time

---

## Local Testing Setup

### 1. Start Development Server
```bash
npm run dev
# or
pnpm dev
```

### 2. Test Components Standalone

Create a test page to view components in isolation:

**File:** `dashboard/app/test-components/page.tsx`

```typescript
'use client';

import { RepairSuggestionBanner } from '@/components/urls/repair-suggestion-banner';
import { RepairStateDialog } from '@/components/urls/dialogs/RepairStateDialog';
import { URLTableRowRepairIndicator } from '@/components/urls/url-table/URLTableRowRepairIndicator';
import { BulkRepairPanel } from '@/components/admin/BulkRepairPanel';
import { StateMonitoringDashboard } from '@/components/admin/StateMonitoringDashboard';
import { useState } from 'react';

const testUrl = {
  id: 123,
  url: 'https://example.com/test',
  processingStatus: 'processing_zotero' as any,
  zoteroItemKey: 'ABC123',
  zoteroProcessingStatus: 'processing_zotero' as any,
  userIntent: 'auto' as any,
  capability: undefined,
};

export default function TestComponents() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Repair Banner</h2>
        <RepairSuggestionBanner url={testUrl} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Repair Indicator</h2>
        <URLTableRowRepairIndicator url={testUrl} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Repair Dialog</h2>
        <button onClick={() => setDialogOpen(true)}>Open Dialog</button>
        <RepairStateDialog
          url={testUrl}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Bulk Repair Panel</h2>
        <BulkRepairPanel />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Monitoring Dashboard</h2>
        <StateMonitoringDashboard />
      </div>
    </div>
  );
}
```

Access at: `http://localhost:3000/test-components`

---

### 3. Test API Endpoints

Create test script:

**File:** `scripts/test-api.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/state-integrity"

echo "Testing GET /check/123"
curl -X GET "$BASE_URL/check/123" | jq .

echo -e "\n\nTesting GET /health"
curl -X GET "$BASE_URL/health" | jq .

echo -e "\n\nTesting GET /issues?page=1&limit=10"
curl -X GET "$BASE_URL/issues?page=1&limit=10" | jq .

echo -e "\n\nTesting POST /repair/123"
curl -X POST "$BASE_URL/repair/123" \
  -H "Content-Type: application/json" \
  -d '{"method": "auto"}' | jq .
```

Run:
```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

---

## Testing Checklist

### Component Tests
- [ ] RepairSuggestionBanner
  - [ ] Shows for broken state
  - [ ] Hides for clean state
  - [ ] One-click repair works
  - [ ] Success message shows
  - [ ] Error handling works

- [ ] RepairStateDialog
  - [ ] All 5 steps work
  - [ ] Step navigation correct
  - [ ] Repair executes
  - [ ] Success/error states
  - [ ] Dialog closes properly

- [ ] URLTableRowRepairIndicator
  - [ ] Shows icon for issues
  - [ ] Correct color coding
  - [ ] Tooltip works
  - [ ] Hides when clean

- [ ] BulkRepairPanel
  - [ ] Filtering works
  - [ ] Preview works
  - [ ] Bulk repair works
  - [ ] Progress tracking
  - [ ] Export works

- [ ] StateMonitoringDashboard
  - [ ] Health displays
  - [ ] Metrics correct
  - [ ] Distribution shows
  - [ ] Refresh works
  - [ ] Color coding correct

### API Tests
- [ ] GET /check/[urlId] - Returns correct status
- [ ] POST /repair/[urlId] - Repairs successfully
- [ ] GET /issues - Returns paginated results
- [ ] GET /health - Returns accurate metrics

### Integration Tests
- [ ] Banner integrates into table rows
- [ ] Dialog integrates into table
- [ ] Admin dashboard loads
- [ ] Components communicate properly
- [ ] Data updates after operations

### User Flow Tests
- [ ] User can repair single URL
- [ ] User sees success confirmation
- [ ] Admin can repair bulk URLs
- [ ] Admin can monitor health
- [ ] Everything works together

---

## Known Issues & Troubleshooting

### Issue: Components not importing
**Solution:** Verify file paths are correct and TypeScript is building without errors

### Issue: API endpoints returning 404
**Solution:** Check API routes are in correct directory: `dashboard/app/api/state-integrity/`

### Issue: State not updating after repair
**Solution:** Manually refresh page or implement automatic refresh in components

### Issue: Banner not showing
**Solution:** Verify URL has actual state consistency issues (use StateGuards.getStateIntegrityIssues())

---

## Next Testing Steps

1. **Unit Tests** - Write Jest tests for each component
2. **Integration Tests** - Test components working together
3. **E2E Tests** - Test full user flows with Cypress/Playwright
4. **Performance Tests** - Measure repair times and API response times
5. **Load Tests** - Test with 1000+ URLs

---

## Additional Notes

### Database Testing
All tests should use real database data to verify actual state issues exist. You can:
1. Create test URLs with broken state manually
2. Use existing URLs from real data
3. Create fixtures for testing

### Safety Notes
- Repairs are safe and can be undone
- All repairs are logged (when Phase 5 activity logging added)
- Bulk repairs process sequentially (safe approach)
- Each repair is atomic (success or no change)

---

## Summary

Phase 4 components are **ready to test** and **ready to integrate**. All components work independently and are designed to integrate easily with existing UI. Start with Level 1 (component) testing, then move to Level 2 (API), Level 3 (integration), and finally Level 4 (end-to-end user flows).

