# Server Actions API Reference

**Version:** 2.0 (Post-Refactor)  
**Last Updated:** November 14, 2025  
**Status:** Phase 2 Complete

---

## Overview

This document provides a complete reference for all server actions in the URL processing system. All actions are type-safe server actions (no API routes) designed for local-first operation.

---

## Table of Contents

1. [URL Query Actions](#url-query-actions)
2. [State Transition Actions](#state-transition-actions)
3. [Processing Actions](#processing-actions)
4. [Batch Processing Actions](#batch-processing-actions)
5. [Manual Creation Actions](#manual-creation-actions)
6. [Citation Editing Actions](#citation-editing-actions)
7. [Error Handling](#error-handling)

---

## URL Query Actions

### `getUrlsWithCapabilities(filters, pagination)`

Get URLs with computed capabilities and new status system.

**Parameters:**
```typescript
filters?: {
  sectionId?: number;
  processingStatus?: ProcessingStatus;
  userIntent?: UserIntent;
  domain?: string;
  search?: string;
  citationStatus?: 'valid' | 'incomplete';
  minAttempts?: number;
  maxAttempts?: number;
}

pagination?: {
  page: number;
  pageSize: number;
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    urls: UrlWithCapabilitiesAndStatus[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  };
  error?: string;
}
```

**Example:**
```typescript
// Get all URLs ready to process
const result = await getUrlsWithCapabilities({
  processingStatus: 'not_started',
  userIntent: 'auto',
}, { page: 1, pageSize: 50 });

if (result.success) {
  console.log(`Found ${result.data.urls.length} URLs`);
  result.data.urls.forEach(url => {
    console.log(`- ${url.url} (${url.capability.hasIdentifiers ? 'has IDs' : 'no IDs'})`);
  });
}
```

---

## State Transition Actions

### `transitionProcessingState(urlId, toStatus, metadata?)`

Manually transition a URL's processing status.

**Parameters:**
```typescript
urlId: number
toStatus: ProcessingStatus
metadata?: TransitionMetadata
```

**Returns:**
```typescript
{
  success: boolean;
  from?: ProcessingStatus;
  to?: ProcessingStatus;
  error?: string;
}
```

**Example:**
```typescript
await transitionProcessingState(
  123,
  'ignored',
  { reason: 'User requested' }
);
```

### `resetProcessingState(urlId)`

Reset URL to not_started and clear all processing history.

**Example:**
```typescript
const result = await resetProcessingState(123);
if (result.success) {
  console.log('Processing state reset');
}
```

### `setUserIntent(urlId, intent)`

Set user intent for a URL.

**Parameters:**
- `intent`: 'auto' | 'ignore' | 'priority' | 'manual_only' | 'archive'

**Example:**
```typescript
await setUserIntent(123, 'priority'); // Process this first
await setUserIntent(456, 'ignore');   // Skip this
```

### `ignoreUrl(urlId)` / `unignoreUrl(urlId)`

Convenience wrappers for ignore/unignore.

**Example:**
```typescript
await ignoreUrl(123);    // Mark as ignored
await unignoreUrl(123);  // Remove ignore
```

### `archiveUrl(urlId)`

Permanently archive a URL (hidden from default views).

**Example:**
```typescript
await archiveUrl(123);
```

---

## Processing Actions

### `processUrlWithZotero(urlId)`

Process a single URL through the complete workflow (uses orchestrator).

**Auto-Cascade Flow:**
1. Tries Zotero (identifier or URL translator)
2. On failure → Content extraction
3. On no identifiers → LLM extraction
4. On LLM failure → Exhausted

**Returns:**
```typescript
{
  urlId: number;
  success: boolean;
  itemKey?: string;
  method?: string;
  error?: string;
  isExisting?: boolean;
}
```

**Example:**
```typescript
const result = await processUrlWithZotero(123);

if (result.success) {
  console.log(`Stored in Zotero: ${result.itemKey}`);
} else if (result.status === 'awaiting_selection') {
  console.log('Identifiers found - user must select');
} else if (result.status === 'exhausted') {
  console.log('All methods failed - manual creation needed');
}
```

### `selectAndProcessIdentifier(urlId, identifierId)`

User selects an identifier and processes it.

**State Required:** `awaiting_selection`

**Example:**
```typescript
// Get identifiers first
const identifiers = await getIdentifiersWithPreviews(123);

// User selects one
const result = await selectAndProcessIdentifier(123, identifiers[0].id);
```

### `unlinkUrlFromZotero(urlId)`

Unlink URL from Zotero item (keeps item in library).

**Safety:** 
- Returns URL to `not_started` state
- Removes link record
- Updates link counts for other URLs

**Example:**
```typescript
const result = await unlinkUrlFromZotero(123);
```

### `deleteZoteroItemAndUnlink(urlId)`

Delete Zotero item AND unlink URL.

**Safety Checks:**
- Only deletes if created by Theodore
- Won't delete if user modified in Zotero
- Won't delete if linked to multiple URLs

**Example:**
```typescript
const result = await deleteZoteroItemAndUnlink(123);

if (!result.success && result.safetyCheckFailed) {
  console.error(`Cannot delete: ${result.reasons.join(', ')}`);
}
```

---

## Batch Processing Actions

### `startBatchProcessing(urlIds, options?)`

Process multiple URLs concurrently.

**Parameters:**
```typescript
urlIds: number[]
options?: {
  concurrency?: number;           // Default: 5
  respectUserIntent?: boolean;     // Default: true
  stopOnError?: boolean;          // Default: false
}
```

**Returns:**
```typescript
BatchProcessingSession
```

**Example:**
```typescript
const session = await startBatchProcessing(
  [1, 2, 3, 4, 5],
  { concurrency: 3, respectUserIntent: true }
);

console.log(`Session ${session.id} started`);
console.log(`Progress: ${session.completed.length}/${session.urlIds.length}`);
```

### `pauseBatch(sessionId)` / `resumeBatch(sessionId)` / `cancelBatch(sessionId)`

Control batch processing sessions.

**Example:**
```typescript
await pauseBatch('batch_123456');
// ... do something ...
await resumeBatch('batch_123456');
```

### `getBatchStatus(sessionId)`

Get current status of a batch session.

**Example:**
```typescript
const result = await getBatchStatus('batch_123456');
if (result.success) {
  const progress = (result.data.currentIndex / result.data.urlIds.length) * 100;
  console.log(`Progress: ${progress.toFixed(1)}%`);
}
```

---

## Manual Creation Actions

### `createCustomZoteroItem(urlId, metadata)`

Manually create a custom Zotero item.

**State:** Can be called from ANY state (escape hatch)

**Parameters:**
```typescript
metadata: Partial<ZoteroItem> & {
  title: string;           // Required
  creators: Creator[];     // Required
  itemType?: string;       // Default: 'webpage'
  url?: string;
  accessDate?: string;
  // ... other Zotero fields
}
```

**Returns:**
```typescript
{
  success: boolean;
  itemKey?: string;
  error?: string;
}
```

**Example:**
```typescript
const result = await createCustomZoteroItem(123, {
  title: 'My Article',
  creators: [
    { creatorType: 'author', firstName: 'John', lastName: 'Doe' }
  ],
  itemType: 'journalArticle',
  publicationTitle: 'Journal Name',
  date: '2023',
});

if (result.success) {
  console.log(`Created custom item: ${result.itemKey}`);
}
```

### `getContentForManualCreation(urlId)`

Get URL content for display in manual creation modal.

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    raw?: string;           // Raw HTML
    reader?: string;        // Cleaned/reader mode
    isPDF: boolean;
    pdfUrl?: string;
    cachedPath?: string;
  };
  error?: string;
}
```

**Example:**
```typescript
const result = await getContentForManualCreation(123);

if (result.success && result.data) {
  if (result.data.isPDF) {
    // Show PDF viewer
    showPDF(result.data.pdfUrl);
  } else {
    // Show HTML in iframe or reader mode
    showHTML(result.data.raw);
  }
}
```

### `getMetadataForManualCreation(urlId)`

Get any extracted metadata to pre-populate manual creation form.

**Example:**
```typescript
const result = await getMetadataForManualCreation(123);
if (result.success && result.data) {
  // Pre-fill form
  setFormData(result.data);
}
```

---

## Citation Editing Actions

### `updateCitation(urlId, itemKey, metadata)`

Update citation metadata for a stored Zotero item.

**State Required:** `stored` or `stored_incomplete`

**Parameters:**
```typescript
urlId: number
itemKey: string
metadata: Partial<ZoteroItem>
```

**Auto-Transitions:**
- If citation becomes complete: `stored_incomplete` → `stored`

**Example:**
```typescript
const result = await updateCitation(123, 'ABC123', {
  creators: [
    { creatorType: 'author', firstName: 'Jane', lastName: 'Smith' }
  ],
  date: '2024',
});

if (result.success && result.validationStatus === 'valid') {
  console.log('Citation is now complete!');
}
```

### `getCitationPreview(metadata)`

Get formatted citation preview in APA style.

**Example:**
```typescript
const result = await getCitationPreview({
  title: 'Test Article',
  creators: [{ creatorType: 'author', lastName: 'Doe', firstName: 'John' }],
  date: '2024',
});

console.log(result.citation);
// Output: "Doe, J. (2024). *Test Article*."
```

### `getMissingCitationFields(urlId)`

Get list of missing critical citation fields.

**Example:**
```typescript
const result = await getMissingCitationFields(123);
if (result.success) {
  console.log(`Missing: ${result.missingFields.join(', ')}`);
}
```

---

## Statistics Actions

### `getProcessingStatusDistribution()`

Get count of URLs by processing status.

**Returns:**
```typescript
{
  success: boolean;
  data?: Array<{
    status: ProcessingStatus;
    count: number;
  }>;
}
```

**Example:**
```typescript
const result = await getProcessingStatusDistribution();
if (result.success) {
  result.data.forEach(({ status, count }) => {
    console.log(`${status}: ${count}`);
  });
}
```

### `getUserIntentDistribution()`

Get count of URLs by user intent.

---

## Error Handling

All actions return a result object with `success` boolean:

```typescript
const result = await someAction(...);

if (result.success) {
  // Success - use result.data
} else {
  // Error - show result.error
  console.error(result.error);
}
```

### Common Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| "URL not found" | Invalid URL ID | Verify ID |
| "Invalid transition from X to Y" | State machine rejected | Check current state |
| "Cannot process URL (status: ...)" | Guard check failed | Check status/intent |
| "Cannot safely delete item: ..." | Safety check failed | Review reasons |
| "Title is required" | Validation failed | Provide required fields |

---

## Usage Patterns

### Pattern 1: Check Before Action

```typescript
import { StateGuards } from '@/lib/state-machine/state-guards';

const url = await getUrlWithCapabilitiesById(123);

if (StateGuards.canProcessWithZotero(url.data)) {
  await processUrlWithZotero(123);
}
```

### Pattern 2: Handle Processing Results

```typescript
const result = await processUrlWithZotero(123);

switch (result.status) {
  case 'stored':
    showSuccess('Stored successfully!');
    break;
  case 'stored_incomplete':
    showWarning('Stored but missing fields');
    break;
  case 'awaiting_selection':
    openIdentifierSelectionModal(123);
    break;
  case 'awaiting_metadata':
    openMetadataApprovalModal(123);
    break;
  case 'exhausted':
    openManualCreationModal(123);
    break;
}
```

### Pattern 3: Batch Processing with Progress

```typescript
const session = await startBatchProcessing(urlIds, {
  concurrency: 5,
  respectUserIntent: true,
});

// Poll for progress
const interval = setInterval(async () => {
  const status = await getBatchStatus(session.id);
  if (status.success && status.data) {
    const progress = status.data.currentIndex / status.data.urlIds.length;
    updateProgressBar(progress);
    
    if (status.data.status === 'completed') {
      clearInterval(interval);
      showResults(status.data);
    }
  }
}, 1000);
```

---

## Type Imports

```typescript
// Status types
import type {
  ProcessingStatus,
  UserIntent,
  ProcessingCapability,
} from '@/lib/types/url-processing';

// Action results
import type {
  ProcessingResult,
  TransitionResult,
  BatchProcessingSession,
} from '@/lib/types/url-processing';

// Zotero types
import type {
  ZoteroItem,
  Creator,
} from '@/lib/zotero-client';
```

---

## Complete Action List

### State Management
- ✅ `transitionProcessingState(urlId, toStatus, metadata?)`
- ✅ `resetProcessingState(urlId)`
- ✅ `setUserIntent(urlId, intent)`
- ✅ `ignoreUrl(urlId)`
- ✅ `unignoreUrl(urlId)`
- ✅ `archiveUrl(urlId)`
- ✅ `bulkIgnoreUrls(urlIds)`
- ✅ `bulkArchiveUrls(urlIds)`
- ✅ `bulkResetProcessingState(urlIds)`

### Processing
- ✅ `processUrlWithZotero(urlId)`
- ✅ `selectAndProcessIdentifier(urlId, identifierId)`
- ✅ `unlinkUrlFromZotero(urlId)`
- ✅ `deleteZoteroItemAndUnlink(urlId)`
- ✅ `bulkUnlinkFromZotero(urlIds)`
- ✅ `bulkDeleteZoteroItemsAndUnlink(urlIds)`

### Batch Processing
- ✅ `startBatchProcessing(urlIds, options?)`
- ✅ `pauseBatch(sessionId)`
- ✅ `resumeBatch(sessionId)`
- ✅ `cancelBatch(sessionId)`
- ✅ `getBatchStatus(sessionId)`
- ✅ `getAllBatchSessions()`
- ✅ `cleanupOldSessions()`

### Manual Creation
- ✅ `createCustomZoteroItem(urlId, metadata)`
- ✅ `getContentForManualCreation(urlId)`
- ✅ `getMetadataForManualCreation(urlId)`

### Citation Editing
- ✅ `updateCitation(urlId, itemKey, metadata)`
- ✅ `getCitationPreview(metadata)`
- ✅ `getMissingCitationFields(urlId)`

### Queries
- ✅ `getUrlsWithCapabilities(filters, pagination)`
- ✅ `getUrlWithCapabilitiesById(id)`
- ✅ `getUrlsByProcessingStatus(status, limit)`
- ✅ `getUrlsByUserIntent(intent, limit)`
- ✅ `getProcessingStatusDistribution()`
- ✅ `getUserIntentDistribution()`

---

## Migration from Old System

### Old → New Mappings

| Old Action | New Action | Notes |
|------------|------------|-------|
| `getUrls()` | `getUrlsWithCapabilities()` | Now includes capabilities |
| `processUrlWithZotero()` | Same name, new implementation | Now uses orchestrator |
| N/A | `resetProcessingState()` | New functionality |
| N/A | `ignoreUrl()` | New functionality |
| N/A | `createCustomZoteroItem()` | New functionality |
| N/A | `updateCitation()` | New functionality |

### Breaking Changes

1. **URL objects now include:**
   - `processingStatus` (NEW)
   - `userIntent` (NEW)
   - `processingAttempts` (NEW)
   - `capability` (NEW)

2. **Processing now auto-cascades:**
   - Single call may trigger multiple stages
   - Check final `status` in result

3. **Safety checks added:**
   - Deletion requires safety validation
   - State transitions must be valid
   - Guards check before actions

---

**API Version:** 2.0  
**Phase:** 2 Complete  
**Ready for:** Phase 3 (UI Components)

