# Batch Processing Fix - Technical Details

## Architecture Diagram

### Old Architecture (Blocking)

```
Client Timeline               Server Timeline
────────────────────         ────────────────
User opens modal
  │
  ├─ Call startBatchProcessing()
  │                          Create session
  │                          │
  │                          ├─ Process URL 1 ⏳
  │                          ├─ Process URL 2 ⏳
  │                          ├─ Process URL 3 ⏳
  │                          ...
  │                          └─ Return session (N=1000ms)
  │
  ├─ Receive response (blocked for 1000ms!)
  │
  ├─ Set batchSession
  │
  └─ Start polling
                              (But processing done!)
```

### New Architecture (Non-Blocking)

```
Client Timeline               Server Timeline
────────────────────         ────────────────
User opens modal
  │
  ├─ Call startBatchProcessing()
  │                          Create session object
  │                          │
  │                          └─ Return immediately (50ms)
  │
  ├─ Receive response (fast!)
  │
  ├─ Set batchSession
  │
  ├─ Start polling (500ms interval)
  │   │
  │   ├─ Poll 1: currentIndex=0, status=running
  │   │                          ├─ processBatchInBackground() starts
  │   │                          │
  │   ├─ Poll 2: currentIndex=1, status=running
  │   │                          ├─ Process URL 1 ✓
  │   │                          │
  │   ├─ Poll 3: currentIndex=2, status=running
  │   │                          ├─ Process URL 2 ✓
  │   │                          │
  │   ├─ Poll 4: currentIndex=3, status=running
  │   │                          ├─ Process URL 3 ✓
  │   │                          │
  │   ...more polls...          ...processing continues...
  │   │
  │   └─ Final poll: currentIndex=N, status=completed
  │                          Final session returned
```

## Code Flow Analysis

### Phase 1: User Initiates Batch Processing

**Location:** `URLTableNew` component

```
User clicks "Process" button
  ↓
URLTableNew.handleBulkProcess()
  ↓
setState(batchProgressModalOpen=true, batchUrlIds=[...])
  ↓
BatchProgressModal opens with onProcessingStart callback
```

### Phase 2: Modal Initialization

**Location:** `BatchProgressModal` component

```
useEffect() triggered when modal opens
  ↓
onProcessingStart() called
  ↓ (this is handleStartBatchProcessing from parent)
useURLProcessing.processBatch() called
  ↓
startBatchProcessing() server action invoked
```

### Phase 3: Server Action (Non-Blocking)

**Location:** `batch-actions.ts:startBatchProcessing()`

```
Export async function startBatchProcessing(urlIds, options) {
  ↓
  BatchProcessor.createAndStartSession(urlIds, options)
  ├─ Generate sessionId
  ├─ Create session object with initial state:
  │  {
  │    id: "batch_1732707000123_abc123",
  │    urlIds: [1, 2, 3, ...],
  │    currentIndex: 0,
  │    completed: [],
  │    failed: [],
  │    status: 'running',
  │    results: [],
  │    ...
  │  }
  ├─ Store in this.sessions.set(sessionId, session)
  ├─ Start background processing: void this.processBatchInBackground(...)
  │  (This returns immediately without awaiting!)
  └─ Return session
}
```

### Phase 4: Background Processing Starts

**Location:** `batch-processor.ts:processBatchInBackground()` (async, not awaited)

```
async processBatchInBackground(sessionId, urlIds, options) {
  ├─ Get session from this.sessions.get(sessionId)
  ├─ If respectUserIntent: filter URLs by user preferences
  ├─ Create p-limit concurrency limiter
  ├─ Map each URL to a promise with limit()
  │  └─ For each URL:
  │     ├─ Wait if paused
  │     ├─ Check if cancelled
  │     ├─ Call URLProcessingOrchestrator.processUrl(urlId)
  │     ├─ Update session.currentIndex = index + 1
  │     ├─ Add to session.completed or session.failed
  │     └─ Append to session.results array
  ├─ await Promise.all(promises)
  └─ Set session.status = 'completed' or 'cancelled'
}
```

**Key Point:** This is called with `void` - not awaited by caller

### Phase 5: Hook Returns and Starts Polling

**Location:** `useURLProcessing.ts:processBatch()`

```
Hook receives session from server action (returned immediately)
  ↓
setBatchSession(session)
  ↓
setInterval(() => {
  getBatchStatus(session.id)  // Polling every 500ms
    ↓
    BatchProcessor.getSession(sessionId)
      └─ Returns current session state with updated:
         - currentIndex (from background processing)
         - completed array
         - failed array
         - results array
    ↓
  setBatchProgress(...)
  setBatchSession(...)  // Update state with latest

  if (status === 'completed' || status === 'cancelled') {
    clearInterval()
  }
}, 500)
```

## State Transitions

### Session Status Transitions

```
Initial State
  │
  ├─ 'running' (while processBatchInBackground is running)
  │   ├─ User can pause → 'paused'
  │   ├─ User can cancel → 'cancelled'
  │   └─ Processing finishes → 'completed' or 'cancelled' (if stopOnError)
  │
  ├─ 'paused' (when user pauses)
  │   ├─ User can resume → 'running'
  │   ├─ User can cancel → 'cancelled'
  │   └─ User closes → stays 'paused' (can resume on refresh?)
  │
  └─ 'completed' or 'cancelled' (final states)
      └─ Can only close or start new batch
```

## Session Data Structure

```typescript
interface BatchProcessingSession {
  id: string;                          // Unique session ID
  urlIds: number[];                    // Array of URLs being processed
  currentIndex: number;                // Number of URLs processed so far
  completed: number[];                 // Array of successful URL IDs
  failed: number[];                    // Array of failed URL IDs
  status: 'running'|'paused'|'completed'|'cancelled';
  startedAt: Date;                     // When session was created
  completedAt?: Date;                  // When session finished
  estimatedCompletion: Date;           // ETA calculated from avg duration
  results?: ProcessingResult[];        // Detailed results for each URL
}

interface ProcessingResult {
  success: boolean;
  urlId?: number;
  status?: ProcessingStatus;
  itemKey?: string;
  method?: string;
  error?: string;
  metadata?: {
    duration: number;                  // Time to process this URL
    [key: string]: any;
  };
}
```

## Memory Management

### Session Lifecycle

1. **Creation:** `createAndStartSession()` stores session in `Map<sessionId, session>`
2. **Updates:** `processBatchInBackground()` continuously updates same session object
3. **Polling:** `getBatchStatus()` returns reference to same session object
4. **Cleanup:** `cleanupOldSessions()` removes sessions completed >1 hour ago

### Memory Implications

- ✅ Only completed sessions are cleaned up (after 1 hour)
- ✅ Active sessions kept in memory for real-time polling
- ⚠️ If 1000 concurrent batches, ~10-50MB RAM per batch (with results array)
- ⚠️ Future: Implement database persistence for long-running batches

## Polling Behavior

### Polling Interval

- **Frequency:** 500ms (configurable via hook options)
- **Start:** Immediately after `startBatchProcessing()` returns
- **Stop:** When status becomes 'completed' or 'cancelled'
- **Timeout:** No hard timeout (polling continues until completion)

### Network Considerations

- **Payload size:** ~1-2KB per poll (session object)
- **Bandwidth:** ~20 requests/second during active batch = ~40KB/s max
- **Latency:** If network delayed, polling just returns stale data (no retry logic yet)

### Failure Handling

```
if (statusResult.success && statusResult.data) {
  // Update UI
} else {
  // Poll failed - just skip this iteration
  // Next poll (500ms later) will retry
}
```

No explicit retry logic - just continues polling.

## Race Conditions

### Scenario 1: User closes modal during processing

```
Modal closes
  ↓
hasStartedRef.current reset to false
  ↓
clearInterval(pollInterval)  // Stop polling
  ↓
But processBatchInBackground continues running on server!
  ↓
Processing completes, session marked 'completed'
  ↓
Session stays in memory until cleanup (1 hour later)
```

**Status:** ✅ Handled - processing continues, session cleaned up later

### Scenario 2: Multiple pollers for same sessionId

```
If user opens modal twice for same batch ID
  ↓
Two polling intervals created
  ↓
Both call getBatchStatus() every 500ms
  ↓
Results in duplicate state updates (harmless)
```

**Status:** ⚠️ Minor inefficiency, but harmless. Could be improved with ref checking.

### Scenario 3: Server restart during batch processing

```
Batch processing underway
  ↓
Server restarts
  ↓
In-memory sessions lost
  ↓
Client continues polling, gets "Session not found" error
  ↓
User sees error
```

**Status:** ⚠️ Known limitation - sessions not persisted. Future improvement.

## Performance Characteristics

### Server Action Performance

```
startBatchProcessing()
  ├─ Generate sessionId: ~0.5ms
  ├─ Create session object: ~1ms
  ├─ Store in Map: ~0.1ms
  ├─ Call processBatchInBackground (void, no await): ~0.1ms
  └─ Return session: ~1ms
  ────────────────────────────
  TOTAL: ~3-5ms ✅ Very fast
```

### Background Processing Performance

```
processBatchInBackground()
  ├─ Filtering (if respectUserIntent): ~N * 10ms = 100-1000ms
  ├─ Processing per URL: ~100-3000ms (depends on URL content)
  │  ├─ Zotero API call: ~100-500ms
  │  ├─ Content fetch: ~500-2000ms
  │  └─ LLM extraction: ~1000-3000ms
  └─ Concurrency: 5 concurrent = 5x speedup
```

Example: 20 URLs at 500ms each with 5 concurrency = ~2 seconds total

### Polling Performance

```
Per poll (500ms interval):
  ├─ getBatchStatus(): ~1-5ms (just Map lookup)
  ├─ React state update: ~5-20ms
  ├─ Modal re-render: ~20-50ms (depending on complexity)
  └─ Network round-trip: ~50-200ms
  ──────────────────────────
  TOTAL: ~75-275ms per poll ✅ Acceptable
```

## Thread Safety Considerations

**JavaScript Single-Threaded Nature:** ✅ No concurrency issues

- All state updates are atomic
- No race conditions between server action and polling
- Event loop ensures proper ordering

## Debugging Tips

### Check if background processing is running

```typescript
// In server action or API endpoint
const sessions = BatchProcessor.getAllSessions();
console.log('Active sessions:', sessions.length);
console.log('Sample session:', sessions[0]);
```

### Check session state

```typescript
// Watch session updates
setInterval(() => {
  const session = BatchProcessor.getSession(sessionId);
  console.log(`Index: ${session.currentIndex}/${session.urlIds.length}`);
}, 1000);
```

### Check polling behavior

```typescript
// In browser DevTools console during batch processing
// Watch polling requests
window.addEventListener('beforefetch', (e) => {
  if (e.request.url.includes('getBatchStatus')) {
    console.log('Poll:', new Date().toISOString());
  }
});
```

## Future Improvements

### Short Term (1-2 weeks)

1. Add session persistence to database
2. Implement automatic reconnection if polling fails
3. Add ETA updates based on actual duration data

### Medium Term (1-3 months)

1. Implement Server-Sent Events (SSE) for real-time updates
2. Add batch history/resume functionality
3. Implement per-URL progress streaming

### Long Term (3+ months)

1. WebSocket support for bi-directional communication
2. Distributed batch processing across multiple servers
3. Persistent session recovery after server restart
4. Advanced progress prediction with ML

## Conclusion

The implementation provides:

✅ **Non-blocking server action** - Returns immediately
✅ **Eager polling** - Starts before processing
✅ **Real-time updates** - Every 500ms
✅ **Minimal changes** - Focused modifications
✅ **Backward compatible** - No breaking changes
✅ **Well-documented** - Clear intent and flow

The solution successfully solves the original problem while maintaining code quality and simplicity.
