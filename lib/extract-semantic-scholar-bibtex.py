#!/usr/bin/env python3
"""
Extract bibliographic citation data from Semantic Scholar URLs.

This script implements a comprehensive extraction strategy with multiple fallback
methods to robustly extract citation data (title, author(s), year, abstract, etc.)
from Semantic Scholar article pages.

Extraction methods (in priority order):
1. JSON-LD Schema Data (Primary - most complete)
2. BibTeX <pre> tag (Current implementation)
3. HTML Citation Meta Tags (standard format)
4. Open Graph Meta Tags (alternative source)
5. Twitter Meta Tags (fallback to OG)
6. DOM Elements (requires JavaScript rendering)
"""

import html as html_module
import json
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


def fetch_page(url: str) -> str:
    """Fetch HTML content from a URL with appropriate headers."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        raise Exception(f"Failed to fetch URL: {e}")


# ============================================================================
# METHOD 1: JSON-LD Schema Data Extraction (Primary)
# ============================================================================

def extract_from_json_ld(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract citation data from JSON-LD structured data.

    Looks for <script type="application/ld+json"> tags and extracts Article
    or ScholarlyArticle types.
    """
    try:
        script_tag = soup.find('script', {'type': 'application/ld+json'})
        if not script_tag or not script_tag.string:
            return None

        data = json.loads(script_tag.string)

        # Navigate @graph array to find Article/ScholarlyArticle
        graph = data.get('@graph', [])
        if not graph:
            return None

        article = None
        for item in graph:
            if isinstance(item, list):
                # @graph might contain nested arrays
                for sub_item in item:
                    if isinstance(sub_item, dict) and sub_item.get('@type') in ['Article', 'ScholarlyArticle']:
                        article = sub_item
                        break
            elif isinstance(item, dict) and item.get('@type') in ['Article', 'ScholarlyArticle']:
                article = item
                break

        if not article:
            return None

        result = {}

        # Extract title
        if 'headline' in article:
            result['title'] = article['headline'].strip()

        # Extract author(s)
        if 'author' in article:
            authors_data = article['author']
            if isinstance(authors_data, list):
                authors = []
                for author in authors_data:
                    if isinstance(author, dict) and 'name' in author:
                        authors.append(author['name'].strip())
                    elif isinstance(author, str):
                        authors.append(author.strip())
                if authors:
                    result['author'] = authors if len(authors) > 1 else authors[0]
            elif isinstance(authors_data, str):
                result['author'] = authors_data.strip()

        # Extract year
        year = None
        if 'copyrightYear' in article:
            year = article['copyrightYear']
        elif 'datePublished' in article:
            # Try to extract year from date string
            date_str = article['datePublished']
            year_match = re.search(r'20\d{2}', date_str)
            if year_match:
                year = year_match.group(0)

        if year:
            result['date'] = str(year)

        # Extract publication date (full format)
        if 'datePublished' in article:
            result['date_published'] = article['datePublished'].strip()

        # Extract abstract
        if 'abstract' in article:
            result['abstract'] = article['abstract'].strip()

        # Extract venue/publication
        if 'publication' in article and article['publication']:
            result['venue'] = article['publication'].strip()

        # Extract publisher
        if 'publisher' in article:
            publisher = article['publisher']
            if isinstance(publisher, dict) and 'name' in publisher:
                result['publisher'] = publisher['name'].strip()
            elif isinstance(publisher, str):
                result['publisher'] = publisher.strip()

        # Extract PDF URL
        if 'mainEntity' in article:
            result['pdf_url'] = article['mainEntity']

        return result if result else None

    except (json.JSONDecodeError, KeyError, TypeError):
        return None


# ============================================================================
# METHOD 2: BibTeX <pre> Tag Extraction
# ============================================================================

def extract_bibtex_from_html(soup: BeautifulSoup) -> Optional[str]:
    """
    Extract BibTeX citation from <pre> tag.

    Tries multiple selectors:
    1. <pre class="bibtex-citation">
    2. Any <pre> tag starting with @
    """
    # Try primary selector
    bibtex_element = soup.find('pre', class_='bibtex-citation')

    # Fallback: any <pre> tag containing BibTeX-like content
    if not bibtex_element:
        for pre_tag in soup.find_all('pre'):
            text = pre_tag.get_text().strip()
            if text.startswith('@'):
                bibtex_element = pre_tag
                break

    if not bibtex_element:
        return None

    return bibtex_element.get_text().strip()


def parse_bibtex(bibtex_text: str) -> Optional[Dict[str, Any]]:
    """Parse BibTeX text and extract structured fields."""
    result = {}

    # Extract title
    title_match = re.search(r'title\s*=\s*\{([^}]+)\}', bibtex_text, re.IGNORECASE)
    if title_match:
        result['title'] = title_match.group(1).strip()

    # Extract author(s)
    author_match = re.search(r'author\s*=\s*\{([^}]+)\}', bibtex_text, re.IGNORECASE)
    if author_match:
        author_text = author_match.group(1).strip()
        # Split by " and " to get individual authors
        authors = [a.strip() for a in author_text.split(' and ')]
        result['author'] = authors if len(authors) > 1 else authors[0]

    # Extract year
    year_match = re.search(r'year\s*=\s*\{([^}]+)\}', bibtex_text, re.IGNORECASE)
    if year_match:
        result['date'] = year_match.group(1).strip()

    # Extract URL
    url_match = re.search(r'url\s*=\s*\{([^}]+)\}', bibtex_text, re.IGNORECASE)
    if url_match:
        result['url'] = url_match.group(1).strip()

    return result if result else None


def extract_from_bibtex(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract citation data from BibTeX."""
    bibtex_text = extract_bibtex_from_html(soup)
    if not bibtex_text:
        return None

    return parse_bibtex(bibtex_text)


# ============================================================================
# METHOD 3: Citation Meta Tags Extraction
# ============================================================================

def extract_from_citation_meta(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract citation data from Dublin Core meta tags.

    Looks for meta tags like:
    - meta[name="citation_author"]
    - meta[name="citation_title"]
    - meta[name="citation_publication_date"]
    """
    result = {}

    # Extract title
    title_tag = soup.find('meta', {'name': 'citation_title'})
    if title_tag and title_tag.get('content'):
        result['title'] = title_tag.get('content').strip()

    # Extract author(s) - may be multiple tags
    author_tags = soup.find_all('meta', {'name': 'citation_author'})
    if author_tags:
        authors = []
        for tag in author_tags:
            content = tag.get('content')
            if content:
                # Handle multiple authors in single tag (comma/and separated)
                if ',' in content or ' and ' in content:
                    author_list = re.split(r',|\s+and\s+', content)
                    authors.extend([a.strip() for a in author_list if a.strip()])
                else:
                    authors.append(content.strip())
        if authors:
            result['author'] = authors if len(authors) > 1 else authors[0]

    # Extract year/publication date
    date_tag = soup.find('meta', {'name': 'citation_publication_date'})
    if not date_tag:
        date_tag = soup.find('meta', {'name': 'citation_year'})

    if date_tag and date_tag.get('content'):
        result['date'] = date_tag.get('content').strip()

    # Extract journal/venue
    journal_tag = soup.find('meta', {'name': 'citation_journal_title'})
    if journal_tag and journal_tag.get('content'):
        venue = journal_tag.get('content').strip()
        if venue:  # Only add if not empty
            result['venue'] = venue

    return result if result else None


# ============================================================================
# METHOD 4 & 5: Open Graph and Twitter Meta Tags Extraction
# ============================================================================

def clean_title(title: str) -> str:
    """Clean title by removing common suffixes and decoding HTML entities."""
    # Remove common suffixes
    title = re.sub(r'\s*\|\s*Semantic Scholar\s*$', '', title)
    title = re.sub(r'\s*\|\s*Abstract\s*$', '', title)

    # Decode HTML entities
    title = html_module.unescape(title)

    return title.strip()


def extract_from_og_meta(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract citation data from Open Graph meta tags.

    Looks for meta tags like:
    - meta[property="og:title"]
    - meta[property="og:description"]
    """
    result = {}

    # Extract title
    og_title = soup.find('meta', {'property': 'og:title'})
    if og_title and og_title.get('content'):
        result['title'] = clean_title(og_title.get('content'))

    # Extract description/abstract
    og_desc = soup.find('meta', {'property': 'og:description'})
    if og_desc and og_desc.get('content'):
        result['abstract'] = html_module.unescape(og_desc.get('content')).strip()

    return result if result else None


def extract_from_twitter_meta(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract citation data from Twitter meta tags.

    Similar to Open Graph, serves as fallback.
    """
    result = {}

    # Extract title
    twitter_title = soup.find('meta', {'name': 'twitter:title'})
    if twitter_title and twitter_title.get('content'):
        result['title'] = clean_title(twitter_title.get('content'))

    # Extract description
    twitter_desc = soup.find('meta', {'name': 'twitter:description'})
    if twitter_desc and twitter_desc.get('content'):
        result['abstract'] = html_module.unescape(twitter_desc.get('content')).strip()

    return result if result else None


# ============================================================================
# METHOD 6: DOM Elements Extraction
# ============================================================================

def extract_from_dom(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract citation data from DOM elements with data-test-id attributes.

    Note: This method only works with fully rendered HTML. For dynamic pages,
    consider using Selenium/Playwright for JavaScript rendering.

    Looks for elements like:
    - h1[data-test-id="paper-detail-title"]
    - span.author-list__author-name
    - span[data-test-id="paper-year"]
    - span[data-test-id="text-truncator-text"]
    """
    result = {}

    # Extract title
    title_elem = soup.find('h1', {'data-test-id': 'paper-detail-title'})
    if title_elem:
        result['title'] = title_elem.get_text().strip()

    # Extract author(s)
    author_elems = soup.find_all('span', class_='author-list__author-name')
    if author_elems:
        authors = [elem.get_text().strip() for elem in author_elems]
        if authors:
            result['author'] = authors if len(authors) > 1 else authors[0]

    # Extract year/date
    year_elem = soup.find('span', {'data-test-id': 'paper-year'})
    if year_elem:
        date_str = year_elem.get_text().strip()
        # Try to extract year from human-readable format
        year_match = re.search(r'20\d{2}', date_str)
        if year_match:
            result['date'] = year_match.group(0)
        else:
            result['date'] = date_str

    # Extract abstract (may be truncated)
    abstract_elem = soup.find('span', {'data-test-id': 'text-truncator-text'})
    if abstract_elem:
        abstract_text = abstract_elem.get_text().strip()
        result['abstract'] = abstract_text
        result['abstract_truncated'] = abstract_text.endswith('...')

    # Extract Corpus ID
    corpus_elem = soup.find('li', {'data-test-id': 'corpus-id'})
    if corpus_elem:
        corpus_text = corpus_elem.get_text()
        corpus_match = re.search(r'Corpus ID:\s*(\d+)', corpus_text)
        if corpus_match:
            result['corpus_id'] = corpus_match.group(1)

    return result if result else None


# ============================================================================
# METHOD 7: Canonical URL Analysis
# ============================================================================

def extract_paper_id_from_url(soup: BeautifulSoup) -> Optional[str]:
    """
    Extract paper ID from canonical URL.

    The paper ID is the last segment of the canonical URL.
    Can be used to query Semantic Scholar API for authoritative data.
    """
    canonical = soup.find('link', {'rel': 'canonical'})
    if canonical and canonical.get('href'):
        url = canonical.get('href')
        # Paper ID is the last segment after final /
        parts = url.rstrip('/').split('/')
        if parts:
            return parts[-1]

    return None


# ============================================================================
# Merge and Utility Functions
# ============================================================================

def merge_extraction_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge results from multiple extraction methods.

    Priority: earlier results take precedence for same fields.
    Special handling for lists (authors).
    """
    merged = {}

    for result in results:
        if not result:
            continue

        for key, value in result.items():
            # Skip if already have a value for this key
            if key in merged:
                continue

            merged[key] = value

    return merged


def extract_citation_data(url: str) -> Dict:
    """
    Extract citation data from a Semantic Scholar URL using fallback chain.

    Strategy:
    1. JSON-LD (most complete)
    2. BibTeX (current implementation)
    3. Citation Meta Tags
    4. Open Graph Meta Tags
    5. Twitter Meta Tags
    6. DOM Elements
    """
    # Validate URL
    parsed = urlparse(url)
    if 'semanticscholar.org' not in parsed.netloc:
        return {
            'success': False,
            'error': 'URL must be from semanticscholar.org domain'
        }

    try:
        # Fetch page
        html = fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')

        # Extract using fallback chain
        results = []

        # Method 1: JSON-LD (Primary)
        json_ld_data = extract_from_json_ld(soup)
        if json_ld_data:
            results.append(json_ld_data)

        # Method 2: BibTeX
        bibtex_data = extract_from_bibtex(soup)
        if bibtex_data:
            results.append(bibtex_data)

        # Method 3: Citation Meta Tags
        citation_meta_data = extract_from_citation_meta(soup)
        if citation_meta_data:
            results.append(citation_meta_data)

        # Method 4: Open Graph Meta Tags
        og_data = extract_from_og_meta(soup)
        if og_data:
            results.append(og_data)

        # Method 5: Twitter Meta Tags
        twitter_data = extract_from_twitter_meta(soup)
        if twitter_data:
            results.append(twitter_data)

        # Method 6: DOM Elements
        dom_data = extract_from_dom(soup)
        if dom_data:
            results.append(dom_data)

        # Method 7: Paper ID from canonical URL
        paper_id = extract_paper_id_from_url(soup)
        if paper_id:
            results.append({'paper_id': paper_id})

        # Merge results
        if not results:
            return {
                'success': False,
                'error': 'No citation data found using any extraction method'
            }

        merged_data = merge_extraction_results(results)

        return {
            'success': True,
            'url': url,
            'extraction_methods': len(results),
            **merged_data
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python extract-semantic-scholar-bibtex.py <url>")
        print("\nExtracts bibliographic data from Semantic Scholar URLs using multiple methods:")
        print("  - JSON-LD Schema Data (primary)")
        print("  - BibTeX citations")
        print("  - Citation meta tags")
        print("  - Open Graph/Twitter meta tags")
        print("  - DOM elements")
        sys.exit(1)

    url = sys.argv[1]
    result = extract_citation_data(url)

    # Output as JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()

