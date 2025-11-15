# Custom Identifier Processing Implementation

## Overview

This document describes the implementation of the custom identifier processing feature in the `URLDetailPanel` component. This feature allows users to add validated identifiers and process them with Zotero, with support for replacing existing Zotero items when necessary.

## Requirements Implemented

### 1. Modal-Based Identifier Addition
- Replaced inline input field with a modal-based flow (matching `URLTableNew`)
- Uses the existing `AddIdentifierModal` component
- Validates identifiers before adding them to enrichment data
- Provides preview functionality for validated identifiers

### 2. Custom Identifier Processing
- Each custom identifier has a "Process" button with icon
- Processing button is always available (identifiers are pre-validated)
- Handles two scenarios:
  - **New Item**: Directly processes the identifier and creates a new Zotero item
  - **Replace Existing**: Shows comparison modal when URL already has a Zotero item

### 3. Replacement Flow
When replacing an existing Zotero item:
- Displays a side-by-side comparison modal
- Shows current item details (citation, title, authors, date, type)
- Shows new item preview (from identifier)
- User can confirm replacement or cancel
- On confirmation, old item is unlinked and new item is linked
- Old item remains in Zotero library (not deleted)

## New Components

### 1. `ReplaceZoteroItemModal`
**Location**: `dashboard/components/urls/replace-zotero-item-modal.tsx`

**Features**:
- Side-by-side comparison of current and new items
- Loads current item metadata from Zotero
- Loads new item preview using identifier
- Shows warnings about replacement implications
- Handles loading and error states

**Props**:
```typescript
interface ReplaceZoteroItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier: string;           // Custom identifier to process
  currentItemKey: string;        // Existing Zotero item key
  onConfirm: () => void;         // Callback when user confirms replacement
  isProcessing?: boolean;        // Show processing state
}
```

## New Server Actions

### 1. `processCustomIdentifier`
**Location**: `dashboard/lib/actions/process-custom-identifier.ts`

**Purpose**: Process a custom identifier from enrichment data with Zotero

**Signature**:
```typescript
export async function processCustomIdentifier(
  urlId: number,
  identifier: string,
  replaceExisting: boolean = false
): Promise<ProcessCustomIdentifierResult>
```

**Features**:
- Validates URL exists
- Checks for existing Zotero item
- Transitions through state machine appropriately
- Processes identifier with Zotero API
- Validates citation quality
- Records processing attempts in history
- Handles link replacement when replacing existing items
- Updates all relevant database records

**Return Type**:
```typescript
interface ProcessCustomIdentifierResult {
  success: boolean;
  itemKey?: string;      // New Zotero item key
  error?: string;        // Error message if failed
  method?: string;       // Processing method used
  replaced?: boolean;    // Whether an existing item was replaced
}
```

## Updated Components

### 1. `URLDetailPanel` Updates

**New State Variables**:
```typescript
const [addIdentifierModalOpen, setAddIdentifierModalOpen] = useState(false);
const [replaceItemModalOpen, setReplaceItemModalOpen] = useState(false);
const [selectedCustomIdentifier, setSelectedCustomIdentifier] = useState<string | null>(null);
```

**New Functions**:

#### `handleIdentifierAdded()`
- Called after successfully adding a new identifier via modal
- Reloads enrichment data
- Shows success message
- Triggers parent update

#### `handleProcessZoteroItemWithCustomIdentifier(identifier: string)`
- Main entry point for processing custom identifiers
- Checks if URL has existing Zotero item
- If yes: Shows replacement modal with preview
- If no: Processes directly

#### `processCustomIdentifierDirect(identifier: string, replaceExisting: boolean)`
- Internal function that calls the server action
- Handles processing state
- Updates Zotero metadata after success
- Triggers router refresh

#### `handleConfirmReplaceItem()`
- Called when user confirms replacement in modal
- Processes with `replaceExisting = true`
- Clears selection state

**Updated UI**:
- Removed inline input field for adding identifiers
- Added "Add Identifier" button that opens modal
- Enhanced identifier list items with:
  - Better styling (hover effects, borders)
  - "Process" button with icon and label
  - "Remove" button with icon
  - Improved tooltips
- Added empty state with call-to-action button
- Added modals at component bottom

## Processing Flow

### Scenario 1: New Item (No Existing Zotero Item)

```
User clicks "Process" on identifier
    ↓
handleProcessZoteroItemWithCustomIdentifier()
    ↓
Check: Has existing item? → No
    ↓
processCustomIdentifierDirect(identifier, false)
    ↓
Call: processCustomIdentifier(urlId, identifier, false)
    ↓
State transition: current → processing_zotero
    ↓
Process identifier with Zotero API
    ↓
Validate citation
    ↓
State transition: processing_zotero → stored/stored_incomplete
    ↓
Update URL record with Zotero item key
    ↓
Create zoteroItemLink record
    ↓
Record processing attempt in history
    ↓
Success: Show message, reload metadata
```

### Scenario 2: Replace Existing Item

```
User clicks "Process" on identifier
    ↓
handleProcessZoteroItemWithCustomIdentifier()
    ↓
Check: Has existing item? → Yes
    ↓
Set selectedCustomIdentifier
Open ReplaceZoteroItemModal
    ↓
Modal loads:
  - Current item metadata from Zotero
  - New item preview from identifier
    ↓
User reviews comparison
    ↓
User clicks "Replace Item"
    ↓
handleConfirmReplaceItem()
    ↓
processCustomIdentifierDirect(identifier, true)
    ↓
Call: processCustomIdentifier(urlId, identifier, true)
    ↓
State transition: stored/stored_incomplete → processing_zotero
    ↓
Process identifier with Zotero API
    ↓
Validate citation
    ↓
Delete old zoteroItemLink record
(Old Zotero item remains in library)
    ↓
State transition: processing_zotero → stored/stored_incomplete
    ↓
Update URL record with new Zotero item key
    ↓
Create new zoteroItemLink record
    ↓
Record processing attempt in history (marked as replacement)
    ↓
Success: Show message with "replaced" text, reload metadata
```

## Database Updates

When processing custom identifiers, the following tables are updated:

### `urls` table
- `zoteroItemKey`: Set to new item key
- `zoteroProcessedAt`: Current timestamp
- `zoteroProcessingStatus`: 'stored'
- `zoteroProcessingMethod`: 'custom_identifier'
- `citationValidationStatus`: 'valid' or 'incomplete'
- `citationValidatedAt`: Current timestamp
- `citationValidationDetails`: { missingFields: [...] }
- `createdByTheodore`: true
- `linkedUrlCount`: 1
- `updatedAt`: Current timestamp
- `processingStatus`: Via state machine transition
- `processingHistory`: Via recordProcessingAttempt()

### `zoteroItemLinks` table
- **Replacement**: Old link record deleted
- **New record created**:
  - `itemKey`: New Zotero item key
  - `urlId`: Current URL ID
  - `createdByTheodore`: true
  - `userModified`: false
  - `linkedAt`: Current timestamp

### Processing Attempt Record
```json
{
  "timestamp": 1234567890,
  "stage": "zotero_custom_identifier",
  "method": "custom_identifier",
  "success": true,
  "itemKey": "ABC123XYZ",
  "duration": 1523,
  "metadata": {
    "identifier": "10.1234/example",
    "validationStatus": "valid",
    "missingFields": [],
    "replaced": true,
    "oldItemKey": "OLD123KEY"  // Only if replaced
  }
}
```

## State Machine Integration

The implementation properly integrates with the URL Processing State Machine:

### Valid Transitions

**For New Items**:
- `not_started` → `processing_zotero` → `stored` or `stored_incomplete`
- `failed` → `processing_zotero` → `stored` or `stored_incomplete`
- `awaiting_selection` → `processing_zotero` → `stored` or `stored_incomplete`
- `exhausted` → `processing_zotero` → `stored` or `stored_incomplete`

**For Replacements**:
- `stored` → `processing_zotero` → `stored` or `stored_incomplete`
- `stored_incomplete` → `processing_zotero` → `stored` or `stored_incomplete`

### Context Data
Each transition includes context:
- `reason`: Human-readable explanation
- `customIdentifier`: The identifier being processed
- `replaced`: Boolean flag (for replacements)
- `itemKey`: Resulting Zotero item key
- `validationStatus`: Citation validation result
- `missingFields`: List of missing citation fields

## UI/UX Improvements

### Custom Identifiers Section

**Before**:
```
[ Inline Input Field ] [Add Button]
```

**After**:
```
[Header with "Add Identifier" button]

[Description text]

[Enhanced list of identifiers with actions]
OR
[Empty state with call-to-action]
```

### Identifier Items

Each identifier shows:
- Identifier value in monospace font
- "Process" button with icon and label
- "Remove" button with icon
- Hover effects and visual feedback
- Tooltips for button actions

### Modals

1. **AddIdentifierModal**: Modal-based validation and addition
2. **ReplaceZoteroItemModal**: Rich comparison with side-by-side view

## Error Handling

The implementation handles various error scenarios:

1. **URL Not Found**: Returns error immediately
2. **Identifier Processing Failed**: 
   - Records failure in history
   - Transitions back to previous state
   - Shows error message to user
3. **Item Key Not Found**: 
   - Records failure
   - Returns error
   - Maintains data integrity
4. **Citation Validation Failed**: 
   - Catches error
   - Assumes incomplete citation
   - Continues processing
5. **State Transition Invalid**:
   - State machine validates transitions
   - Rejects invalid transitions
   - Returns appropriate error

## Testing Recommendations

### Unit Tests
1. `processCustomIdentifier` action
   - Test with valid identifier
   - Test with invalid identifier
   - Test replacement flow
   - Test state transitions
   - Test error scenarios

### Integration Tests
1. Full flow from UI to database
2. Modal interactions
3. State machine transitions
4. Database record updates

### E2E Tests
1. Add identifier via modal
2. Process new identifier (no existing item)
3. Process identifier with replacement
4. Cancel replacement modal
5. Handle processing errors
6. Verify processing history

## Future Enhancements

Potential improvements:
1. Bulk processing of multiple custom identifiers
2. Batch validation of identifiers
3. Identifier source tracking (manual vs automatic)
4. Identifier confidence scoring
5. Automatic identifier detection from pasted text
6. Integration with external identifier databases
7. Identifier format standardization

## Related Files

### Components
- `dashboard/components/urls/url-detail-panel.tsx` (updated)
- `dashboard/components/urls/replace-zotero-item-modal.tsx` (new)
- `dashboard/components/urls/add-identifier-modal.tsx` (existing)

### Actions
- `dashboard/lib/actions/process-custom-identifier.ts` (new)
- `dashboard/lib/actions/enrichments.ts` (existing)
- `dashboard/lib/actions/validate-identifier.ts` (existing)
- `dashboard/lib/actions/preview-identifier.ts` (existing)

### State Machine
- `dashboard/lib/state-machine/url-processing-state-machine.ts`
- `dashboard/lib/state-machine/state-guards.ts`

### Utilities
- `dashboard/lib/zotero-client.ts` (processIdentifier, getItem, validateCitation)
- `dashboard/lib/orchestrator/processing-helpers.ts` (recordProcessingAttempt)

## Conclusion

This implementation provides a complete, user-friendly solution for processing custom identifiers with Zotero. It properly handles all edge cases, integrates with the state machine, records processing history, and provides clear feedback to users throughout the process.

The modal-based flow ensures identifiers are validated before being added, and the replacement preview gives users confidence when replacing existing items. All processing is properly tracked and recorded for audit purposes.

