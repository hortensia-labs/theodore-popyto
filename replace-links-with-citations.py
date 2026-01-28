#!/usr/bin/env python3
"""
Replace markdown links with Zotero citations.

This script loads URL-to-citation mappings from zotero-data.json and replaces
all matching markdown links in sections/*/sources/*.md files with their
corresponding citations. Reference links without mappings are deleted by default.

Example transformation:
    Input:  perspectivas[1](http://example.com/paper.pdf).
    Output: perspectivas (Author, 2023).

    Input:  sin fuente[2](http://unknown-url.com).
    Output: sin fuente

Edge cases handled:
- Links with footnote-style text: [^1](url) or [1](url)
- Links with any text content: [text](url) - non-reference links are preserved
- URLs with fragments (#...) or query parameters
- Multiple occurrences of the same URL
- Reference links not in the mapping are deleted (use --keep-unmatched to preserve)
- Proper handling of special regex characters in URLs
"""

import json
import re
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse


def load_zotero_data(json_path: Path) -> dict:
    """Load the URL-to-citation mapping from the JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalize_url(url: str) -> str:
    """
    Normalize a URL for matching purposes.
    
    Handles:
    - URL decoding (percent-encoded characters)
    - Removing trailing slashes
    - Normalizing whitespace
    """
    # Decode URL-encoded characters
    normalized = unquote(url)
    # Strip whitespace
    normalized = normalized.strip()
    # Remove trailing slash (but keep path structure)
    if normalized.endswith('/') and normalized.count('/') > 3:
        normalized = normalized.rstrip('/')
    return normalized


def build_url_lookup(zotero_data: dict) -> dict:
    """
    Build a lookup dictionary with normalized URLs as keys.
    
    Returns a dict mapping normalized URLs to their citation strings.
    Also includes the original URLs for exact matching priority.
    """
    lookup = {}
    
    for url, data in zotero_data.items():
        citation = data.get('citation', '')
        if citation:
            # Store with original URL
            lookup[url] = citation
            # Also store normalized version
            normalized = normalize_url(url)
            if normalized not in lookup:
                lookup[normalized] = citation
    
    return lookup


def find_citation_for_url(url: str, lookup: dict) -> Optional[str]:
    """
    Find the citation for a given URL, handling various edge cases.
    
    Matching priority:
    1. Exact match
    2. Normalized URL match
    3. URL without fragment match
    4. URL without query parameters match
    """
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


def replace_links_in_content(content: str, lookup: dict, delete_unmatched: bool = True) -> tuple[str, int, int, list]:
    """
    Replace all markdown links with citations where URL matches.
    
    Returns:
        - Modified content
        - Number of replacements made (citations found)
        - Number of deletions made (unmatched reference links removed)
        - List of deleted URLs (for reporting)
    
    Handles these markdown link patterns:
    - [text](url)
    - [^num](url)  (footnote-style)
    - [num](url)
    """
    replacements_made = 0
    deletions_made = 0
    deleted_urls = []
    
    # Pattern to match markdown links: [text](url)
    # - [text] can contain any characters except ] (including ^, numbers, etc.)
    # - (url) contains the URL which cannot contain unescaped parentheses
    # 
    # We need to be careful with nested parentheses in URLs
    # Most URLs don't have them, but some might (e.g., Wikipedia)
    # For now, we'll handle simple cases and URLs with balanced parens
    
    # Regex pattern explanation:
    # \[([^\]]*)\]  - Match [text] where text is any chars except ]
    # \(            - Match opening paren
    # ([^)\s]+)     - Match URL (any chars except ) and whitespace)
    # \)            - Match closing paren
    #
    # Note: This pattern handles most cases. URLs with spaces would need encoding.
    
    link_pattern = re.compile(r'\[([^\]]*)\]\(([^)\s]+)\)')
    
    def replace_link(match: re.Match) -> str:
        nonlocal replacements_made, deletions_made, deleted_urls
        
        full_match = match.group(0)
        link_text = match.group(1)
        url = match.group(2)
        
        # Try to find citation for this URL
        citation = find_citation_for_url(url, lookup)
        
        if citation:
            replacements_made += 1
            # Return just the citation (without brackets since citation already has parens)
            return citation
        else:
            # URL not found in mapping
            # Check if it looks like a reference link (number or ^number)
            is_reference_link = re.match(r'^\^?\d+$', link_text)
            
            if is_reference_link and delete_unmatched:
                # Delete the reference link entirely
                deletions_made += 1
                deleted_urls.append(url)
                return ''  # Remove the link completely
            else:
                # Keep non-reference links (e.g., [click here](url)) unchanged
                return full_match
    
    # Perform replacements
    new_content = link_pattern.sub(replace_link, content)
    
    return new_content, replacements_made, deletions_made, deleted_urls


def process_markdown_file(file_path: Path, lookup: dict, dry_run: bool = False, delete_unmatched: bool = True) -> dict:
    """
    Process a single markdown file, replacing links with citations.
    
    Returns a summary dict with stats about the processing.
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        return {
            'file': str(file_path),
            'status': 'error',
            'error': f"Could not read file: {e}",
            'replacements': 0,
            'deletions': 0,
            'deleted_urls': []
        }
    
    new_content, replacements, deletions, deleted_urls = replace_links_in_content(
        content, lookup, delete_unmatched=delete_unmatched
    )
    
    changes_made = replacements + deletions
    if changes_made > 0 and not dry_run:
        try:
            file_path.write_text(new_content, encoding='utf-8')
        except Exception as e:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': f"Could not write file: {e}",
                'replacements': 0,
                'deletions': 0,
                'deleted_urls': deleted_urls
            }
    
    return {
        'file': str(file_path),
        'status': 'modified' if changes_made > 0 else 'unchanged',
        'replacements': replacements,
        'deletions': deletions,
        'deleted_urls': list(set(deleted_urls))  # Deduplicate
    }


def find_markdown_files(base_path: Path) -> list[Path]:
    """
    Find all markdown files in sections/*/sources/ directories.
    """
    pattern = base_path / 'sections' / '*' / 'sources' / '*.md'
    return sorted(Path(p) for p in Path(base_path).glob('sections/*/sources/*.md'))


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Replace markdown links with Zotero citations.'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without modifying files'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed output including deleted URLs'
    )
    parser.add_argument(
        '--keep-unmatched',
        action='store_true',
        help='Keep reference links that have no matching citation (default: delete them)'
    )
    parser.add_argument(
        '--json-path',
        type=Path,
        default=Path('zotero-data.json'),
        help='Path to the zotero-data.json file (default: zotero-data.json)'
    )
    parser.add_argument(
        '--base-path',
        type=Path,
        default=Path('.'),
        help='Base path to search for markdown files (default: current directory)'
    )
    
    args = parser.parse_args()
    
    # Resolve paths
    json_path = args.json_path.resolve()
    base_path = args.base_path.resolve()
    
    # Check if JSON file exists
    if not json_path.exists():
        print(f"Error: JSON file not found: {json_path}", file=sys.stderr)
        sys.exit(1)
    
    # Load Zotero data
    print(f"Loading citation data from: {json_path}")
    try:
        zotero_data = load_zotero_data(json_path)
        print(f"  Loaded {len(zotero_data)} URL-to-citation mappings")
    except Exception as e:
        print(f"Error loading JSON file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Build lookup dictionary
    lookup = build_url_lookup(zotero_data)
    
    # Find markdown files
    md_files = find_markdown_files(base_path)
    if not md_files:
        print(f"No markdown files found in {base_path}/sections/*/sources/")
        sys.exit(0)
    
    delete_unmatched = not args.keep_unmatched
    
    print(f"\nProcessing {len(md_files)} markdown files...")
    if args.dry_run:
        print("(DRY RUN - no files will be modified)")
    if delete_unmatched:
        print("(Unmatched reference links will be deleted)")
    else:
        print("(Unmatched reference links will be kept)")
    print()
    
    # Process each file
    total_replacements = 0
    total_deletions = 0
    modified_files = 0
    all_deleted_urls = []
    
    for md_file in md_files:
        result = process_markdown_file(
            md_file, lookup, dry_run=args.dry_run, delete_unmatched=delete_unmatched
        )
        
        if result['status'] == 'error':
            print(f"  ERROR: {result['file']}")
            print(f"         {result['error']}")
        elif result['status'] == 'modified':
            modified_files += 1
            total_replacements += result['replacements']
            total_deletions += result['deletions']
            relative_path = md_file.relative_to(base_path)
            
            # Format output to show both replacements and deletions
            stats = []
            if result['replacements'] > 0:
                stats.append(f"{result['replacements']} replaced")
            if result['deletions'] > 0:
                stats.append(f"{result['deletions']} deleted")
            stats_str = ', '.join(stats)
            print(f"  [{stats_str:>25}] {relative_path}")
            
            if args.verbose and result['deleted_urls']:
                all_deleted_urls.extend(result['deleted_urls'])
        elif args.verbose:
            relative_path = md_file.relative_to(base_path)
            print(f"  [{'no changes':>25}] {relative_path}")
    
    # Print summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Files processed:    {len(md_files)}")
    print(f"  Files modified:     {modified_files}")
    print(f"  Citations replaced: {total_replacements}")
    print(f"  Links deleted:      {total_deletions}")
    
    if args.dry_run:
        print(f"\n  (DRY RUN - no files were actually modified)")
    
    # Report deleted URLs if verbose
    if args.verbose and all_deleted_urls:
        unique_deleted = sorted(set(all_deleted_urls))
        print(f"\n  Deleted reference URLs ({len(unique_deleted)}):")
        for url in unique_deleted[:20]:  # Limit to first 20
            print(f"    - {url[:80]}{'...' if len(url) > 80 else ''}")
        if len(unique_deleted) > 20:
            print(f"    ... and {len(unique_deleted) - 20} more")


if __name__ == '__main__':
    main()
