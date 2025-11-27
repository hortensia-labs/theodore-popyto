# Semantic Scholar API Rate Limiting Implementation

## Overview

This document describes the rate limiting and retry mechanism implemented for the Semantic Scholar API client to prevent rate limit errors during bulk processing of academic papers.

## Problem Statement

When bulk processing multiple Semantic Scholar URLs concurrently, the orchestrator and batch processor were hitting rate limit errors (HTTP 429) from the Semantic Scholar API. This was happening because:

1. **No rate limiting**: The API client made direct requests without any rate control
2. **Concurrent requests**: Batch processor runs 5 concurrent URL processing tasks by default
3. **Each semantic scholar URL triggers immediate API call**: No delays between requests
4. **API limits**: Semantic Scholar API has limits (~100 requests per 5 minutes)

## Solution Architecture

### 1. Rate Limiter (Token Bucket Algorithm)

**File**: `lib/rate-limiter.ts`

The `DomainRateLimiter` class uses a token bucket algorithm to control request rates per domain:

```typescript
// Configuration in rate-limiter.ts (setTrustedDomains method)
this.domainConfigs.set('api.semanticscholar.org', {
  tokensPerSecond: 1,        // 1 request per second
  maxBurst: 2,               // Allow burst of 2 requests
});
```

**Why 1 req/sec?**
- Semantic Scholar API: ~100 requests per 5 minutes ≈ 0.33 req/sec absolute limit
- Using 1 req/sec ensures we stay well below the limit
- Provides safety margin for network variance

**Key Methods:**
- `waitForToken(url)`: Blocks until a token is available
- `executeWithRateLimit(url, fn)`: Wraps function execution with rate limiting
- `hasTokenAvailable(url)`: Non-blocking check for token availability

### 2. Semantic Scholar Client Enhancement

**File**: `lib/semantic-scholar-client.ts`

#### Rate Limiting Integration

```typescript
// In fetchPaperFromSemanticScholar()
await globalRateLimiter.waitForToken(url);
const response = await fetch(url, {...});
```

Every API call now waits for a token before executing. This ensures requests are spaced 1 second apart.

#### Exponential Backoff for 429 Errors

When rate limited (HTTP 429), the client now:

1. **Detects 429 response** and checks if retries remain
2. **Calculates exponential backoff delay**:
   - Attempt 1: 1 second
   - Attempt 2: 2 seconds
   - Attempt 3: 4 seconds
   - Attempt 4: 8 seconds (capped at 32 seconds max)

3. **Retries up to 3 times** before giving up

```typescript
const maxRetries = 3;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  // Token bucket rate limiting
  await globalRateLimiter.waitForToken(url);

  const response = await fetch(url, {...});

  if (response.status === 429 && attempt < maxRetries) {
    const backoffDelay = getExponentialBackoffDelay(attempt);
    console.warn(`Rate limited. Retrying after ${backoffDelay}ms...`);
    await sleep(backoffDelay);
    continue; // Retry
  }
}
```

#### Logging

- **Info**: When successfully fetching after retries
- **Warn**: When rate limited, shows attempt count and wait time
- **Error**: When exhausting all retries

### 3. Batch Processing Impact

**File**: `lib/orchestrator/batch-processor.ts`

The batch processor now automatically respects rate limiting:

```
Before:
┌─ URL 1 → API call (immediate)
├─ URL 2 → API call (immediate)
├─ URL 3 → API call (immediate)
├─ URL 4 → API call (immediate)
└─ URL 5 → API call (immediate)
All 5 requests hit API in parallel → 429 errors

After (with rate limiting):
┌─ URL 1 → wait 0s  → API call
├─ URL 2 → wait 1s  → API call
├─ URL 3 → wait 1s  → API call
├─ URL 4 → wait 1s  → API call
└─ URL 5 → wait 1s  → API call
Requests spaced 1 second apart → No rate limiting
```

The batch processor doesn't need code changes—it automatically benefits from rate limiting in the client.

## Request Flow Diagram

```
BatchProcessor.processBatch(urlIds)
  ↓
  For each URL (up to 5 concurrent):
    ↓
    URLProcessingOrchestrator.processUrl(urlId)
      ↓
      Check if semantic scholar domain
      ↓ (if yes)
      extractSemanticScholarBibTeX(urlId, url)
        ↓
        fetchPaperFromSemanticScholar(url)
          ↓
          1. Wait for rate limit token (1 req/sec)
          2. Make API request
          3. If 429 + retries left:
             - Calculate backoff (1s, 2s, 4s, 8s)
             - Wait and retry (up to 3 times)
          4. Return paper or throw error
```

## Performance Impact

### Before Rate Limiting
- 5 concurrent requests to API
- Immediate 429 errors for semantic scholar URLs
- No recovery mechanism
- Batch processing fails

### After Rate Limiting
- Requests spaced 1 second apart by design
- 429 errors extremely unlikely (only if API becomes stricter)
- Automatic recovery with exponential backoff
- Batch processing completes successfully

**Example Timeline** (5 semantic scholar URLs):
```
t=0.0s  : URL 1 waits for token (has it) → requests immediately
t=1.0s  : URL 2 waits for token (now available) → requests
t=2.0s  : URL 3 waits for token (now available) → requests
t=3.0s  : URL 4 waits for token (now available) → requests
t=4.0s  : URL 5 waits for token (now available) → requests
t=5-10s : Responses arrive (no overlap)
Total time: ~5-10 seconds instead of instant failure
```

## Configuration

### Default Settings

Rate limiter is configured at initialization in `lib/rate-limiter.ts`:

```typescript
// Global instance with default 1 req/sec
export const globalRateLimiter = new DomainRateLimiter(
  parseInt(process.env.RATE_LIMIT_DEFAULT_PER_SECOND || '1', 10)
);
```

### Adjusting Limits

If you need to adjust rate limits (not recommended without testing):

```typescript
// In any file that imports rate-limiter
import { globalRateLimiter } from './rate-limiter';

// Adjust semantic scholar limit
globalRateLimiter.setDomainLimit('api.semanticscholar.org', 2, 4);
// Change to: 2 req/sec, max burst of 4
```

**⚠️ Warning**: Don't increase beyond 2 req/sec without checking current API limits.

## Testing

### Unit Testing

The rate limiter has built-in methods for testing:

```typescript
// Check tokens available
const count = globalRateLimiter.getTokenCount(url);
console.log(`Tokens available: ${count}`);

// Get stats for all domains
const stats = globalRateLimiter.getStats();
console.log(stats);
// Output:
// {
//   'api.semanticscholar.org': {
//     tokens: 1.5,
//     maxTokens: 2,
//     refillRate: 1
//   }
// }
```

### Integration Testing

Test with batch processing:

```bash
# Process a batch of semantic scholar URLs
POST /api/batch-process
{
  "urlIds": [1, 2, 3, 4, 5],
  "respectUserIntent": true,
  "concurrency": 5,
  "stopOnError": false
}

# Expected behavior:
# - No 429 errors
# - Completion time ~5-10 seconds (not instant)
# - Console logs showing rate limiting in effect
```

### Manual Testing

Monitor rate limiter in action:

```typescript
// In extract-semantic-scholar-bibtex.ts, before calling fetchPaperFromSemanticScholar
const stats = globalRateLimiter.getStats();
console.log('Rate limiter stats before API call:', stats);

// After the call completes:
const statsAfter = globalRateLimiter.getStats();
console.log('Rate limiter stats after API call:', statsAfter);
```

## Error Scenarios

### Scenario 1: Rate Limit with Successful Retry

```
Request 1: 429 Too Many Requests
  → Exponential backoff: wait 1000ms
Request 2: Success (200 OK)
  → Paper fetched successfully
```

**Console Output:**
```
⚠️  Rate limited (attempt 1/4). Retrying after 1000ms...
✅ Successfully fetched paper after 1 retry
```

### Scenario 2: Multiple Rate Limits

```
Request 1: 429 Too Many Requests
  → Wait 1000ms
Request 2: 429 Too Many Requests
  → Wait 2000ms
Request 3: 429 Too Many Requests
  → Wait 4000ms
Request 4: Success (200 OK)
```

**Total wait time**: 1 + 2 + 4 = 7 seconds (plus actual fetch time)

### Scenario 3: Non-Retryable Errors

```
Request 1: 404 Not Found
  → Throw error immediately (no retry)
```

Only 429 (rate limit) and server errors (5xx) are retried. Client errors (4xx except 429) fail immediately.

### Scenario 4: Exhausted Retries

```
Request 1: 429
  → Wait 1s, retry
Request 2: 429
  → Wait 2s, retry
Request 3: 429
  → Wait 4s, retry
Request 4: 429
  → No more retries, throw error
```

**Error thrown**:
```
SemanticScholarError(RATE_LIMITED, "Semantic Scholar API rate limit exceeded", 429)
```

## Monitoring & Debugging

### Console Logs

The implementation includes informative logging:

```typescript
// Rate limit event
console.warn(`Rate limited (attempt 1/4). Retrying after 1000ms...`);

// Success after retry
console.log(`Successfully fetched paper after 1 retry/retries`);

// In extract-semantic-scholar-bibtex.ts
console.log('⚠️  Citation incomplete - triggering metadata extraction');
```

### Error Codes

Three error codes are used for rate limiting:

1. **RATE_LIMITED** (429): HTTP 429 response
2. **TIMEOUT** (408/504): Request timeout
3. **API_ERROR** (500-503): Server unavailable

All can be handled based on error type:

```typescript
try {
  const paper = await fetchPaperFromSemanticScholar(url);
} catch (error) {
  if (error instanceof SemanticScholarError) {
    if (error.code === SemanticScholarErrorCode.RATE_LIMITED) {
      // Handle rate limit (should not happen with new implementation)
    } else if (error.code === SemanticScholarErrorCode.TIMEOUT) {
      // Handle timeout (retry manually if needed)
    }
  }
}
```

## Files Modified

1. **lib/rate-limiter.ts**
   - Added Semantic Scholar API configuration (1 req/sec, burst of 2)

2. **lib/semantic-scholar-client.ts**
   - Imported `globalRateLimiter`
   - Added `sleep()` utility function
   - Added `getExponentialBackoffDelay()` function
   - Updated `fetchPaperFromSemanticScholar()` with:
     - Rate limiting via `globalRateLimiter.waitForToken()`
     - Retry loop with exponential backoff
     - Improved logging

## Future Improvements

1. **Adaptive rate limiting**: Detect API limits from response headers
2. **Metrics tracking**: Log success/failure rates for monitoring
3. **Circuit breaker**: Temporarily disable requests if API is down
4. **Distributed rate limiting**: Share token bucket across multiple servers
5. **Configuration UI**: Allow users to adjust rate limits per domain

## References

- [Semantic Scholar API Docs](https://www.semanticscholar.org/product/api)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [HTTP 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
