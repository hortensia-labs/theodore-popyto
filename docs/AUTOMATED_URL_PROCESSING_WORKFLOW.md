# Automated URL Processing Workflow

## Overview

The Automated URL Processing Workflow is a comprehensive system for processing URLs that Zotero has failed to translate. It programmatically extracts bibliographic identifiers and metadata, presents options to users for validation, and stores items in Zotero.

## Workflow Architecture

### Two-Path Processing Strategy

**Path 1: Identifier-Based Storage** (Preferred)
```
URL → Fetch Content → Extract Identifiers → Preview All → User Selects → Store via Identifier
```

**Path 2: Metadata-Based Storage** (Fallback)
```
URL → Fetch Content → Extract Metadata → User Reviews → Store via Metadata
```

### Processing Phases

1. **Content Acquisition**
   - HTTP fetch with retry logic
   - Content caching (HTML/PDF)
   - Rate limiting per domain
   - Size validation

2. **Identifier Extraction**
   - HTML: Meta tags, JSON-LD, OpenGraph, regex
   - PDF: Zotero `/previewpdf` endpoint
   - Priority: DOI > PMID > ArXiv > ISBN

3. **Preview Fetching**
   - Parallel preview requests (3 concurrent)
   - Quality scoring (0-100 scale)
   - Caching for 7 days

4. **User Interaction**
   - Multiple identifiers → User selects best
   - No identifiers → User reviews metadata
   - Single high-quality identifier → Can auto-process

5. **Storage**
   - Via identifier: `/citationlinker/processidentifier`
   - Via metadata: `/connector/saveItems` + snapshot

## Database Schema

### New Tables

#### `url_content_cache`
Tracks cached content files and HTTP metadata.

**Key Fields:**
- `contentHash`: SHA-256 hash for deduplication
- `rawContentPath`: File system path to cached content
- `responseHeaders`: HTTP headers as JSON
- `expiresAt`: Cache expiration timestamp

#### `url_identifiers`
Stores all found identifiers with preview data.

**Key Fields:**
- `identifierType`: DOI, PMID, ARXIV, ISBN
- `identifierValue`: Normalized identifier
- `extractionMethod`: How it was found
- `previewData`: Cached Zotero preview (JSON)
- `previewQualityScore`: 0-100
- `userSelected`: Boolean flag

#### `url_extracted_metadata`
Stores bibliographic metadata for URLs without identifiers.

**Key Fields:**
- `title`, `creators`, `date`, `itemType`: Core bibliography
- `extractionMethod`: html_meta_tag, json_ld, pdf_metadata, etc.
- `qualityScore`: 0-100
- `validationStatus`: valid, incomplete, invalid
- `userApproved`: Boolean flag

### Extended Fields in `urls` Table

- `processWorkflowVersion`: Track workflow version
- `contentFetchAttempts`: Retry counter
- `lastFetchError`: Last error message
- `identifierCount`: Denormalized count
- `hasExtractedMetadata`: Boolean flag

## Core Modules

### 1. Content Fetcher (`lib/content-fetcher.ts`)

**Features:**
- HEAD request first to check size
- Streaming download with size limits
- Retry with exponential backoff
- Error classification
- Content type detection

**Configuration:**
- HTML: 10MB max, 30s timeout
- PDF: 50MB max, 60s timeout
- Max 5 redirects

### 2. Content Cache (`lib/content-cache.ts`)

**Features:**
- Atomic file writes
- 30-day expiry by default
- Automatic cleanup
- Organized storage (raw/html, raw/pdf, processed)

**Cache Structure:**
```
data/content_cache/
├── raw/
│   ├── html/{hash}.html
│   └── pdf/{hash}.pdf
└── processed/{hash}.json
```

### 3. Rate Limiter (`lib/rate-limiter.ts`)

**Algorithm:** Token bucket per domain

**Default Limits:**
- General: 1 request/second
- Trusted (arxiv.org, nih.gov): 2 requests/second
- Configurable per domain

### 4. Identifier Extraction

#### HTML (`lib/extractors/html-identifier-extractor.ts`)

**Strategies:**
1. Meta tags (high confidence)
2. JSON-LD structured data (high confidence)
3. OpenGraph tags (medium confidence)
4. Content regex (low confidence)

**Patterns:**
- DOI: `10.xxxx/...`
- PMID: 7-8 digits
- ArXiv: `YYMM.NNNNN`
- ISBN: 10 or 13 digits

#### PDF (`lib/extractors/pdf-identifier-extractor.ts`)

Uses Zotero's `/citationlinker/previewpdf` endpoint which:
- Extracts text from first 10 pages
- Applies identifier regex patterns
- Returns confidence levels
- Provides page locations

### 5. Metadata Extraction

#### HTML (`lib/extractors/html-metadata-extractor.ts`)

**Extraction Layers:**
1. Citation meta tags (e.g., `citation_title`, `citation_author`)
2. Schema.org JSON-LD (ScholarlyArticle, BlogPosting)
3. OpenGraph tags
4. HTML structure (`<h1>`, `<time>`, `<title>`)

**Fields Extracted:**
- title, creators, date, itemType (required)
- abstractNote, publicationTitle, language (optional)
- volume, issue, pages, publisher (if available)

#### PDF (`lib/extractors/pdf-metadata-extractor.ts`)

**Sources:**
- PDF embedded metadata (title, author)
- Text analysis from first pages
- Heuristics for title/author detection

### 6. Preview Orchestrator (`lib/preview-orchestrator.ts`)

**Features:**
- Parallel processing (3 concurrent)
- Smart caching (7-day TTL)
- Quality scoring algorithm
- Ranking by quality + type priority

**Quality Scoring Criteria:**
- Title: 20 points
- Creators: 20 points
- Date: 15 points
- DOI: 10 points
- Abstract: 10 points
- Publication: 10 points
- Rich metadata: 10 points
- Field completeness: 5 points

### 7. Metadata Validation (`lib/metadata-validator.ts`)

**Validation Rules:**
- Title: 10-500 characters, not placeholder
- Creators: At least one, valid names
- Date: Valid year (1900-present)
- Item type: From allowed list

**Quality Thresholds:**
- >= 80: Excellent
- >= 60: Good
- >= 40: Acceptable
- < 30: Reject

### 8. Storage

#### Identifier Storage (`lib/actions/identifier-selection-action.ts`)

Uses `/citationlinker/processidentifier` endpoint.

**Process:**
1. User selects identifier
2. Call Zotero API
3. Extract item key
4. Update database
5. Mark identifier as selected

#### Metadata Storage (`lib/storage/metadata-storage.ts`)

Uses `/connector/saveItems` + `/connector/saveSingleFile`.

**Process:**
1. Convert metadata to Connector format
2. Create item via `saveItems`
3. Optionally attach HTML snapshot
4. Find item key via Local API
5. Update database

### 9. Batch Processor (`lib/batch-processor.ts`)

**Features:**
- Process 25 URLs per batch
- 5 concurrent content fetches
- 3 concurrent preview requests
- Progress streaming
- Error aggregation

**Functions:**
- `processBatch(urlIds)`: Process specific URLs
- `processAllPending()`: Process all pending
- `processBySection(sectionId)`: Process by section
- `retryFailed()`: Retry failed URLs

## User Interface

### URL Detail Panel Enhancements

#### 1. Process URL Content Button
- Triggers workflow for single URL
- Shows progress and results
- Available for extractable/translatable URLs

#### 2. Identifier Previews Section
- Card-based comparison interface
- Quality scores with star ratings
- Field completeness indicators
- Confidence badges
- Select button for each identifier
- Collapsible full metadata view

#### 3. Extracted Metadata Review Section
- All extracted fields displayed
- Validation status badges
- Quality score indicator
- Missing fields warning
- Source attribution
- Approve/Reject buttons
- Option to attach HTML snapshot

#### 4. Batch Progress Modal
- Phase timeline visualization
- Real-time progress bar
- Statistics grid (fetched, identifiers, awaiting, failed)
- Activity log with timestamps
- Cancel/pause capabilities

## API Endpoints

### `/api/process-urls-batch`

**Method:** POST

**Request Body:**
```json
{
  "urlIds": [1, 2, 3, ...],
  "options": {
    "batchSize": 25,
    "parallelFetches": 5,
    "parallelPreviews": 3
  }
}
```

**Response:** Server-Sent Events (SSE) stream

**Events:**
```json
{"type": "progress", "phase": "content_fetching", "progress": 10, "total": 100, "stats": {...}}
{"type": "url_processed", "urlId": 1, "state": "identifiers_found", "identifierCount": 2}
{"type": "complete", "stats": {...}}
```

## Processing States

### State Machine

```
pending
  ↓
fetching_content
  ↓
content_cached
  ↓
extracting_identifiers
  ↓
[Branch based on results]
  ↓                              ↓
identifiers_found            no_identifiers
  ↓                              ↓
previewing_identifiers      awaiting_user_review
  ↓                              ↓
awaiting_user_selection    creating_from_metadata
  ↓                              ↓
processing_identifier           ↓
  ↓                              ↓
  └──────────┬─────────────────┘
             ↓
          stored
```

### Terminal States
- `stored`: Successfully stored in Zotero
- `failed_fetch`: Permanent fetch failure
- `failed_parse`: No identifiers or metadata found
- `user_skipped`: User chose to skip

### User Interaction States
- `awaiting_user_selection`: Multiple identifiers found
- `awaiting_user_review`: Metadata needs approval

## Error Handling

### Error Classification

**Severity Levels:**
- **Recoverable**: Auto-retry immediately
- **Temporary**: Retry later (5-30s delay)
- **Permanent**: User intervention needed
- **Fatal**: System error (log and alert)

### Common Errors

| Code | Message | Severity | Retry | Action |
|------|---------|----------|-------|--------|
| FETCH_TIMEOUT | Request timeout | Recoverable | Yes (5s) | Auto-retry |
| FETCH_404 | Not found | Permanent | No | Verify URL |
| FETCH_403 | Forbidden | Permanent | No | May need auth |
| FETCH_500 | Server error | Temporary | Yes (30s) | Wait and retry |
| CONTENT_TOO_LARGE | Size exceeded | Permanent | No | Content too big |
| PREVIEW_TIMEOUT | Preview timeout | Temporary | Yes (3s) | Auto-retry |
| STORE_ZOTERO_OFFLINE | Zotero offline | Temporary | Yes (5s) | Start Zotero |

## Performance Characteristics

### Single URL Processing
- **HTML with identifier**: 2-5 seconds
- **PDF with identifier**: 5-15 seconds
- **No identifiers**: 2-4 seconds
- **With preview**: +2-5 seconds per identifier

### Batch Processing (100 URLs)
- **Content fetching**: 3-5 minutes (parallel)
- **Identifier extraction**: 10-20 seconds (parallel)
- **Preview fetching**: 5-10 minutes (sequential, rate-limited)
- **Total**: ~10-15 minutes

### Cache Performance
- **Cache hit**: < 100ms
- **Cache miss + fetch**: 2-5 seconds
- **Cache cleanup**: Runs daily, ~1 second per 1000 files

## Configuration

### Environment Variables

#### Zotero Connection
```bash
ZOTERO_API_URL=http://localhost:23119
ZOTERO_REQUEST_TIMEOUT=60000
ZOTERO_USER_ID=your_user_id
```

#### Content Fetching
```bash
CONTENT_FETCH_TIMEOUT=30000  # 30 seconds
CONTENT_FETCH_MAX_SIZE_HTML=10485760  # 10MB
CONTENT_FETCH_MAX_SIZE_PDF=52428800   # 50MB
```

#### Rate Limiting
```bash
RATE_LIMIT_DEFAULT_PER_SECOND=1
RATE_LIMIT_MAX_CONCURRENT_FETCHES=10
RATE_LIMIT_MAX_CONCURRENT_PREVIEWS=3
```

#### Caching
```bash
CONTENT_CACHE_DIR=./data/content_cache
CONTENT_CACHE_MAX_AGE_DAYS=30
CONTENT_CACHE_CLEANUP_ENABLED=true
```

#### Processing
```bash
AUTO_PROCESS_SINGLE_IDENTIFIERS=false
MINIMUM_METADATA_QUALITY_SCORE=30
BATCH_SIZE=25
```

## Usage Guide

### Process Single URL

1. Navigate to URL detail panel
2. Click "Process URL Content (Phase 1)"
3. Wait for processing to complete
4. Review results:
   - **Identifiers found**: Compare previews and select one
   - **No identifiers**: Review extracted metadata and approve

### Process Multiple URLs

1. Select URLs in table (multi-select)
2. Click "Batch Process Selected"
3. Monitor progress modal
4. Review URLs awaiting user input

### Review Identifier Previews

When multiple identifiers are found:
1. Compare quality scores (star ratings)
2. Check field completeness bars
3. Expand to view full metadata
4. Click "Select This" on preferred identifier
5. Item automatically created in Zotero

### Review Extracted Metadata

When no identifiers found:
1. Check validation status badge
2. Review all extracted fields
3. Note missing fields (if any)
4. Check quality score
5. Toggle "Attach HTML snapshot" if desired
6. Click "Create Zotero Item" to approve

## Quality Indicators

### Identifier Preview Quality Score

**Formula:**
```
Title (20) + Creators (20) + Date (15) + DOI (10) + 
Abstract (10) + Publication (10) + Rich Fields (10) + Completeness (5)
= 100 points maximum
```

**Interpretation:**
- **90-100**: Excellent - Complete, high-quality metadata
- **70-89**: Very Good - Minor fields missing
- **50-69**: Good - Usable but some gaps
- **30-49**: Acceptable - Significant gaps
- **< 30**: Poor - Not recommended

### Metadata Extraction Quality Score

**Formula:**
```
Title (30) + Creators (30) + Date (20) + Item Type (10) +
Abstract (5) + Publication (5) = 100 points maximum
```

**Thresholds:**
- **>= 80**: Auto-process candidate
- **>= 50**: Show to user for review
- **< 30**: Reject, don't show

## Best Practices

### 1. Content Caching
- **Always enabled** - Enables re-processing and LLM fallback
- **Cleanup**: Runs automatically daily
- **Storage**: ~50-500KB per HTML, ~1-10MB per PDF

### 2. Batch Processing
- **Optimal batch size**: 25 URLs
- **Best for**: Initial processing of imported URLs
- **Monitor**: Progress modal for real-time feedback

### 3. Identifier Selection
- **DOI preferred**: Most reliable and complete
- **PMID good**: For medical/biological literature
- **ArXiv good**: For preprints
- **ISBN variable**: Quality depends on book data

### 4. Error Recovery
- **Automatic retry**: Network timeouts, server errors
- **Manual retry**: Click retry on failed URLs
- **Permanent failures**: Check error message for action

## Troubleshooting

### "Request timed out"
- **Cause**: Slow server or large content
- **Solution**: Retry (automatic after 5s)
- **Prevention**: Increase timeout in env vars

### "Access forbidden (403)"
- **Cause**: URL requires authentication
- **Solution**: Skip or manually fetch content
- **Prevention**: Filter authenticated URLs

### "No identifiers or metadata found"
- **Cause**: Page structure not recognized
- **Solution**: Use LLM extraction workflow
- **Prevention**: Check if content is accessible

### "Cannot connect to Zotero"
- **Cause**: Zotero not running
- **Solution**: Start Zotero desktop app
- **Prevention**: Check Zotero before batch processing

### "Preview failed"
- **Cause**: Invalid identifier or Zotero translation failure
- **Solution**: Try other identifiers or metadata path
- **Prevention**: Validate identifier format

## Advanced Features

### Custom Domain Rate Limits

Modify `rate-limiter.ts` to add custom limits:

```typescript
globalRateLimiter.setDomainLimit('slow-server.com', 0.5); // 1 request per 2 seconds
globalRateLimiter.setDomainLimit('fast-server.com', 5);   // 5 requests per second
```

### Cache Management

```typescript
// Get cache stats
const stats = await getCacheStats();

// Clean expired cache manually
const result = await cleanExpiredCache();
console.log(`Deleted ${result.filesDeleted} files, freed ${result.bytesFreed} bytes`);

// Invalidate specific cache
await invalidateCache(urlId);
```

### Processing Statistics

```typescript
// Get overall stats
const stats = await getProcessingStats();

// Get batch stats
const batchStats = await getBatchStats();
```

## Integration with LLM Workflow

The automated workflow prepares for LLM fallback:

1. **Content already cached** - No re-fetch needed
2. **Failed identifiers stored** - Know what didn't work
3. **Partial metadata available** - LLM can enhance
4. **State tracked** - Resume from exact point

**Handoff data:**
- Cached content path
- Identifiers attempted
- Metadata extracted (if any)
- Error history

## Performance Optimization

### Database Indexing

Critical indexes for query performance:
- `urls(zotero_processing_status)`
- `url_identifiers(url_id, preview_fetched)`
- `url_content_cache(content_hash)`

### Caching Strategy

**Three levels:**
1. **In-memory**: Preview cache (1 hour TTL, 1000 entries)
2. **Database**: Identifier previews (7 days)
3. **File system**: Content cache (30 days)

### Batch Optimization

**Parallelism:**
- Content fetching: 5 concurrent
- Preview fetching: 3 concurrent (Zotero limitation)
- Metadata extraction: CPU-bound, parallel within batch

**Memory Management:**
- Process 25 URLs per batch
- Stream to disk immediately
- Clear buffers after processing

## Monitoring & Logging

### Key Metrics

Track these for system health:
- URLs processed per hour
- Success/failure rates by state
- Cache hit ratio
- Average processing time per URL
- Zotero API latency
- Storage usage

### Log Levels

- **INFO**: Normal workflow events
- **WARN**: Retry attempts, partial failures
- **ERROR**: Permanent failures, system errors

## Future Enhancements

### Potential Improvements

1. **Browser Automation**: For JavaScript-heavy sites (Playwright)
2. **OCR Support**: For scanned PDFs
3. **Multiple Languages**: Language-specific extraction
4. **Smart Deduplication**: Detect similar content
5. **Machine Learning**: Learn extraction patterns
6. **Webhook Integration**: Notify on completion
7. **Priority Queue**: User-prioritized processing
8. **Parallel Zotero Instances**: Scale preview fetching

## Security Considerations

### Data Privacy
- All processing is local (localhost only)
- No external API calls except to target URLs
- Cached content stored locally
- No data leaves your machine

### Resource Protection
- Size limits prevent memory exhaustion
- Rate limiting prevents server abuse
- Timeout prevents hanging processes
- Sandboxed processing (no code execution)

## Support & Maintenance

### Regular Maintenance Tasks

**Daily:**
- Cache cleanup (automatic)
- Retry temporary failures

**Weekly:**
- Database vacuum
- Review error patterns

**Monthly:**
- Audit cache size
- Update extraction patterns
- Review quality thresholds

### Backup Recommendations

**Critical data:**
- SQLite database (`data/thesis.db`)
- Content cache (`data/content_cache/`)

**Backup frequency:**
- Before bulk operations
- Weekly for safety
- Before system updates

---

*Last Updated: 2025-11-12*
*Version: 1.0.0*

