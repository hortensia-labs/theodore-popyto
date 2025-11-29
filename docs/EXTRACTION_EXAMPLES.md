# Semantic Scholar Extraction Examples

## Command Line Usage

### Basic Extraction
```bash
python3 lib/extract-semantic-scholar-bibtex.py https://www.semanticscholar.org/paper/abc123
```

### Output Example (Success)
```json
{
  "success": true,
  "url": "https://www.semanticscholar.org/paper/SomeTitle/abc123...",
  "extraction_methods": 3,
  "title": "Deep Learning for Natural Language Processing",
  "author": ["John Doe", "Jane Smith", "Bob Johnson"],
  "date": "2023",
  "date_published": "March 15, 2023",
  "abstract": "This paper presents a comprehensive study of deep learning...",
  "venue": "NeurIPS 2023",
  "publisher": "MIT Press",
  "pdf_url": "https://example.com/paper.pdf",
  "corpus_id": "245123456",
  "paper_id": "a1b2c3d4e5f6..."
}
```

### Output Example (Partial Extraction)
```json
{
  "success": true,
  "url": "https://www.semanticscholar.org/paper/AnotherPaper/xyz789...",
  "extraction_methods": 2,
  "title": "Machine Learning Applications",
  "author": "Alice Wonder",
  "date": "2022",
  "abstract": "This work explores various applications of machine learning..."
}
```

### Output Example (Error)
```json
{
  "success": false,
  "error": "BibTeX citation not found on page",
  "url": "https://www.semanticscholar.org/paper/invalid-url"
}
```

---

## Programmatic Usage

### Python Script Integration
```python
#!/usr/bin/env python3
"""Example of using the extraction functions directly."""

import json
from pathlib import Path
import sys

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from extract_semantic_scholar_bibtex import extract_citation_data

def extract_and_save(urls):
    """Extract citation data from URLs and save results."""
    results = []

    for url in urls:
        print(f"Extracting: {url}")
        result = extract_citation_data(url)
        results.append(result)

        if result['success']:
            print(f"  ✓ Found: {result.get('title', 'N/A')}")
        else:
            print(f"  ✗ Error: {result.get('error')}")

    # Save results
    with open('extracted_citations.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    urls = [
        "https://www.semanticscholar.org/paper/...",
        "https://www.semanticscholar.org/paper/...",
    ]
    extract_and_save(urls)
```

### Using Individual Extraction Methods
```python
from bs4 import BeautifulSoup
import requests
from extract_semantic_scholar_bibtex import (
    extract_from_json_ld,
    extract_from_bibtex,
    extract_from_citation_meta,
)

def debug_extraction(url):
    """Show which extraction methods succeed."""
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(response.text, 'html.parser')

    methods = {
        'JSON-LD': extract_from_json_ld(soup),
        'BibTeX': extract_from_bibtex(soup),
        'Citation Meta': extract_from_citation_meta(soup),
    }

    for method_name, result in methods.items():
        if result:
            print(f"{method_name}: ✓ Success")
            print(f"  Fields: {', '.join(result.keys())}")
        else:
            print(f"{method_name}: ✗ Not found")

debug_extraction("https://www.semanticscholar.org/paper/...")
```

---

## Batch Processing

### Using the Batch Script
```bash
# Prepare your URLs in semanticscholar/semantic_urls.md
echo "https://www.semanticscholar.org/paper/..." >> semanticscholar/semantic_urls.md

# Run batch processing
python3 lib/batch-extract-semantic-scholar.py
```

### Output Files
- `semanticscholar/semantic_urls.json` - Successfully extracted citations
- `semanticscholar/semantic_errors.json` - Failed URLs with error messages

### Example Batch Results
**semantic_urls.json** (first entry):
```json
[
  {
    "url": "https://www.semanticscholar.org/paper/abc123...",
    "title": "Deep Learning for NLP",
    "author": ["John Doe", "Jane Smith"],
    "date": "2023",
    "abstract": "...",
    "venue": "NeurIPS 2023"
  },
  ...
]
```

**semantic_errors.json**:
```json
[
  {
    "url": "https://www.semanticscholar.org/paper/invalid...",
    "error": "Failed to fetch URL: ..."
  },
  ...
]
```

---

## Data Quality Scenarios

### Scenario 1: Complete Extraction (All Data Available)
Paper with full metadata on all sources.

**Sources Used**: JSON-LD (primary)
```python
result = {
    'title': 'Complete Paper Title',
    'author': ['Author 1', 'Author 2', 'Author 3'],
    'date': '2023',
    'date_published': 'March 15, 2023',
    'abstract': 'Full abstract text...',
    'venue': 'Conference Name',
    'publisher': 'Publisher',
    'pdf_url': 'https://...',
    'corpus_id': '123456',
    'paper_id': 'abc123...',
}
```

### Scenario 2: Partial Extraction (Limited Data)
Preprint or lesser-known paper with limited metadata.

**Sources Used**: BibTeX + Citation Meta Tags + DOM
```python
result = {
    'title': 'Preprint Title',
    'author': 'Single Author',  # Note: string, not array
    'date': '2023',
    'abstract': 'Abstract from OG tags...',  # May be truncated
}
```

### Scenario 3: Fallback Chain in Action
Paper where primary source fails, but fallbacks succeed.

**Sources Used**:
1. JSON-LD → No @graph found
2. BibTeX → Found! (provides title, author, date)
3. Citation Meta → Found! (provides venue)

```python
result = {
    'title': 'From BibTeX',
    'author': 'From BibTeX',
    'date': 'From BibTeX',
    'venue': 'From Citation Meta',  # Filled by fallback
}
```

### Scenario 4: Minimal Data (Nearly All Fallbacks Fail)
Unusual page structure with limited metadata.

**Sources Used**: DOM + Canonical URL
```python
result = {
    'title': 'From DOM',
    'author': 'From DOM',
    'corpus_id': 'From DOM',
    'paper_id': 'From Canonical URL',
}
```

---

## Common Use Cases

### Use Case 1: Extract Citations for Bibliography
```python
def extract_bibliography(paper_urls):
    """Extract citations in bibliography format."""
    import json
    from extract_semantic_scholar_bibtex import extract_citation_data

    citations = []
    for url in paper_urls:
        result = extract_citation_data(url)
        if result['success']:
            citations.append({
                'title': result.get('title'),
                'authors': result.get('author'),
                'year': result.get('date'),
                'source': url
            })

    return citations
```

### Use Case 2: Validate Citation Data
```python
def validate_citations(json_file):
    """Check which fields are present in extracted data."""
    import json

    with open(json_file) as f:
        data = json.load(f)

    required_fields = {'title', 'author', 'date'}

    for entry in data:
        missing = required_fields - set(entry.keys())
        if missing:
            print(f"Missing fields in {entry['url']}: {missing}")
```

### Use Case 3: Extract Abstracts for Analysis
```python
def extract_abstracts(urls):
    """Get abstracts for text analysis."""
    from extract_semantic_scholar_bibtex import extract_citation_data

    abstracts = {}
    for url in urls:
        result = extract_citation_data(url)
        if result['success'] and 'abstract' in result:
            abstracts[result['title']] = result['abstract']

    return abstracts
```

### Use Case 4: Build Paper Catalog
```python
def build_catalog(json_results):
    """Create a structured catalog of papers."""
    import json

    catalog = {}
    with open(json_results) as f:
        results = json.load(f)

    for paper in results:
        if paper['success']:
            year = paper.get('date', 'Unknown')
            if year not in catalog:
                catalog[year] = []

            catalog[year].append({
                'title': paper['title'],
                'authors': paper.get('author', []),
                'venue': paper.get('venue', 'Unknown'),
                'paper_id': paper.get('paper_id'),
            })

    return catalog
```

---

## Troubleshooting Examples

### Problem: "BibTeX citation not found on page"
**Likely Cause**: All extraction methods failed
**Solution**:
1. Check if URL is valid and accessible
2. Verify it's from semanticscholar.org
3. Try with `extract_from_json_ld()` directly to debug
4. Consider using Selenium for JavaScript-rendered pages

### Problem: Multiple author extraction failing
**Likely Cause**: Using BibTeX-only method
**Solution**: Script now tries JSON-LD first (handles author arrays naturally)
```python
# JSON-LD returns:
'author': ['Author 1', 'Author 2']  # List

# BibTeX returns:
'author': 'Author 1 and Author 2'  # String (parsed as separate)
```

### Problem: Title has extra suffix like "| Semantic Scholar"
**Likely Cause**: Extracted from OG tags
**Solution**: `clean_title()` is applied automatically
```python
# Before: "'Feeling at one' | Semantic Scholar"
# After: "'Feeling at one'"
```

### Problem: Abstract is truncated with "..."
**Likely Cause**: Extracted from DOM elements
**Solution**: Check `abstract_truncated` flag; prefer JSON-LD
```python
if result.get('abstract_truncated'):
    print("Warning: Abstract may be incomplete")
```

---

## Performance Notes

### Single URL Extraction
- **Typical time**: 1-3 seconds
- **Bottleneck**: Network fetch (90% of time)
- **Parsing**: <100ms for all methods

### Batch Processing (100 URLs)
- **Expected time**: 2-5 minutes
- **Network overhead**: Majority of time
- **Optimization**: Add parallel requests library for speed

### Tips for Better Performance
1. Use connection pooling for batch operations
2. Add caching to avoid re-scraping same papers
3. Consider using Semantic Scholar API for authoritative data (faster, no scraping)

