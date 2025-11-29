# Semantic Scholar Integration - Implementation Guide

**Quick reference for developers implementing citation extraction**

---

## Part 1: URL Detection (Phase 1 - START HERE)

### Identifying Semantic Scholar URLs

```typescript
// Pattern examples
const semanticScholarPatterns = [
  'https://www.semanticscholar.org/paper/',
  'https://semanticscholar.org/paper/',
];

export function isSemanticScholarUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname?.includes('semanticscholar.org') ?? false;
  } catch {
    return false;
  }
}

// Extract paper ID
export function extractSemanticScholarPaperId(url: string): string | null {
  const match = url.match(/\/paper\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}
```

### Integration Point: URL Processing Orchestrator

**File:** `dashboard/lib/orchestrator/url-processing-orchestrator.ts`

**Add to `callZoteroProcessing()`:**

```typescript
// Strategy 0: Check if Semantic Scholar
if (urlRecord.url.includes('semanticscholar.org')) {
  console.log('🔍 Detected Semantic Scholar URL, prioritizing Zotero translator');
  // Fall through to existing Zotero processing
  // Zotero has built-in S2 support
}
```

---

## Part 2: Browser-Based Extraction (Phase 2)

### New Service: Semantic Scholar Scraper

**File:** `dashboard/lib/services/semantic-scholar-scraper.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ExtractedCitation {
  bibtex: string;
  format: 'bibtex' | 'mla' | 'apa';
  extracted_at: string;
  source: 'browser';
}

class SemanticScholarScraper {
  private browser: Browser | null = null;
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly PAGE_LOAD_WAIT = 'networkidle2';

  async extractCitation(url: string, format: 'bibtex' = 'bibtex'): Promise<ExtractedCitation> {
    console.log(`📄 Extracting ${format} from Semantic Scholar...`);

    const page = await this.getPage();

    try {
      // Navigate to article
      console.log('🌐 Loading article page...');
      await page.goto(url, {
        waitUntil: this.PAGE_LOAD_WAIT,
        timeout: this.TIMEOUT
      });

      // Wait for page to be interactive
      await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});

      // Click cite button
      console.log('🖱️  Clicking cite button...');
      const citeButton = await page.$('[data-test-id="cite-link"]');

      if (!citeButton) {
        throw new Error('Cite button not found - page may have changed');
      }

      await citeButton.click();

      // Wait for modal and citation format
      console.log(`⏳ Waiting for citation modal (${format})...`);
      const citationSelector = `.formatted-citation--style-${format}`;

      await page.waitForSelector(citationSelector, { timeout: 5000 });

      // Extract citation text
      const citation = await page.$eval(citationSelector, (el) => {
        return el.textContent?.trim() || '';
      });

      if (!citation) {
        throw new Error('Citation text not found in modal');
      }

      return {
        bibtex: citation,
        format: format as any,
        extracted_at: new Date().toISOString(),
        source: 'browser',
      };

    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Extraction failed:', error.message);
      }
      throw error;
    } finally {
      await page.close();
    }
  }

  private async getPage(): Promise<Page> {
    if (!this.browser) {
      console.log('🚀 Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Important for serverless
        ],
      });
    }

    return this.browser.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let scraperInstance: SemanticScholarScraper | null = null;

export async function getSemanticScholarScraper(): Promise<SemanticScholarScraper> {
  if (!scraperInstance) {
    scraperInstance = new SemanticScholarScraper();
  }
  return scraperInstance;
}
```

### Integration Action

**File:** `dashboard/lib/actions/semantic-scholar-extraction.ts`

```typescript
'use server';

import { getSemanticScholarScraper } from '@/lib/services/semantic-scholar-scraper';
import { parseBibTeX } from '@/lib/utils/bibtex-parser';
import type { ZoteroItem } from '@/lib/zotero-client';

export async function extractSemanticScholarCitation(
  url: string
): Promise<{
  success: boolean;
  item?: Partial<ZoteroItem>;
  citation?: string;
  error?: string;
}> {
  try {
    console.log('🔄 Starting Semantic Scholar extraction...');

    const scraper = await getSemanticScholarScraper();
    const extracted = await scraper.extractCitation(url);

    console.log('✅ Extraction successful');
    console.log('📊 Citation length:', extracted.bibtex.length);

    // Parse BibTeX to Zotero item
    const item = parseBibTeX(extracted.bibtex);

    return {
      success: true,
      item,
      citation: extracted.bibtex,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Extraction failed:', message);

    return {
      success: false,
      error: message,
    };
  }
}
```

### BibTeX Parser Utility

**File:** `dashboard/lib/utils/bibtex-parser.ts`

```typescript
import type { ZoteroItem, ZoteroCreator } from '@/lib/zotero-client';

interface BibTeXEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

export function parseBibTeX(bibtexText: string): Partial<ZoteroItem> {
  const entry = parseBibTeXEntry(bibtexText);

  // Map BibTeX fields to Zotero format
  const item: Partial<ZoteroItem> = {
    title: entry.fields.title || '',
    date: entry.fields.year || '',
    url: entry.fields.url || entry.fields.doi,
    abstractNote: entry.fields.abstract,
  };

  // Parse authors
  if (entry.fields.author) {
    item.creators = parseAuthors(entry.fields.author);
  }

  // Determine item type
  item.itemType = mapBibTeXType(entry.type);

  // Include identifiers
  if (entry.fields.doi) {
    item.DOI = entry.fields.doi;
  }

  if (entry.fields.isbn) {
    item.ISBN = entry.fields.isbn;
  }

  return item;
}

function parseBibTeXEntry(text: string): BibTeXEntry {
  // Match @type{key, fields...}
  const match = text.match(/@(\w+)\{([^,]+),\s*([\s\S]*)\}/);

  if (!match) {
    throw new Error('Invalid BibTeX format');
  }

  const [, type, key, fieldsStr] = match;
  const fields: Record<string, string> = {};

  // Parse individual fields
  const fieldMatches = fieldsStr.matchAll(/(\w+)\s*=\s*{([^}]*)}/g);
  for (const fieldMatch of fieldMatches) {
    const [, fieldName, fieldValue] = fieldMatch;
    fields[fieldName.toLowerCase()] = fieldValue.trim();
  }

  return {
    type: type.toLowerCase(),
    key,
    fields,
  };
}

function parseAuthors(authorString: string): ZoteroCreator[] {
  // Split by ' and '
  const authors = authorString.split(' and ').map(a => a.trim());

  return authors.map(author => {
    // Try to parse "Lastname, Firstname" or "Firstname Lastname"
    const parts = author.split(',').map(p => p.trim());

    if (parts.length === 2) {
      // "Lastname, Firstname" format
      return {
        creatorType: 'author',
        lastName: parts[0],
        firstName: parts[1],
      };
    } else {
      // "Firstname Lastname" or single name
      const nameParts = parts[0].split(/\s+/);
      if (nameParts.length >= 2) {
        return {
          creatorType: 'author',
          firstName: nameParts.slice(0, -1).join(' '),
          lastName: nameParts[nameParts.length - 1],
        };
      } else {
        return {
          creatorType: 'author',
          name: author,
          fieldMode: 1, // Single name field
        };
      }
    }
  });
}

function mapBibTeXType(bibtexType: string): string {
  const mapping: Record<string, string> = {
    'article': 'journalArticle',
    'inproceedings': 'conferencePaper',
    'conference': 'conferencePaper',
    'book': 'book',
    'inbook': 'bookSection',
    'misc': 'webpage',
    'techreport': 'report',
    'phdthesis': 'thesis',
    'mastersthesis': 'thesis',
  };

  return mapping[bibtexType.toLowerCase()] || 'webpage';
}
```

---

## Part 3: API-Based Approach (Phase 3)

### Semantic Scholar API Integration

**File:** `dashboard/lib/services/semantic-scholar-api.ts`

```typescript
export interface SemanticScholarPaper {
  paperId: string;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    MAG?: string;
    ACL?: string;
  };
  title: string;
  authors: Array<{
    authorId: string;
    name: string;
  }>;
  year: number;
  venue: string;
  abstract?: string;
  citationCount: number;
  publicationTypes?: string[];
}

const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1';

export async function getPaperMetadata(paperId: string): Promise<SemanticScholarPaper> {
  const fields = [
    'paperId',
    'externalIds',
    'title',
    'authors',
    'year',
    'venue',
    'abstract',
    'citationCount',
    'publicationTypes',
  ].join(',');

  const response = await fetch(
    `${S2_API_BASE}/paper/${paperId}?fields=${fields}`
  );

  if (!response.ok) {
    throw new Error(`S2 API error: ${response.statusText}`);
  }

  return response.json();
}

export function reconstructBibTeX(paper: SemanticScholarPaper): string {
  const authors = paper.authors
    .map(a => a.name)
    .join(' and ');

  const citationKey = `${paper.authors[0]?.name?.split(' ').pop()}${paper.year}`;

  const bibtex = `@${mapVenueType(paper.publicationTypes?.[0])}{${citationKey},
  title={${escapeBibTeX(paper.title)}},
  author={${authors}},
  year={${paper.year}},
  venue={${escapeBibTeX(paper.venue)}},
  url={https://api.semanticscholar.org/CorpusID:${paper.paperId}}
}`;

  return bibtex;
}

function mapVenueType(publicationType?: string): string {
  const mapping: Record<string, string> = {
    'Conference': 'inproceedings',
    'Journal': 'article',
    'Review': 'article',
  };
  return mapping[publicationType || ''] || 'misc';
}

function escapeBibTeX(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, match => `\\${match}`)
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_');
}
```

---

## Part 4: Orchestrator Integration (Phase 2)

### Updated Processing Orchestrator

**File:** `dashboard/lib/orchestrator/url-processing-orchestrator.ts`

Add this to the failure handler:

```typescript
import { extractSemanticScholarCitation } from '@/lib/actions/semantic-scholar-extraction';
import { isSemanticScholarUrl } from '@/lib/utils/url-utils';

// In handleZoteroFailure() method, add before auto-cascade:

if (isSemanticScholarUrl(urlRecord.url)) {
  console.log('🔄 AUTO-CASCADE: Zotero failed for S2 URL, trying browser extraction');

  try {
    const extracted = await extractSemanticScholarCitation(urlRecord.url);

    if (extracted.success && extracted.item) {
      // Create Zotero item from extracted metadata
      const result = await createItem(extracted.item);

      if (result.success) {
        const itemKey = extractItemKey(result);

        await URLProcessingStateMachine.transition(
          urlId,
          'processing_zotero',
          'stored',
          { zoteroItemKey: itemKey }
        );

        return {
          success: true,
          urlId,
          status: 'stored',
          itemKey,
          method: 'browser_extraction',
        };
      }
    }
  } catch (error) {
    console.log('⚠️  Browser extraction failed:', error);
    // Continue with normal cascade
  }
}
```

---

## Part 5: Testing

### Unit Tests

**File:** `tests/unit/semantic-scholar.test.ts`

```typescript
import { extractSemanticScholarPaperId, isSemanticScholarUrl } from '@/lib/utils/url-utils';

describe('Semantic Scholar URL Utils', () => {
  it('detects Semantic Scholar URLs', () => {
    expect(isSemanticScholarUrl('https://www.semanticscholar.org/paper/ABC123')).toBe(true);
    expect(isSemanticScholarUrl('https://semanticscholar.org/paper/ABC123')).toBe(true);
    expect(isSemanticScholarUrl('https://arxiv.org/abs/2310.12345')).toBe(false);
  });

  it('extracts paper IDs', () => {
    const url = 'https://www.semanticscholar.org/paper/Moroishi1999ExplicitVI';
    const paperId = extractSemanticScholarPaperId(url);
    expect(paperId).toBe('Moroishi1999ExplicitVI');
  });
});
```

### Integration Tests

**File:** `tests/integration/semantic-scholar-extraction.test.ts`

```typescript
import { extractSemanticScholarCitation } from '@/lib/actions/semantic-scholar-extraction';

describe('Semantic Scholar Citation Extraction', () => {
  it('extracts citation from real S2 URL', async () => {
    const url = 'https://www.semanticscholar.org/paper/Moroishi1999ExplicitVI';

    const result = await extractSemanticScholarCitation(url);

    expect(result.success).toBe(true);
    expect(result.item?.title).toBeDefined();
    expect(result.item?.creators).toBeDefined();
    expect(result.citation).toContain('@');
  });

  it('handles extraction errors gracefully', async () => {
    const invalidUrl = 'https://www.semanticscholar.org/paper/InvalidPaperId12345';

    const result = await extractSemanticScholarCitation(invalidUrl);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

---

## Part 6: Error Handling

### Common Errors & Solutions

```typescript
// Error 1: Cite button not found
// Cause: Page didn't load properly or S2 changed UI
// Solution: Add retry with longer wait time
await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
await page.waitForTimeout(1000); // Extra delay

// Error 2: Modal doesn't appear
// Cause: JavaScript not executed or blocked
// Solution: Wait longer for modal
await page.waitForSelector(citationSelector, { timeout: 10000 });

// Error 3: BibTeX parsing fails
// Cause: Unexpected format from S2
// Solution: Add format validation
function validateBibTeX(text: string): boolean {
  return text.includes('@') && text.includes('{');
}

// Error 4: Rate limiting (429)
// Cause: Too many requests to S2
// Solution: Implement backoff
async function withRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Part 7: Configuration

### Environment Variables

```bash
# .env.local
SEMANTIC_SCHOLAR_TIMEOUT=30000          # Puppeteer timeout in ms
SEMANTIC_SCHOLAR_ENABLE=true            # Feature flag
SEMANTIC_SCHOLAR_CACHE_TTL=3600         # Cache extracted citations for 1 hour
SEMANTIC_SCHOLAR_API_RATE_LIMIT=100     # Requests per 5 minutes
```

### Feature Flag

```typescript
export function isSemanticScholarEnabled(): boolean {
  return process.env.SEMANTIC_SCHOLAR_ENABLE === 'true';
}
```

---

## Part 8: Monitoring & Logging

### Key Metrics to Track

```typescript
interface ExtractionMetrics {
  urlId: number;
  url: string;
  method: 'zotero' | 'browser' | 'api';
  success: boolean;
  duration_ms: number;
  error?: string;
  extracted_at: string;
}

// Log to database for analysis
await db.insert(extractionMetrics).values({
  urlId,
  url,
  method,
  success: result.success,
  duration_ms: Date.now() - startTime,
  error: result.error,
  extracted_at: new Date(),
});
```

### Success Rate Tracking

```sql
-- Query success rate by method
SELECT
  method,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM extraction_metrics
GROUP BY method;
```

---

## Dependencies Package

Add to `package.json`:

```json
{
  "dependencies": {
    "puppeteer": "^22.0.0",
    "bibtex-parser": "^0.1.0"
  },
  "devDependencies": {
    "@types/puppeteer": "^7.0.0"
  }
}
```

Install:
```bash
npm install puppeteer bibtex-parser
npm install -D @types/puppeteer
```

---

## Summary Checklist

- [ ] Phase 1: URL Detection (2-4 hours)
  - [ ] Add `isSemanticScholarUrl()` utility
  - [ ] Update URL orchestrator
  - [ ] Add logging

- [ ] Phase 2: Browser Extraction (6-10 hours)
  - [ ] Create scraper service
  - [ ] Create extraction action
  - [ ] Create BibTeX parser
  - [ ] Integrate with orchestrator
  - [ ] Add tests

- [ ] Phase 3: API Fallback (3-5 hours)
  - [ ] Create API service
  - [ ] Create fallback action
  - [ ] Add to orchestrator
  - [ ] Add tests

- [ ] Phase 4: Monitoring (ongoing)
  - [ ] Track metrics
  - [ ] Monitor errors
  - [ ] Optimize based on data

---

**Status:** Implementation ready
**Confidence:** High
**Start Date:** [When approved]
