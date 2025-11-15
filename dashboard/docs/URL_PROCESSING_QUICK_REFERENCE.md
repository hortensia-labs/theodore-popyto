# URL Processing System - Quick Reference

**For:** Developers working with the new URL processing system  
**Last Updated:** November 14, 2025

---

## 🎯 At a Glance

### Processing Statuses (12 States)

| Status | Meaning | Can Process? | User Action? |
|--------|---------|--------------|--------------|
| `not_started` | Never processed | ✅ Yes | No |
| `processing_zotero` | Calling Zotero API | ⏳ In Progress | No |
| `processing_content` | Fetching content | ⏳ In Progress | No |
| `processing_llm` | LLM extracting | ⏳ In Progress | No |
| `awaiting_selection` | Found identifiers | ❌ Paused | ✅ Select ID |
| `awaiting_metadata` | Extracted metadata | ❌ Paused | ✅ Approve |
| `stored` | In Zotero, complete | ❌ Done | No |
| `stored_incomplete` | In Zotero, missing fields | ❌ Done | ✅ Edit |
| `stored_custom` | User created | ❌ Done | No |
| `exhausted` | All methods failed | ❌ Failed | ✅ Manual |
| `ignored` | User skipped | ❌ Skipped | No |
| `archived` | Permanently hidden | ❌ Hidden | No |

### User Intent (5 Values)

| Intent | Behavior |
|--------|----------|
| `auto` | System decides (default) |
| `ignore` | Skip processing |
| `priority` | Process first in batch |
| `manual_only` | No auto-processing |
| `archive` | Permanent ignore |

---

## 🔧 Common Code Patterns

### Check if Action is Allowed

```typescript
import { StateGuards } from '@/lib/state-machine/state-guards';

// Check before processing
if (StateGuards.canProcessWithZotero(url)) {
  await URLProcessingOrchestrator.processUrl(urlId);
}

// Check before unlinking
if (StateGuards.canUnlink(url)) {
  await unlinkUrlFromZotero(urlId);
}

// Get all available actions
const actions = StateGuards.getAvailableActions(url);
// Returns: ['process', 'manual_create', 'ignore', ...]
```

### Perform State Transition

```typescript
import { URLProcessingStateMachine } from '@/lib/state-machine/url-processing-state-machine';

// Always use the state machine, never update directly!
await URLProcessingStateMachine.transition(
  urlId,
  'not_started',        // from
  'processing_zotero',  // to
  {                     // optional metadata
    reason: 'User initiated',
    userId: 'user123',
  }
);
```

### Process a URL (Main Entry Point)

```typescript
import { URLProcessingOrchestrator } from '@/lib/orchestrator/url-processing-orchestrator';

// Process single URL (auto-cascades on failure)
const result = await URLProcessingOrchestrator.processUrl(urlId);

if (result.success) {
  console.log(`Stored with status: ${result.status}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### Handle Errors

```typescript
import { 
  categorizeError, 
  isPermanentError,
  createProcessingError 
} from '@/lib/error-handling';

try {
  // ... some processing
} catch (error) {
  const category = categorizeError(error);
  
  if (isPermanentError(error)) {
    // Don't retry, mark as exhausted
  } else {
    // Can retry
  }
  
  // Create typed error
  const processingError = createProcessingError(error, {
    urlId,
    stage: 'zotero',
  });
}
```

### Record Processing Attempt

```typescript
import { recordProcessingAttempt } from '@/lib/orchestrator/processing-helpers';

await recordProcessingAttempt(urlId, {
  timestamp: Date.now(),
  stage: 'zotero_identifier',
  method: 'DOI',
  success: true,
  itemKey: 'ABC123',
  duration: 1234,
});
```

### Get URL with Capabilities

```typescript
import { getUrlWithCapabilities } from '@/lib/orchestrator/processing-helpers';

const url = await getUrlWithCapabilities(urlId);

if (url.capability.hasIdentifiers) {
  // Can process via identifier
}

if (url.capability.hasWebTranslators) {
  // Can process via URL translator
}

if (url.capability.canUseLLM) {
  // Can use LLM extraction
}
```

### Set User Intent

```typescript
import { setUserIntent } from '@/lib/orchestrator/processing-helpers';

// Mark as ignored
await setUserIntent(urlId, 'ignore');

// Mark as priority
await setUserIntent(urlId, 'priority');

// Back to auto
await setUserIntent(urlId, 'auto');
```

### Reset Processing State

```typescript
import { resetUrlProcessingState } from '@/lib/orchestrator/processing-helpers';

// Clear all processing history and return to not_started
await resetUrlProcessingState(urlId);
```

---

## 🎨 UI Patterns

### Display Status Badge

```typescript
import { URLProcessingStateMachine } from '@/lib/state-machine/url-processing-state-machine';

const label = URLProcessingStateMachine.getStateLabel(url.processingStatus);
const description = URLProcessingStateMachine.getStateDescription(url.processingStatus);

<StatusBadge 
  status={url.processingStatus}
  label={label}
  tooltip={description}
/>
```

### Show Available Actions

```typescript
import { StateGuards } from '@/lib/state-machine/state-guards';

const actions = StateGuards.getAvailableActions(url);

// Sort by priority
const sorted = actions.sort((a, b) => 
  StateGuards.getActionPriority(b) - StateGuards.getActionPriority(a)
);

// Render buttons
{sorted.map(action => (
  <ActionButton key={action} action={action} url={url} />
))}
```

### Display Processing History

```typescript
import { 
  getProcessingHistory,
  summarizeProcessingHistory 
} from '@/lib/orchestrator/processing-helpers';

const history = await getProcessingHistory(urlId);
const summary = summarizeProcessingHistory(history);

console.log(`Attempts: ${summary.totalAttempts}`);
console.log(`Success: ${summary.successCount}`);
console.log(`Failed: ${summary.failureCount}`);
console.log(`Stages tried: ${summary.stagesAttempted.join(', ')}`);
```

---

## 🚦 Decision Trees

### When to Use Each Processing Method

```
Has valid identifiers (DOI, PMID, etc.)?
  YES → Use Zotero identifier processing
  NO  → Check next...

Has web translators?
  YES → Use Zotero URL processing
  NO  → Check next...

Has content cached?
  YES → Extract identifiers from content
  NO  → Fetch content first

Found identifiers after extraction?
  YES → User selects, then process
  NO  → Try LLM extraction

LLM extraction successful?
  YES → User approves metadata
  NO  → Mark as exhausted
```

### When to Show Which Button

```typescript
// Process button
show if: not_started + (hasIdentifiers OR hasWebTranslators)
       OR awaiting_selection

// Retry button  
show if: exhausted OR (not_started + attempts > 0)

// Select Identifier button
show if: awaiting_selection

// Approve Metadata button
show if: awaiting_metadata

// Edit Citation button
show if: stored_incomplete

// Unlink button
show if: stored OR stored_incomplete OR stored_custom

// Manual Create button
show if: ALWAYS (escape hatch)

// Ignore button
show if: NOT (ignored OR archived OR actively processing)

// Reset button
show if: NOT actively processing
```

---

## 📊 Querying by Status

### Get URLs by Processing Status

```typescript
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// Get all URLs needing attention
const needingAttention = await db
  .select()
  .from(urls)
  .where(
    `processing_status IN ('awaiting_selection', 'awaiting_metadata', 'exhausted', 'stored_incomplete')`
  );
```

### Get URLs Ready for Processing

```typescript
import { getUrlsReadyForProcessing } from '@/lib/orchestrator/processing-helpers';

const urlIds = await getUrlsReadyForProcessing(100); // limit to 100
// Returns URLs that are: not_started + (hasIdentifiers OR hasWebTranslators) + intent != ignore
```

---

## 🐛 Debugging

### View Processing History in Console

```typescript
import { getProcessingHistory } from '@/lib/orchestrator/processing-helpers';

const history = await getProcessingHistory(urlId);
console.table(history);
```

### Validate State Machine

```typescript
import { URLProcessingStateMachine } from '@/lib/state-machine/url-processing-state-machine';

const validation = URLProcessingStateMachine.validateTransitionGraph();
if (!validation.valid) {
  console.error('State machine issues:', validation.issues);
}
```

### Check Error Category

```typescript
import { categorizeError } from '@/lib/error-handling';

try {
  // ... something that might fail
} catch (error) {
  const category = categorizeError(error);
  console.log(`Error category: ${category}`);
  // network, http_client, http_server, permanent, etc.
}
```

---

## 🎓 Best Practices

### DO ✅

- **Always use state machine** for transitions
- **Check guards** before performing actions
- **Record attempts** in processing history
- **Categorize errors** for proper retry logic
- **Use orchestrator** as main entry point
- **Test with dry-run** for batch operations

### DON'T ❌

- **Don't** update `processing_status` directly (use state machine)
- **Don't** skip guard checks (ensures consistency)
- **Don't** ignore error categories (affects retry logic)
- **Don't** delete Zotero items without safety checks
- **Don't** process URLs with `user_intent = 'ignore'`
- **Don't** retry permanent errors

---

## 📖 Type Imports

```typescript
// Status types
import type { 
  ProcessingStatus,
  UserIntent,
  ProcessingCapability,
  ProcessingAttempt,
  ErrorCategory,
} from '@/lib/types/url-processing';

// Database types
import type { Url, ProcessingAttempt } from '@/drizzle/schema';

// Guard types
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

// Result types
import type { 
  ProcessingResult,
  TransitionResult,
  BatchProcessingResult,
} from '@/lib/types/url-processing';
```

---

## 🔗 Related Documentation

- **Full PRD:** `docs/URL_PROCESSING_REFACTOR_PRD.md`
- **Implementation Plan:** `docs/URL_PROCESSING_REFACTOR_IMPLEMENTATION_PLAN.md`
- **Phase 1 Report:** `docs/PHASE_1_COMPLETION.md`
- **Migration Checklist:** `dashboard/MIGRATION_CHECKLIST.md`

---

**Quick Reference Version:** 1.0  
**For:** Phase 1 Foundation  
**Status:** Production Ready (after migration)

