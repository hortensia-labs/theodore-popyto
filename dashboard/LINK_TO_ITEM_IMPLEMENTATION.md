# Link to Existing Zotero Item - Implementation Guide

## Overview

A new action has been implemented to allow users to link URL items to existing Zotero items in their library. This enables scenarios where users want to connect a URL to an item that was created outside of Theodore (e.g., items created directly in Zotero).

## Components

### 1. State Guard (`dashboard/lib/state-machine/state-guards.ts`)

**New Guard Method:** `canLinkToItem(url: UrlForGuardCheck): boolean`

Requirements:
- URL must not already be linked to a Zotero item (`zoteroItemKey` must be null/undefined)
- User intent must not be 'ignore' or 'archive'
- URL must not be actively processing (not in 'processing_zotero', 'processing_content', or 'processing_llm' states)

**Action Priority:** 82 (placed between retry at 80 and extract_semantic_scholar at 85)

**Integration in StateGuards:**
- Added to `getAvailableActions()` method
- Added to `getActionPriority()` for action sorting

### 2. Dialog Component (`dashboard/components/urls/dialogs/LinkToItemDialog.tsx`)

A modal dialog with the following features:

**Props:**
```typescript
{
  urlId: number;                    // URL being linked
  open: boolean;                    // Dialog visibility
  onOpenChange: (open: boolean) => void;  // Toggle dialog
  onConfirm: (itemKey: string, itemPreview: ZoteroItemResponse) => Promise<void>;  // Callback on confirm
  isLoading?: boolean;              // External loading state
}
```

**Features:**
1. **Item Key Input**
   - User enters Zotero item key (e.g., "ABC123XY")
   - Case-insensitive, whitespace-trimmed
   - Helper text explaining where to find item keys

2. **Verification Button**
   - Verifies item exists in Zotero library
   - Calls `getItem()` from zotero-client
   - Shows loading spinner during verification
   - Displays detailed error messages if verification fails

3. **Item Preview**
   - Shows green success box when item is verified
   - Displays item title (or citation if available)
   - Shows authors/creators list
   - Displays item type and date added
   - Shows item key and creator count for reference

4. **Confirmation**
   - "Link Item" button disabled until item is verified
   - Shows loading state during linking
   - Resets form on successful linking and closes dialog

### 3. Server Action (`dashboard/lib/actions/zotero.ts`)

**New Function:** `linkUrlToExistingZoteroItem(urlId: number, zoteroItemKey: string)`

**Process:**
1. Validates URL exists and can be linked (using `StateGuards.canLinkToItem()`)
2. Verifies Zotero item exists and is accessible
3. Transitions URL state to 'stored_custom' (manually linked item)
4. Updates URL database record:
   - Sets `zoteroItemKey`
   - Sets `zoteroProcessingStatus` to 'stored_custom'
   - Sets `zoteroProcessingMethod` to 'manual_link_existing'
   - Sets `createdByTheodore` to false (item was pre-existing)
5. Creates link record in `zoteroItemLinks` table
6. Updates `linkedUrlCount` for the item
7. Validates citation completeness and updates validation status

**Returns:**
```typescript
{
  success: boolean;
  urlId?: number;
  itemKey?: string;
  itemTitle?: string;
  citationValidationStatus?: CitationValidationStatus;
  error?: string;
}
```

### 4. UI Components

#### QuickActionsSection (`dashboard/components/urls/url-detail-panel/QuickActionsSection.tsx`)

**Changes:**
- Added `onLinkToItem?: () => void` prop
- Added Link icon import from lucide-react
- Added conditional button in Quick Actions area:
  ```tsx
  {actions.includes('link_to_item') && onLinkToItem && (
    <Button
      onClick={onLinkToItem}
      variant="outline"
      className="w-full justify-start"
      size="sm"
      disabled={isProcessing}
    >
      <Link className="h-4 w-4 mr-2" />
      Link to Existing Item
    </Button>
  )}
  ```

#### URLTableRow (`dashboard/components/urls/url-table/URLTableRow.tsx`)

**Changes:**
- Added `onLinkToItem?: () => void` prop
- Added Link icon import from lucide-react
- Added menu item in dropdown menu (after extract_semantic_scholar):
  ```tsx
  {actions.includes('link_to_item') && (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        onLinkToItem?.();
      }}
      disabled={isProcessing || !onLinkToItem}
    >
      <Link className="h-4 w-4 mr-2" />
      Link to Existing Item
    </DropdownMenuItem>
  )}
  ```

## Usage Example

In a URL detail panel or table integration:

```typescript
const [linkDialogOpen, setLinkDialogOpen] = useState(false);
const [isLinking, setIsLinking] = useState(false);

const handleLinkToItem = () => {
  setLinkDialogOpen(true);
};

const handleConfirmLink = async (itemKey: string, itemPreview: ZoteroItemResponse) => {
  setIsLinking(true);
  try {
    const result = await linkUrlToExistingZoteroItem(url.id, itemKey);

    if (result.success) {
      toast.success(`URL linked to item: ${result.itemTitle}`);
      // Refresh URL data
      onUpdate?.();
    } else {
      toast.error(`Failed to link: ${result.error}`);
    }
  } finally {
    setIsLinking(false);
  }
};

return (
  <>
    <QuickActionsSection
      url={url}
      onLinkToItem={handleLinkToItem}
      {...otherProps}
    />

    <LinkToItemDialog
      urlId={url.id}
      open={linkDialogOpen}
      onOpenChange={setLinkDialogOpen}
      onConfirm={handleConfirmLink}
      isLoading={isLinking}
    />
  </>
);
```

## State Machine Integration

**State Transition:**
- Any state → `stored_custom`
- Reason: "User linked to existing Zotero item"

**Processing Method:**
- `manual_link_existing` (indicates manual linking to pre-existing item)

**Metadata:**
- `createdByTheodore: false` (item not created by Theodore)
- `citationValidationStatus` updated based on item metadata
- `linkedUrlCount` incremented for the linked item

## Guard Rules

The action is available when:

✅ **Available:**
- URL not yet linked to any Zotero item
- Not in ignore/archive intent
- Not currently processing
- From any non-processing state (awaiting_selection, awaiting_metadata, not_started, exhausted, etc.)

❌ **Not Available:**
- URL already has a linked Zotero item
- User marked URL as "ignore" or "archive"
- URL is actively processing (Zotero, content, or LLM processing)

## Files Modified

1. **`dashboard/lib/state-machine/state-guards.ts`**
   - Added `canLinkToItem()` guard method
   - Added 'link_to_item' to `getAvailableActions()`
   - Added 'link_to_item' priority (82) to `getActionPriority()`

2. **`dashboard/lib/actions/zotero.ts`**
   - Added `linkUrlToExistingZoteroItem()` server action

3. **`dashboard/components/urls/dialogs/LinkToItemDialog.tsx`** (NEW)
   - Complete dialog component with verification and preview

4. **`dashboard/components/urls/url-detail-panel/QuickActionsSection.tsx`**
   - Added `onLinkToItem` prop
   - Added Link icon and button

5. **`dashboard/components/urls/url-table/URLTableRow.tsx`**
   - Added `onLinkToItem` prop
   - Added Link icon
   - Added dropdown menu item

## Error Handling

The implementation handles:

1. **Invalid Item Key**
   - Empty or whitespace-only keys rejected
   - Clear error message shown

2. **Item Not Found**
   - Zotero API returns error
   - Specific error message displayed to user
   - Dialog remains open for retry

3. **Item Verification Failure**
   - Connection errors to Zotero
   - Permission issues
   - Timeout scenarios
   - User can retry with different key

4. **Database Errors**
   - Server action catches exceptions
   - User informed of linking failure
   - Transaction-like behavior (all-or-nothing)

## Validation

The item is validated at two levels:

1. **During Verification (Dialog)**
   - `getItem()` from Zotero client confirms existence
   - Shows preview of actual item data

2. **After Linking (Server Action)**
   - `validateCitation()` checks completeness
   - Citation validation status updated
   - Missing fields tracked

## Citation Validation

After linking, the URL's citation is revalidated based on linked item's metadata:

- Checks for title (required)
- Checks for creators/authors (required)
- Checks for date (required)
- Stores validation status and missing fields
- Displayed in citation indicator in table

## Testing Considerations

When testing this feature:

1. **Test with valid item keys** - Use items you know exist in your Zotero library
2. **Test error cases** - Invalid keys, non-existent items, network errors
3. **Test state guards** - Try linking items that already have linked items
4. **Test UI rendering** - Button appears/disappears based on availability
5. **Test dialog flow** - Verification → Preview → Confirmation → Close
6. **Test data persistence** - Verify linked items appear correctly in table

## Future Enhancements

Potential improvements:

1. **Search functionality** - Allow searching Zotero library instead of just key entry
2. **Bulk linking** - Link multiple URLs to the same item
3. **Conflict resolution** - Handle cases where item already has other linked URLs
4. **Quick suggestions** - Show recently used items
5. **Item preview enrichment** - Show attachments, notes, tags from Zotero
