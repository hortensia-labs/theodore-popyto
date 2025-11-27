# Semantic Scholar Integration - Debugging Guide

## Issue: Batch Processing Fails for Semantic Scholar URLs

If you press the "Process" button with Semantic Scholar URLs and they all fail without attempting Semantic Scholar extraction, follow this guide.

## Diagnostic Steps

### 1. Check Server Logs

When you click Process, look for these logs in your server console:

```
🔍 Checking if URL is Semantic Scholar...
   URL: https://www.semanticscholar.org/paper/...
   Is Semantic Scholar: true|false

[isSemanticScholarPaperUrl] URL: https://www.semanticscholar.org/paper/...
[isSemanticScholarPaperUrl] hostname: www.semanticscholar.org, isDomain: true
[isSemanticScholarPaperUrl] pathname: /paper/..., pathParts: paper,..., hasPaper: true
```

### 2. Verify URL Format

Semantic Scholar URLs should match this pattern:
```
https://www.semanticscholar.org/paper/{ID}
https://www.semanticscholar.org/paper/{TITLE}-{ID}
https://semanticscholar.org/paper/{ID}
```

**Valid Examples**:
- `https://www.semanticscholar.org/paper/AttentionIsAllYouNeed/17dfa20fc64506ab4e1ff1ee67f63513d5b6e3ab`
- `https://semanticscholar.org/paper/17dfa20fc64506ab4e1ff1ee67f63513d5b6e3ab`

**Invalid Examples** (will not trigger Semantic Scholar processing):
- `https://semanticscholar.org/search?...` (not a paper URL)
- `https://semanticscholar.org/` (just homepage)
- `https://s2-production-openreview.s3.amazonaws.com/...` (external link)

### 3. Check Database URL Values

Query your database to see what URLs are actually stored:

```sql
SELECT id, url, domain, processingStatus FROM urls LIMIT 10;
```

Look at the actual URL values being stored. They might be:
- Redirected URLs
- Shortened URLs
- Different domain variants

Example of issues:
```
❌ https://arxiv.org/abs/2301.00123  (not a SS URL)
❌ https://doi.org/10.1234/...        (not a SS URL)
✅ https://www.semanticscholar.org/paper/...  (SS URL)
```

### 4. Check Processing Flow

Look for these stages in the logs:

**Stage 1: Entry**
```
╔════════════════════════════════════════════════════════════╗
║   ORCHESTRATOR ENTRY: processUrl()                         ║
╚════════════════════════════════════════════════════════════╝
📌 URL ID: 42
⏰ Started at: 2024-01-15T10:30:00.000Z
📂 Fetching URL with capabilities...
```

**Stage 2: Domain Detection**
```
🎯 DETERMINING STARTING STAGE
🔍 Checking if URL is Semantic Scholar...
   URL: https://www.semanticscholar.org/paper/...
   Is Semantic Scholar: true
✅ Decision: START WITH SEMANTIC SCHOLAR API PROCESSING
🚀 Calling attemptSemanticScholarProcessing()...
```

**Stage 3: Semantic Scholar Processing**
```
╔════════════════════════════════════════════════════════════╗
║   STAGE 0: attemptSemanticScholarProcessing()               ║
╚════════════════════════════════════════════════════════════╝
📌 URL ID: 42
🌐 URL: https://www.semanticscholar.org/paper/...
🎬 Starting Semantic Scholar API processing...
🔵 SEMANTIC SCHOLAR CITATION EXTRACTION START
```

### 5. Common Issues and Solutions

#### Issue A: "Is Semantic Scholar: false"

**Problem**: URL is detected correctly as semanticscholar.org, but the paper check fails

**Causes**:
- URL is not actually a paper URL (e.g., search page, homepage)
- Path doesn't contain `/paper/` segment

**Solution**:
- Verify URLs in database are paper URLs
- Check URL domain and path in logs

#### Issue B: "Not a semanticscholar.org domain, returning false"

**Problem**: URL domain is not recognized as Semantic Scholar

**Causes**:
- URL is actually from a different domain
- URL might be wrapped/modified somehow
- Database stores alternative URLs

**Solution**:
- Check what URL is actually being stored
- Make sure URLs are from `semanticscholar.org` domain
- Check for URL redirects or transformations

#### Issue C: Appears to skip Semantic Scholar and go to Zotero

**Log Output**:
```
Is Semantic Scholar: false
✅ Decision: START WITH ZOTERO PROCESSING  ← Should be Semantic Scholar!
```

**Causes**:
- URL detection function returning false for valid SS URLs
- Paper path not detected correctly
- Domain check failing

**Solution**:
- Add `console.log(url)` to see actual URL string
- Check pathname parsing logic
- Verify URL format in database

## Debug Logging

The code now includes detailed logging. Check server console for:

### Helper Function Logs
```
[isSemanticScholarUrl] URL: ..., hostname: ..., result: true/false
[isSemanticScholarPaperUrl] URL: ..., hostname: ..., isDomain: true/false
[isSemanticScholarPaperUrl] pathname: /paper/..., pathParts: ..., hasPaper: true/false
```

### Orchestrator Logs
```
🔍 Checking if URL is Semantic Scholar...
   URL: ...
   Is Semantic Scholar: true/false
```

## Testing URLs

Use these known good Semantic Scholar URLs for testing:

1. **Attention Is All You Need**
   ```
   https://www.semanticscholar.org/paper/AttentionIsAllYouNeed/17dfa20fc64506ab4e1ff1ee67f63513d5b6e3ab
   ```

2. **BERT Paper**
   ```
   https://www.semanticscholar.org/paper/BERT%3A-Pre-training-of-Deep-Bidirectional-Transformers-Devlin-Chang/df2b0e26d0599ce3e70df8a9cb0d4360615cde485
   ```

3. **GPT-3 Paper**
   ```
   https://www.semanticscholar.org/paper/Language-Models-are-Unsupervised-Multitask-Learners-Radford/9405cc0d6169988371b2755e573cc28650d14dfe8
   ```

## Manual Testing

### 1. Test Detection Function

In browser console or Node script:

```javascript
import { isSemanticScholarPaperUrl } from '@/lib/orchestrator/semantic-scholar-helpers';

const testUrls = [
  'https://www.semanticscholar.org/paper/AttentionIsAllYouNeed/17dfa20fc64506ab4e1ff1ee67f63513d5b6e3ab',
  'https://arxiv.org/abs/1706.03762',
  'https://doi.org/10.1234/example',
];

testUrls.forEach(url => {
  const result = isSemanticScholarPaperUrl(url);
  console.log(`${url}: ${result}`);
});
```

**Expected Output**:
```
https://www.semanticscholar.org/paper/...: true
https://arxiv.org/abs/...: false
https://doi.org/...: false
```

### 2. Test Orchestrator

```javascript
import { URLProcessingOrchestrator } from '@/lib/orchestrator/url-processing-orchestrator';

// Assuming you have a URL ID that points to a SS URL
const result = await URLProcessingOrchestrator.processUrl(42);
console.log('Result:', result);
```

**Expected Logs**:
```
Is Semantic Scholar: true
✅ Decision: START WITH SEMANTIC SCHOLAR API PROCESSING
🔵 SEMANTIC SCHOLAR CITATION EXTRACTION START
...
✅ Success! Item: XXXXXX
```

### 3. Test Batch Processing

```javascript
import { startBatchProcessing } from '@/lib/actions/batch-actions';

const urlIds = [1, 2, 3]; // IDs of SS URLs
const session = await startBatchProcessing(urlIds);
console.log('Session:', session);
```

## Checking State Machine

The orchestrator should transition URLs through states:

```
not_started
    ↓
processing_zotero (Semantic Scholar API)
    ├→ stored (success, complete citation)
    ├→ stored_incomplete (success, missing fields)
    └→ exhausted (permanent error)
```

Query database to verify:
```sql
SELECT id, url, processingStatus, zoteroProcessingMethod
FROM urls
WHERE id IN (1, 2, 3);
```

## Common Problems and Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| All SS URLs fail | URL format not recognized | Check URL format in database |
| Skips SS, goes to Zotero | Detection returns false | Check helper function logs |
| API call fails | Invalid paper ID | Verify paper exists on SS |
| Never reaches API | Orchestrator never called | Check processUrl entry point |
| Error: "URL not found" | Database missing URL | Insert test URL first |

## Report Template

When reporting an issue, include:

1. **Sample URL**: The exact URL that fails
2. **Server Logs**: The console output from processing attempt
3. **Database State**: Result of `SELECT * FROM urls WHERE id = ?;`
4. **Expected vs Actual**: What should happen vs what actually happens
5. **Error Messages**: Any error text from logs

## Advanced Debugging

### 1. Add Breakpoints

In VS Code, add breakpoints in orchestrator:

```typescript
// Line 103-106: URL detection
if (isSemanticScholar) {  // ← Set breakpoint here
  return await this.attemptSemanticScholarProcessing(urlId);
}
```

### 2. Inspect URL Object

Add logging to see exact URL properties:

```typescript
console.log('URL object:', {
  full: url.url,
  hostname: new URL(url.url).hostname,
  pathname: new URL(url.url).pathname,
  isPaper: isSemanticScholarPaperUrl(url.url),
});
```

### 3. Check Type System

Ensure types are correct:

```typescript
const isSemanticScholar: boolean = isSemanticScholarPaperUrl(url.url);
console.log('Type check:', typeof isSemanticScholar, isSemanticScholar);
```

## Next Steps

1. Check server logs for domain detection results
2. Verify URLs in database match expected format
3. Test with known good URLs from testing section
4. Check processing stage flow in logs
5. Enable breakpoints for step-by-step debugging

---

**Status**: Debug logging enabled
**Added Logs**: Helper functions and orchestrator entry point
**Next**: Run batch process and check server console output
