# Reset Functionality Implementation Summary

**Date:** November 15, 2025  
**Feature:** Enhanced Processing State Reset with History Preservation

---

## Overview

Added comprehensive reset functionality that allows resetting URLs stuck in 'processing' status while preserving their processing history. The reset feature is now available for ALL URLs in the detail panel's processing history section.

---

## Key Features

### 1. **History-Preserving Reset**
- **Preserves** all previous processing attempts in history
- **Adds** a reset event to the history timeline
- **Resets** processing status to `not_started`
- **Clears** processing attempts counter
- **Allows** URLs to be processed again from a clean state

### 2. **Universal Availability**
- Available for **ALL URLs** (not restricted by state)
- Special handling for stuck `processing_*` states (bypasses state guards)
- Shows reset button even when no history exists
- Accessible directly in Processing History section

### 3. **Visual Reset Events**
- Reset events appear in purple in the history timeline
- Clearly labeled as "Processing Reset"
- Shows transition from previous state to `not_started`
- Includes metadata about why reset was triggered

---

## Implementation Details

### Modified Files

#### 1. `/dashboard/lib/actions/state-transitions.ts`
Enhanced `resetProcessingState()` function:

```typescript
export async function resetProcessingState(
  urlId: number, 
  preserveHistory: boolean = true
)
```

**Key Changes:**
- Added `preserveHistory` parameter (defaults to `true`)
- Bypasses state guards for stuck `processing_*` states
- Creates reset event with:
  - `stage: 'manual'`
  - `method: 'reset'`
  - `success: true`
  - Transition metadata
  - Previous status preserved
- Recomputes all relevant status fields:
  - `processingStatus` → `'not_started'`
  - `processingAttempts` → `0`
  - `zoteroProcessingStatus` → `null`
  - `zoteroProcessingError` → `null`
  - `processingHistory` → Preserved with reset event added

#### 2. `/dashboard/components/urls/url-detail-panel/ProcessingHistorySection.tsx`
Added reset button and visual handling:

**Key Changes:**
- Added `urlId`, `onReset`, and `isResetting` props
- Shows reset button even when no history exists
- Special visual styling for reset events:
  - Purple background (`bg-purple-50`)
  - Purple border (`border-purple-200`)
  - Purple icon background (`bg-purple-100`)
  - RotateCcw icon in purple
- Updated `getStageIcon()` and `getStageLabel()` to handle reset method
- Reset button placed after stats bar

#### 3. `/dashboard/components/urls/url-detail-panel.tsx`
Wired up the reset functionality:

**Key Changes:**
- Passes `urlId`, `onReset={handleReset}`, and `isResetting={isProcessing}` to ProcessingHistorySection
- Shows Processing History section for all URLs (not just those with history)
- Existing `handleReset()` function works with enhanced reset

---

## User Experience

### Reset Button Location
The reset button appears in the **Processing History** section, right after the summary stats bar showing Total/Success/Failed counts.

### Visual Hierarchy
```
Processing History
├── Timeline of attempts
│   ├── Processing attempts
│   ├── State transitions
│   └── Reset events (in purple)
├── Summary Stats
│   ├── Total: X
│   ├── Success: Y
│   └── Failed: Z
└── Reset Button ← HERE
    └── Description: "Resets status to not_started (preserves history)"
```

### Reset Event in History
Reset events appear as:
- **Purple card** with purple icon background
- **"Processing Reset"** label
- **Transition display**: Shows `previous_status → not_started`
- **Timestamp**: When reset occurred
- **Metadata**: Includes reason (e.g., "Reset stuck processing state")

---

## How It Works

### 1. User Clicks Reset Button
```
User clicks "Reset Processing State" button
   ↓
handleReset() called in URLDetailPanel
   ↓
resetProcessingState(url.id, preserveHistory=true)
   ↓
Enhanced reset action
```

### 2. Reset Process
1. **Load URL data** with capabilities
2. **Check if can reset**:
   - If stuck in `processing_*` → Allow (bypass guards)
   - Otherwise → Check StateGuards.canReset()
3. **Get existing history** from database
4. **Create reset event**:
   ```typescript
   {
     timestamp: Date.now(),
     stage: 'manual',
     method: 'reset',
     success: true,
     metadata: {
       action: 'reset',
       previousStatus: 'processing_zotero',
       reason: 'Reset stuck processing state'
     },
     transition: {
       from: 'processing_zotero',
       to: 'not_started'
     }
   }
   ```
5. **Update database**:
   - `processingStatus` = `'not_started'`
   - `processingAttempts` = `0`
   - `processingHistory` = `[...existingHistory, resetEvent]`
   - `lastProcessingMethod` = `null`
   - `zoteroProcessingStatus` = `null`
   - `zoteroProcessingError` = `null`
6. **Return success** with message
7. **Refresh UI** (onUpdate, router.refresh)

### 3. After Reset
- URL appears with `processingStatus='not_started'`
- Can be processed again from scratch
- Complete history preserved showing:
  - Original processing attempts
  - Why they failed
  - When reset occurred
  - What state it was reset from

---

## Benefits

### For Stuck URLs
- **Fixes stuck states**: URLs stuck in `processing_*` can be reset
- **No data loss**: All historical attempts preserved
- **Clean slate**: Can try processing again
- **Audit trail**: Clear record of when and why reset

### For All URLs
- **Flexibility**: Can reset any URL if needed
- **Transparency**: History shows full lifecycle
- **Debugging**: Can see what was tried before reset
- **Recovery**: Easy recovery from any state

### For Developers
- **Debugging**: Complete history helps diagnose issues
- **Analytics**: Can see patterns of resets
- **Traceability**: Full audit trail of all actions
- **Flexibility**: preserveHistory flag allows different behaviors

---

## State Validation

### URLs That Can Be Reset
✅ **Stuck processing states** (`processing_zotero`, `processing_content`, `processing_llm`)
✅ **Failed states** (`exhausted`)
✅ **Awaiting states** (`awaiting_selection`, `awaiting_metadata`)
✅ **Stored states** (`stored`, `stored_incomplete`, `stored_custom`)
✅ **Ignored states** (`ignored`, `archived`)

### State Guard Bypass
For URLs stuck in `processing_*` states:
- StateGuards check is bypassed
- Allows reset even if normally not allowed
- Ensures stuck URLs can always be recovered

---

## Example History Timeline

After resetting a stuck URL, the history might look like:

```
Processing History
─────────────────────────────────────────────

[🔵 State Transition] 15:23:45
not_started → processing_zotero

[❌ Zotero (Identifier) · DOI] 15:23:46
Error: Zotero API timeout after 60s

[🔵 State Transition] 15:23:47
processing_zotero → processing_content

[❌ Content Extraction] 15:23:50
Error: Failed to fetch content (404)

[🟣 Processing Reset] 15:24:12  ← RESET EVENT
processing_content → not_started
Reason: Reset stuck processing state

─────────────────────────────────────────────
Total: 5 | Success: 0 | Failed: 2

[Reset Processing State] ← Reset button always available
```

---

## Testing Checklist

### Basic Reset
- [ ] Reset button appears in Processing History section
- [ ] Reset button works for URLs with history
- [ ] Reset button works for URLs without history
- [ ] Reset event appears in history timeline (purple card)
- [ ] Status changes to `not_started`
- [ ] Processing attempts counter resets to 0

### Stuck URLs
- [ ] Can reset URL stuck in `processing_zotero`
- [ ] Can reset URL stuck in `processing_content`
- [ ] Can reset URL stuck in `processing_llm`
- [ ] Reset message indicates "stuck processing state"

### History Preservation
- [ ] Original processing attempts preserved after reset
- [ ] Failed attempts still visible after reset
- [ ] Reset event added to history
- [ ] Transition shows correct from/to states
- [ ] Metadata includes previous status

### After Reset
- [ ] URL can be processed again
- [ ] New processing attempts add to history (after reset event)
- [ ] Status properly transitions through workflow
- [ ] History shows complete lifecycle including reset

### UI/UX
- [ ] Reset button disabled while resetting
- [ ] Reset button shows spinner when processing
- [ ] Success message appears after reset
- [ ] Error message appears if reset fails
- [ ] URL list refreshes after reset
- [ ] Detail panel updates after reset

---

## API Reference

### `resetProcessingState(urlId, preserveHistory?)`

**Parameters:**
- `urlId: number` - ID of URL to reset
- `preserveHistory: boolean` - If true, keeps history and adds reset event (default: `true`)

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  from?: ProcessingStatus;
  to?: ProcessingStatus;
}
```

**Example:**
```typescript
// Reset with history preservation (default)
const result = await resetProcessingState(123);

// Reset and clear all history
const result = await resetProcessingState(123, false);
```

---

## Database Schema

### Reset Event Structure
```typescript
{
  timestamp: number;              // Unix timestamp in ms
  stage: 'manual';               // Always 'manual' for resets
  method: 'reset';               // Identifies as reset event
  success: true;                 // Always true for successful reset
  metadata: {
    action: 'reset';
    previousStatus: string;      // Status before reset
    reason: string;              // Why reset occurred
  };
  transition: {
    from: ProcessingStatus;      // Previous status
    to: 'not_started';          // Always transitions to not_started
  };
}
```

### Fields Updated by Reset
```sql
UPDATE urls SET
  processing_status = 'not_started',
  processing_attempts = 0,
  processing_history = json_array_append(processing_history, '$', reset_event),
  last_processing_method = NULL,
  zotero_processing_status = NULL,
  zotero_processing_error = NULL,
  updated_at = CURRENT_TIMESTAMP
WHERE id = urlId;
```

---

## Future Enhancements

### Potential Additions
1. **Bulk Reset**: Reset multiple URLs at once
2. **Selective Reset**: Reset specific processing stages only
3. **Reset with Options**: Configure what gets reset
4. **Reset Analytics**: Track reset patterns and reasons
5. **Auto-Reset**: Automatically reset URLs stuck for X hours
6. **Reset Confirmation**: Add confirmation dialog for important URLs

### Bulk Reset API
```typescript
// Future API
export async function bulkResetProcessingState(
  urlIds: number[],
  options?: {
    preserveHistory?: boolean;
    reason?: string;
  }
): Promise<BatchResetResult>
```

---

## Troubleshooting

### Reset Button Not Appearing
- Check that URL has `urlWithCap` (new processing system)
- Verify `onReset` callback is passed to ProcessingHistorySection
- Ensure Processing History section is rendered

### Reset Not Working
- Check console for error messages
- Verify URL exists in database
- Check StateGuards if not in processing_* state
- Ensure database schema includes new fields

### History Not Preserved
- Verify `preserveHistory=true` (default)
- Check that existing history is loaded before reset
- Ensure reset event is properly created
- Verify database update includes history append

---

## Related Documents

- [URL Processing Refactor PRD](./URL_PROCESSING_REFACTOR_PRD.md)
- [Orchestrator Fix Summary](./ORCHESTRATOR_FIX_SUMMARY.md)
- [Technical Guide](./TECHNICAL_GUIDE.md)

---

**Implementation Complete:** ✅  
**Testing Status:** ⏳ Pending User Testing  
**Documentation:** ✅ Complete

