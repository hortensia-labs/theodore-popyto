# URLDetailPanel Integration Guide

This guide shows how to integrate the new Phase 3 components into the existing URLDetailPanel.

---

## New Sections Created

1. **StatusSummarySection** - Processing status, user intent, attempts
2. **CapabilitiesSection** - Available processing methods
3. **ProcessingHistorySection** - Timeline of all processing attempts
4. **QuickActionsSection** - Context-aware action buttons

---

## Integration Steps

### Step 1: Import New Sections

Add to the top of `URLDetailPanel.tsx`:

```typescript
import { StatusSummarySection } from './StatusSummarySection';
import { CapabilitiesSection } from './CapabilitiesSection';
import { ProcessingHistorySection } from './ProcessingHistorySection';
import { QuickActionsSection } from './QuickActionsSection';
```

### Step 2: Update Props

The URLDetailPanel should now accept URLs with the new structure:

```typescript
interface URLDetailPanelProps {
  url: UrlWithCapabilitiesAndStatus; // Updated type
  onClose: () => void;
  onUpdate: () => void;
}
```

### Step 3: Add Sections to Layout

Insert the new sections in the detail panel layout:

```typescript
export function URLDetailPanel({ url, onClose, onUpdate }: URLDetailPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">URL Details</h2>
          <button onClick={onClose}>×</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* NEW: Status Summary */}
        <StatusSummarySection
          processingStatus={url.processingStatus}
          userIntent={url.userIntent}
          processingAttempts={url.processingAttempts}
          urlId={url.id}
          onUpdate={onUpdate}
        />

        {/* NEW: Capabilities */}
        {url.capability && (
          <CapabilitiesSection capability={url.capability} />
        )}

        {/* NEW: Quick Actions */}
        <QuickActionsSection
          url={{
            id: url.id,
            url: url.url,
            processingStatus: url.processingStatus,
            userIntent: url.userIntent,
            zoteroItemKey: url.zoteroItemKey,
            createdByTheodore: url.createdByTheodore,
            userModifiedInZotero: url.userModifiedInZotero,
            linkedUrlCount: url.linkedUrlCount,
            processingAttempts: url.processingAttempts,
            capability: url.capability,
          }}
          onProcess={() => {/* implement */}}
          onUnlink={() => {/* implement */}}
          onEditCitation={() => {/* implement */}}
          // ... other handlers
          onUpdate={onUpdate}
        />

        {/* Existing sections... */}
        {/* ... URL information, identifiers, etc. ... */}

        {/* NEW: Processing History (at bottom) */}
        {url.processingHistory && url.processingHistory.length > 0 && (
          <ProcessingHistorySection history={url.processingHistory} />
        )}
      </div>
    </div>
  );
}
```

### Step 4: Connect Action Handlers

Implement the action handlers that connect to server actions:

```typescript
const handleProcess = async () => {
  await processUrlWithZotero(url.id);
  onUpdate();
};

const handleUnlink = async () => {
  const confirmed = confirm('Unlink this URL from Zotero?');
  if (confirmed) {
    await unlinkUrlFromZotero(url.id);
    onUpdate();
  }
};

const handleEditCitation = () => {
  // Open edit citation modal
  setEditCitationModalOpen(true);
};

// ... etc for all actions
```

---

## Recommended Layout

```
┌─────────────────────────────────┐
│ Header                   [×]    │
├─────────────────────────────────┤
│                                 │
│ Status Summary                  │
│ ├─ Processing Status Badge      │
│ ├─ User Intent Selector         │
│ └─ Attempts Count               │
│                                 │
│ Capabilities                    │
│ ├─ Available Methods (icons)    │
│ └─ Recommendation               │
│                                 │
│ Quick Actions                   │
│ ├─ Process Button               │
│ ├─ Edit Button                  │
│ └─ ... (context-aware)          │
│                                 │
│ URL Information                 │
│ ├─ Domain, Status Code, etc.    │
│ └─ ... (existing content)       │
│                                 │
│ Identifiers                     │
│ └─ ... (existing content)       │
│                                 │
│ Metadata                        │
│ └─ ... (existing content)       │
│                                 │
│ Processing History              │
│ └─ Timeline of attempts         │
│                                 │
└─────────────────────────────────┘
```

---

## Testing

After integration, verify:

- [ ] Status summary displays correctly
- [ ] User intent can be changed
- [ ] Capabilities show available methods
- [ ] Quick actions show correct buttons
- [ ] Processing history displays attempts
- [ ] All actions trigger correctly
- [ ] Updates refresh the panel

---

## Notes

- The new sections are **standalone components** - can be added incrementally
- All sections handle missing data gracefully
- Responsive design maintained
- Consistent with existing UI patterns
- Type-safe prop interfaces

---

**Created:** November 14, 2025  
**Phase:** 3 - Core Components  
**Status:** Ready for integration

