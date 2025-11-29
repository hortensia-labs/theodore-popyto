# Semantic Scholar HTML Extraction Methods

This document describes all available methods to extract bibliographic information from Semantic Scholar article pages, providing redundancy and fallback strategies for the extraction pipeline.

## Overview

Semantic Scholar embeds bibliographic data in multiple formats on their article pages. This redundancy provides multiple extraction pathways with different levels of reliability and completeness.

---

## Method 1: BibTeX `<pre>` Tag (Primary Method)

### Location
```html
<pre class="bibtex-citation" data-nosnippet="true">
@inproceedings{Witek2018FeelingAO,
  title={...},
  author={...},
  year={...},
  url={...}
}
</pre>
```

### Selector
- `pre.bibtex-citation`
- Fallback: any `<pre>` tag starting with `@`

### Data Extraction
- **Title**: `title={...}` field
- **Author(s)**: `author={...}` field (format: "FirstName LastName" or "LastName, FirstName")
- **Year**: `year={...}` field
- **URL**: `url={...}` field (often Semantic Scholar API URL)

### Advantages
- Structured format with clear field delimiters
- Currently implemented in the script
- Works reliably when present

### Disadvantages
- May not always be present in page HTML
- Requires regex parsing of unstructured text
- Limited to BibTeX field availability

### Reliability
**High when present**, but presence is not guaranteed

---

## Method 2: JSON-LD Structured Data (Recommended Fallback)

### Location
```html
<script type="application/ld+json" class="schema-data">
{
  "@context": "http://schema.org",
  "@graph": [
    { "@type": "BreadcrumbList", ... },
    [
      {
        "@type": "Article" or "ScholarlyArticle",
        "author": [{"@type": "Person", "name": "..."}],
        "headline": "...",
        "datePublished": "8 January 2018",
        "copyrightYear": "2018",
        "abstract": "...",
        "mainEntity": "https://...",
        ...
      }
    ]
  ]
}
</script>
```

### Selector
- `<script type="application/ld+json">`
- Parse JSON and iterate through `@graph` array
- Find objects with `"@type": "Article"` or `"@type": "ScholarlyArticle"`

### Data Extraction
- **Title**: `headline` field
- **Author(s)**: `author` array → `name` field (full name format)
  - Multiple authors supported naturally as array
- **Year**: `copyrightYear` or extract from `datePublished`
- **Publication Date**: `datePublished` (human-readable format)
- **Abstract**: `abstract` field (full text)
- **Venue**: `publication` field (may be empty)
- **Publisher**: `publisher.name` field

### Advantages
- Structured, machine-readable JSON format
- Standard schema.org format (widely supported)
- More complete data (includes abstract, dates, publisher)
- Easier parsing with JSON library
- Author array naturally handles multiple authors
- No regex parsing needed
- High semantic clarity

### Disadvantages
- Requires JSON parsing and array traversal
- May have empty fields (e.g., `publication: ""`)
- Date format varies (human-readable vs ISO 8601)

### Reliability
**Very High** - JSON-LD is standard metadata format for search engines

---

## Method 3: HTML Meta Tags (Standard Fallback)

### Location
```html
<meta name="citation_author" content="Maria A. G. Witek">
<meta name="citation_title" content="'Feeling at one': Distribution of minds, bodies and beats in dance music, Abstract">
<meta name="citation_publication_date" content="2018">
<meta name="citation_journal_title" content="">
<meta name="citation_year" content="2018">
```

### Selectors
- `meta[name="citation_author"]` - may repeat for multiple authors
- `meta[name="citation_title"]`
- `meta[name="citation_publication_date"]` or `citation_year`
- `meta[name="citation_journal_title"]`

### Data Extraction
- **Title**: Single `content` attribute from `citation_title`
- **Author(s)**: Multiple `citation_author` meta tags with one author each
  - May also include co-authors in single tag (comma/and separated)
- **Year**: `citation_publication_date` or `citation_year` (numeric)
- **Journal**: `citation_journal_title` (often empty for arXiv/preprints)

### Advantages
- Simple CSS selector-based extraction
- Dublin Core standard (widely recognized)
- Multiple author support (repeating tags)
- Low parsing complexity

### Disadvantages
- Only basic fields available
- No abstract or full publication details
- Multiple authors require handling of multiple tags
- Some fields may be empty

### Reliability
**High** - Standard citation metadata format

---

## Method 4: Open Graph Meta Tags

### Location
```html
<meta property="og:title" content="'Feeling at one': Distribution of minds, bodies and beats in dance music, Abstract | Semantic Scholar">
<meta property="og:description" content="Vibe is a well-known phenomenon in research on dance music...">
<meta property="og:image" content="...">
```

### Selectors
- `meta[property="og:title"]`
- `meta[property="og:description"]`

### Data Extraction
- **Title**: `content` attribute (includes "| Semantic Scholar" suffix that needs removal)
- **Abstract/Description**: `content` attribute (partial or full abstract)
- **Image**: `content` attribute (usually static scholar image)

### Advantages
- Simple extraction
- Designed for social media sharing
- Usually includes clean description

### Disadvantages
- Title includes "Abstract | Semantic Scholar" suffix (needs cleaning)
- Author information missing
- Description may be truncated
- No structured year/date
- HTML entities need decoding (e.g., `&#39;` → `'`)

### Reliability
**Medium** - useful for title and abstract, but cleaning required

---

## Method 5: Twitter Meta Tags

### Location
```html
<meta name="twitter:title" content="'Feeling at one': Distribution of minds, bodies and beats in dance music, Abstract | Semantic Scholar">
<meta name="twitter:description" content="Vibe is a well-known phenomenon...">
<meta name="twitter:image" content="...">
```

### Selectors
- `meta[name="twitter:title"]`
- `meta[name="twitter:description"]`

### Data Extraction
- Same as Open Graph meta tags (essentially duplicated)
- **Title**: Same with suffix removal needed
- **Description**: Abstract text

### Advantages
- Alternative to Open Graph if OG tags unavailable
- Consistent with OG format

### Disadvantages
- Duplicate of Open Graph data
- Same cleaning requirements
- No additional data beyond OG tags

### Reliability
**Medium** - fallback to Open Graph

---

## Method 6: DOM/Page Content Elements

### Location
```html
<!-- Title -->
<h1 data-test-id="paper-detail-title">
  'Feeling at one': Distribution of minds, bodies and beats in dance music, Abstract
</h1>

<!-- Authors -->
<span data-test-id="author-list">
  <a class="author-list__link author-list__author-name" href="/author/...">
    <span>Maria A. G. Witek</span>
  </a>
</span>

<!-- Year -->
<span data-test-id="paper-year">
  <span>8 January 2018</span>
</span>

<!-- Abstract -->
<span data-test-id="text-truncator-text">
  Vibe is a well-known phenomenon...
</span>

<!-- Corpus ID -->
<li data-test-id="corpus-id">
  Corpus ID: 192272496
</li>
```

### Selectors
- `h1[data-test-id="paper-detail-title"]` - Title
- `span.author-list__author-name` - Individual authors
- `span[data-test-id="paper-year"]` - Publication year
- `span[data-test-id="text-truncator-text"]` - Abstract
- `li[data-test-id="corpus-id"]` - Corpus ID
- `span[data-test-id="year-and-venue"]` - Year and venue combined

### Data Extraction
- **Title**: Text content of h1 element
- **Author(s)**: Text content of each author span/link
  - May be incomplete if page is server-side rendered
- **Year**: Text content, requires date parsing ("8 January 2018" → 2018)
- **Abstract**: Text content with possible truncation ("...") indicator
- **Corpus ID**: Extract number from "Corpus ID: xxxxxx" format

### Advantages
- Direct access to displayed content
- Multiple author handling (multiple elements)
- Includes corpus ID (Semantic Scholar unique identifier)

### Disadvantages
- **NOT RELIABLE for server-rendered pages** - content often loaded via JavaScript
- Requires DOM parsing (needs BeautifulSoup for static HTML only)
- Date format variable (human-readable, needs parsing)
- Abstract may be truncated mid-sentence
- Only works if HTML is fully rendered before fetch
- Requires CSS selectors that may change with page redesigns
- Not suitable for static HTML scraping without JavaScript execution

### Reliability
**Low to Medium** - unreliable for static HTML scraping; better for JavaScript-rendered content

---

## Method 7: Page Canonical URL Analysis

### Location
```html
<link rel="canonical" href="https://www.semanticscholar.org/paper/%27Feeling-at-one%27%3A-Distribution-of-minds%2C-bodies-and-Witek/118aa8ef9f03356d24ea41618f128e079441f78e">
```

### Data Extraction
- **Paper ID**: Last segment of URL (`118aa8ef9f03356d24ea41618f128e079441f78e`)
- **Title slug**: URL-encoded title portion

### Use Case
- Identify papers across URLs
- Query Semantic Scholar API for authoritative data
- Validate paper identity

### Reliability
**High** - but requires API call for additional data

---

## Extraction Strategy & Fallback Chain

### Recommended Priority Order

1. **Primary**: JSON-LD Schema Data (Method 2)
   - Most complete and structured
   - Reliable with clear data types
   - Single parsing operation

2. **Fallback 1**: BibTeX `<pre>` tag (Method 1)
   - Current implementation
   - Reliable when present
   - Fallback if JSON-LD missing

3. **Fallback 2**: HTML Meta Tags (Method 3)
   - Standard citation format
   - Good coverage of basic fields
   - Simple extraction

4. **Fallback 3**: Open Graph Meta Tags (Method 4)
   - Alternative title/abstract source
   - Useful for filling gaps
   - Requires HTML entity decoding

5. **Fallback 4**: DOM Elements (Method 6)
   - Last resort for dynamic pages
   - Only if HTML is fully rendered
   - Consider using Selenium/Playwright for rendering

6. **Fallback 5**: Semantic Scholar API
   - Query using paper ID from canonical URL
   - Most authoritative but requires API key
   - Slowest but most complete

### Implementation Flow

```
fetch_page(url)
  ↓
extract_from_json_ld() [Method 2]
  ↓ (if fails or empty)
extract_from_bibtex() [Method 1]
  ↓ (if fails or empty)
extract_from_citation_meta() [Method 3]
  ↓ (if fails or empty)
extract_from_og_meta() [Method 4]
  ↓ (if fails or empty)
extract_from_dom() [Method 6]
  ↓ (if fails or empty)
query_api(paper_id) [Method 7]
  ↓ (if all else fails)
return error
```

---

## Data Field Availability Summary

| Field | JSON-LD | BibTeX | Citation Meta | OG Meta | DOM | Notes |
|-------|---------|--------|---------------|---------|-----|-------|
| Title | ✅ headline | ✅ title | ✅ title | ✅ (with suffix) | ✅ | JSON-LD recommended |
| Author(s) | ✅ author[] | ✅ author | ✅ (multiple tags) | ❌ | ✅ (may be incomplete) | JSON-LD handles multiple naturally |
| Year | ✅ copyrightYear | ✅ year | ✅ publication_date | ❌ | ✅ (needs parsing) | JSON-LD most reliable |
| Date Published | ✅ datePublished | ❌ | ✅ (if available) | ❌ | ✅ (needs parsing) | JSON-LD includes full date |
| Abstract | ✅ abstract | ❌ | ❌ | ✅ (partial) | ✅ (may be truncated) | JSON-LD most complete |
| Venue/Journal | ✅ publication | ❌ | ✅ journal_title | ❌ | ❌ | Often empty |
| Publisher | ✅ publisher | ❌ | ❌ | ❌ | ❌ | JSON-LD only |
| Corpus ID | ❌ | ❌ | ❌ | ❌ | ✅ | DOM only, also in URL |
| PDF URL | ✅ mainEntity | ✅ url | ❌ | ❌ | ❌ | JSON-LD most reliable |

---

## Parsing Considerations

### JSON-LD (Method 2)
```python
import json
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, 'html.parser')
script_tag = soup.find('script', {'type': 'application/ld+json'})
if script_tag:
    data = json.loads(script_tag.string)
    # Navigate @graph array to find Article/ScholarlyArticle
    for item in data.get('@graph', []):
        if isinstance(item, list):
            for sub_item in item:
                if sub_item.get('@type') in ['Article', 'ScholarlyArticle']:
                    # Extract fields here
```

### Meta Tags (Methods 3 & 4)
```python
# For repeating tags (authors)
authors = [tag.get('content') for tag in soup.find_all('meta', {'name': 'citation_author'})]

# For single tags
title = soup.find('meta', {'name': 'citation_title'})
if title:
    title_text = title.get('content')
```

### Title Cleaning
```python
# Remove "| Semantic Scholar" suffix from OG/Twitter titles
title = title.replace(' | Semantic Scholar', '').replace(' | Abstract', '')

# Decode HTML entities
import html
title = html.unescape(title)  # &#39; → '
```

### Date Parsing
```python
from dateutil import parser

# Handle various formats
year = parser.parse(date_string).year

# Or simple regex for numeric year
import re
year_match = re.search(r'20\d{2}', date_string)
year = int(year_match.group(0))
```

---

## Recommended Implementation Changes

### Phase 1: Add JSON-LD as Primary Method
1. Create `extract_from_json_ld()` function
2. Parse structured data from script tag
3. Make this the first fallback after BibTeX

### Phase 2: Enhance Fallback Chain
1. Implement `extract_from_citation_meta()` using meta tag selectors
2. Implement `extract_from_og_meta()` with title cleaning
3. Add proper error handling and logging at each stage

### Phase 3: Add Robustness Features
1. HTML entity decoding for all text fields
2. Title cleaning (remove suffixes and normalize)
3. Author list standardization (normalize format)
4. Date parsing to consistent format (ISO 8601)
5. Validation of extracted fields

### Phase 4: Optional Enhancements
1. Integrate Semantic Scholar API for authoritative data
2. Cache results to avoid re-scraping
3. Add request retry logic with exponential backoff
4. Implement result validation and confidence scoring

---

## Security & Ethical Considerations

- Respect `robots.txt` and rate limiting
- Use appropriate User-Agent headers
- Cache results to minimize requests
- Consider using Semantic Scholar API instead of scraping when available
- Monitor for changes in page structure
