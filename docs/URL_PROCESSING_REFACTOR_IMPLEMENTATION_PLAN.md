# URL Processing System Refactor - Implementation Plan

**Version:** 1.0  
**Date:** November 14, 2025  
**Related:** [PRD Document](./URL_PROCESSING_REFACTOR_PRD.md)  
**Timeline:** 6 weeks  
**Team Size:** 1-2 developers

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Foundation (Week 1)](#phase-1-foundation-week-1)
3. [Phase 2: Server Actions (Week 2)](#phase-2-server-actions-week-2)
4. [Phase 3: Core Components (Week 3)](#phase-3-core-components-week-3)
5. [Phase 4: Modals & UI (Week 4)](#phase-4-modals--ui-week-4)
6. [Phase 5: Advanced Features (Week 5)](#phase-5-advanced-features-week-5)
7. [Phase 6: Testing & Polish (Week 6)](#phase-6-testing--polish-week-6)
8. [Risk Management](#risk-management)
9. [Daily Workflow](#daily-workflow)
10. [Rollback Checkpoints](#rollback-checkpoints)

---

## Overview

### Project Goals

Transform the URL processing system from a confused, overlapping status system into a clear, automated workflow with user control and complete transparency.

### Success Metrics

- [ ] All URLs have unambiguous status
- [ ] Auto-cascade reduces manual intervention by 70%
- [ ] Users can ignore/archive URLs
- [ ] Complete audit trail for all processing
- [ ] Zero data loss during migration
- [ ] All existing functionality preserved

### Development Principles

1. **Incremental** - Each phase produces working code
2. **Testable** - Write tests alongside implementation
3. **Reversible** - Can rollback at any checkpoint
4. **Type-safe** - No `any` types, strict TypeScript
5. **Local-first** - Server actions, no API routes

---

## Phase 1: Foundation (Week 1)

**Goal:** Establish database schema, state machine, and core orchestrator logic

### Day 1: Database Schema Migration

#### Task 1.1: Prepare Migration Scripts (2 hours)

**File:** `dashboard/drizzle/migrations/0014_add_processing_status.sql`

```sql
-- Create migration file with:
-- 1. Add new columns
-- 2. Create zotero_item_links table
-- 3. Create indexes
-- 4. Migration logic
```

**Checklist:**

- [ ] Copy migration SQL from PRD
- [ ] Test on backup database
- [ ] Verify all indexes created
- [ ] Check foreign key constraints

**Validation:**

```bash
# Test migration on copy of production database
cp dashboard/data/thesis.db dashboard/data/thesis_backup.db
sqlite3 dashboard/data/thesis_backup.db < migration.sql
# Verify no errors
```

#### Task 1.2: Update Drizzle Schema (1 hour)

**File:** `dashboard/drizzle/schema.ts`

```typescript
// Add to urls table:
processingStatus: text('processing_status').notNull().default('not_started'),
userIntent: text('user_intent').notNull().default('auto'),
processingAttempts: integer('processing_attempts').notNull().default(0),
processingHistory: text('processing_history', { mode: 'json' }).$type<ProcessingAttempt[]>(),
lastProcessingMethod: text('last_processing_method'),
createdByTheodore: integer('created_by_theodore', { mode: 'boolean' }).default(false),
userModifiedInZotero: integer('user_modified_in_zotero', { mode: 'boolean' }).default(false),
linkedUrlCount: integer('linked_url_count').default(0),
```

**Checklist:**

- [ ] Add new columns to `urls` table schema
- [ ] Create `zoteroItemLinks` table schema
- [ ] Add TypeScript types for new fields
- [ ] Export new types

**Dependencies:** None

#### Task 1.3: Run Migration (30 minutes)

**Command:**

```bash
cd dashboard
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

**Checklist:**

- [ ] Generate migration files
- [ ] Apply migration to development DB
- [ ] Run validation queries from PRD
- [ ] Verify data integrity
- [ ] Create backup before production migration

**Validation Queries:**

```sql
-- Run all queries from PRD Section 10.3
SELECT COUNT(*) FROM urls WHERE processing_status NOT IN (...);
SELECT COUNT(*) FROM urls WHERE processing_status LIKE 'stored%' AND ...;
```

#### Task 1.4: Data Migration Script (2 hours)

**File:** `dashboard/scripts/migrate-url-statuses.ts`

```typescript
// Script to:
// 1. Convert old statuses to new
// 2. Build processing history
// 3. Create link records
// 4. Compute capabilities
// 5. Validate results
```

**Checklist:**

- [ ] Script converts all old statuses correctly
- [ ] Processing history populated from existing data
- [ ] Link records created for all stored URLs
- [ ] Dry-run mode for testing
- [ ] Progress reporting
- [ ] Error handling and logging

**Dependencies:** Task 1.3

### Day 2: Type Definitions & Core Logic

#### Task 1.5: Type Definitions (2 hours)

**File:** `dashboard/lib/types/url-processing.ts`

```typescript
export type ProcessingStatus = 
  | 'not_started'
  | 'processing_zotero'
  | 'processing_content'
  | 'processing_llm'
  | 'awaiting_selection'
  | 'awaiting_metadata'
  | 'stored'
  | 'stored_incomplete'
  | 'stored_custom'
  | 'exhausted'
  | 'ignored'
  | 'archived';

export type UserIntent = 
  | 'auto'
  | 'ignore'
  | 'priority'
  | 'manual_only'
  | 'archive';

export interface ProcessingCapability {
  hasIdentifiers: boolean;
  hasWebTranslators: boolean;
  hasContent: boolean;
  isAccessible: boolean;
  canUseLLM: boolean;
  isPDF: boolean;
  manualCreateAvailable: boolean;
}

export interface ProcessingAttempt {
  timestamp: number;
  stage: 'zotero_identifier' | 'zotero_url' | 'content_extraction' | 'llm' | 'manual';
  method?: string;
  success: boolean;
  error?: string;
  errorCategory?: ErrorCategory;
  itemKey?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type ErrorCategory = 
  | 'network'
  | 'http_client'
  | 'http_server'
  | 'parsing'
  | 'validation'
  | 'zotero_api'
  | 'rate_limit'
  | 'permanent'
  | 'unknown';

// ... more types
```

**Checklist:**

- [ ] All status types defined
- [ ] Processing interfaces defined
- [ ] Error categories defined
- [ ] Export all types
- [ ] JSDoc comments for all types

**Dependencies:** None

#### Task 1.6: Error Categorization (1 hour)

**File:** `dashboard/lib/error-handling.ts`

```typescript
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('timeout') || message.includes('econnrefused')) {
      return 'network';
    }
    
    // HTTP errors
    if (message.includes('404') || message.includes('403')) {
      return 'permanent';
    }
    
    // ... more categorization
  }
  
  return 'unknown';
}

export function isPermanentError(error: unknown): boolean {
  return categorizeError(error) === 'permanent';
}

export function shouldRetry(error: unknown): boolean {
  const category = categorizeError(error);
  return ['network', 'http_server', 'rate_limit'].includes(category);
}
```

**Checklist:**

- [ ] Categorize all error types
- [ ] Helper functions for retry logic
- [ ] Tests for error categorization
- [ ] Export utility functions

**Dependencies:** Task 1.5

### Day 3: State Machine Implementation

#### Task 1.7: State Machine Core (4 hours)

**File:** `dashboard/lib/state-machine/url-processing-state-machine.ts`

**Implementation from PRD Section 6.1:**

- State transition rules
- Validation logic
- Transition history recording
- Side effect handling

**Checklist:**

- [ ] Define all valid transitions
- [ ] Implement `canTransition` method
- [ ] Implement `transition` method
- [ ] Record transitions in history
- [ ] Handle side effects
- [ ] Add error handling
- [ ] Add logging

**Test Coverage:**

- [ ] Test all valid transitions succeed
- [ ] Test invalid transitions fail
- [ ] Test history recording
- [ ] Test side effects trigger

**Dependencies:** Task 1.5

#### Task 1.8: State Guards (2 hours)

**File:** `dashboard/lib/state-machine/state-guards.ts`

**Implementation from PRD Section 6.2:**

- Guards for all actions
- Safety checks for deletion
- Capability checks

**Checklist:**

- [ ] Implement `canProcessWithZotero`
- [ ] Implement `canUnlink`
- [ ] Implement `canDeleteZoteroItem`
- [ ] Implement `canManuallyCreate`
- [ ] Implement `canReset`
- [ ] Implement `shouldAutoCascade`

**Test Coverage:**

- [ ] Test each guard with valid conditions
- [ ] Test each guard with invalid conditions
- [ ] Test edge cases (multiple URLs, user modified, etc.)

**Dependencies:** Task 1.7

### Day 4: Processing Orchestrator

#### Task 1.9: Orchestrator Core (4 hours)

**File:** `dashboard/lib/orchestrator/url-processing-orchestrator.ts`

**Implementation from PRD Section 7.1:**

- Main `processUrl` method
- Stage 1: Zotero processing
- Stage 2: Content processing
- Stage 3: LLM processing
- Failure handling and auto-cascade

**Checklist:**

- [ ] Implement main entry point
- [ ] Implement Zotero processing stage
- [ ] Implement content processing stage
- [ ] Implement LLM processing stage
- [ ] Implement failure handlers
- [ ] Implement auto-cascade logic
- [ ] Add comprehensive logging

**Test Coverage:**

- [ ] Test successful Zotero processing
- [ ] Test Zotero failure → content cascade
- [ ] Test content failure → LLM cascade
- [ ] Test LLM failure → exhausted
- [ ] Test user intent respect

**Dependencies:** Task 1.7, 1.8

#### Task 1.10: Helper Functions (2 hours)

**File:** `dashboard/lib/orchestrator/processing-helpers.ts`

```typescript
export async function recordProcessingAttempt(
  urlId: number,
  attempt: ProcessingAttempt
): Promise<void>;

export async function getUrlWithCapabilities(
  urlId: number
): Promise<UrlWithCapabilities>;

export async function validateCitation(
  itemKey: string
): Promise<CitationValidation>;
```

**Checklist:**

- [ ] Implement `recordProcessingAttempt`
- [ ] Implement `getUrlWithCapabilities`
- [ ] Implement `validateCitation`
- [ ] Add error handling
- [ ] Add logging

**Dependencies:** Task 1.9

### Day 5: Testing & Documentation

#### Task 1.11: Unit Tests (4 hours)

**Files:**

- `dashboard/__tests__/state-machine.test.ts`
- `dashboard/__tests__/orchestrator.test.ts`
- `dashboard/__tests__/error-categorization.test.ts`

**Checklist:**

- [ ] Test state machine transitions
- [ ] Test orchestrator workflows
- [ ] Test error categorization
- [ ] Test guards
- [ ] Test helper functions
- [ ] Achieve 80%+ coverage

**Dependencies:** All previous tasks

#### Task 1.12: Phase 1 Documentation (2 hours)

**File:** `dashboard/docs/PHASE_1_COMPLETION.md`

Document:

- Migration results
- Test coverage
- Known issues
- Next steps

**Checklist:**

- [ ] Document migration results
- [ ] List all new files
- [ ] Document API changes
- [ ] Note any issues found

**Dependencies:** Task 1.11

### Phase 1 Checkpoint

**Deliverables:**

- ✅ Database schema migrated
- ✅ State machine implemented and tested
- ✅ Processing orchestrator core functional
- ✅ Unit tests passing
- ✅ Documentation complete

**Validation:**

```bash
# Run tests
pnpm test

# Verify migration
pnpm tsx scripts/validate-migration.ts

# Check types
pnpm tsc --noEmit
```

**Go/No-Go Decision:**

- All tests passing? → Proceed
- Migration validated? → Proceed
- Any critical issues? → Fix before Phase 2

---

## Phase 2: Server Actions (Week 2)

**Goal:** Refactor and create server actions for the new system

### Day 1: Core Action Refactors

#### Task 2.1: Update URL Actions (3 hours)

**File:** `dashboard/lib/actions/urls.ts`

**Changes:**

- Update `getUrls` to filter by new statuses
- Add capability computation
- Update sorting/filtering

```typescript
export async function getUrls(
  filters: UrlFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 100 }
) {
  // Use new processing_status field
  // Add user_intent filtering
  // Compute capabilities
}
```

**Checklist:**

- [ ] Update `getUrls` with new filters
- [ ] Add `getUserIntent` filter
- [ ] Add `getByProcessingStatus` filter
- [ ] Compute capabilities for each URL
- [ ] Update return types

**Dependencies:** Phase 1 complete

#### Task 2.2: Refactor Zotero Actions (4 hours)

**File:** `dashboard/lib/actions/zotero.ts`

**Changes:**

- Use orchestrator instead of direct processing
- Update to new status system
- Add link tracking

```typescript
export async function processUrlWithZotero(urlId: number) {
  // Delegate to orchestrator
  return URLProcessingOrchestrator.processUrl(urlId);
}
```

**Checklist:**

- [ ] Update `processUrlWithZotero` to use orchestrator
- [ ] Update `unlinkUrlFromZotero` with safety checks
- [ ] Update `deleteZoteroItemAndUnlink` with link tracking
- [ ] Add `createCustomZoteroItem` action
- [ ] Update status transitions

**Dependencies:** Task 2.1

### Day 2: New Actions - State Management

#### Task 2.3: State Transition Actions (3 hours)

**File:** `dashboard/lib/actions/state-transitions.ts`

```typescript
export async function transitionProcessingState(
  urlId: number,
  to: ProcessingStatus,
  metadata?: TransitionMetadata
): Promise<Result>;

export async function resetProcessingState(
  urlId: number
): Promise<Result>;

export async function setUserIntent(
  urlId: number,
  intent: UserIntent
): Promise<Result>;
```

**Checklist:**

- [ ] Implement `transitionProcessingState`
- [ ] Implement `resetProcessingState`
- [ ] Implement `setUserIntent`
- [ ] Add validation
- [ ] Add error handling
- [ ] Add logging

**Dependencies:** Phase 1

#### Task 2.4: Identifier Selection Action (2 hours)

**File:** `dashboard/lib/actions/identifier-selection.ts`

```typescript
export async function selectIdentifierAndProcess(
  urlId: number,
  identifierId: number
): Promise<ProcessingResult>;
```

**Checklist:**

- [ ] Get selected identifier
- [ ] Validate identifier
- [ ] Process with Zotero using selected identifier
- [ ] Handle success/failure
- [ ] Update status

**Dependencies:** Task 2.2

#### Task 2.5: Metadata Approval Action (2 hours)

**File:** `dashboard/lib/actions/metadata-approval.ts`

```typescript
export async function approveAndStoreMetadata(
  urlId: number,
  metadata: ExtractedMetadata,
  attachSnapshot?: boolean
): Promise<Result>;

export async function rejectMetadata(
  urlId: number,
  reason?: string
): Promise<Result>;
```

**Checklist:**

- [ ] Validate metadata quality
- [ ] Create Zotero item from metadata
- [ ] Attach snapshot if requested
- [ ] Update status to stored/stored_incomplete
- [ ] Handle rejection

**Dependencies:** Task 2.2

### Day 3: Batch Processing

#### Task 2.6: Batch Processor (4 hours)

**File:** `dashboard/lib/orchestrator/batch-processor.ts`

**Implementation from PRD Section 7.2:**

- Concurrent processing with limits
- Session management
- Pause/Resume functionality
- Progress tracking

**Checklist:**

- [ ] Implement `processBatch`
- [ ] Add concurrency control (p-limit)
- [ ] Implement pause/resume
- [ ] Implement cancel
- [ ] Session persistence
- [ ] Progress events

**Dependencies:** Task 2.2

#### Task 2.7: Batch Processing Actions (2 hours)

**File:** `dashboard/lib/actions/batch-actions.ts`

```typescript
export async function startBatchProcessing(
  urlIds: number[],
  options?: BatchOptions
): Promise<BatchSession>;

export async function pauseBatch(sessionId: string): Promise<Result>;
export async function resumeBatch(sessionId: string): Promise<Result>;
export async function cancelBatch(sessionId: string): Promise<Result>;
export async function getBatchStatus(sessionId: string): Promise<BatchSession>;
```

**Checklist:**

- [ ] Implement all batch actions
- [ ] Respect user intent in batch operations
- [ ] Add error handling
- [ ] Add progress reporting

**Dependencies:** Task 2.6

### Day 4: Manual Creation & Citation Editing

#### Task 2.8: Manual Creation Action (3 hours)

**File:** `dashboard/lib/actions/manual-creation.ts`

```typescript
export async function createCustomZoteroItem(
  urlId: number,
  metadata: ZoteroItem
): Promise<Result>;

export async function getContentForManualCreation(
  urlId: number
): Promise<ContentViews>;

interface ContentViews {
  raw: string;
  reader: string;
  isPDF: boolean;
  pdfUrl?: string;
}
```

**Checklist:**

- [ ] Implement `createCustomZoteroItem`
- [ ] Create item in Zotero
- [ ] Link to URL
- [ ] Update status to `stored_custom`
- [ ] Implement `getContentForManualCreation`
- [ ] Return raw HTML
- [ ] Return reader-mode version
- [ ] Return PDF URL if applicable

**Dependencies:** Task 2.2

#### Task 2.9: Citation Editing Action (2 hours)

**File:** `dashboard/lib/actions/citation-editing.ts`

```typescript
export async function updateCitation(
  urlId: number,
  itemKey: string,
  metadata: Partial<ZoteroItem>
): Promise<Result>;

export async function getCitationPreview(
  metadata: ZoteroItem
): Promise<string>;
```

**Checklist:**

- [ ] Implement `updateCitation`
- [ ] Update Zotero item
- [ ] Revalidate citation
- [ ] Update status if now complete
- [ ] Implement `getCitationPreview`
- [ ] Format in APA style

**Dependencies:** Task 2.2

### Day 5: Testing & Integration

#### Task 2.10: Integration Tests (4 hours)

**Files:**

- `dashboard/__tests__/integration/url-workflow.test.ts`
- `dashboard/__tests__/integration/batch-processing.test.ts`

**Test Scenarios:**

- Complete Zotero workflow
- Auto-cascade workflow
- Batch processing
- Manual creation
- Citation editing
- State transitions

**Checklist:**

- [ ] Test complete workflows
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Mock external services
- [ ] Achieve 80%+ coverage

**Dependencies:** All previous tasks

#### Task 2.11: Action Documentation (2 hours)

**File:** `dashboard/docs/SERVER_ACTIONS.md`

Document all new and updated actions:

- Parameters
- Return types
- Usage examples
- Error handling

**Dependencies:** All previous tasks

### Phase 2 Checkpoint

**Deliverables:**

- ✅ All server actions refactored/created
- ✅ Batch processing functional
- ✅ Integration tests passing
- ✅ API documentation complete

**Validation:**

```bash
# Run integration tests
pnpm test:integration

# Verify all actions work
pnpm tsx scripts/test-actions.ts
```

---

## Phase 3: Core Components (Week 3)

**Goal:** Refactor URLTable and create core UI components

### Day 1: Custom Hooks

#### Task 3.1: URL Filters Hook (2 hours)

**File:** `dashboard/components/urls/url-table/hooks/useURLFilters.ts`

```typescript
export function useURLFilters() {
  const [filters, setFilters] = useState<UrlFilters>({});
  
  return {
    values: filters,
    update: (key: string, value: unknown) => {...},
    clear: () => {...},
    apply: async () => {...},
  };
}
```

**Checklist:**

- [ ] State management for all filters
- [ ] Update individual filters
- [ ] Clear all filters
- [ ] Apply filters (trigger fetch)
- [ ] Persist to URL params

**Dependencies:** Phase 2 complete

#### Task 3.2: URL Selection Hook (2 hours)

**File:** `dashboard/components/urls/url-table/hooks/useURLSelection.ts`

```typescript
export function useURLSelection(urls: UrlWithStatus[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  return {
    ids: Array.from(selectedIds),
    count: selectedIds.size,
    allSelected: selectedIds.size === urls.length,
    toggle: (id: number) => {...},
    toggleAll: () => {...},
    clear: () => {...},
  };
}
```

**Checklist:**

- [ ] Track selected IDs
- [ ] Toggle individual selection
- [ ] Select/deselect all
- [ ] Clear selection
- [ ] Computed properties

**Dependencies:** None

#### Task 3.3: URL Processing Hook (3 hours)

**File:** `dashboard/components/urls/url-table/hooks/useURLProcessing.ts`

```typescript
export function useURLProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  return {
    isProcessing,
    error,
    processSingle: async (urlId: number) => {...},
    processBatch: async (urlIds: number[]) => {...},
    reset: () => {...},
  };
}
```

**Checklist:**

- [ ] Processing state management
- [ ] Single URL processing
- [ ] Batch processing
- [ ] Error handling
- [ ] Loading states

**Dependencies:** Phase 2

### Day 2: Status Indicators

#### Task 3.4: Processing Status Badge (2 hours)

**File:** `dashboard/components/urls/url-status/ProcessingStatusBadge.tsx`

```typescript
interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  showLabel?: boolean;
  animated?: boolean;
}
```

**Checklist:**

- [ ] Badge for each status type
- [ ] Color coding from PRD
- [ ] Icons for each status
- [ ] Animated loader for processing states
- [ ] Tooltip with status description

**Dependencies:** None

#### Task 3.5: Capability Indicator (2 hours)

**File:** `dashboard/components/urls/url-status/CapabilityIndicator.tsx`

```typescript
interface CapabilityIndicatorProps {
  capability: ProcessingCapability;
  compact?: boolean;
}
```

**Checklist:**

- [ ] Show available processing methods
- [ ] Icon for each capability
- [ ] Tooltip with details
- [ ] Compact mode for tables
- [ ] Expanded mode for detail panel

**Dependencies:** None

#### Task 3.6: Intent Badge (1 hour)

**File:** `dashboard/components/urls/url-status/IntentBadge.tsx`

```typescript
interface IntentBadgeProps {
  intent: UserIntent;
  onChangeIntent?: (intent: UserIntent) => void;
}
```

**Checklist:**

- [ ] Badge for each intent type
- [ ] Click to change (if editable)
- [ ] Color coding
- [ ] Tooltip

**Dependencies:** None

### Day 3: URLTable Refactor

#### Task 3.7: URLTableFilters Component (3 hours)

**File:** `dashboard/components/urls/url-table/URLTableFilters.tsx`

**From PRD Section 9.3:**

- All filter inputs
- Apply/Clear buttons
- Filter chips for active filters

**Checklist:**

- [ ] Search input
- [ ] Section dropdown
- [ ] Domain dropdown
- [ ] Processing status checkboxes
- [ ] User intent checkboxes
- [ ] Capability checkboxes
- [ ] Citation status checkboxes
- [ ] Processing attempts filter
- [ ] Apply/Clear buttons
- [ ] Active filter chips

**Dependencies:** Task 3.1

#### Task 3.8: URLTableBulkActions Component (2 hours)

**File:** `dashboard/components/urls/url-table/URLTableBulkActions.tsx`

```typescript
interface BulkActionsProps {
  selectedCount: number;
  selectedIds: number[];
  onProcessComplete: () => void;
}
```

**Checklist:**

- [ ] Bulk process button
- [ ] Bulk ignore button
- [ ] Bulk archive button
- [ ] Bulk delete button
- [ ] Selection count display
- [ ] Confirm dialogs

**Dependencies:** Task 3.2, Task 3.3

#### Task 3.9: URLTableRow Component (3 hours)

**File:** `dashboard/components/urls/url-table/URLTableRow.tsx`

```typescript
interface URLTableRowProps {
  url: UrlWithStatus;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  onProcessComplete: () => void;
}
```

**Checklist:**

- [ ] Checkbox for selection
- [ ] URL link
- [ ] All status indicators
- [ ] Action buttons (dynamic based on state)
- [ ] Click to open detail panel
- [ ] Hover effects

**Dependencies:** Task 3.4, 3.5, 3.6

### Day 4: URLTable Main Component

#### Task 3.10: URLTable Component (4 hours)

**File:** `dashboard/components/urls/url-table/URLTable.tsx`

**From PRD Section 8.2:**

- Main orchestrator component
- Layout with filters, table, detail panel
- State management using hooks

**Checklist:**

- [ ] Component structure
- [ ] Use all custom hooks
- [ ] Sticky header with filters
- [ ] Table with rows
- [ ] Pagination
- [ ] Detail panel toggle
- [ ] Responsive layout
- [ ] Loading states
- [ ] Error states

**Dependencies:** Tasks 3.1-3.9

#### Task 3.11: URLDetailPanel Updates (2 hours)

**File:** `dashboard/components/urls/url-detail-panel/URLDetailPanel.tsx`

**Updates:**

- Show new status types
- Processing history timeline
- Capabilities display
- Smart suggestions integration

**Checklist:**

- [ ] Update to show new statuses
- [ ] Add processing history section
- [ ] Add capabilities section
- [ ] Integrate smart suggestions
- [ ] Update action buttons

**Dependencies:** Task 3.10

### Day 5: Testing & Polish

#### Task 3.12: Component Tests (4 hours)

**Files:**

- `dashboard/__tests__/components/*.test.tsx`

**Checklist:**

- [ ] Test all status badges render
- [ ] Test filters work correctly
- [ ] Test selection logic
- [ ] Test bulk actions
- [ ] Test table interactions
- [ ] Snapshot tests for visual regression

**Dependencies:** All component tasks

#### Task 3.13: Storybook Stories (2 hours)

**Files:**

- `dashboard/stories/*.stories.tsx`

Create stories for:

- All status badges
- Capability indicator
- Filter panel
- Table row variations
- Bulk actions

**Dependencies:** All component tasks

### Phase 3 Checkpoint

**Deliverables:**

- ✅ URLTable fully refactored
- ✅ All status indicators working
- ✅ Filters functional
- ✅ Component tests passing
- ✅ Storybook documentation

**Validation:**

```bash
# Run component tests
pnpm test:components

# Check Storybook
pnpm storybook
```

---

## Phase 4: Modals & UI (Week 4)

**Goal:** Create all modal dialogs and advanced UI components

### Day 1: Manual Creation Modal

#### Task 4.1: Content Viewer Component (4 hours)

**File:** `dashboard/components/urls/url-modals/ContentViewer.tsx`

**From PRD Section 8.2:**

- Iframe preview
- Reader mode
- Raw HTML view
- PDF viewer

**Checklist:**

- [ ] Tab navigation between views
- [ ] Iframe view with sandbox
- [ ] Reader mode (cleaned content)
- [ ] Raw HTML view with syntax highlighting
- [ ] PDF viewer (object tag or PDF.js)
- [ ] Loading states
- [ ] Error handling

**Dependencies:** Phase 2 (content loading action)

#### Task 4.2: Metadata Form Component (3 hours)

**File:** `dashboard/components/urls/url-modals/MetadataForm.tsx`

```typescript
interface MetadataFormProps {
  metadata: Partial<ZoteroItem>;
  onChange: (metadata: Partial<ZoteroItem>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}
```

**Checklist:**

- [ ] All critical fields (title, creators, date)
- [ ] Item type selector
- [ ] Creator fields (add/remove)
- [ ] Validation
- [ ] Submit button with loading state
- [ ] Preview of formatted citation

**Dependencies:** None

#### Task 4.3: Manual Creation Modal (2 hours)

**File:** `dashboard/components/urls/url-modals/ManualCreateModal.tsx`

**From PRD Section 8.2:**

- Side-by-side layout
- Content viewer + metadata form

**Checklist:**

- [ ] Modal with large size
- [ ] Split layout
- [ ] Content viewer on left
- [ ] Metadata form on right
- [ ] Submit action
- [ ] Success feedback
- [ ] Error handling

**Dependencies:** Task 4.1, 4.2

### Day 2: Citation Editor Modal

#### Task 4.4: Citation Preview Component (2 hours)

**File:** `dashboard/components/urls/url-modals/CitationPreview.tsx`

```typescript
interface CitationPreviewProps {
  metadata: ZoteroItem;
  style?: 'apa' | 'mla' | 'chicago';
}
```

**Checklist:**

- [ ] Render formatted citation
- [ ] Support APA style (primary)
- [ ] Highlight missing fields
- [ ] Copy to clipboard button
- [ ] Update on metadata change

**Dependencies:** Phase 2 (citation preview action)

#### Task 4.5: Metadata Editor Component (3 hours)

**File:** `dashboard/components/urls/url-modals/MetadataEditor.tsx`

```typescript
interface MetadataEditorProps {
  metadata: ZoteroItem;
  missingFields: string[];
  onChange: (metadata: ZoteroItem) => void;
}
```

**Checklist:**

- [ ] All Zotero fields editable
- [ ] Highlight missing critical fields
- [ ] Field validation
- [ ] Add/remove creators
- [ ] Add/remove tags
- [ ] Save button
- [ ] Revert changes button

**Dependencies:** None

#### Task 4.6: Edit Citation Modal (2 hours)

**File:** `dashboard/components/urls/url-modals/EditCitationModal.tsx`

**Checklist:**

- [ ] Modal dialog
- [ ] Citation preview at top
- [ ] Metadata editor below
- [ ] Save action
- [ ] Sync to Zotero
- [ ] Revalidate citation
- [ ] Success/error feedback

**Dependencies:** Task 4.4, 4.5

### Day 3: Selection & Approval Modals

#### Task 4.7: Identifier Card Component (2 hours)

**File:** `dashboard/components/urls/url-modals/IdentifierCard.tsx`

```typescript
interface IdentifierCardProps {
  identifier: UrlIdentifier;
  onSelect: () => void;
  onPreview: () => void;
}
```

**Checklist:**

- [ ] Display identifier type and value
- [ ] Show confidence level
- [ ] Show extraction source
- [ ] Preview button
- [ ] Select button
- [ ] Preview data (if available)

**Dependencies:** None

#### Task 4.8: Identifier Selection Modal (3 hours)

**File:** `dashboard/components/urls/url-modals/IdentifierSelectionModal.tsx`

**Checklist:**

- [ ] List all found identifiers
- [ ] Sort by confidence/priority
- [ ] Preview functionality
- [ ] Select and process button
- [ ] Loading state during processing
- [ ] Success/error feedback

**Dependencies:** Task 4.7, Phase 2

#### Task 4.9: Metadata Approval Modal (3 hours)

**File:** `dashboard/components/urls/url-modals/MetadataApprovalModal.tsx`

**Checklist:**

- [ ] Display extracted metadata
- [ ] Show quality score
- [ ] Show confidence scores per field
- [ ] Edit capability
- [ ] Approve button
- [ ] Reject button
- [ ] Processing feedback

**Dependencies:** Task 4.5, Phase 2

### Day 4: Processing History & Progress

#### Task 4.10: Processing Timeline Component (3 hours)

**File:** `dashboard/components/urls/processing-history/ProcessingTimeline.tsx`

```typescript
interface ProcessingTimelineProps {
  history: ProcessingAttempt[];
  compact?: boolean;
}
```

**Checklist:**

- [ ] Vertical timeline layout
- [ ] Icon for each stage
- [ ] Success/failure indicators
- [ ] Timestamps
- [ ] Error messages (if failed)
- [ ] Duration indicators
- [ ] Expandable details

**Dependencies:** None

#### Task 4.11: Processing History Modal (2 hours)

**File:** `dashboard/components/urls/url-modals/ProcessingHistoryModal.tsx`

**Checklist:**

- [ ] Modal dialog
- [ ] Full timeline view
- [ ] Export button
- [ ] Filter by stage/success
- [ ] Statistics summary

**Dependencies:** Task 4.10

#### Task 4.12: Batch Processing Progress Modal (3 hours)

**File:** `dashboard/components/urls/url-modals/BatchProgressModal.tsx`

**Checklist:**

- [ ] Progress bar
- [ ] Current/total counts
- [ ] Success/failure counts
- [ ] Live log of processing
- [ ] Pause button
- [ ] Resume button
- [ ] Cancel button
- [ ] Estimated time remaining

**Dependencies:** Phase 2 (batch processing)

### Day 5: Testing & Integration

#### Task 4.13: Modal Tests (3 hours)

**Files:**

- `dashboard/__tests__/modals/*.test.tsx`

**Test Coverage:**

- All modal open/close
- Form submissions
- Content viewer modes
- Timeline rendering
- Progress tracking

**Dependencies:** All modal tasks

#### Task 4.14: E2E Modal Workflows (3 hours)

**Files:**

- `dashboard/e2e/manual-creation.spec.ts`
- `dashboard/e2e/citation-editing.spec.ts`
- `dashboard/e2e/identifier-selection.spec.ts`

**Test Scenarios:**

- Complete manual creation workflow
- Edit citation workflow
- Select identifier workflow
- Approve metadata workflow
- View processing history

**Dependencies:** All modal tasks

### Phase 4 Checkpoint

**Deliverables:**

- ✅ All modals implemented
- ✅ Content viewer with all modes
- ✅ Citation editing functional
- ✅ Identifier selection working
- ✅ Processing history viewable
- ✅ Tests passing

**Validation:**

```bash
# Run modal tests
pnpm test:modals

# Run E2E tests
pnpm test:e2e
```

---

## Phase 5: Advanced Features (Week 5)

**Goal:** Implement smart suggestions, export, and polish features

### Day 1: Smart Suggestions System

#### Task 5.1: Suggestion Generator (3 hours)

**File:** `dashboard/lib/suggestions/url-suggestions.ts`

**From PRD Section 8.2:**

- Generate suggestions based on URL state
- Prioritize suggestions
- Action handlers

**Checklist:**

- [ ] Incomplete citation suggestions
- [ ] Failed Zotero with identifiers suggestion
- [ ] Multiple failures suggestion
- [ ] Exhausted state suggestion
- [ ] Ready to process suggestion
- [ ] Priority ordering
- [ ] Action handlers

**Dependencies:** Phase 2

#### Task 5.2: Suggestion Card Component (2 hours)

**File:** `dashboard/components/urls/suggestions/SuggestionCard.tsx`

```typescript
interface SuggestionCardProps {
  suggestion: Suggestion;
  onAction: () => void;
}
```

**Checklist:**

- [ ] Icon for suggestion type
- [ ] Message text
- [ ] Priority indicator
- [ ] Action button
- [ ] Dismiss button
- [ ] Styling by type/priority

**Dependencies:** Task 5.1

#### Task 5.3: Smart Suggestions Component (2 hours)

**File:** `dashboard/components/urls/suggestions/SmartSuggestions.tsx`

**Checklist:**

- [ ] List all suggestions
- [ ] Sort by priority
- [ ] Integrate with detail panel
- [ ] Integrate with table rows
- [ ] Action handlers

**Dependencies:** Task 5.2

### Day 2: Export & Analytics

#### Task 5.4: Export Processing History (3 hours)

**File:** `dashboard/lib/actions/export-history.ts`

```typescript
export async function exportProcessingHistory(
  filters?: UrlFilters
): Promise<ExportData>;

interface ExportData {
  urls: UrlExportRecord[];
  summary: ExportSummary;
  generatedAt: Date;
}
```

**Checklist:**

- [ ] Export to JSON
- [ ] Export to CSV
- [ ] Include all processing attempts
- [ ] Include summary statistics
- [ ] Apply filters
- [ ] Download functionality

**Dependencies:** Phase 2

#### Task 5.5: Analytics Dashboard Component (4 hours)

**File:** `dashboard/components/analytics/ProcessingAnalytics.tsx`

**Metrics:**

- Success rate by stage
- Average attempts per URL
- Most common errors
- Processing time statistics
- Status distribution

**Checklist:**

- [ ] Success rate charts
- [ ] Error distribution
- [ ] Processing time graphs
- [ ] Status pie chart
- [ ] Export analytics data

**Dependencies:** Task 5.4

### Day 3: Keyboard Shortcuts & Accessibility

#### Task 5.6: Keyboard Shortcuts (3 hours)

**File:** `dashboard/lib/hooks/useKeyboardShortcuts.ts`

**Shortcuts:**

- `p` - Process selected
- `i` - Ignore selected
- `m` - Manual create
- `Escape` - Close modals
- `?` - Show shortcuts help

**Checklist:**

- [ ] Implement shortcut handler
- [ ] Add help modal
- [ ] Test all shortcuts
- [ ] Document shortcuts
- [ ] Prevent conflicts

**Dependencies:** Phase 3, 4

#### Task 5.7: Accessibility Audit (3 hours)

**Checklist:**

- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels
- [ ] Focus management in modals
- [ ] Screen reader testing
- [ ] Color contrast validation
- [ ] Fix any issues found

**Dependencies:** All UI components

### Day 4: Performance Optimization

#### Task 5.8: Table Virtualization (4 hours)

**File:** `dashboard/components/urls/url-table/VirtualizedTable.tsx`

**For large datasets (1000+ URLs):**

- Use `@tanstack/react-virtual`
- Render only visible rows
- Maintain scroll position

**Checklist:**

- [ ] Implement virtualization
- [ ] Test with 10k URLs
- [ ] Maintain selection state
- [ ] Smooth scrolling
- [ ] Performance profiling

**Dependencies:** Phase 3

#### Task 5.9: Memoization & Optimization (2 hours)

**Optimize:**

- URL filtering
- Status computation
- Component re-renders

**Checklist:**

- [ ] Memoize expensive computations
- [ ] Use React.memo for components
- [ ] Optimize filter queries
- [ ] Profile with React DevTools
- [ ] Reduce re-renders

**Dependencies:** All components

### Day 5: Polish & Bug Fixes

#### Task 5.10: UI Polish (3 hours)

**Checklist:**

- [ ] Consistent spacing/padding
- [ ] Smooth transitions
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error states
- [ ] Success animations
- [ ] Tooltip consistency

**Dependencies:** All UI components

#### Task 5.11: Bug Fixes & Edge Cases (3 hours)

**Test and fix:**

- [ ] Network errors during processing
- [ ] Race conditions
- [ ] Concurrent processing conflicts
- [ ] Large batch operations
- [ ] Browser back/forward
- [ ] Page refresh during processing

**Dependencies:** All previous tasks

### Phase 5 Checkpoint

**Deliverables:**

- ✅ Smart suggestions working
- ✅ Export functionality complete
- ✅ Keyboard shortcuts implemented
- ✅ Accessibility compliant
- ✅ Performance optimized
- ✅ UI polished

**Validation:**

```bash
# Performance test
pnpm test:performance

# Accessibility audit
pnpm test:a11y

# E2E complete workflow
pnpm test:e2e:full
```

---

## Phase 6: Testing & Polish (Week 6)

**Goal:** Comprehensive testing, documentation, and production readiness

### Day 1: Comprehensive Testing

#### Task 6.1: Complete Unit Test Suite (4 hours)

**Achieve 90%+ coverage:**

- State machine: 100%
- Orchestrator: 95%
- Server actions: 90%
- Components: 85%
- Utilities: 95%

**Checklist:**

- [ ] Run coverage report
- [ ] Identify gaps
- [ ] Write missing tests
- [ ] Fix failing tests
- [ ] Document test patterns

**Dependencies:** All implementation

#### Task 6.2: Integration Test Suite (3 hours)

**Test complete workflows:**

- [ ] New URL → Analysis → Zotero → Stored
- [ ] Zotero failure → Content → Identifiers → Process
- [ ] Content failure → LLM → Approval → Stored
- [ ] All methods fail → Exhausted → Manual create
- [ ] Batch processing 100 URLs
- [ ] Unlink and re-process

**Dependencies:** All implementation

### Day 2: E2E Testing

#### Task 6.3: Critical Path E2E Tests (4 hours)

**Scenarios:**

1. Happy path: Process URL successfully
2. Auto-cascade: Zotero fails → content succeeds
3. Manual intervention: Select identifier
4. Citation editing: Fix incomplete citation
5. Manual creation: Create custom item
6. Batch processing: Process 50 URLs
7. Ignore workflow: Mark as ignored
8. Reset workflow: Reset and retry

**Checklist:**

- [ ] Write all scenario tests
- [ ] Tests pass consistently
- [ ] Screenshot comparison
- [ ] Performance benchmarks

**Dependencies:** All implementation

#### Task 6.4: Edge Case Testing (2 hours)

**Test:**

- [ ] Concurrent processing same URL
- [ ] Network interruption mid-process
- [ ] Zotero API unavailable
- [ ] Invalid identifiers
- [ ] Malformed PDFs
- [ ] Very long URLs
- [ ] Unicode in metadata
- [ ] Empty content

**Dependencies:** Task 6.3

### Day 3: Documentation

#### Task 6.5: User Guide (3 hours)

**File:** `docs/USER_GUIDE.md`

**Content:**

- Getting started
- Understanding statuses
- Processing URLs
- Manual creation
- Citation editing
- Batch operations
- Troubleshooting

**Checklist:**

- [ ] Write all sections
- [ ] Add screenshots
- [ ] Add examples
- [ ] Review for clarity

**Dependencies:** All features complete

#### Task 6.6: Developer Documentation (3 hours)

**File:** `docs/DEVELOPER_GUIDE.md`

**Content:**

- Architecture overview
- State machine explanation
- Adding new processing stages
- Creating new actions
- Testing guidelines
- Deployment guide

**Checklist:**

- [ ] Architecture diagrams
- [ ] Code examples
- [ ] API reference
- [ ] Testing guide

**Dependencies:** All features complete

### Day 4: Performance & Security

#### Task 6.7: Performance Audit (3 hours)

**Metrics to measure:**

- [ ] Initial page load < 2s
- [ ] Time to interactive < 3s
- [ ] Single URL processing < 5s
- [ ] Batch 100 URLs < 10min
- [ ] Filter application < 500ms
- [ ] Modal open < 300ms

**Checklist:**

- [ ] Run Lighthouse audit
- [ ] Profile with React DevTools
- [ ] Optimize bundle size
- [ ] Lazy load components
- [ ] Fix any bottlenecks

**Dependencies:** All features

#### Task 6.8: Security Review (2 hours)

**Check:**

- [ ] No sensitive data in client
- [ ] Proper input validation
- [ ] SQL injection prevention
- [ ] XSS prevention in content viewer
- [ ] CSRF protection
- [ ] Rate limiting

**Checklist:**

- [ ] Review all user inputs
- [ ] Review database queries
- [ ] Review external content rendering
- [ ] Fix any issues

**Dependencies:** All features

### Day 5: Production Preparation

#### Task 6.9: Migration Dry Run (2 hours)

**Steps:**

1. Copy production database
2. Run migration scripts
3. Validate data integrity
4. Test rollback
5. Document issues

**Checklist:**

- [ ] Backup current database
- [ ] Run migration on copy
- [ ] Validate all data
- [ ] Test rollback works
- [ ] Document any issues
- [ ] Create migration checklist

**Dependencies:** All testing complete

#### Task 6.10: Deployment Checklist (1 hour)

**File:** `docs/DEPLOYMENT_CHECKLIST.md`

**Pre-deployment:**

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance targets met
- [ ] Security review done
- [ ] Database backup created

**Deployment:**

- [ ] Stop application
- [ ] Backup database
- [ ] Run migrations
- [ ] Deploy new code
- [ ] Start application
- [ ] Verify functionality

**Post-deployment:**

- [ ] Monitor errors
- [ ] Check performance
- [ ] User acceptance testing
- [ ] Document issues

**Dependencies:** Task 6.9

#### Task 6.11: Rollback Plan (1 hour)

**File:** `docs/ROLLBACK_PLAN.md`

**If issues occur:**

1. Stop application
2. Restore database backup
3. Deploy previous code version
4. Restart application
5. Verify functionality
6. Investigate issues

**Checklist:**

- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Identify rollback triggers
- [ ] Communication plan

**Dependencies:** Task 6.10

#### Task 6.12: Final Review (2 hours)

**Review checklist:**

- [ ] All features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Migration tested
- [ ] Rollback plan ready

**Go/No-Go Decision:**

- All critical tests passing? → Go
- Performance targets met? → Go
- Documentation complete? → Go
- Any blocking issues? → No-Go (fix first)

**Dependencies:** All tasks

### Phase 6 Checkpoint

**Deliverables:**

- ✅ 90%+ test coverage
- ✅ All E2E tests passing
- ✅ Complete documentation
- ✅ Performance optimized
- ✅ Security verified
- ✅ Production ready

**Final Validation:**

```bash
# Full test suite
pnpm test:all

# Coverage report
pnpm test:coverage

# E2E tests
pnpm test:e2e

# Performance test
pnpm test:performance

# Build for production
pnpm build
```

---

## Risk Management

### Technical Risks

#### Risk 1: Data Loss During Migration

**Probability:** Medium  
**Impact:** Critical  
**Mitigation:**

- Always backup before migration
- Dry run on copy first
- Validate data after migration
- Test rollback procedure
- Keep old columns during transition period

#### Risk 2: Performance Degradation

**Probability:** Low  
**Impact:** High  
**Mitigation:**

- Virtualization for large lists
- Memoization of expensive computations
- Database indexes on new columns
- Batch processing limits
- Performance testing throughout

#### Risk 3: State Machine Bugs

**Probability:** Medium  
**Impact:** High  
**Mitigation:**

- Comprehensive unit tests
- Validate all transitions
- Log all state changes
- Manual testing of edge cases
- Ability to reset state

#### Risk 4: Auto-Cascade Failures

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**

- Proper error categorization
- Retry limits
- Manual intervention always available
- Comprehensive logging
- User can disable auto-cascade

### Project Risks

#### Risk 1: Timeline Overrun

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**

- Weekly progress reviews
- Prioritize core features
- Defer nice-to-haves if needed
- Parallel work where possible

#### Risk 2: Scope Creep

**Probability:** High  
**Impact:** Medium  
**Mitigation:**

- Strict adherence to PRD
- Document all changes
- Defer non-critical features
- Regular scope reviews

#### Risk 3: Testing Gaps

**Probability:** Low  
**Impact:** High  
**Mitigation:**

- Test-driven development
- Coverage requirements
- E2E for critical paths
- Manual testing checklist

---

## Daily Workflow

### Morning (30 minutes)

1. Review previous day's work
2. Check test status
3. Review TODOs for today
4. Plan work order

### During Development (6-7 hours)

1. Implement one task at a time
2. Write tests alongside code
3. Run tests frequently
4. Commit frequently with clear messages
5. Update documentation as you go

### End of Day (30 minutes)

1. Run full test suite
2. Commit and push work
3. Update progress tracking
4. Note any blockers
5. Plan next day

### Weekly Review (Friday, 1 hour)

1. Review week's progress
2. Update project board
3. Identify risks
4. Adjust timeline if needed
5. Document decisions

---

## Rollback Checkpoints

### Checkpoint 1: After Database Migration

**Can rollback to:** Pre-migration state  
**How:**

```bash
# Restore backup
cp dashboard/data/thesis_backup.db dashboard/data/thesis.db

# Rollback code
git checkout main

# Restart app
```

**When:** If migration validation fails

### Checkpoint 2: After Phase 2

**Can rollback to:** Old server actions  
**How:**

```bash
# Revert actions
git revert <phase-2-commits>

# Keep database (new columns don't break old code)
```

**When:** If server actions have critical bugs

### Checkpoint 3: After Phase 3

**Can rollback to:** Old UI  
**How:**

```bash
# Revert UI changes
git revert <phase-3-commits>

# Keep backend (old UI can work with new backend)
```

**When:** If UI has critical bugs

### Checkpoint 4: Before Production

**Can rollback to:** Complete old system  
**How:**

```bash
# Restore database
cp thesis_prod_backup.db thesis.db

# Checkout previous version
git checkout v1.x.x

# Restart
```

**When:** If critical issues found in staging

---

## Success Criteria Validation

### Technical Validation

- [ ] All 200+ unit tests passing
- [ ] All 20+ integration tests passing
- [ ] All 8 E2E critical path tests passing
- [ ] 90%+ code coverage
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Build succeeds without warnings

### Performance Validation

- [ ] Page load < 2s (measured)
- [ ] Single URL processing < 5s average
- [ ] Batch 100 URLs < 10min
- [ ] Table filters < 500ms
- [ ] Modal open < 300ms
- [ ] No memory leaks (profiled)

### Functional Validation

- [ ] All status types display correctly
- [ ] Auto-cascade works for all failure scenarios
- [ ] Manual creation works for all URL types
- [ ] Citation editing works
- [ ] Batch processing works
- [ ] Ignore/Archive works
- [ ] Reset works
- [ ] Export works

### User Acceptance Validation

- [ ] User can understand all statuses
- [ ] User can ignore URLs easily
- [ ] User can manually create items
- [ ] User can edit citations
- [ ] User can see processing history
- [ ] User receives helpful suggestions
- [ ] User can undo mistakes (reset)

---

## Conclusion

This implementation plan provides a detailed roadmap for transforming the URL processing system over 6 weeks. By following this plan:

✅ **Week 1:** Foundation is solid (database, state machine, orchestrator)  
✅ **Week 2:** All backend logic works (server actions, batch processing)  
✅ **Week 3:** Core UI is functional (table, filters, indicators)  
✅ **Week 4:** Advanced UI complete (all modals, editing)  
✅ **Week 5:** Features polished (suggestions, export, optimization)  
✅ **Week 6:** Production ready (tested, documented, deployed)

**Key Success Factors:**

1. Strict adherence to PRD specifications
2. Test-driven development throughout
3. Regular checkpoints and validation
4. Documentation as you go
5. Performance testing early
6. User acceptance validation

**Next Steps:**

1. Review and approve this plan
2. Set up project tracking (GitHub Projects, Jira, etc.)
3. Create git branch: `feature/url-processing-refactor`
4. Begin Phase 1, Day 1, Task 1.1
5. Daily standups to track progress
6. Weekly reviews to adjust course

**Estimated Effort:**

- 1 developer: 6 weeks
- 2 developers: 4 weeks (with good task parallelization)

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Author:** Claude (AI Assistant)  
**Status:** Ready for Implementation
