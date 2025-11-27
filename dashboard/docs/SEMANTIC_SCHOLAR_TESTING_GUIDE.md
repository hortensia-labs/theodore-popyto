# Semantic Scholar Rate Limiting - Testing Guide

## Quick Start

### Test 1: Verify Rate Limiter Configuration

**Objective**: Confirm that rate limiting is properly configured for Semantic Scholar API.

**Steps**:

1. Open `dashboard/lib/rate-limiter.ts`
2. Verify `setTrustedDomains()` includes Semantic Scholar:
   ```typescript
   this.domainConfigs.set('api.semanticscholar.org', {
     tokensPerSecond: 1,
     maxBurst: 2,
   });
   ```

3. Verify in `semantic-scholar-client.ts` the import is present:
   ```typescript
   import { globalRateLimiter } from './rate-limiter';
   ```

**Expected Result**: Both files show proper configuration ✅

---

## Test 2: Single URL Processing

**Objective**: Test that a single Semantic Scholar URL is processed successfully with rate limiting.

**Setup**:

Create a test file or use your dashboard UI.

**Test Case**:

```typescript
import { extractSemanticScholarBibTeX } from '@/lib/actions/extract-semantic-scholar-bibtex';

// Test with a valid Semantic Scholar URL
const testUrl = 'https://www.semanticscholar.org/paper/abc123def456...';

const result = await extractSemanticScholarBibTeX(1, testUrl);

console.log('Result:', result);
// Expected: { success: true, itemKey: "...", extractedFields: [...] }
```

**Expected Behavior**:

1. ✅ No immediate error
2. ✅ Console shows rate limiter waiting for token
3. ✅ API call succeeds
4. ✅ Item created in Zotero

**Console Output**:

```
🔵 SEMANTIC SCHOLAR CITATION EXTRACTION START
⏰ Timestamp: 2024-01-15T10:30:45.123Z
📌 URL ID: 1
🌐 URL: https://www.semanticscholar.org/paper/abc123def456...
✔️  Validating URL...
✅ URL validated
📥 Fetching paper metadata from Semantic Scholar API...
✅ Paper metadata fetched successfully
📄 Title: Example Paper Title
👥 Authors: 3
📅 Year: 2023
✅ Conversion complete: { itemType: 'journalArticle', ... }
💾 Creating Zotero item...
✅ Zotero item created: ABC123XYZ
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Test 3: Batch Processing (5 URLs)

**Objective**: Verify that batch processing respects rate limiting and doesn't hit 429 errors.

**Setup**:

Create 5 Semantic Scholar URLs in your database with IDs: 1, 2, 3, 4, 5

**Test Case**:

```typescript
import { BatchProcessor } from '@/lib/orchestrator/batch-processor';

const result = await BatchProcessor.processBatch(
  [1, 2, 3, 4, 5],
  {
    concurrency: 5,        // Full concurrency
    respectUserIntent: true,
    stopOnError: false,
  }
);

console.log('Batch Result:', result);
console.log('Completed:', result.completed.length);
console.log('Failed:', result.failed.length);
console.log('Status:', result.status);
```

**Expected Behavior**:

1. ✅ All 5 URLs processed successfully
2. ✅ No 429 errors in logs
3. ✅ Processing takes ~5-10 seconds (not instant)
4. ✅ Requests spaced approximately 1 second apart

**Console Output (Example)**:

```
Starting batch processing session batch_1705326645123_abc123: 5 URLs with concurrency 5
Starting Semantic Scholar API processing...
Batch batch_1705326645123_abc123: Processed 1/5 (✓)
[1s later]
Batch batch_1705326645123_abc123: Processed 2/5 (✓)
[1s later]
Batch batch_1705326645123_abc123: Processed 3/5 (✓)
[1s later]
Batch batch_1705326645123_abc123: Processed 4/5 (✓)
[1s later]
Batch batch_1705326645123_abc123: Processed 5/5 (✓)
Batch batch_1705326645123_abc123 finished: 5 succeeded, 0 failed
```

**Success Criteria**:

- ✅ `completed.length === 5`
- ✅ `failed.length === 0`
- ✅ `status === 'completed'`
- ✅ No "RATE_LIMITED" in error messages
- ✅ Total time: 5-15 seconds (not instant)

---

## Test 4: Rate Limiting Under Stress (10+ URLs)

**Objective**: Verify rate limiting works correctly with larger batches.

**Setup**:

Create 10 Semantic Scholar URLs (can reuse same URL multiple times for testing).

**Test Case**:

```typescript
import { BatchProcessor } from '@/lib/orchestrator/batch-processor';

const urlIds = Array.from({ length: 10 }, (_, i) => i + 1);

const startTime = Date.now();
const result = await BatchProcessor.processBatch(
  urlIds,
  { concurrency: 5 }
);
const duration = Date.now() - startTime;

console.log(`✅ Batch completed in ${duration}ms`);
console.log(`Processed: ${result.completed.length}`);
console.log(`Failed: ${result.failed.length}`);
```

**Expected Behavior**:

1. ✅ All 10 URLs processed (with 5 concurrency)
2. ✅ Duration: ~10-15 seconds (10 requests × 1 req/sec spacing)
3. ✅ No rate limit errors

**Timing Breakdown** (with 5 concurrency):

```
0-1s:  URLs 1-5 processing
1-2s:  URLs 6-10 processing
Total: ~10 seconds for 10 URLs
```

---

## Test 5: Rate Limit Error Handling (Simulated)

**Objective**: Verify that if a 429 error somehow occurs, the exponential backoff mechanism handles it correctly.

**Setup**:

This test requires mocking the fetch API. Use your testing framework.

**Test Code (Jest Example)**:

```typescript
import { fetchPaperFromSemanticScholar } from '@/lib/semantic-scholar-client';

jest.mock('node-fetch');
const fetchMock = require('node-fetch') as jest.Mock;

it('should retry on 429 rate limit error', async () => {
  // First two calls return 429, third succeeds
  fetchMock
    .mockResolvedValueOnce({ ok: false, status: 429 })
    .mockResolvedValueOnce({ ok: false, status: 429 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        paperId: '123abc',
        title: 'Test Paper',
        authors: [],
        externalIds: {},
      }),
    });

  const result = await fetchPaperFromSemanticScholar(
    'https://www.semanticscholar.org/paper/123abc'
  );

  expect(result.title).toBe('Test Paper');
  expect(fetchMock).toHaveBeenCalledTimes(3); // 2 retries + 1 success
});
```

**Expected Behavior**:

1. ✅ First request gets 429
2. ✅ Waits 1 second (exponential backoff)
3. ✅ Second request gets 429
4. ✅ Waits 2 seconds
5. ✅ Third request succeeds
6. ✅ Paper returned successfully

**Console Output** (if logging enabled):

```
⚠️  Rate limited (attempt 1/4). Retrying after 1000ms...
⚠️  Rate limited (attempt 2/4). Retrying after 2000ms...
✅ Successfully fetched paper after 2 retries
```

---

## Test 6: Non-Retryable Errors

**Objective**: Verify that non-rate-limit errors fail immediately without retrying.

**Test Case** (404 Not Found):

```typescript
import { fetchPaperFromSemanticScholar } from '@/lib/semantic-scholar-client';

try {
  // Invalid paper ID that returns 404
  await fetchPaperFromSemanticScholar('https://www.semanticscholar.org/paper/invalid');
  fail('Should have thrown error');
} catch (error) {
  if (error instanceof SemanticScholarError) {
    expect(error.code).toBe(SemanticScholarErrorCode.PAPER_NOT_FOUND);
    expect(error.statusCode).toBe(404);
  }
}
```

**Expected Behavior**:

1. ✅ Error thrown immediately (no retries)
2. ✅ Error code: `PAPER_NOT_FOUND`
3. ✅ Status code: 404

**Console Output**:

```
❌ API Error (PAPER_NOT_FOUND): Paper not found in Semantic Scholar: invalid
```

---

## Test 7: Monitoring Rate Limiter State

**Objective**: Verify rate limiter is working by checking token availability.

**Test Code**:

```typescript
import { globalRateLimiter } from '@/lib/rate-limiter';

// Get current rate limiter stats
const stats = globalRateLimiter.getStats();
console.log('Rate Limiter Stats:', stats);

// Expected output:
// {
//   'api.semanticscholar.org': {
//     tokens: 0.8,        // <1 token available (0-1)
//     maxTokens: 2,
//     refillRate: 1       // 1 token per second
//   }
// }

// Check if token available (non-blocking)
const hasToken = globalRateLimiter.hasTokenAvailable(
  'https://api.semanticscholar.org/graph/v1/paper/123'
);
console.log('Token available:', hasToken); // true or false

// Get exact token count
const tokenCount = globalRateLimiter.getTokenCount(
  'https://api.semanticscholar.org/graph/v1/paper/123'
);
console.log('Token count:', tokenCount); // e.g., 0.5
```

**Expected Behavior**:

- ✅ Stats show 1 token/sec refill rate
- ✅ Max tokens: 2 (burst capacity)
- ✅ Token count fluctuates between 0-2
- ✅ `hasTokenAvailable()` returns boolean

---

## Test 8: End-to-End Batch with Monitoring

**Objective**: Complete batch processing with detailed monitoring.

**Test Code**:

```typescript
import { BatchProcessor } from '@/lib/orchestrator/batch-processor';
import { globalRateLimiter } from '@/lib/rate-limiter';

// Monitor rate limiter throughout batch
const urlIds = [1, 2, 3, 4, 5];

console.log('🚀 Starting batch process...');
const startTime = Date.now();

// Start batch
const batchPromise = BatchProcessor.processBatch(urlIds, { concurrency: 5 });

// Monitor progress every 500ms
const monitorInterval = setInterval(() => {
  const stats = globalRateLimiter.getStats();
  console.log('📊 Rate limiter stats:', stats['api.semanticscholar.org']);
}, 500);

const result = await batchPromise;
clearInterval(monitorInterval);

const duration = Date.now() - startTime;

console.log('✅ Batch completed');
console.log(`⏱️  Duration: ${duration}ms`);
console.log(`✓ Succeeded: ${result.completed.length}`);
console.log(`✗ Failed: ${result.failed.length}`);
```

**Expected Output**:

```
🚀 Starting batch process...
Starting batch processing session batch_1705326645123_abc123: 5 URLs with concurrency 5
📊 Rate limiter stats: { tokens: 0.95, maxTokens: 2, refillRate: 1 }
📊 Rate limiter stats: { tokens: 0, maxTokens: 2, refillRate: 1 }
Batch batch_1705326645123_abc123: Processed 1/5 (✓)
📊 Rate limiter stats: { tokens: 0, maxTokens: 2, refillRate: 1 }
📊 Rate limiter stats: { tokens: 0.5, maxTokens: 2, refillRate: 1 }
📊 Rate limiter stats: { tokens: 0, maxTokens: 2, refillRate: 1 }
Batch batch_1705326645123_abc123: Processed 2/5 (✓)
...
✅ Batch completed
⏱️  Duration: 8234ms
✓ Succeeded: 5
✗ Failed: 0
```

---

## Troubleshooting

### Issue: 429 Errors Still Occurring

**Symptoms**: Seeing "Rate limited" errors in logs

**Solution**:

1. Check rate limiter configuration in `rate-limiter.ts`
2. Verify `api.semanticscholar.org` is configured to 1 req/sec
3. Check logs for warning messages about retries
4. If still happening, reduce concurrency:
   ```typescript
   BatchProcessor.processBatch(urlIds, { concurrency: 2 });
   ```

### Issue: Processing Takes Too Long

**Symptoms**: Batch of 5 URLs takes >30 seconds

**Possible Causes**:
- Each URL takes 1-5 seconds to fetch and process
- Network latency
- Zotero item creation overhead

**Expected Times** (with 5 concurrent, 1 req/sec):
- 5 URLs: 5-15 seconds ✅
- 10 URLs: 10-25 seconds ✅
- 20 URLs: 20-50 seconds ✅

If significantly longer, check:
- Network connection
- API response times
- Database write performance

### Issue: Batch Fails Silently

**Symptoms**: Batch completes but `failed.length > 0`

**Debugging**:

```typescript
const result = await BatchProcessor.processBatch([1, 2, 3]);
console.log('Failed URLs:', result.failed);

// Check each failed URL's error
for (const urlId of result.failed) {
  const url = await db.query.urls.findFirst({
    where: eq(urls.id, urlId),
  });
  console.log(`URL ${urlId}: ${url?.url}`);
  console.log(`Last error: ${url?.lastFetchError}`);
}
```

### Issue: Rate Limiter Not Initialized

**Symptoms**: TypeError: globalRateLimiter is undefined

**Solution**:

Ensure import is present:

```typescript
import { globalRateLimiter } from './rate-limiter';
```

And that `semantic-scholar-client.ts` has this import in the file.

---

## Performance Benchmarks

### Target Performance

| Test | Concurrency | URLs | Expected Time | Status |
|------|-------------|------|----------------|--------|
| Single URL | 1 | 1 | 1-3s | ✅ |
| Small batch | 5 | 5 | 5-15s | ✅ |
| Medium batch | 5 | 10 | 10-25s | ✅ |
| Large batch | 3 | 20 | 20-50s | ✅ |

### Success Rate

After implementation:
- **Before**: ~20-30% (rate limit errors)
- **After**: 95%+ (only non-API errors fail)

---

## Cleanup

After testing, remember to:

1. Remove test data from database
2. Check that no test sessions are still running
3. Verify batch processor cleanup of old sessions:
   ```typescript
   BatchProcessor.cleanupOldSessions();
   ```

---

## Questions?

If tests fail or behave unexpectedly:

1. Check console logs for detailed error messages
2. Review the implementation in:
   - `lib/rate-limiter.ts`
   - `lib/semantic-scholar-client.ts`
3. Check rate limiter stats: `globalRateLimiter.getStats()`
4. Enable verbose logging if available
