# Semantic Scholar Integration - Testing Guide

## Quick Integration Validation

### 1. Domain Detection Tests

Test the helper functions with various URL formats:

```typescript
import {
  isSemanticScholarUrl,
  isSemanticScholarPaperUrl,
  extractPaperIdFromUrl,
} from '@/lib/orchestrator/semantic-scholar-helpers';

// Should return true
isSemanticScholarUrl('https://www.semanticscholar.org/paper/abc123');
isSemanticScholarUrl('https://semanticscholar.org/paper/abc123');

// Should return false
isSemanticScholarUrl('https://google.com');
isSemanticScholarUrl('https://arxiv.org/abs/2301.00123');

// Paper URL validation
isSemanticScholarPaperUrl('https://www.semanticscholar.org/paper/abc123');
isSemanticScholarPaperUrl('https://www.semanticscholar.org/search');  // false

// Paper ID extraction
extractPaperIdFromUrl('https://www.semanticscholar.org/paper/123456789abcdef0123456789abcdef0123456789');
// Returns: '123456789abcdef0123456789abcdef0123456789'

extractPaperIdFromUrl('https://www.semanticscholar.org/paper/Some-Title-123456789abcdef0123456789abcdef0123456789');
// Returns: '123456789abcdef0123456789abcdef0123456789'
```

### 2. Orchestrator Integration Tests

Test that Semantic Scholar URLs are fast-tracked:

```typescript
import { URLProcessingOrchestrator } from '@/lib/orchestrator/url-processing-orchestrator';

// Mock or use real URL ID pointing to a semanticscholar.org URL
const urlId = 42;  // Assume this URL is: https://www.semanticscholar.org/paper/...

const result = await URLProcessingOrchestrator.processUrl(urlId);

// For successful Semantic Scholar extraction:
if (result.success) {
  console.log('✅ Semantic Scholar processing succeeded!');
  console.log('   Item Key:', result.itemKey);
  console.log('   Status:', result.status);  // Should be 'stored' or 'stored_incomplete'
}

// For retryable error (cascades to Zotero):
if (!result.success && result.error?.includes('timeout')) {
  console.log('⚠️  Semantic Scholar API error (retryable)');
  console.log('   Will cascade to Zotero processing');
}

// For permanent error:
if (!result.success && result.status === 'exhausted') {
  console.log('❌ Permanent error - URL needs manual creation');
}
```

### 3. Batch Processing Integration Test

Test batch processing with a mix of URL types:

```typescript
import { BatchProcessor } from '@/lib/orchestrator/batch-processor';

// Mix of URL types: some semanticscholar.org, some others
const urlIds = [1, 2, 3, 4, 5];

// Start batch processing
const session = await BatchProcessor.processBatch(urlIds, {
  respectUserIntent: true,
  concurrency: 3,
  stopOnError: false,
});

// Monitor results
console.log(`Session ${session.id}:`);
console.log(`  Total URLs: ${session.urlIds.length}`);
console.log(`  Completed: ${session.completed.length}`);
console.log(`  Failed: ${session.failed.length}`);
console.log(`  Status: ${session.status}`);

// Check individual results
if (session.results) {
  for (const result of session.results) {
    if (result.success) {
      console.log(`✅ URL ${result.urlId}: ${result.status}`);
    } else {
      console.log(`❌ URL ${result.urlId}: ${result.error}`);
    }
  }
}
```

### 4. Error Handling Tests

Test different error scenarios:

```typescript
// Test 1: Invalid URL format
const result1 = await extractSemanticScholarBibTeX(1, 'not-a-valid-url');
// Should return: { success: false, error: 'Invalid URL format', ... }

// Test 2: Non-Semantic Scholar URL
const result2 = await extractSemanticScholarBibTeX(2, 'https://arxiv.org/abs/2301.00123');
// Should return: { success: false, error: 'URL must be from semanticscholar.org domain', ... }

// Test 3: Valid SS URL but paper not found
const result3 = await extractSemanticScholarBibTeX(3, 'https://www.semanticscholar.org/paper/0000000000000000000000000000000000000000');
// Should return: { success: false, error: 'Paper not found in Semantic Scholar', ... }
// Should transition to exhausted (permanent error)

// Test 4: API rate limiting (retryable)
// Mock API to return 429 status
// Should return error and auto-cascade to Zotero processing
```

### 5. Database State Verification

After processing, verify database updates:

```typescript
import { db } from '@/lib/db/client';
import { urls, urlEnrichments } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

const urlId = 42;

// Check URL record
const urlRecord = await db.query.urls.findFirst({
  where: eq(urls.id, urlId),
});

if (urlRecord?.zoteroProcessingMethod === 'semantic_scholar_api') {
  console.log('✅ Zotero processing method set to semantic_scholar_api');
  console.log('   Item Key:', urlRecord.zoteroItemKey);
  console.log('   Status:', urlRecord.processingStatus);
  console.log('   Citation Status:', urlRecord.citationValidationStatus);
}

// Check enrichment notes
const enrichment = await db.query.urlEnrichments.findFirst({
  where: eq(urlEnrichments.urlId, urlId),
});

if (enrichment?.notes?.includes('Semantic Scholar API')) {
  console.log('✅ Processing notes recorded in enrichment');
}
```

### 6. End-to-End Test Scenario

Complete workflow test:

```typescript
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { URLProcessingOrchestrator } from '@/lib/orchestrator/url-processing-orchestrator';

// Step 1: Insert a Semantic Scholar URL into database
const insertResult = await db.insert(urls).values({
  url: 'https://www.semanticscholar.org/paper/AttentionIsAllYouNeed/17dfa20fc64506ab4e1ff1ee67f63513d5b6e3ab',
  domain: 'semanticscholar.org',
  processingStatus: 'not_started',
  userIntent: 'extract',
  // ... other required fields
});

const urlId = insertResult[0].id;
console.log(`Created URL ID: ${urlId}`);

// Step 2: Process the URL
const processingResult = await URLProcessingOrchestrator.processUrl(urlId);
console.log(`Processing Result:`, processingResult);

// Step 3: Verify results
const finalRecord = await db.query.urls.findFirst({
  where: eq(urls.id, urlId),
});

console.log(`✅ Final Processing Status:`, finalRecord?.processingStatus);
console.log(`✅ Zotero Item Key:`, finalRecord?.zoteroItemKey);
console.log(`✅ Processing Method:`, finalRecord?.zoteroProcessingMethod);

// Step 4: Check if it's linked in Zotero
if (finalRecord?.zoteroItemKey) {
  const item = await getItem(finalRecord.zoteroItemKey);
  console.log(`✅ Zotero Item Retrieved:`, item.title);
}
```

## Performance Benchmarks

Expected timings for Semantic Scholar processing:

| Operation | Duration | Notes |
|-----------|----------|-------|
| URL validation | <10ms | Simple regex check |
| Paper ID extraction | <5ms | String parsing |
| API request | 200-500ms | Network dependent |
| Zotero conversion | 50-100ms | Format conversion |
| Zotero item creation | 100-200ms | API call |
| Citation validation | 50-100ms | API call |
| Database updates | 10-50ms | Transaction |
| **Total** | **300-800ms** | Typical end-to-end |

## Logging Output Example

When processing a successful Semantic Scholar URL:

```
╔════════════════════════════════════════════════════════════╗
║   ORCHESTRATOR ENTRY: processUrl()                         ║
╚════════════════════════════════════════════════════════════╝
📌 URL ID: 42
⏰ Started at: 2024-01-15T10:30:00.000Z
📂 Fetching URL with capabilities...
✅ URL loaded: https://www.semanticscholar.org/paper/...
📊 Processing status: not_started
🎯 User intent: extract
📋 Capabilities:
   Has identifiers: false
   Has web translators: false
   Has content: false
   Is accessible: true
   Can use LLM: false

🔍 Checking if URL can be processed...
✅ URL can be processed

🎯 DETERMINING STARTING STAGE
✅ Decision: START WITH SEMANTIC SCHOLAR API PROCESSING
   Reason: URL is from semanticscholar.org domain
🚀 Calling attemptSemanticScholarProcessing()...

╔════════════════════════════════════════════════════════════╗
║   STAGE 0: attemptSemanticScholarProcessing()               ║
╚════════════════════════════════════════════════════════════╝
📌 URL ID: 42
📊 Current state: not_started
🌐 URL: https://www.semanticscholar.org/paper/...
🎯 Transitioning to: processing_zotero
✅ State transition complete
📝 Processing attempt recorded
🎬 Starting Semantic Scholar API processing...

🔵 SEMANTIC SCHOLAR CITATION EXTRACTION START
⏰ Timestamp: 2024-01-15T10:30:00.100Z
📌 URL ID: 42
🌐 URL: https://www.semanticscholar.org/paper/...
✔️  Validating URL...
📥 Fetching paper metadata from Semantic Scholar API...
✅ Paper metadata fetched successfully
📄 Title: Attention Is All You Need
👥 Authors: 8
📅 Year: 2017
🔄 Converting to Zotero format...
✅ Conversion complete: {
  itemType: 'journalArticle',
  title: 'Attention Is All You Need',
  creators: 8,
}
💾 Creating Zotero item...
✅ Zotero item created: ABCD1234
💾 Updating database...
✅ Database updated successfully
⏱️  Total duration: 342ms

📊 Semantic Scholar API result:
Success: true
Duration: 342ms
✅ Semantic Scholar processing succeeded
🔑 Item key: ABCD1234
📦 Extracted fields: 12
📝 Updating processing history with success...
✅ STAGE 0 COMPLETE - SUCCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Debugging Tips

1. **Enable verbose logging**: Check server logs during processing
2. **Test with known papers**: Use real Semantic Scholar URLs from your research
3. **Mock API responses**: For isolated testing without API calls
4. **Check state transitions**: Verify database state after each step
5. **Validate Zotero integration**: Ensure items appear in Zotero library

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| URL not recognized as SS | Wrong domain format | Check `isSemanticScholarPaperUrl()` |
| Paper ID extraction fails | Invalid URL format | Verify URL has `/paper/` in path |
| API timeout | Network/rate limit | Will auto-cascade to Zotero |
| Zotero creation fails | Invalid metadata | Check Zotero conversion function |
| State not updated | Transaction error | Check database transaction logs |

## Next Steps

After validating the integration:

1. Deploy to staging environment
2. Test with batch of real Semantic Scholar URLs
3. Monitor error rates and performance metrics
4. Gather user feedback on processing speed
5. Consider caching for repeated requests
