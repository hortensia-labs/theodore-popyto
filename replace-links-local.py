#!/usr/bin/env python3
"""
Replace markdown links with Zotero citations using local zotero-data.json.

This is a simplified version that works with the local JSON file.
"""

import json
import re
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse


def load_zotero_data(json_path: Path) -> dict:
    """Load the URL-to-citation mapping from local JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {json_path}: {e}", file=sys.stderr)
        sys.exit(1)


def normalize_url(url: str) -> str:
    """Normalize a URL for matching purposes."""
    normalized = unquote(url)
    normalized = normalized.strip()
    if normalized.endswith('/') and normalized.count('/') > 3:
        normalized = normalized.rstrip('/')
    return normalized


def build_url_lookup(zotero_data: dict) -> dict:
    """Build a lookup dictionary with normalized URLs as keys."""
    lookup = {}
    
    for url_key, data in zotero_data.items():
        citation = data.get('citation', '')
        if citation:
            # Clean the URL key - remove suffix patterns like )+1, )+2, etc.
            # These were mistakenly included as part of the URL
            clean_url = re.sub(r'\)\+\d+.*$', '', url_key)
            
            # Store with cleaned URL
            lookup[clean_url] = citation
            normalized = normalize_url(clean_url)
            if normalized not in lookup:
                lookup[normalized] = citation
            
            if '#' in clean_url:
                base_url = clean_url.split('#')[0]
                if base_url not in lookup:
                    lookup[base_url] = citation
                normalized_base = normalize_url(base_url)
                if normalized_base not in lookup:
                    lookup[normalized_base] = citation
    
    return lookup


def find_citation_for_url(url: str, lookup: dict) -> Optional[str]:
    """Find the citation for a given URL, handling various edge cases."""
    # 1. Try exact match
    if url in lookup:
        return lookup[url]
    
    # 2. Try normalized URL
    normalized = normalize_url(url)
    if normalized in lookup:
        return lookup[normalized]
    
    # 3. Try without fragment (part after #)
    parsed = urlparse(url)
    if parsed.fragment:
        url_without_fragment = url.split('#')[0]
        if url_without_fragment in lookup:
            return lookup[url_without_fragment]
        normalized_no_frag = normalize_url(url_without_fragment)
        if normalized_no_frag in lookup:
            return lookup[normalized_no_frag]
    
    # 4. Try without query parameters
    if parsed.query:
        url_without_query = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        if url_without_query in lookup:
            return lookup[url_without_query]
        normalized_no_query = normalize_url(url_without_query)
        if normalized_no_query in lookup:
            return lookup[normalized_no_query]
    
    return None


def replace_links_in_content(content: str, lookup: dict) -> tuple[str, int, list]:
    """
    Replace all markdown links with citations where URL matches.
    
    Handles both standard links [text](url) and extended format [text](url)+number+text...
    
    Returns:
        - Modified content
        - Number of replacements made
        - List of unmatched URLs
    """
    replacements_made = 0
    unmatched_urls = []
    
    # Pattern to match: [text](url) optionally followed by +number+text+number...
    # Group 1: link text
    # Group 2: URL
    # Group 3: optional suffix like +3U.S. Copyright Office+3AP News+3
    link_pattern = re.compile(r'\[((?:\\[\[\]]|[^\]])*)\]\(([^)\s]+)\)(\+[0-9]+[^[]*)?')
    
    def replace_link(match: re.Match) -> str:
        nonlocal replacements_made, unmatched_urls
        
        full_match = match.group(0)
        link_text = match.group(1)
        url = match.group(2)
        suffix = match.group(3) or ''  # The +3Text+3 part
        
        citation = find_citation_for_url(url, lookup)
        
        if citation:
            replacements_made += 1
            # Replace the entire link (including suffix) with just the citation
            return citation
        else:
            unmatched_urls.append(url)
            return full_match
    
    new_content = link_pattern.sub(replace_link, content)
    
    return new_content, replacements_made, unmatched_urls


def main():
    if len(sys.argv) < 3:
        print("Usage: python replace-links-local.py <zotero-data.json> <markdown-file.md>")
        sys.exit(1)
    
    zotero_json_path = Path(sys.argv[1])
    markdown_file_path = Path(sys.argv[2])
    
    if not zotero_json_path.exists():
        print(f"Error: Zotero data file not found: {zotero_json_path}")
        sys.exit(1)
    
    if not markdown_file_path.exists():
        print(f"Error: Markdown file not found: {markdown_file_path}")
        sys.exit(1)
    
    # Load data
    print(f"Loading citation data from: {zotero_json_path}")
    zotero_data = load_zotero_data(zotero_json_path)
    print(f"  Loaded {len(zotero_data)} URL-to-citation mappings")
    
    # Build lookup
    lookup = build_url_lookup(zotero_data)
    
    # Read markdown file
    print(f"\nProcessing: {markdown_file_path}")
    content = markdown_file_path.read_text(encoding='utf-8')
    
    # Replace links
    new_content, replacements, unmatched = replace_links_in_content(content, lookup)
    
    # Write back to file
    markdown_file_path.write_text(new_content, encoding='utf-8')
    
    # Report results
    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")
    print(f"  Citations replaced: {replacements}")
    print(f"  URLs not found:     {len(unmatched)}")
    
    if unmatched:
        unique_unmatched = sorted(set(unmatched))
        print(f"\n  URLs without mappings ({len(unique_unmatched)}):")
        for url in unique_unmatched:
            print(f"    - {url}")


if __name__ == '__main__':
    main()
