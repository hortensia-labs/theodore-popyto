# URL Processing System Refactor - Product Requirements Document

**Version:** 1.0  
**Date:** November 14, 2025  
**Status:** Planning  
**Project:** Theodore - PhD Thesis URL Processing Dashboard

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System Analysis](#2-current-system-analysis)
3. [Goals & Objectives](#3-goals--objectives)
4. [New System Architecture](#4-new-system-architecture)
5. [Database Schema Changes](#5-database-schema-changes)
6. [State Machine Design](#6-state-machine-design)
7. [Processing Orchestrator](#7-processing-orchestrator)
8. [Component Architecture](#8-component-architecture)
9. [UI/UX Specifications](#9-uiux-specifications)
10. [Migration Strategy](#10-migration-strategy)
11. [Implementation Plan](#11-implementation-plan)
12. [Testing Strategy](#12-testing-strategy)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

### 1.1 Problem Statement

The current URL processing system has multiple overlapping status concepts that confuse users and developers:

- Computed status (extractable, translatable, etc.) vs. Zotero processing status (processing, stored, failed)
- No user-controlled statuses (e.g., "ignore" this URL)
- Failed processing states aren't visible in the UI
- No clear processing workflow or automatic fallback strategies
- Inconsistent button enablement logic
- No processing history or audit trail

### 1.2 Solution Overview

A comprehensive refactor that introduces:

- **Unified status system** with clear separation of concerns
- **Multi-stage processing workflow** with automatic cascading
- **User intent management** (ignore, priority, manual-only)
- **Complete audit trail** for all processing attempts
- **Modular component architecture** with reusable actions
- **Smart suggestions** to guide users
- **Manual creation capabilities** at any stage

### 1.3 Success Criteria

- Clear, unambiguous status for every URL
- Automatic fallback when one processing method fails
- Users can ignore/archive URLs without deletion
- Complete processing history for analysis
- Modular, maintainable codebase
- Type-safe server actions (no API routes)
- Smooth migration of existing data

---

## 2. Current System Analysis

### 2.1 Existing Status Types

#### Computed Status (Client-side)

```typescript
type UrlStatus = 'stored' | 'error' | 'extractable' | 'translatable' | 'resolvable' | 'unknown';
```

- Computed from analysis data
- Priority: stored > extractable > error > translatable > resolvable > unknown

#### Zotero Processing Status (Database)

```typescript
zoteroProcessingStatus: 'processing' | 'stored' | 'failed' | null
```

#### Citation Validation Status (Database)

```typescript
citationValidationStatus: 'valid' | 'incomplete' | null
```

### 2.2 Current Processing Flow

1. Python script extracts URLs → Analyzes via citation-linker API → JSON reports
2. Dashboard imports JSON → Creates `urls` and `urlAnalysisData` records
3. User processes URLs → Calls Zotero API
4. On failure → Sometimes triggers content fetching

### 2.3 Key Issues

1. **Status confusion** - Multiple overlapping systems
2. **No user control** - Can't mark URLs as "ignore"
3. **Hidden failures** - Failed state overridden by computed status
4. **Manual intervention** - No automatic cascading to alternative methods
5. **Component bloat** - URLTable has too many responsibilities
6. **No history** - Can't track what was attempted

---

## 3. Goals & Objectives

### 3.1 Primary Goals

1. **Clarity** - Every URL has one clear, understandable status
2. **Automation** - Auto-cascade through processing stages on failure
3. **User Control** - Allow ignoring, prioritizing, and manual creation
4. **Transparency** - Complete audit trail of all attempts
5. **Maintainability** - Modular, reusable components and actions

### 3.2 Non-Goals

- Backward compatibility with old status system
- Real-time synchronization with Zotero library changes
- Automatic re-checking of failed URLs
- Multi-user collaboration features

---

## 4. New System Architecture

### 4.1 Status System Design

#### 4.1.1 Processing Status (Primary State)

```typescript
type ProcessingStatus = 
  | 'not_started'           // Initial state, never processed
  | 'processing_zotero'     // Stage 1: Zotero API call in progress
  | 'processing_content'    // Stage 2: Content extraction in progress
  | 'processing_llm'        // Stage 3: LLM extraction in progress
  | 'awaiting_selection'    // User must select identifier
  | 'awaiting_metadata'     // User must edit/approve metadata
  | 'stored'                // Successfully linked to Zotero (complete citation)
  | 'stored_incomplete'     // Linked but missing critical citation fields
  | 'stored_custom'         // Manually created by user
  | 'exhausted'             // All automated methods failed
  | 'ignored'               // User marked to skip
  | 'archived';             // Permanent ignore
```

#### 4.1.2 Processing Capability (Computed)

```typescript
interface ProcessingCapability {
  hasIdentifiers: boolean;        // DOI, PMID, arXiv, ISBN found
  hasWebTranslators: boolean;     // Zotero web translators available
  hasContent: boolean;            // Content fetched and cached
  isAccessible: boolean;          // URL is reachable (HTTP < 400)
  canUseLLM: boolean;             // Content available for LLM extraction
  isPDF: boolean;                 // Content is PDF file
  manualCreateAvailable: boolean; // Always true
}
```

#### 4.1.3 User Intent (User-Managed)

```typescript
type UserIntent = 
  | 'auto'           // Default: system decides processing strategy
  | 'ignore'         // Skip processing, but keep in database
  | 'priority'       // Process this first in bulk operations
  | 'manual_only'    // Don't auto-process, manual intervention only
  | 'archive';       // Permanent ignore, hide from default views
```

#### 4.1.4 Effective UI Status (Computed for Display)

```typescript
function computeEffectiveStatus(
  processingStatus: ProcessingStatus,
  userIntent: UserIntent,
  capability: ProcessingCapability
): EffectiveStatus {
  // Priority 1: User Intent
  if (userIntent === 'ignore' || userIntent === 'archive') {
    return 'IGNORED';
  }
  
  // Priority 2: Processing Status
  if (processingStatus === 'stored') return 'STORED';
  if (processingStatus === 'stored_incomplete') return 'NEEDS_METADATA';
  if (processingStatus === 'stored_custom') return 'CUSTOM_ITEM';
  if (processingStatus.startsWith('processing_')) return 'PROCESSING';
  if (processingStatus === 'awaiting_selection') return 'SELECT_IDENTIFIER';
  if (processingStatus === 'awaiting_metadata') return 'APPROVE_METADATA';
  if (processingStatus === 'exhausted') return 'MANUAL_NEEDED';
  
  // Priority 3: Capability
  if (!capability.isAccessible) return 'ERROR';
  if (capability.hasIdentifiers) return 'READY_EXTRACT';
  if (capability.hasWebTranslators) return 'READY_TRANSLATE';
  if (capability.canUseLLM) return 'READY_LLM';
  
  return 'UNKNOWN';
}
```

### 4.2 Processing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    URL INITIAL STATE                        │
│                    (not_started)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Check User Intent    │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    [IGNORED]         [PROCESS]
   (skip)                 │
                          ▼
         ┌────────────────────────────────┐
         │ STAGE 1: Zotero Processing    │
         │ Method: identifier or URL      │
         │ Status: processing_zotero      │
         └────┬───────────────────────┬───┘
              │                       │
          SUCCESS                  FAILURE
              │                       │
              ▼                       ▼
      ┌──────────────┐    ┌──────────────────────────┐
      │ Validate     │    │ Auto-trigger Stage 2     │
      │ Citation     │    │ Status: processing_content│
      └──────┬───────┘    └──────┬───────────────┬───┘
             │                   │               │
       ┌─────┴─────┐      IDENTIFIERS       NO IDS
       │           │        FOUND            FOUND
   COMPLETE    INCOMPLETE    │                  │
       │           │         ▼                  ▼
       ▼           ▼    ┌─────────────┐  ┌────────────┐
   [STORED]  [STORED_   │ Status:     │  │ Stage 3:   │
             INCOMPLETE]│ awaiting_   │  │ LLM Extract│
       │           │    │ selection   │  │ Status:    │
       │           │    └──────┬──────┘  │ processing_│
       │           │           │         │ llm        │
       │           ▼           ▼         └─────┬──────┘
       │    ┌──────────────────────┐          │
       │    │ User Edits Citation  │      SUCCESS│FAIL
       │    │ or Approves Metadata │          │   │
       │    └──────────┬───────────┘          │   │
       │               │                      │   │
       │               ▼                      ▼   ▼
       │          [STORED]              ┌──────────────┐
       │                                │ EXHAUSTED:   │
       │                                │ All methods  │
       │                                │ failed       │
       │                                └──────┬───────┘
       │                                       │
       │    [At any point: Manual Create] <────┘
       │               │
       │               ▼
       │         [STORED_CUSTOM]
       │               │
       └───────────────┴──> [DONE]
```

### 4.3 Auto-Cascade Logic

When a processing stage fails, automatically attempt the next stage:

```typescript
async function handleProcessingFailure(
  urlId: number,
  failedStage: 'zotero' | 'content' | 'llm',
  error: ProcessingError
): Promise<void> {
  // Record the failure
  await recordProcessingAttempt(urlId, {
    stage: failedStage,
    success: false,
    error: error.message,
    errorCategory: categorizeError(error),
    timestamp: Date.now(),
  });
  
  // Determine if error is permanent
  if (isPermanentError(error)) {
    await transitionTo(urlId, 'exhausted');
    return;
  }
  
  // Auto-cascade to next stage
  switch (failedStage) {
    case 'zotero':
      // Try content extraction
      await transitionTo(urlId, 'processing_content');
      await attemptContentExtraction(urlId);
      break;
      
    case 'content':
      // Try LLM extraction
      await transitionTo(urlId, 'processing_llm');
      await attemptLLMExtraction(urlId);
      break;
      
    case 'llm':
      // All automated methods exhausted
      await transitionTo(urlId, 'exhausted');
      break;
  }
}
```

---

## 5. Database Schema Changes

### 5.1 New Columns for `urls` Table

```sql
-- Add new columns
ALTER TABLE urls ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE urls ADD COLUMN user_intent TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE urls ADD COLUMN processing_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE urls ADD COLUMN processing_history TEXT; -- JSON array
ALTER TABLE urls ADD COLUMN last_processing_method TEXT;
ALTER TABLE urls ADD COLUMN created_by_theodore INTEGER DEFAULT 0; -- boolean
ALTER TABLE urls ADD COLUMN user_modified_in_zotero INTEGER DEFAULT 0; -- boolean
ALTER TABLE urls ADD COLUMN linked_url_count INTEGER DEFAULT 0; -- denormalized

-- Add indexes for new columns
CREATE INDEX idx_urls_processing_status ON urls(processing_status);
CREATE INDEX idx_urls_user_intent ON urls(user_intent);
CREATE INDEX idx_urls_processing_attempts ON urls(processing_attempts);
```

### 5.2 Processing History Structure

```typescript
interface ProcessingAttempt {
  timestamp: number;
  stage: 'zotero_identifier' | 'zotero_url' | 'content_extraction' | 'llm' | 'manual';
  method?: string; // Specific method used (e.g., 'DOI', 'web_translator')
  success: boolean;
  error?: string;
  errorCategory?: ErrorCategory;
  itemKey?: string; // If successful
  duration?: number; // milliseconds
  metadata?: Record<string, unknown>; // Additional context
}

type ErrorCategory = 
  | 'network'
  | 'http_client'      // 4xx
  | 'http_server'      // 5xx
  | 'parsing'
  | 'validation'
  | 'zotero_api'
  | 'rate_limit'
  | 'permanent'        // 404, 403, 401
  | 'unknown';
```

### 5.3 New Table: `zotero_item_links`

Track relationships between URLs and Zotero items:

```sql
CREATE TABLE zotero_item_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL,
  url_id INTEGER NOT NULL,
  created_by_theodore INTEGER NOT NULL DEFAULT 0,
  user_modified INTEGER NOT NULL DEFAULT 0,
  linked_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  UNIQUE(item_key, url_id)
);

CREATE INDEX idx_zotero_links_item_key ON zotero_item_links(item_key);
CREATE INDEX idx_zotero_links_url_id ON zotero_item_links(url_id);
```

### 5.4 Migration SQL

```sql
-- ============================================
-- MIGRATION: URL Processing System Refactor
-- Version: 1.0
-- Date: 2025-11-14
-- ============================================

BEGIN TRANSACTION;

-- Step 1: Add new columns with defaults
ALTER TABLE urls ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE urls ADD COLUMN user_intent TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE urls ADD COLUMN processing_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE urls ADD COLUMN processing_history TEXT;
ALTER TABLE urls ADD COLUMN last_processing_method TEXT;
ALTER TABLE urls ADD COLUMN created_by_theodore INTEGER DEFAULT 0;
ALTER TABLE urls ADD COLUMN user_modified_in_zotero INTEGER DEFAULT 0;
ALTER TABLE urls ADD COLUMN linked_url_count INTEGER DEFAULT 1;

-- Step 2: Create new table for Zotero item links
CREATE TABLE zotero_item_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL,
  url_id INTEGER NOT NULL,
  created_by_theodore INTEGER NOT NULL DEFAULT 1,
  user_modified INTEGER NOT NULL DEFAULT 0,
  linked_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  UNIQUE(item_key, url_id)
);

-- Step 3: Migrate existing data
UPDATE urls
SET 
  processing_status = CASE
    -- Already stored with complete citation
    WHEN zotero_item_key IS NOT NULL 
         AND zotero_processing_status = 'stored' 
         AND citation_validation_status = 'valid'
    THEN 'stored'
    
    -- Stored but incomplete citation
    WHEN zotero_item_key IS NOT NULL 
         AND zotero_processing_status = 'stored' 
         AND citation_validation_status = 'incomplete'
    THEN 'stored_incomplete'
    
    -- Failed processing - reset to not_started per requirements
    WHEN zotero_processing_status = 'failed'
    THEN 'not_started'
    
    -- Currently processing (unlikely but handle it)
    WHEN zotero_processing_status = 'processing'
    THEN 'processing_zotero'
    
    -- Default: not started
    ELSE 'not_started'
  END,
  
  processing_attempts = CASE
    WHEN zotero_processing_status IS NOT NULL THEN 1
    ELSE 0
  END,
  
  last_processing_method = CASE
    WHEN zotero_processing_method IS NOT NULL THEN zotero_processing_method
    ELSE NULL
  END,
  
  created_by_theodore = CASE
    WHEN zotero_item_key IS NOT NULL THEN 1
    ELSE 0
  END;

-- Step 4: Create link records for existing stored URLs
INSERT INTO zotero_item_links (item_key, url_id, created_by_theodore, linked_at)
SELECT 
  zotero_item_key,
  id,
  1,
  COALESCE(zotero_processed_at, created_at)
FROM urls
WHERE zotero_item_key IS NOT NULL;

-- Step 5: Build processing history from existing data
UPDATE urls
SET processing_history = json_array(
  json_object(
    'timestamp', COALESCE(zotero_processed_at, created_at),
    'stage', CASE zotero_processing_method
      WHEN 'identifier' THEN 'zotero_identifier'
      WHEN 'url' THEN 'zotero_url'
      ELSE 'unknown'
    END,
    'success', CASE zotero_processing_status
      WHEN 'stored' THEN 1
      WHEN 'failed' THEN 0
      ELSE NULL
    END,
    'itemKey', zotero_item_key,
    'error', zotero_processing_error
  )
)
WHERE zotero_processing_status IS NOT NULL;

-- Step 6: Create indexes
CREATE INDEX idx_urls_processing_status ON urls(processing_status);
CREATE INDEX idx_urls_user_intent ON urls(user_intent);
CREATE INDEX idx_urls_processing_attempts ON urls(processing_attempts);
CREATE INDEX idx_zotero_links_item_key ON zotero_item_links(item_key);
CREATE INDEX idx_zotero_links_url_id ON zotero_item_links(url_id);

-- Step 7: Update linked_url_count
UPDATE urls
SET linked_url_count = (
  SELECT COUNT(*)
  FROM zotero_item_links
  WHERE zotero_item_links.item_key = urls.zotero_item_key
)
WHERE zotero_item_key IS NOT NULL;

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT
-- ============================================
-- To rollback, run:
/*
BEGIN TRANSACTION;

-- Drop new table
DROP TABLE IF EXISTS zotero_item_links;

-- Drop new indexes
DROP INDEX IF EXISTS idx_urls_processing_status;
DROP INDEX IF EXISTS idx_urls_user_intent;
DROP INDEX IF EXISTS idx_urls_processing_attempts;
DROP INDEX IF EXISTS idx_zotero_links_item_key;
DROP INDEX IF EXISTS idx_zotero_links_url_id;

-- Remove new columns (SQLite doesn't support ALTER TABLE DROP COLUMN easily)
-- You may need to recreate the table without these columns
-- or keep them as null/default values

COMMIT;
*/
```

---

## 6. State Machine Design

### 6.1 State Transition Rules

```typescript
// lib/state-machine/url-processing-state-machine.ts

export class URLProcessingStateMachine {
  // Valid state transitions
  private static readonly TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
    not_started: [
      'processing_zotero',
      'processing_content',  // Direct if no Zotero options
      'ignored',
      'archived',
      'stored_custom',       // Manual creation
    ],
    
    processing_zotero: [
      'stored',
      'stored_incomplete',
      'processing_content',  // Auto-cascade on failure
      'exhausted',           // Permanent error
    ],
    
    processing_content: [
      'awaiting_selection',  // Found identifiers
      'processing_llm',      // Auto-cascade if no identifiers
      'exhausted',           // Permanent error
    ],
    
    processing_llm: [
      'awaiting_metadata',   // Found metadata
      'exhausted',           // Failed or low quality
    ],
    
    awaiting_selection: [
      'processing_zotero',   // User selected identifier
      'ignored',             // User gives up
      'stored_custom',       // Manual creation
    ],
    
    awaiting_metadata: [
      'stored',              // User approved
      'stored_incomplete',   // User approved with missing fields
      'processing_zotero',   // User wants to retry
      'ignored',
      'stored_custom',
    ],
    
    stored: [
      'not_started',         // Unlinked
      'stored_incomplete',   // Re-validation found issues
    ],
    
    stored_incomplete: [
      'stored',              // User completed metadata
      'not_started',         // Unlinked
    ],
    
    stored_custom: [
      'not_started',         // Unlinked
    ],
    
    exhausted: [
      'not_started',         // User wants to retry
      'stored_custom',       // Manual creation
      'ignored',
      'archived',
    ],
    
    ignored: [
      'not_started',         // Un-ignore
      'archived',
    ],
    
    archived: [
      'not_started',         // Un-archive
    ],
  };
  
  /**
   * Check if a transition is valid
   */
  static canTransition(from: ProcessingStatus, to: ProcessingStatus): boolean {
    return this.TRANSITIONS[from]?.includes(to) ?? false;
  }
  
  /**
   * Perform a state transition with validation
   */
  static async transition(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus,
    metadata?: TransitionMetadata
  ): Promise<TransitionResult> {
    // Validate transition
    if (!this.canTransition(from, to)) {
      return {
        success: false,
        error: `Invalid transition from ${from} to ${to}`,
      };
    }
    
    try {
      // Perform transition
      await db.update(urls)
        .set({
          processing_status: to,
          updatedAt: new Date(),
          ...metadata,
        })
        .where(eq(urls.id, urlId));
      
      // Record in history
      await this.recordTransition(urlId, from, to, metadata);
      
      // Trigger side effects
      await this.handleTransitionSideEffects(urlId, from, to);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Record transition in processing history
   */
  private static async recordTransition(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus,
    metadata?: TransitionMetadata
  ): Promise<void> {
    const url = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!url) return;
    
    const history: ProcessingAttempt[] = url.processing_history 
      ? JSON.parse(url.processing_history)
      : [];
    
    history.push({
      timestamp: Date.now(),
      transition: { from, to },
      metadata,
    });
    
    await db.update(urls)
      .set({ processing_history: JSON.stringify(history) })
      .where(eq(urls.id, urlId));
  }
  
  /**
   * Handle side effects of state transitions
   */
  private static async handleTransitionSideEffects(
    urlId: number,
    from: ProcessingStatus,
    to: ProcessingStatus
  ): Promise<void> {
    // Example: When moving to exhausted, create a suggestion
    if (to === 'exhausted') {
      await createSuggestion(urlId, {
        type: 'manual_creation',
        priority: 'high',
        message: 'All automated processing methods failed. Consider manual creation.',
      });
    }
    
    // Example: When moving from stored to not_started (unlink)
    if (from.startsWith('stored') && to === 'not_started') {
      // This is handled by the unlink action, but we could add logging here
      console.log(`URL ${urlId} was unlinked from Zotero`);
    }
  }
}

interface TransitionMetadata {
  reason?: string;
  userId?: string;
  error?: string;
  [key: string]: unknown;
}

interface TransitionResult {
  success: boolean;
  error?: string;
}
```

### 6.2 State Guards

```typescript
// Guards that control when certain actions are allowed

export class StateGuards {
  /**
   * Can this URL be processed with Zotero?
   */
  static canProcessWithZotero(url: UrlWithStatus): boolean {
    return (
      url.user_intent !== 'ignore' &&
      url.user_intent !== 'archive' &&
      url.user_intent !== 'manual_only' &&
      (url.processing_status === 'not_started' ||
       url.processing_status === 'awaiting_selection') &&
      (url.capability.hasIdentifiers || url.capability.hasWebTranslators)
    );
  }
  
  /**
   * Can this URL be unlinked from Zotero?
   */
  static canUnlink(url: UrlWithStatus): boolean {
    return (
      url.processing_status === 'stored' ||
      url.processing_status === 'stored_incomplete' ||
      url.processing_status === 'stored_custom'
    );
  }
  
  /**
   * Can this URL be deleted from Zotero?
   */
  static canDeleteZoteroItem(url: UrlWithStatus): boolean {
    if (!url.zoteroItemKey) return false;
    
    // Only delete if created by Theodore
    if (!url.created_by_theodore) return false;
    
    // Don't auto-delete if user modified in Zotero
    if (url.user_modified_in_zotero) return false;
    
    // Don't delete if other URLs link to it
    if (url.linked_url_count > 1) return false;
    
    return true;
  }
  
  /**
   * Can this URL be manually created?
   */
  static canManuallyCreate(url: UrlWithStatus): boolean {
    // Can always create manually, even if already stored
    return true;
  }
  
  /**
   * Can this URL be reset?
   */
  static canReset(url: UrlWithStatus): boolean {
    // Can reset anything except currently processing
    return !url.processing_status.startsWith('processing_');
  }
  
  /**
   * Should auto-cascade to next stage?
   */
  static shouldAutoCascade(
    processingStatus: ProcessingStatus,
    error: ProcessingError
  ): boolean {
    // Don't cascade on permanent errors
    if (isPermanentError(error)) return false;
    
    // Don't cascade if user intent is manual_only
    // (checked elsewhere)
    
    // Only cascade from certain states
    return (
      processingStatus === 'processing_zotero' ||
      processingStatus === 'processing_content'
    );
  }
}
```

---

## 7. Processing Orchestrator

### 7.1 Main Orchestrator

```typescript
// lib/orchestrator/url-processing-orchestrator.ts

export class URLProcessingOrchestrator {
  /**
   * Main entry point for processing a URL
   * Handles the complete workflow with auto-cascading
   */
  static async processUrl(urlId: number): Promise<ProcessingResult> {
    const url = await getUrlWithCapabilities(urlId);
    
    if (!url) {
      return { success: false, error: 'URL not found' };
    }
    
    // Check user intent
    if (url.user_intent === 'ignore' || url.user_intent === 'archive') {
      return { success: false, error: 'URL is marked as ignored' };
    }
    
    // Start from appropriate stage based on capabilities
    if (url.capability.hasIdentifiers || url.capability.hasWebTranslators) {
      return await this.attemptZoteroProcessing(urlId);
    } else if (url.capability.hasContent) {
      return await this.attemptContentProcessing(urlId);
    } else {
      // Fetch content first
      return await this.attemptContentFetching(urlId);
    }
  }
  
  /**
   * Stage 1: Zotero Processing
   */
  private static async attemptZoteroProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    // Transition to processing state
    await URLProcessingStateMachine.transition(
      urlId,
      'not_started',
      'processing_zotero'
    );
    
    try {
      // Attempt Zotero processing
      const result = await processUrlWithZotero(urlId);
      
      if (result.success) {
        // Validate citation
        const validation = await validateCitation(result.itemKey!);
        
        const finalStatus = validation.status === 'valid'
          ? 'stored'
          : 'stored_incomplete';
        
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_zotero',
          finalStatus,
          {
            itemKey: result.itemKey,
            citationStatus: validation.status,
          }
        );
        
        // Auto-trigger metadata extraction if incomplete
        if (finalStatus === 'stored_incomplete') {
          await this.attemptMetadataExtraction(urlId);
        }
        
        return { success: true, status: finalStatus };
      } else {
        // Failed - auto-cascade to content processing
        return await this.handleZoteroFailure(urlId, result.error);
      }
    } catch (error) {
      return await this.handleZoteroFailure(
        urlId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
  
  /**
   * Handle Zotero processing failure
   */
  private static async handleZoteroFailure(
    urlId: number,
    error: string
  ): Promise<ProcessingResult> {
    const errorCategory = categorizeError(error);
    
    // Record attempt
    await recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'zotero',
      success: false,
      error,
      errorCategory,
    });
    
    // Check if error is permanent
    if (errorCategory === 'permanent') {
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_zotero',
        'exhausted'
      );
      return {
        success: false,
        error,
        status: 'exhausted',
      };
    }
    
    // Auto-cascade to content processing
    return await this.attemptContentProcessing(urlId);
  }
  
  /**
   * Stage 2: Content Processing
   */
  private static async attemptContentProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    const currentUrl = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    await URLProcessingStateMachine.transition(
      currentUrl!.processing_status as ProcessingStatus,
      'processing_content'
    );
    
    try {
      // Fetch and extract identifiers
      const result = await processSingleUrl(urlId);
      
      if (result.identifierCount && result.identifierCount > 0) {
        // Found identifiers - await user selection
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_content',
          'awaiting_selection'
        );
        
        return {
          success: true,
          status: 'awaiting_selection',
          identifierCount: result.identifierCount,
        };
      } else {
        // No identifiers - try LLM
        return await this.attemptLLMProcessing(urlId);
      }
    } catch (error) {
      return await this.handleContentFailure(
        urlId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
  
  /**
   * Stage 3: LLM Processing
   */
  private static async attemptLLMProcessing(
    urlId: number
  ): Promise<ProcessingResult> {
    await URLProcessingStateMachine.transition(
      urlId,
      'processing_content',
      'processing_llm'
    );
    
    try {
      const result = await extractMetadataWithLLM(urlId);
      
      if (result.success && result.qualityScore > 70) {
        // High quality extraction - await user approval
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_llm',
          'awaiting_metadata'
        );
        
        return {
          success: true,
          status: 'awaiting_metadata',
        };
      } else {
        // Low quality or failed - exhausted
        await URLProcessingStateMachine.transition(
          urlId,
          'processing_llm',
          'exhausted'
        );
        
        return {
          success: false,
          status: 'exhausted',
          error: 'LLM extraction failed or low quality',
        };
      }
    } catch (error) {
      await URLProcessingStateMachine.transition(
        urlId,
        'processing_llm',
        'exhausted'
      );
      
      return {
        success: false,
        status: 'exhausted',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Auto-trigger metadata extraction for incomplete citations
   */
  private static async attemptMetadataExtraction(
    urlId: number
  ): Promise<void> {
    // Attempt to fetch content and extract metadata
    try {
      await processSingleUrl(urlId);
      // Results will be available for user to fill in missing fields
    } catch (error) {
      console.error(`Metadata extraction failed for URL ${urlId}:`, error);
    }
  }
  
  /**
   * Fetch content for a URL
   */
  private static async attemptContentFetching(
    urlId: number
  ): Promise<ProcessingResult> {
    try {
      const result = await processSingleUrl(urlId);
      
      if (result.success) {
        // Content fetched, now process it
        return await this.attemptContentProcessing(urlId);
      } else {
        // Failed to fetch - exhausted
        await URLProcessingStateMachine.transition(
          urlId,
          'not_started',
          'exhausted'
        );
        
        return {
          success: false,
          status: 'exhausted',
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        status: 'exhausted',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Handle content processing failure
   */
  private static async handleContentFailure(
    urlId: number,
    error: string
  ): Promise<ProcessingResult> {
    await recordProcessingAttempt(urlId, {
      timestamp: Date.now(),
      stage: 'content_extraction',
      success: false,
      error,
    });
    
    // Try LLM as last resort
    return await this.attemptLLMProcessing(urlId);
  }
}
```

### 7.2 Batch Processing with Concurrency Control

```typescript
// lib/orchestrator/batch-processor.ts

import pLimit from 'p-limit';

export class BatchProcessor {
  private static sessions: Map<string, BatchSession> = new Map();
  
  /**
   * Process multiple URLs with concurrency control
   */
  static async processBatch(
    urlIds: number[],
    options: BatchProcessingOptions = {}
  ): Promise<BatchProcessingSession> {
    const sessionId = generateId();
    const session: BatchProcessingSession = {
      id: sessionId,
      urlIds,
      currentIndex: 0,
      completed: [],
      failed: [],
      status: 'running',
      startedAt: new Date(),
      estimatedCompletion: this.estimateCompletion(urlIds.length),
    };
    
    this.sessions.set(sessionId, session);
    
    // Create concurrency limiter
    const limit = pLimit(options.concurrency || 5);
    
    // Process URLs
    const promises = urlIds.map((urlId, index) =>
      limit(async () => {
        // Check if paused
        if (session.status === 'paused') {
          await this.waitForResume(sessionId);
        }
        
        // Check if cancelled
        if (session.status === 'cancelled') {
          return;
        }
        
        try {
          const result = await URLProcessingOrchestrator.processUrl(urlId);
          
          if (result.success) {
            session.completed.push(urlId);
          } else {
            session.failed.push(urlId);
          }
          
          session.currentIndex = index + 1;
          
          // Emit progress event
          this.emitProgress(sessionId);
        } catch (error) {
          session.failed.push(urlId);
          console.error(`Error processing URL ${urlId}:`, error);
        }
      })
    );
    
    // Wait for all to complete
    await Promise.all(promises);
    
    session.status = 'completed';
    session.completedAt = new Date();
    
    return session;
  }
  
  /**
   * Pause a batch processing session
   */
  static pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
    }
  }
  
  /**
   * Resume a paused session
   */
  static resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'running';
    }
  }
  
  /**
   * Cancel a session
   */
  static cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'cancelled';
    }
  }
  
  /**
   * Get session status
   */
  static getSession(sessionId: string): BatchProcessingSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  private static async waitForResume(sessionId: string): Promise<void> {
    while (true) {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'paused') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  private static estimateCompletion(count: number): Date {
    // Rough estimate: 3 seconds per URL
    const estimatedMs = count * 3000;
    return new Date(Date.now() + estimatedMs);
  }
  
  private static emitProgress(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Emit via event system or websocket
      // For now, just update the session object
    }
  }
}

interface BatchProcessingOptions {
  concurrency?: number;
  respectUserIntent?: boolean;
  stopOnError?: boolean;
}

interface BatchProcessingSession {
  id: string;
  urlIds: number[];
  currentIndex: number;
  completed: number[];
  failed: number[];
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion: Date;
}
```

---

## 8. Component Architecture

### 8.1 Component Hierarchy

```
app/urls/page.tsx
└── URLTable (orchestrator)
    ├── URLTableFilters
    │   ├── SearchInput
    │   ├── StatusFilter
    │   ├── SectionFilter
    │   ├── DomainFilter
    │   ├── IntentFilter
    │   └── ClearFiltersButton
    │
    ├── URLTableBulkActions
    │   ├── BulkProcessButton
    │   ├── BulkIgnoreButton
    │   ├── BulkArchiveButton
    │   └── BulkDeleteButton
    │
    ├── URLTableHeader (sticky)
    │   └── Column headers
    │
    ├── URLTableBody
    │   └── URLTableRow (for each URL)
    │       ├── SelectCheckbox
    │       ├── URLLink
    │       ├── StatusIndicators
    │       │   ├── ProcessingStatusBadge
    │       │   ├── CapabilityIndicator
    │       │   ├── IntentBadge
    │       │   └── CitationStatusIndicator
    │       │
    │       └── URLActions
    │           ├── ProcessButton
    │           ├── UnlinkButton
    │           ├── IgnoreButton
    │           ├── ManualCreateButton
    │           └── MoreActionsMenu
    │               ├── ResetAction
    │               ├── ViewHistoryAction
    │               ├── ArchiveAction
    │               └── DeleteAction
    │
    ├── URLDetailPanel (right sidebar)
    │   ├── URLMetadataDisplay
    │   ├── ProcessingHistoryTimeline
    │   ├── IdentifiersList
    │   ├── CapabilitiesInfo
    │   ├── SmartSuggestions
    │   └── QuickActions
    │
    └── Modals
        ├── ProcessingProgressModal
        ├── ManualCreateModal
        │   ├── ContentViewer
        │   │   ├── IframePreview
        │   │   ├── ReaderModeView
        │   │   └── RawHTMLView
        │   └── MetadataForm
        │
        ├── EditCitationModal
        │   ├── CitationPreview
        │   └── MetadataEditor
        │
        ├── IdentifierSelectionModal
        │   └── IdentifierList
        │       └── IdentifierCard
        │           ├── PreviewButton
        │           └── SelectButton
        │
        ├── MetadataApprovalModal
        │   ├── ExtractedDataDisplay
        │   ├── QualityIndicator
        │   └── EditableFields
        │
        └── ProcessingHistoryModal
            └── TimelineView
```

### 8.2 Key Component Templates

#### URLTable (Main Orchestrator)

```typescript
// components/urls/url-table/URLTable.tsx
'use client';

import { useState } from 'react';
import { URLTableFilters } from './URLTableFilters';
import { URLTableBulkActions } from './URLTableBulkActions';
import { URLTableHeader } from './URLTableHeader';
import { URLTableBody } from './URLTableBody';
import { URLDetailPanel } from '../url-detail-panel';
import { useURLFilters } from './hooks/useURLFilters';
import { useURLSelection } from './hooks/useURLSelection';
import { useURLProcessing } from './hooks/useURLProcessing';
import type { UrlWithStatus } from '@/lib/db/computed';

interface URLTableProps {
  initialUrls: UrlWithStatus[];
}

export function URLTable({ initialUrls }: URLTableProps) {
  const [urls, setUrls] = useState(initialUrls);
  const [selectedUrlForDetail, setSelectedUrlForDetail] = useState<UrlWithStatus | null>(null);
  
  const filters = useURLFilters();
  const selection = useURLSelection(urls);
  const processing = useURLProcessing();
  
  const filteredUrls = applyFilters(urls, filters.values);
  
  const handleRefresh = async () => {
    const result = await getUrls(filters.values);
    if (result.success) {
      setUrls(result.data.urls);
    }
  };
  
  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Main content */}
      <div className={selectedUrlForDetail ? 'flex-1' : 'w-full'}>
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-gray-50 pb-4 space-y-4">
          <URLTableFilters 
            filters={filters.values}
            onChange={filters.update}
            onClear={filters.clear}
          />
          
          {selection.count > 0 && (
            <URLTableBulkActions
              selectedCount={selection.count}
              selectedIds={selection.ids}
              onProcessComplete={handleRefresh}
            />
          )}
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <URLTableHeader
              allSelected={selection.allSelected}
              onSelectAll={selection.toggleAll}
            />
            <URLTableBody
              urls={filteredUrls}
              selectedIds={selection.ids}
              onSelect={selection.toggle}
              onRowClick={setSelectedUrlForDetail}
              onProcessComplete={handleRefresh}
            />
          </table>
        </div>
      </div>
      
      {/* Detail panel */}
      {selectedUrlForDetail && (
        <div className="w-[500px] shrink-0">
          <URLDetailPanel
            url={selectedUrlForDetail}
            onClose={() => setSelectedUrlForDetail(null)}
            onUpdate={handleRefresh}
          />
        </div>
      )}
    </div>
  );
}
```

#### Manual Creation Modal

```typescript
// components/urls/url-modals/ManualCreateModal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { ContentViewer } from './ContentViewer';
import { MetadataForm } from './MetadataForm';
import type { ZoteroItem } from '@/lib/zotero-client';

interface ManualCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  url: string;
  isPDF: boolean;
  onSuccess: () => void;
}

export function ManualCreateModal({
  open,
  onOpenChange,
  urlId,
  url,
  isPDF,
  onSuccess,
}: ManualCreateModalProps) {
  const [viewMode, setViewMode] = useState<'iframe' | 'reader' | 'raw' | 'pdf'>('iframe');
  const [metadata, setMetadata] = useState<Partial<ZoteroItem>>({});
  const [isCreating, setIsCreating] = useState(false);
  
  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createCustomZoteroItem(urlId, metadata);
      if (result.success) {
        onSuccess();
        onOpenChange(false);
      }
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <DialogHeader>
          <h2>Create Custom Zotero Item</h2>
          <p className="text-sm text-gray-600">{url}</p>
        </DialogHeader>
        
        <div className="flex gap-4 h-full">
          {/* Left: Content viewer */}
          <div className="flex-1">
            <ContentViewer
              url={url}
              urlId={urlId}
              isPDF={isPDF}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
          
          {/* Right: Metadata form */}
          <div className="w-[400px]">
            <MetadataForm
              metadata={metadata}
              onChange={setMetadata}
              onSubmit={handleCreate}
              isSubmitting={isCreating}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### Content Viewer Component

```typescript
// components/urls/url-modals/ContentViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContentViewerProps {
  url: string;
  urlId: number;
  isPDF: boolean;
  viewMode: 'iframe' | 'reader' | 'raw' | 'pdf';
  onViewModeChange: (mode: 'iframe' | 'reader' | 'raw' | 'pdf') => void;
}

export function ContentViewer({
  url,
  urlId,
  isPDF,
  viewMode,
  onViewModeChange,
}: ContentViewerProps) {
  const [content, setContent] = useState<{
    raw?: string;
    reader?: string;
    pdf?: string;
  }>({});
  
  useEffect(() => {
    // Load cached content
    loadCachedContent(urlId).then(setContent);
  }, [urlId]);
  
  return (
    <div className="flex flex-col h-full">
      <Tabs value={viewMode} onValueChange={onViewModeChange}>
        <TabsList>
          {!isPDF && <TabsTrigger value="iframe">Live Preview</TabsTrigger>}
          {!isPDF && <TabsTrigger value="reader">Reader Mode</TabsTrigger>}
          {!isPDF && <TabsTrigger value="raw">Raw HTML</TabsTrigger>}
          {isPDF && <TabsTrigger value="pdf">PDF Viewer</TabsTrigger>}
        </TabsList>
      </Tabs>
      
      <div className="flex-1 mt-4 border rounded overflow-hidden">
        {viewMode === 'iframe' && !isPDF && (
          <iframe
            src={url}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
        
        {viewMode === 'reader' && !isPDF && (
          <div className="prose max-w-none p-8 overflow-auto h-full">
            {content.reader || 'Loading...'}
          </div>
        )}
        
        {viewMode === 'raw' && !isPDF && (
          <pre className="p-4 text-xs overflow-auto h-full">
            {content.raw || 'Loading...'}
          </pre>
        )}
        
        {viewMode === 'pdf' && isPDF && (
          <object
            data={content.pdf}
            type="application/pdf"
            className="w-full h-full"
          >
            <p>PDF cannot be displayed. <a href={content.pdf}>Download instead</a></p>
          </object>
        )}
      </div>
    </div>
  );
}
```

#### Smart Suggestions Component

```typescript
// components/urls/suggestions/SmartSuggestions.tsx
'use client';

import { type UrlWithStatus } from '@/lib/db/computed';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Suggestion {
  type: 'error' | 'warning' | 'info';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SmartSuggestions({ url }: { url: UrlWithStatus }) {
  const suggestions = generateSuggestions(url);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Suggestions</h3>
      {suggestions.map((suggestion, index) => (
        <SuggestionCard key={index} suggestion={suggestion} />
      ))}
    </div>
  );
}

function generateSuggestions(url: UrlWithStatus): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Incomplete citation
  if (url.processing_status === 'stored_incomplete') {
    suggestions.push({
      type: 'warning',
      priority: 'high',
      message: `Citation is missing: ${url.citationValidationDetails?.missingFields?.join(', ')}`,
      action: {
        label: 'Edit Citation',
        onClick: () => openEditCitationModal(url.id),
      },
    });
  }
  
  // Failed Zotero but found identifiers
  if (
    url.processing_attempts > 0 &&
    url.processing_status === 'awaiting_selection' &&
    hasFailedZoteroAttempt(url)
  ) {
    suggestions.push({
      type: 'info',
      priority: 'medium',
      message: 'Zotero processing failed, but identifiers were found. Review and select one.',
      action: {
        label: 'Select Identifier',
        onClick: () => openIdentifierSelectionModal(url.id),
      },
    });
  }
  
  // Multiple failures
  if (url.processing_attempts >= 3) {
    suggestions.push({
      type: 'warning',
      priority: 'high',
      message: `${url.processing_attempts} processing attempts failed. Consider manual creation.`,
      action: {
        label: 'Create Manually',
        onClick: () => openManualCreateModal(url.id),
      },
    });
  }
  
  // Exhausted
  if (url.processing_status === 'exhausted') {
    suggestions.push({
      type: 'error',
      priority: 'high',
      message: 'All automated methods failed. Manual intervention required.',
      action: {
        label: 'Create Manually',
        onClick: () => openManualCreateModal(url.id),
      },
    });
  }
  
  // Ready to process
  if (
    url.processing_status === 'not_started' &&
    (url.capability.hasIdentifiers || url.capability.hasWebTranslators)
  ) {
    suggestions.push({
      type: 'info',
      priority: 'low',
      message: 'Ready to process with Zotero',
      action: {
        label: 'Process Now',
        onClick: () => processUrl(url.id),
      },
    });
  }
  
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function hasFailedZoteroAttempt(url: UrlWithStatus): boolean {
  if (!url.processing_history) return false;
  const history: ProcessingAttempt[] = JSON.parse(url.processing_history);
  return history.some(
    attempt => 
      attempt.stage.startsWith('zotero') && 
      !attempt.success
  );
}
```

---

## 9. UI/UX Specifications

### 9.1 Status Badge Design

```typescript
// New status badge with clear visual hierarchy

const STATUS_STYLES = {
  // Processing statuses
  stored: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: CheckCircle,
    label: 'Stored',
  },
  stored_incomplete: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: AlertTriangle,
    label: 'Incomplete',
  },
  stored_custom: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: Star,
    label: 'Custom',
  },
  processing_zotero: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Loader,
    label: 'Processing (Zotero)',
    animated: true,
  },
  processing_content: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Loader,
    label: 'Processing (Content)',
    animated: true,
  },
  processing_llm: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Loader,
    label: 'Processing (LLM)',
    animated: true,
  },
  awaiting_selection: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: Hand,
    label: 'Select Identifier',
  },
  awaiting_metadata: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: Hand,
    label: 'Approve Metadata',
  },
  exhausted: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle,
    label: 'Manual Needed',
  },
  ignored: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: EyeOff,
    label: 'Ignored',
  },
  not_started: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: Circle,
    label: 'Not Started',
  },
};
```

### 9.2 Action Button Logic

```typescript
// Determine which buttons to show based on status and capability

function getAvailableActions(url: UrlWithStatus): Action[] {
  const actions: Action[] = [];
  
  // Process button
  if (StateGuards.canProcessWithZotero(url)) {
    actions.push({
      type: 'process',
      label: 'Process',
      variant: 'default',
      icon: Database,
    });
  }
  
  // Unlink button
  if (StateGuards.canUnlink(url)) {
    actions.push({
      type: 'unlink',
      label: 'Unlink',
      variant: 'outline',
      icon: Unlink,
    });
  }
  
  // Edit citation button
  if (url.processing_status === 'stored_incomplete') {
    actions.push({
      type: 'edit_citation',
      label: 'Edit Citation',
      variant: 'default',
      icon: Edit,
    });
  }
  
  // Select identifier button
  if (url.processing_status === 'awaiting_selection') {
    actions.push({
      type: 'select_identifier',
      label: 'Select Identifier',
      variant: 'default',
      icon: List,
    });
  }
  
  // Approve metadata button
  if (url.processing_status === 'awaiting_metadata') {
    actions.push({
      type: 'approve_metadata',
      label: 'Review & Approve',
      variant: 'default',
      icon: CheckSquare,
    });
  }
  
  // Manual create button (always available)
  actions.push({
    type: 'manual_create',
    label: 'Create Manually',
    variant: 'outline',
    icon: FilePlus,
  });
  
  // More actions menu
  const moreActions = [];
  
  if (StateGuards.canReset(url)) {
    moreActions.push({ type: 'reset', label: 'Reset Processing' });
  }
  
  if (url.user_intent !== 'ignore') {
    moreActions.push({ type: 'ignore', label: 'Mark as Ignored' });
  } else {
    moreActions.push({ type: 'unignore', label: 'Remove Ignore' });
  }
  
  if (url.user_intent !== 'archive') {
    moreActions.push({ type: 'archive', label: 'Archive' });
  }
  
  moreActions.push({ type: 'view_history', label: 'View History' });
  moreActions.push({ type: 'delete', label: 'Delete', variant: 'destructive' });
  
  if (moreActions.length > 0) {
    actions.push({
      type: 'more',
      label: 'More',
      variant: 'ghost',
      icon: MoreVertical,
      menu: moreActions,
    });
  }
  
  return actions;
}
```

### 9.3 Filter Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Filters                                                  [×] │
├─────────────────────────────────────────────────────────────┤
│ Search: [_________________]                                 │
│                                                             │
│ Section:        [All Sections ▼]                            │
│ Domain:         [All Domains ▼]                             │
│                                                             │
│ Processing Status:                                          │
│ ☐ Not Started    ☐ Processing     ☐ Awaiting Action       │
│ ☐ Stored         ☐ Exhausted      ☐ Ignored               │
│                                                             │
│ User Intent:                                                │
│ ☐ Auto          ☐ Priority        ☐ Manual Only           │
│ ☐ Ignored       ☐ Archived                                 │
│                                                             │
│ Capability:                                                 │
│ ☐ Has Identifiers    ☐ Has Translators                     │
│ ☐ Has Content        ☐ Can Use LLM                         │
│                                                             │
│ Citation Status:                                            │
│ ☐ Valid         ☐ Incomplete      ☐ Not Validated         │
│                                                             │
│ Processing Attempts:                                        │
│ ☐ None          ☐ 1-2             ☐ 3+                     │
│                                                             │
│         [Apply Filters]  [Clear All]                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Migration Strategy

### 10.1 Migration Phases

**Phase 1: Schema Migration** (Breaking changes)

- Add new columns to `urls` table
- Create `zotero_item_links` table
- Migrate existing data
- Create indexes

**Phase 2: Data Migration** (Data transformation)

- Convert old statuses to new system
- Build processing history from existing data
- Create link records for stored URLs
- Compute capabilities for all URLs

**Phase 3: Code Migration** (Component updates)

- Update server actions to use new schema
- Refactor components to use new status system
- Add new UI components (modals, etc.)
- Update filters and queries

**Phase 4: Testing & Validation**

- Test all state transitions
- Verify data integrity
- Test UI flows
- Performance testing

### 10.2 Rollback Plan

```sql
-- Rollback script (if migration fails)
BEGIN TRANSACTION;

-- Drop new table
DROP TABLE IF EXISTS zotero_item_links;

-- Drop new indexes
DROP INDEX IF EXISTS idx_urls_processing_status;
DROP INDEX IF EXISTS idx_urls_user_intent;
DROP INDEX IF EXISTS idx_urls_processing_attempts;

-- Restore old behavior (keep new columns but reset to defaults)
UPDATE urls SET
  processing_status = 'not_started',
  user_intent = 'auto',
  processing_attempts = 0,
  processing_history = NULL,
  last_processing_method = NULL;

COMMIT;
```

### 10.3 Migration Validation Queries

```sql
-- Verify migration success

-- 1. Check all URLs have valid processing_status
SELECT COUNT(*) FROM urls 
WHERE processing_status NOT IN (
  'not_started', 'processing_zotero', 'processing_content', 
  'processing_llm', 'awaiting_selection', 'awaiting_metadata',
  'stored', 'stored_incomplete', 'stored_custom', 'exhausted',
  'ignored', 'archived'
);
-- Expected: 0

-- 2. Check all stored URLs have link records
SELECT COUNT(*) FROM urls 
WHERE processing_status LIKE 'stored%' 
  AND zotero_item_key IS NOT NULL
  AND id NOT IN (SELECT url_id FROM zotero_item_links);
-- Expected: 0

-- 3. Check processing history is valid JSON
SELECT COUNT(*) FROM urls
WHERE processing_history IS NOT NULL
  AND json_valid(processing_history) = 0;
-- Expected: 0

-- 4. Verify link counts
SELECT 
  u.id,
  u.linked_url_count,
  COUNT(zil.id) as actual_count
FROM urls u
LEFT JOIN zotero_item_links zil ON u.zotero_item_key = zil.item_key
WHERE u.zotero_item_key IS NOT NULL
GROUP BY u.id
HAVING u.linked_url_count != actual_count;
-- Expected: 0 rows
```

---

## 11. Implementation Plan

### 11.1 Implementation Phases

**Phase 1: Foundation** (Week 1)

- [ ] Database schema migration
- [ ] State machine implementation
- [ ] Processing orchestrator core
- [ ] Migration scripts
- [ ] Data validation

**Phase 2: Server Actions** (Week 2)

- [ ] Refactor Zotero actions
- [ ] Content processing actions
- [ ] LLM extraction actions
- [ ] Batch processing
- [ ] State transition actions

**Phase 3: Core Components** (Week 3)

- [ ] New status badges
- [ ] Refactor URLTable
- [ ] URLTableFilters
- [ ] URLTableRow
- [ ] URLDetailPanel updates

**Phase 4: Modals & UI** (Week 4)

- [ ] ManualCreateModal
- [ ] ContentViewer
- [ ] EditCitationModal
- [ ] IdentifierSelectionModal
- [ ] ProcessingHistoryModal

**Phase 5: Advanced Features** (Week 5)

- [ ] Smart suggestions system
- [ ] Batch processing UI
- [ ] Export/import functionality
- [ ] Processing analytics

**Phase 6: Testing & Polish** (Week 6)

- [ ] Unit tests for state machine
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Performance optimization
- [ ] Documentation

### 11.2 Development Checklist

#### Database & Backend

- [ ] Run migration SQL
- [ ] Verify data migration
- [ ] Implement state machine
- [ ] Implement processing orchestrator
- [ ] Add error categorization
- [ ] Implement batch processor
- [ ] Add concurrency control
- [ ] Implement rate limiting

#### Server Actions

- [ ] `transitionProcessingState`
- [ ] `processUrlWithOrchestrator`
- [ ] `selectIdentifierAndProcess`
- [ ] `approveAndStoreMetadata`
- [ ] `createCustomZoteroItem`
- [ ] `unlinkWithSafetyChecks`
- [ ] `resetProcessingState`
- [ ] `setUserIntent`
- [ ] `processBatch`

#### Components

- [ ] URLTable refactor
- [ ] URLTableFilters
- [ ] URLTableBulkActions
- [ ] URLTableRow
- [ ] ProcessingStatusBadge
- [ ] CapabilityIndicator
- [ ] IntentBadge
- [ ] SmartSuggestions

#### Modals

- [ ] ManualCreateModal
- [ ] ContentViewer (iframe/reader/raw/pdf)
- [ ] MetadataForm
- [ ] EditCitationModal
- [ ] IdentifierSelectionModal
- [ ] MetadataApprovalModal
- [ ] ProcessingHistoryModal

#### Hooks

- [ ] useURLFilters
- [ ] useURLSelection
- [ ] useURLProcessing
- [ ] useBatchProcessing
- [ ] useProcessingHistory

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// __tests__/state-machine.test.ts
describe('URLProcessingStateMachine', () => {
  test('allows valid transitions', () => {
    expect(
      URLProcessingStateMachine.canTransition('not_started', 'processing_zotero')
    ).toBe(true);
  });
  
  test('rejects invalid transitions', () => {
    expect(
      URLProcessingStateMachine.canTransition('stored', 'processing_zotero')
    ).toBe(false);
  });
  
  test('records transition in history', async () => {
    await URLProcessingStateMachine.transition(
      urlId,
      'not_started',
      'processing_zotero'
    );
    
    const url = await getUrlById(urlId);
    const history = JSON.parse(url.processing_history);
    
    expect(history).toHaveLength(1);
    expect(history[0].transition).toEqual({
      from: 'not_started',
      to: 'processing_zotero',
    });
  });
});
```

### 12.2 Integration Tests

```typescript
// __tests__/orchestrator.test.ts
describe('URLProcessingOrchestrator', () => {
  test('auto-cascades on Zotero failure', async () => {
    // Mock Zotero failure
    mockZoteroApi.processIdentifier.mockRejectedValue(new Error('Not found'));
    
    // Process URL
    const result = await URLProcessingOrchestrator.processUrl(urlId);
    
    // Should have attempted content processing
    expect(result.status).toBe('awaiting_selection'); // or other content result
  });
  
  test('stops at exhausted state', async () => {
    // Mock all methods failing
    mockZoteroApi.processUrl.mockRejectedValue(new Error('Failed'));
    mockContentExtractor.extract.mockResolvedValue({ identifiers: [] });
    mockLLM.extract.mockResolvedValue({ qualityScore: 30 });
    
    const result = await URLProcessingOrchestrator.processUrl(urlId);
    
    expect(result.status).toBe('exhausted');
  });
});
```

### 12.3 E2E Tests

```typescript
// e2e/url-processing-workflow.spec.ts
test('complete processing workflow', async ({ page }) => {
  await page.goto('/urls');
  
  // Click process button on a URL
  await page.click('[data-url-id="1"] [data-action="process"]');
  
  // Wait for processing
  await page.waitForSelector('[data-processing-status="stored"]');
  
  // Verify status badge
  const badge = await page.textContent('[data-url-id="1"] [data-status-badge]');
  expect(badge).toContain('Stored');
});

test('manual creation workflow', async ({ page }) => {
  await page.goto('/urls');
  
  // Open manual creation modal
  await page.click('[data-url-id="1"] [data-action="manual-create"]');
  
  // Fill metadata form
  await page.fill('[name="title"]', 'Test Article');
  await page.fill('[name="creators"]', 'John Doe');
  
  // Submit
  await page.click('[data-action="create-item"]');
  
  // Verify success
  await page.waitForSelector('[data-processing-status="stored_custom"]');
});
```

---

## 13. Appendices

### 13.1 Glossary

- **Processing Status**: The current state of a URL in the processing workflow
- **User Intent**: User's explicit preference for how to handle a URL
- **Processing Capability**: What processing methods are available for a URL
- **Effective Status**: Computed status shown in UI (combination of processing status, intent, and capability)
- **Auto-cascade**: Automatic progression to the next processing stage when one fails
- **State Machine**: Formal definition of valid status transitions
- **Processing Orchestrator**: Coordinator that manages the complete processing workflow

### 13.2 Error Categories

| Category | Description | Examples | Retry? |
|----------|-------------|----------|--------|
| `network` | Network connectivity issues | Timeout, DNS failure | Yes |
| `http_client` | Client errors (4xx) | 400, 404, 403, 401 | No |
| `http_server` | Server errors (5xx) | 500, 502, 503 | Yes |
| `parsing` | Failed to extract data | Invalid HTML, PDF parsing error | No |
| `validation` | Invalid data format | Malformed identifier | No |
| `zotero_api` | Zotero-specific errors | Rate limit, invalid response | Yes |
| `rate_limit` | Hit API rate limit | 429 Too Many Requests | Yes |
| `permanent` | Unrecoverable errors | 404, 410 Gone | No |

### 13.3 Processing Method Priority

When multiple processing methods are available:

1. **Valid identifiers** (DOI, PMID, etc.) - Highest priority, most reliable
2. **Web translators** - Good quality, Zotero-supported
3. **Custom identifiers** - User-provided, assumed valid
4. **Content extraction** - Medium quality, needs validation
5. **LLM extraction** - Variable quality, needs approval
6. **Manual creation** - Lowest priority (user effort), but always available

### 13.4 Citation Validation Rules (APA Style)

Critical fields for valid citation:

- **Title** - Always required
- **Creators** - At least one author/contributor
- **Date** - Publication or access date

Optional but recommended:

- Publication title (journal, website, etc.)
- Volume/issue (for articles)
- DOI or URL
- Publisher
- Pages

### 13.5 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Single URL processing | < 5s | Average case |
| Batch processing (100 URLs) | < 10 min | With concurrency |
| State transition | < 100ms | Database update |
| UI filter application | < 500ms | Client-side compute |
| Modal open time | < 300ms | Content loading |
| Page load time | < 2s | Initial render |

### 13.6 API Rate Limits

| Service | Limit | Handling |
|---------|-------|----------|
| Zotero API | 120 req/min | Rate limiter with queue |
| Citation Linker | 60 req/min | Rate limiter with queue |
| LLM Provider | Varies | Configurable concurrency |
| Content Fetching | 100 req/min | Rate limiter per domain |

---

## Conclusion

This PRD provides a comprehensive blueprint for refactoring the URL processing system. The new architecture:

✅ **Clarifies status** with distinct processing status, user intent, and capabilities  
✅ **Automates workflows** with multi-stage processing and auto-cascading  
✅ **Empowers users** with manual creation, editing, and ignore capabilities  
✅ **Ensures transparency** with complete audit trails and smart suggestions  
✅ **Improves maintainability** with modular components and clear state machines  

**Next Steps:**

1. Review and approve this PRD
2. Begin Phase 1 implementation (database migration)
3. Iterate through phases with regular reviews
4. Test thoroughly at each phase
5. Deploy with careful monitoring

**Estimated Timeline:** 6 weeks for complete implementation and testing.

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Author:** Claude (AI Assistant)  
**Reviewed By:** [Pending]
