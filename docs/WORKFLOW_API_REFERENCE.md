# Automated Workflow - API Reference

## Server Actions

### URL Processing

#### `processSingleUrl(urlId: number)`

Process a single URL through the complete workflow.

**Returns:**
```typescript
{
  success: boolean;
  state: ProcessingState;
  identifierCount?: number;
  error?: string;
  errorCode?: FetchErrorCode;
}
```

**States:**
- `pending`: Initial state
- `fetching_content`: Downloading URL
- `content_cached`: Content cached
- `extracting_identifiers`: Finding identifiers
- `identifiers_found`: Identifiers found and previewed
- `no_identifiers`: No identifiers, metadata available
- `failed_fetch`: Fetch failed
- `failed_parse`: No data extracted

**Example:**
```typescript
const result = await processSingleUrl(123);
if (result.success && result.identifierCount > 0) {
  console.log(`Found ${result.identifierCount} identifiers`);
}
```

#### `retryFailedUrl(urlId: number)`

Retry a failed URL.

**Returns:** Same as `processSingleUrl`

---

### Identifier Management

#### `getIdentifiersWithPreviews(urlId: number)`

Get all identifiers with preview data for a URL.

**Returns:**
```typescript
Array<{
  id: number;
  type: string;
  value: string;
  confidence: string;
  extractionSource: string;
  preview: any;
  previewFetched: boolean;
  qualityScore: number;
  userSelected: boolean;
}>
```

#### `selectAndProcessIdentifier(urlId: number, identifierId: number)`

Select an identifier and process it with Zotero.

**Returns:**
```typescript
{
  success: boolean;
  itemKey?: string;
  error?: string;
  method?: string;
}
```

#### `refreshIdentifierPreview(identifierId: number)`

Force refresh a preview (bypasses cache).

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### `fetchAllPreviews(urlId: number)`

Fetch previews for all identifiers of a URL.

**Returns:**
```typescript
{
  success: boolean;
  count?: number;
  error?: string;
}
```

---

### Metadata Management

#### `getExtractedMetadata(urlId: number)`

Get extracted metadata for a URL.

**Returns:**
```typescript
{
  title?: string;
  creators?: Creator[];
  date?: string;
  itemType?: string;
  abstractNote?: string;
  publicationTitle?: string;
  language?: string;
  extractionMethod?: string;
  qualityScore?: number;
  validationStatus?: string;
  missingFields?: string[];
}
```

#### `approveAndStoreMetadata(urlId: number, attachSnapshot: boolean)`

Approve extracted metadata and create Zotero item.

**Returns:**
```typescript
{
  success: boolean;
  itemKey?: string;
  error?: string;
}
```

#### `rejectMetadata(urlId: number, reason?: string)`

Reject extracted metadata.

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## Helper Functions

### Content Cache

#### `getCachedContent(urlId: number)`

Get cached content for a URL.

**Returns:**
```typescript
{
  content: Buffer;
  metadata: {
    contentType: string;
    contentHash: string;
    statusCode: number;
    size: number;
    fetchedAt: Date;
    headers: Record<string, string>;
  };
  age: number; // milliseconds since cached
} | null
```

#### `hasCachedContent(urlId: number)`

Check if URL has valid cached content.

**Returns:** `Promise<boolean>`

#### `getCacheStats()`

Get cache statistics.

**Returns:**
```typescript
{
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}
```

#### `cleanExpiredCache()`

Clean expired cache entries.

**Returns:**
```typescript
{
  filesDeleted: number;
  bytesFreed: number;
}
```

---

### Identifier Extraction

#### `extractIdentifiersFromHtml(htmlContent: string, url: string)`

Extract identifiers from HTML.

**Returns:**
```typescript
Identifier[] // Array of { type, value, source, confidence }
```

#### `extractIdentifiersFromPdf(pdfContent: Buffer, filename: string)`

Extract identifiers from PDF via Zotero.

**Returns:**
```typescript
{
  identifiers: Identifier[];
  metadata?: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
  error?: string;
}
```

---

### Metadata Extraction

#### `extractMetadataFromHtml(htmlContent: string, url: string)`

Extract bibliographic metadata from HTML.

**Returns:** `Promise<ExtractedMetadata>`

#### `extractMetadataFromPdf(pdfContent: Buffer, url: string, filename?: string)`

Extract bibliographic metadata from PDF.

**Returns:** `Promise<ExtractedMetadata>`

---

### Validation

#### `validateExtractedMetadata(metadata: ExtractedMetadata)`

Validate metadata quality and completeness.

**Returns:**
```typescript
{
  status: 'valid' | 'incomplete' | 'invalid';
  score: number; // 0-100
  missingFields: string[];
  warnings: string[];
  errors: string[];
}
```

#### `calculateMetadataQualityScore(metadata: ExtractedMetadata)`

Calculate quality score (0-100).

**Returns:** `number`

---

### Preview & Quality

#### `previewAllIdentifiers(urlId: number, options?)`

Preview all identifiers for a URL.

**Options:**
```typescript
{
  parallelLimit?: number;  // Default: 3
  timeout?: number;        // Default: 30000ms
  cacheResults?: boolean;  // Default: true
  force?: boolean;         // Default: false (use cache)
}
```

**Returns:**
```typescript
PreviewResult[] // Array of preview results with quality scores
```

#### `rankPreviewsByQuality(results: PreviewResult[])`

Sort previews by quality score.

**Returns:** `PreviewResult[]` (sorted)

---

### Batch Processing

#### `processBatch(urlIds: number[], options?)`

Process batch of URLs with progress streaming.

**Options:**
```typescript
{
  batchSize?: number;          // Default: 25
  parallelFetches?: number;    // Default: 5
  parallelPreviews?: number;   // Default: 3
  autoSelectSingleIdentifier?: boolean; // Default: false
}
```

**Returns:** `AsyncGenerator<BatchProgressEvent, BatchProcessResult>`

**Usage:**
```typescript
for await (const progress of processBatch(urlIds)) {
  console.log(progress.phase, progress.progress);
}
```

#### `processAllPending(options?)`

Process all URLs with status 'pending'.

**Returns:** Same as `processBatch`

#### `processBySection(sectionId: number, options?)`

Process all URLs in a specific section.

**Returns:** Same as `processBatch`

#### `retryFailed(options?)`

Retry all failed URLs.

**Returns:** Same as `processBatch`

---

## Types

### Core Types

```typescript
type IdentifierType = 'DOI' | 'PMID' | 'ARXIV' | 'ISBN';

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface Identifier {
  type: IdentifierType;
  value: string;
  source: string;
  confidence: ConfidenceLevel;
}

interface Creator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface ExtractedMetadata {
  title?: string;
  creators?: Creator[];
  date?: string;
  itemType?: string;
  abstractNote?: string;
  publicationTitle?: string;
  url?: string;
  accessDate?: string;
  language?: string;
  extractionSources: Record<string, string>;
}
```

### Processing Types

```typescript
type ProcessingState =
  | 'pending'
  | 'fetching_content'
  | 'content_cached'
  | 'extracting_identifiers'
  | 'identifiers_found'
  | 'no_identifiers'
  | 'failed_fetch'
  | 'failed_parse';

interface ProcessUrlResult {
  success: boolean;
  state: ProcessingState;
  identifierCount?: number;
  error?: string;
  errorCode?: FetchErrorCode;
}
```

### Batch Processing Types

```typescript
interface BatchProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'url_processed';
  phase?: 'content_fetching' | 'extracting_identifiers' | 'previewing_identifiers' | 'complete';
  progress?: number;
  total?: number;
  urlId?: number;
  url?: string;
  state?: string;
  identifierCount?: number;
  error?: string;
  stats?: BatchStats;
}

interface BatchStats {
  total: number;
  contentFetched: number;
  identifiersFound: number;
  previewsFetched: number;
  stored: number;
  awaitingUser: number;
  failed: number;
  skipped: number;
}
```

## Error Codes

### Fetch Errors

- `FETCH_TIMEOUT`: Request timed out
- `FETCH_NETWORK_ERROR`: Network connectivity issue
- `FETCH_404`: URL not found
- `FETCH_403`: Access forbidden
- `FETCH_500`: Server error
- `FETCH_SSL_ERROR`: SSL certificate problem
- `FETCH_REDIRECT_LOOP`: Too many redirects

### Content Errors

- `CONTENT_TOO_LARGE`: Exceeds size limit
- `CONTENT_INVALID_TYPE`: Unsupported content type

### Extraction Errors

- `EXTRACT_NO_IDENTIFIERS`: No identifiers found
- `EXTRACT_NO_METADATA`: No metadata extracted

### Preview Errors

- `PREVIEW_TIMEOUT`: Preview request timeout
- `PREVIEW_INVALID_IDENTIFIER`: Identifier not recognized
- `PREVIEW_TRANSLATION_FAILED`: Zotero translation failed

### Storage Errors

- `STORE_ZOTERO_OFFLINE`: Cannot connect to Zotero
- `STORE_LIBRARY_READ_ONLY`: Library permissions issue
- `STORE_ITEM_CREATION_FAILED`: Item creation failed

## Rate Limits

### Default Limits

- **General domains**: 1 request/second
- **Trusted domains**: 2 requests/second
- **Preview requests**: 3 concurrent maximum

### Trusted Domains

Pre-configured with higher limits:
- arxiv.org
- ncbi.nlm.nih.gov
- pubmed.ncbi.nlm.nih.gov
- doi.org
- dx.doi.org

## Cache Configuration

### Content Cache

**Location:** `data/content_cache/`

**Structure:**
```
raw/
  html/{sha256}.html
  pdf/{sha256}.pdf
processed/{sha256}.json
```

**TTL:** 30 days (configurable)

**Cleanup:** Automatic daily

### Preview Cache

**Location:** `url_identifiers.previewData` (database)

**TTL:** 7 days

**Revalidation:** On-demand via refresh action

---

*This API reference covers all public functions and types for the Automated URL Processing Workflow.*

