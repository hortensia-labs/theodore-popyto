# Extraction Methods Quick Reference

## Function Mapping

| Method | Function | Selector/Type | Reliability | Use When |
|--------|----------|---------------|-------------|----------|
| 1 | `extract_from_json_ld()` | `<script type="application/ld+json">` | Very High ✅ | Primary extraction |
| 2 | `extract_from_bibtex()` | `<pre class="bibtex-citation">` | High ✅ | BibTeX present |
| 3 | `extract_from_citation_meta()` | `<meta name="citation_*">` | High ✅ | Standard metadata |
| 4 | `extract_from_og_meta()` | `<meta property="og:*">` | Medium ⚠️ | Social sharing |
| 5 | `extract_from_twitter_meta()` | `<meta name="twitter:*">` | Medium ⚠️ | Twitter metadata |
| 6 | `extract_from_dom()` | `data-test-id` attributes | Low ⚠️ | Rendered HTML only |
| 7 | `extract_paper_id_from_url()` | Canonical URL | Very High ✅ | API lookups |

---

## Execution Order & Fallback Chain

```
1. JSON-LD (Primary - most complete)
   ↓ (if no data)
2. BibTeX (current implementation)
   ↓ (if no data)
3. Citation Meta Tags (standard format)
   ↓ (if no data)
4. Open Graph Meta Tags (social sharing)
   ↓ (if no data)
5. Twitter Meta Tags (alternative OG)
   ↓ (if no data)
6. DOM Elements (requires JS rendering)
   ↓ (if no data)
7. Paper ID (for API queries)
```

---

## Data Extraction Coverage

### Title
- **JSON-LD**: headline ✅
- **BibTeX**: title field ✅
- **Citation Meta**: citation_title ✅
- **OG/Twitter**: og:title / twitter:title ✅ (needs cleaning)
- **DOM**: h1[data-test-id="paper-detail-title"] ✅

### Author(s)
- **JSON-LD**: author[] array ✅ (handles multiple)
- **BibTeX**: author field, split by " and " ✅
- **Citation Meta**: multiple citation_author tags ✅
- **OG/Twitter**: ❌ (not available)
- **DOM**: span.author-list__author-name ⚠️ (may be incomplete)

### Year/Date
- **JSON-LD**: copyrightYear or datePublished ✅
- **BibTeX**: year field ✅
- **Citation Meta**: citation_publication_date or citation_year ✅
- **OG/Twitter**: ❌ (not available)
- **DOM**: span[data-test-id="paper-year"] ⚠️ (needs parsing)

### Abstract
- **JSON-LD**: abstract ✅ (full text)
- **BibTeX**: ❌ (not available)
- **Citation Meta**: ❌ (not available)
- **OG/Twitter**: og:description / twitter:description ⚠️ (may be truncated)
- **DOM**: span[data-test-id="text-truncator-text"] ⚠️ (may be truncated)

### Venue/Journal
- **JSON-LD**: publication ✅
- **BibTeX**: ❌ (not available)
- **Citation Meta**: citation_journal_title ✅
- **OG/Twitter**: ❌ (not available)
- **DOM**: ❌ (not available)

### Publisher
- **JSON-LD**: publisher ✅
- **Others**: ❌ (not available)

### Corpus/Paper ID
- **JSON-LD**: ❌
- **DOM**: data-test-id="corpus-id" ✅
- **URL**: Canonical URL last segment ✅

### PDF URL
- **JSON-LD**: mainEntity ✅
- **BibTeX**: url field ⚠️
- **Others**: ❌

---

## Key Helper Functions

### `clean_title(title: str) -> str`
- Removes "| Semantic Scholar" suffix
- Removes "| Abstract" suffix
- Decodes HTML entities (`&#39;` → `'`)
- **Used by**: OG and Twitter extraction

### `merge_extraction_results(results: List[Dict]) -> Dict`
- Combines results from multiple methods
- Priority: earlier results take precedence
- **Strategy**: First successful extraction for each field wins
- **Returns**: Unified dictionary with all extracted fields

---

## Usage Patterns

### Direct Function Calls
```python
from extract_semantic_scholar_bibtex import extract_from_json_ld
from bs4 import BeautifulSoup
import requests

html = requests.get(url).text
soup = BeautifulSoup(html, 'html.parser')
result = extract_from_json_ld(soup)
```

### Full Extraction Pipeline
```python
from extract_semantic_scholar_bibtex import extract_citation_data

result = extract_citation_data(url)
if result['success']:
    print(f"Title: {result.get('title')}")
    print(f"Authors: {result.get('author')}")
    print(f"Methods used: {result['extraction_methods']}")
```

---

## Error Handling

All functions return `Optional[Dict]` or `Optional[str]`:
- Return `None` if extraction fails
- Main function catches exceptions and returns error JSON
- Each method is independent - failure doesn't affect others

**Error Response Format**:
```json
{
  "success": false,
  "error": "Error description",
  "url": "original_url"
}
```

---

## Performance Considerations

| Method | Speed | Network | Notes |
|--------|-------|---------|-------|
| All (except DOM) | Fast | Single fetch | Parallel parsing |
| DOM | Medium | Single fetch | Requires JS rendering |
| API | Slow | Additional request | Most authoritative |

---

## Common Issues & Solutions

### Issue: Title has "| Semantic Scholar" suffix
**Solution**: `clean_title()` is applied to OG/Twitter results automatically

### Issue: Multiple authors not being extracted
**Solution**: Check extraction method - JSON-LD and Citation Meta handle arrays

### Issue: Abstract is truncated
**Solution**: Check `abstract_truncated` flag in DOM results; use JSON-LD when possible

### Issue: Paper ID needed for API
**Solution**: `extract_paper_id_from_url()` always runs, returns `paper_id` field

### Issue: Date format inconsistent
**Solution**: Year extracted as string; full date in `date_published` field when available

