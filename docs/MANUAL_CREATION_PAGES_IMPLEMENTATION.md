# Manual Creation & Edit Pages Implementation

**Date:** November 15, 2025  
**Feature:** Full-Page Manual Create and Edit Interfaces

---

## Overview

Implemented comprehensive full-page interfaces for manual Zotero item creation and editing. These pages provide a complete workflow for users to create items when automation fails or to edit incomplete citations.

---

## Pages Implemented

### 1. Manual Create Page
**Route:** `/urls/[id]/manual/create`  
**File:** `/dashboard/app/urls/[id]/manual/create/page.tsx`

**Purpose:** Create a new Zotero item manually when automated methods fail or when user wants complete control.

**Features:**
- ✅ Full-screen layout with side-by-side view
- ✅ Content viewer (left) - Multiple viewing modes
- ✅ Metadata form (right) - Zotero item creation
- ✅ Pre-populated from extracted metadata if available
- ✅ State machine integration (transitions to `stored_custom`)
- ✅ Success/error messaging
- ✅ Auto-redirect to URLs page after success
- ✅ Cancel with unsaved changes warning

### 2. Manual Edit Page
**Route:** `/urls/[id]/manual/edit`  
**File:** `/dashboard/app/urls/[id]/manual/edit/page.tsx`

**Purpose:** Edit existing Zotero citation metadata to fix incomplete citations or update fields.

**Features:**
- ✅ Full-screen layout optimized for editing
- ✅ Citation preview at top (live updates)
- ✅ Metadata editor with validation
- ✅ Missing fields detection and highlighting
- ✅ State machine integration (transitions to `stored` when complete)
- ✅ Unsaved changes tracking
- ✅ Auto-redirect when citation becomes complete
- ✅ Save button in header and footer

---

## Architecture

### Manual Create Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Create Custom Zotero Item                         │
│           Review content and manually create item            │
│                                                              │
│ Source URL: https://example.com/article                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Success: Custom Zotero item created! (ABC123)              │
│                                                              │
├───────────────────────────┬─────────────────────────────────┤
│                           │                                  │
│  Content Preview          │  Item Metadata                  │
│                           │                                  │
│  [Iframe] [Reader] [Raw]  │  Item Type: [webpage ▼]        │
│  ┌─────────────────────┐  │                                  │
│  │                     │  │  *Title: ________________        │
│  │  [Live webpage or  │  │                                  │
│  │   reader mode]     │  │  *Author 1:                      │
│  │                     │  │  First: _______ Last: _______   │
│  │                     │  │  [+ Add Author]                  │
│  │                     │  │                                  │
│  │                     │  │  *Date: __________              │
│  │                     │  │                                  │
│  │                     │  │  Publication: _____________      │
│  │                     │  │                                  │
│  │                     │  │  Abstract: _______________       │
│  │                     │  │  _________________________       │
│  │                     │  │                                  │
│  │                     │  │  ┌─────────────────────┐        │
│  │                     │  │  │ Create Item         │        │
│  │                     │  │  └─────────────────────┘        │
│  └─────────────────────┘  │                                  │
│                           │                                  │
└───────────────────────────┴─────────────────────────────────┘
│ ℹ️ Manual Creation Workflow                                 │
│ • Fill minimum: Title, Author(s), Date                      │
│ • Item will be marked as stored_custom                      │
└─────────────────────────────────────────────────────────────┘
```

### Manual Edit Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [← Back]  Edit Zotero Citation          [Unsaved changes]  │
│           Update citation metadata to complete fields        │
│                                                              │
│ Source URL: https://example.com        Item Key: ABC123    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠️  Citation Incomplete: Missing title, date                │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Citation Preview                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Smith, J. (2024). Example Article. Journal Name.     │  │
│ │ https://example.com                                   │  │
│ │                                                        │  │
│ │ Missing: title, date                                   │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Edit Metadata                                   [Save ▼]   │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Item Type: [Journal Article ▼]                        │  │
│ │                                                        │  │
│ │ *Title: ____________________________________           │  │
│ │                                                        │  │
│ │ *Authors:                                              │  │
│ │   [Smith] [John]  [x]                                 │  │
│ │   [+ Add Author]                                       │  │
│ │                                                        │  │
│ │ *Date: __________                                      │  │
│ │                                                        │  │
│ │ Publication Title: _______________________             │  │
│ │                                                        │  │
│ │ [... more fields ...]                                  │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Unsaved changes                    [Cancel] [Save Changes] │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### From URLDetailPanel

**Edit Citation Button:**
```typescript
<QuickActionsSection
  url={url}
  onEditCitation={() => router.push(`/urls/${url.id}/manual/edit`)}
  // ... other handlers
/>
```

**Manual Create Button:**
```typescript
<QuickActionsSection
  url={url}
  onManualCreate={() => router.push(`/urls/${url.id}/manual/create`)}
  // ... other handlers
/>
```

### From URLTableRow

The URLTableRow component has action buttons that can be wired similarly:
- "Manual Create" → Opens manual create page
- "Edit Citation" → Opens manual edit page

---

## Workflow Integration

### Manual Create Workflow

```
User Journey:
  1. URL has status: exhausted, failed, or awaiting_*
  2. User clicks "Create Manual Item" in QuickActions
  3. Navigates to /urls/[id]/manual/create
     ↓
  4. Page loads:
     - Fetches URL data
     - Pre-fills metadata from extracted data
     - Shows content viewer
     ↓
  5. User reviews content
  6. User fills metadata form
  7. User clicks "Create Item"
     ↓
  8. Server action: createCustomZoteroItem()
     - Creates item in Zotero
     - Updates URL: processingStatus = 'stored_custom'
     - Creates zotero_item_links record
     - Records in processing history
     ↓
  9. Success message shown
  10. Auto-redirects to /urls after 1.5s
  11. URL appears with status: stored_custom
```

### Manual Edit Workflow

```
User Journey:
  1. URL has status: stored_incomplete
  2. User clicks "Edit Citation" in QuickActions
  3. Navigates to /urls/[id]/manual/edit
     ↓
  4. Page loads:
     - Fetches URL and Zotero item metadata
     - Shows missing fields warning
     - Displays citation preview
     - Loads metadata editor
     ↓
  5. User sees missing fields highlighted
  6. User fills in missing information
  7. Citation preview updates live
  8. User clicks "Save Changes"
     ↓
  9. Server action: updateCitation()
     - Updates item in Zotero
     - Revalidates citation
     - If complete: transitions stored_incomplete → stored
     - Updates URL record
     ↓
  10. Success message shown
  11. If citation complete:
      - Auto-redirects to /urls after 2s
      - URL status changes to 'stored'
  12. If still incomplete:
      - Stays on page
      - Shows updated missing fields
```

---

## State Machine Integration

### Manual Create

**Transitions:**
```
FROM: any state (not_started, exhausted, awaiting_*, etc.)
  ↓
TO: stored_custom
  ↓
Updates:
  - processingStatus = 'stored_custom'
  - zoteroItemKey = [new item key]
  - citationValidationStatus = 'valid'
  - createdByTheodore = true
  - History: adds manual creation attempt
```

### Manual Edit

**Transitions:**
```
FROM: stored_incomplete
  ↓
TO: stored (if citation becomes complete)
  ↓
Updates:
  - processingStatus = 'stored' (only if complete)
  - citationValidationStatus = 'valid' or 'incomplete'
  - citationValidationDetails = { missingFields: [...] }
  - Zotero item updated with new metadata
```

---

## Component Reuse

Both pages leverage existing components:

### Shared Components
- **ContentViewer** - Multi-mode content display
- **MetadataForm** - Zotero item creation form
- **MetadataEditor** - Zotero item editing form
- **CitationPreview** - Live APA citation preview
- **Button** - UI component
- **Dialog** (for modal versions) - Not used in full-page versions

### Server Actions
- **createCustomZoteroItem** - Creates item and updates state
- **updateCitation** - Updates item and revalidates
- **getMetadataForManualCreation** - Pre-fills form
- **getMissingCitationFields** - Detects incomplete fields
- **getZoteroItemMetadata** - Fetches current item data
- **getUrlWithCapabilitiesById** - Loads URL with capabilities

---

## User Experience Enhancements

### Manual Create Page

**Pre-Population:**
- Automatically loads extracted metadata if available
- Sets default item type to 'webpage'
- Includes current URL
- Sets access date to today

**Content Viewing:**
- Switch between Iframe, Reader, and Raw HTML views
- PDF viewer for PDF files
- Side-by-side with form for easy reference
- Resizable panels (future enhancement)

**Validation:**
- Required fields marked with *
- Real-time validation
- Preview citation as you type
- Clear error messages

**Success Flow:**
- Success message with item key
- Auto-redirect after 1.5s
- Updated URL list
- Item appears in Zotero immediately

### Manual Edit Page

**Visual Feedback:**
- Missing fields warning banner
- Citation preview updates live
- Unsaved changes indicator
- Save button in two locations (header + footer)

**Validation:**
- Missing fields highlighted in red
- Real-time citation preview
- Shows current validation status
- Clear success/error messages

**Smart Behavior:**
- Detects if citation becomes complete
- Auto-transitions state when complete
- Auto-redirects only when complete
- Stays on page if still incomplete

---

## Error Handling

### Manual Create

**No URL Found:**
```
Error: URL not found
[← Back to URLs]
```

**Missing Required Fields:**
```
Error: Title is required
Error: At least one creator is required
```

**Zotero API Failure:**
```
Error: Failed to create item in Zotero
[User can retry]
```

### Manual Edit

**No Zotero Item:**
```
Error: This URL is not linked to a Zotero item.
Use "Create" instead of "Edit".
[← Back to URLs]
```

**Failed to Load Metadata:**
```
Error: Failed to load Zotero item metadata
[← Back to URLs]
```

**Update Failed:**
```
Error: Failed to update citation
[User can retry save]
```

---

## Key Features

### 1. Pre-Population
Both pages intelligently pre-fill forms with available data:
- **Create**: Extracted metadata from content analysis
- **Edit**: Current Zotero item metadata

### 2. Real-Time Validation
- Required fields marked clearly
- Live citation preview
- Missing fields detection
- Validation on save

### 3. Unsaved Changes Protection
- Tracks changes in edit mode
- Warns before leaving page
- Visual indicator in header
- Prevents accidental data loss

### 4. Auto-Navigation
- **Create**: Redirects after successful creation (1.5s delay)
- **Edit**: Redirects only when citation becomes complete (2s delay)
- Gives user time to see success message
- Refreshes URL list automatically

### 5. Content Viewing (Create Only)
- Iframe preview - Live webpage
- Reader mode - Cleaned content
- Raw HTML - Source code
- PDF viewer - For PDF files

---

## Integration Triggers

### Where Users Access These Pages

**1. From URL Detail Panel**
```
QuickActionsSection:
  - "Create Manual Item" → /urls/[id]/manual/create
  - "Edit Citation" → /urls/[id]/manual/edit
```

**2. From URL Table Row**
```
Action Buttons:
  - "Manual Create" → Can route to create page
  - "Edit Citation" → Can route to edit page
```

**3. From Smart Suggestions**
```
When exhausted:
  - "Create Manually" → /urls/[id]/manual/create

When stored_incomplete:
  - "Edit Citation" → /urls/[id]/manual/edit
```

**4. From Manual Create Modal** (Alternative)
```
Modal version still available:
  - QuickActions can open modal instead
  - Or route to full page based on preference
```

---

## State Transitions

### Create → stored_custom

```typescript
// Before
processingStatus: 'exhausted' | 'not_started' | 'awaiting_*'

// Server Action
await createCustomZoteroItem(urlId, metadata);

// After
processingStatus: 'stored_custom'
zoteroItemKey: 'ABC123'
citationValidationStatus: 'valid'
createdByTheodore: true
linkedUrlCount: 1

// History Entry
{
  timestamp: Date.now(),
  stage: 'manual',
  success: true,
  itemKey: 'ABC123',
  metadata: { title, creators: 2 }
}
```

### Edit → stored (if complete)

```typescript
// Before
processingStatus: 'stored_incomplete'
citationValidationStatus: 'incomplete'
citationValidationDetails: { missingFields: ['title', 'date'] }

// Server Action
await updateCitation(urlId, itemKey, updatedMetadata);

// After (if now complete)
processingStatus: 'stored'
citationValidationStatus: 'valid'
citationValidationDetails: { missingFields: [] }

// Transition Entry
{
  transition: {
    from: 'stored_incomplete',
    to: 'stored'
  },
  metadata: { reason: 'Citation completed by user' }
}
```

---

## Code Structure

### Manual Create Page

```typescript
export default function ManualCreatePage({ params }) {
  // URL and metadata state
  const [urlData, setUrlData] = useState(null);
  const [metadata, setMetadata] = useState(defaultMetadata);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Load URL and pre-fill metadata
  const loadData = async () => {
    const urlResult = await getUrlWithCapabilitiesById(urlId);
    const metadataResult = await getMetadataForManualCreation(urlId);
    // Pre-populate form
  };
  
  // Handle form submission
  const handleSubmit = async (formMetadata) => {
    const result = await createCustomZoteroItem(urlId, formMetadata);
    // Show success, redirect
  };
  
  return (
    <div>
      <Header />
      <Messages />
      <ContentAndForm />
      <FooterInfo />
    </div>
  );
}
```

### Manual Edit Page

```typescript
export default function ManualEditPage({ params }) {
  // Data state
  const [urlData, setUrlData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Load URL and Zotero item
  const loadData = async () => {
    const urlResult = await getUrlWithCapabilitiesById(urlId);
    const metadataResult = await getZoteroItemMetadata(itemKey);
    const missingResult = await getMissingCitationFields(urlId);
    // Load all data
  };
  
  // Handle save
  const handleSave = async (updatedMetadata) => {
    const result = await updateCitation(urlId, itemKey, updatedMetadata);
    // Revalidate, check if complete, redirect if complete
  };
  
  return (
    <div>
      <Header />
      <Messages />
      <CitationPreview />
      <MetadataEditor />
      <FooterActions />
    </div>
  );
}
```

---

## Testing Checklist

### Manual Create Page

#### Data Loading
- [ ] Page loads URL data correctly
- [ ] Pre-populates metadata from extracted data
- [ ] Shows loading spinner while loading
- [ ] Handles URL not found error
- [ ] Content viewer loads correctly

#### Content Viewing
- [ ] Iframe mode shows live webpage
- [ ] Reader mode shows cleaned content
- [ ] Raw mode shows source HTML
- [ ] PDF mode shows embedded PDF
- [ ] Can switch between modes

#### Form Functionality
- [ ] Can edit all metadata fields
- [ ] Required fields are marked
- [ ] Can add/remove creators
- [ ] Item type selector works
- [ ] Citation preview updates (if available)

#### Submission
- [ ] Validates required fields
- [ ] Creates item in Zotero
- [ ] Updates URL status to stored_custom
- [ ] Shows success message
- [ ] Redirects to /urls after delay
- [ ] URL list refreshes

#### Error Handling
- [ ] Shows error for missing required fields
- [ ] Shows error if Zotero API fails
- [ ] Allows retry after error
- [ ] Cancel works with confirmation

### Manual Edit Page

#### Data Loading
- [ ] Page loads URL and Zotero item
- [ ] Shows missing fields warning
- [ ] Displays current citation
- [ ] Handles not found errors
- [ ] Handles no item key error

#### Citation Preview
- [ ] Shows current formatted citation
- [ ] Updates live as user types
- [ ] Shows missing fields in preview
- [ ] Format is correct (APA)

#### Editor Functionality
- [ ] All fields editable
- [ ] Missing fields highlighted
- [ ] Can add/remove creators
- [ ] Changes tracked correctly
- [ ] Unsaved changes indicator works

#### Saving
- [ ] Updates item in Zotero
- [ ] Revalidates citation
- [ ] Updates missing fields list
- [ ] Shows success message
- [ ] Transitions state if complete
- [ ] Redirects only if complete
- [ ] Stays on page if incomplete

#### Unsaved Changes
- [ ] Tracks changes correctly
- [ ] Shows indicator in header
- [ ] Warns before leaving page
- [ ] Cancel button works
- [ ] Clears after save

---

## Files Created/Modified

### New Files
1. ✅ `/dashboard/app/urls/[id]/manual/create/page.tsx` - Manual create page
2. ✅ `/dashboard/app/urls/[id]/manual/edit/page.tsx` - Manual edit page
3. ✅ `/docs/MANUAL_CREATION_PAGES_IMPLEMENTATION.md` - This document

### Modified Files
4. ✅ `/dashboard/components/urls/url-detail-panel.tsx` - Fixed route paths

### Existing Components Used
- `/dashboard/components/urls/url-modals/ContentViewer.tsx`
- `/dashboard/components/urls/url-modals/MetadataForm.tsx`
- `/dashboard/components/urls/url-modals/MetadataEditor.tsx`
- `/dashboard/components/urls/url-modals/CitationPreview.tsx`

### Server Actions Used
- `/dashboard/lib/actions/manual-creation.ts`
- `/dashboard/lib/actions/citation-editing.ts`
- `/dashboard/lib/actions/url-with-capabilities.ts`
- `/dashboard/lib/actions/zotero.ts`

---

## Future Enhancements

### Potential Additions

**1. Keyboard Shortcuts**
```typescript
- Cmd/Ctrl + S → Save
- Cmd/Ctrl + Enter → Create/Save
- Esc → Cancel/Go Back
```

**2. Auto-Save Draft**
```typescript
- Save form state to localStorage
- Restore on page reload
- Prevent data loss
```

**3. Metadata Suggestions**
```typescript
- Suggest similar items from Zotero
- Auto-complete publication titles
- Suggest creators from history
```

**4. Bulk Manual Creation**
```typescript
- Create multiple items at once
- Copy metadata between URLs
- Template-based creation
```

**5. AI-Assisted Extraction**
```typescript
- "Fill with AI" button
- Extract from visible content
- Smart field mapping
```

**6. Preview Improvements**
```typescript
- Multiple citation styles (APA, MLA, Chicago)
- Export formatted citation
- Copy to clipboard
```

**7. Collaboration Features**
```typescript
- Share draft with collaborators
- Review and approve workflow
- Comments on fields
```

---

## Comparison: Modal vs Full-Page

### Modal Version
✅ Quick access from table
✅ Stays in context
✅ Good for simple edits
❌ Limited screen space
❌ Can't see multiple modals
❌ Hard to compare with other sources

### Full-Page Version
✅ Maximum screen space
✅ Better for complex forms
✅ Easier content review
✅ Can open multiple tabs
✅ Better focus on task
✅ Clearer workflow separation

**Recommendation:** Keep both!
- **Modal** for quick actions from table
- **Full-page** for focused manual work

---

## Accessibility

### Keyboard Navigation
- Tab through all form fields
- Enter to submit
- Esc to cancel
- Arrow keys in selects

### Screen Readers
- Proper ARIA labels
- Required field announcements
- Error message announcements
- Success message announcements

### Visual
- High contrast mode support
- Clear focus indicators
- Large touch targets
- Readable font sizes

---

## Performance

### Page Load Time
- **Target**: < 2s
- Fetches only necessary data
- Parallel data loading
- Progressive rendering

### Content Loading
- **Target**: < 1s for cached content
- Uses cached content when available
- Falls back to live fetch if needed
- Shows loading states

### Form Performance
- **Target**: < 100ms input lag
- Debounced citation preview
- Optimized re-renders
- Efficient state updates

---

## Security Considerations

### Input Validation
- Server-side validation of all fields
- Required field enforcement
- Type checking
- Length limits

### Zotero Integration
- API key security
- Error message sanitization
- Rate limiting
- Timeout handling

### Data Privacy
- No external content loading in iframe (sandbox)
- Content served from cache when possible
- Secure content fetching
- No data leakage

---

## Related Documentation

- [URL Processing Refactor PRD](./URL_PROCESSING_REFACTOR_PRD.md) - Section 8.2
- [Orchestrator Fix Summary](./ORCHESTRATOR_FIX_SUMMARY.md)
- [Reset Functionality](./RESET_FUNCTIONALITY_SUMMARY.md)
- [Batch Processing Integration](./BATCH_PROCESSING_INTEGRATION.md)
- [Server Actions API](../docs/SERVER_ACTIONS_API.md)

---

## Quick Reference

### Manual Create
```bash
# Access
/urls/[id]/manual/create

# When to Use
- Automated processing failed (exhausted)
- User wants complete control
- Special item types
- Complex metadata

# Result
- Status: stored_custom
- Item created in Zotero
- Full metadata control
```

### Manual Edit
```bash
# Access
/urls/[id]/manual/edit

# When to Use
- Citation incomplete (stored_incomplete)
- Fix missing fields
- Update metadata
- Improve citation quality

# Result
- Status: stored (if complete)
- Zotero item updated
- Citation validated
```

---

**Implementation Status:** ✅ Complete  
**Integration Status:** ✅ Complete  
**Testing Status:** ⏳ Pending User Testing  
**Documentation:** ✅ Complete

---

**Last Updated:** November 15, 2025  
**Version:** 1.0

