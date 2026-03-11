#!/usr/bin/env python3
"""
Scan markdown files and extract URL hyperlinks.

This script scans markdown files for URL hyperlinks in markdown format [text](url)
and builds a registry for InDesign correction.

Usage:
    python scan-hyperlinks.py <markdown_dir> <output_file>

Arguments:
    markdown_dir: Directory containing markdown files to process
    output_file:  Path where the URL registry JSON will be saved

Example:
    python scan-hyperlinks.py generated/markdown generated/data/url-registry.json

Output:
    Creates url-registry.json containing:
    - Metadata (generation time, counts)
    - URLs with link text, source file, and line numbers
    - Duplicate URL tracking
    - Warnings for potential issues (e.g., insecure HTTP URLs)

Exit codes:
    0: Processing completed successfully
    1: Error occurred during processing
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, NamedTuple


class URLEntry(NamedTuple):
    """Represents a URL hyperlink entry."""
    display_text: str
    url: str
    source_file: str
    line_number: int


# Pattern to match markdown URL hyperlinks: [text](https://url) or [text](http://url)
URL_HYPERLINK_PATTERN = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')


def extract_urls_from_content(content: str, source_file: str) -> List[URLEntry]:
    """
    Extract URL hyperlinks from markdown content.

    Looks for markdown-style links: [display text](https://url)

    Args:
        content: Markdown content to analyze
        source_file: Name of the source file (for registry)

    Returns:
        List of URLEntry objects with URL details
    """
    urls = []

    for line_num, line in enumerate(content.splitlines(), 1):
        matches = URL_HYPERLINK_PATTERN.findall(line)
        for display_text, url in matches:
            urls.append(URLEntry(
                display_text=display_text.strip(),
                url=url.strip(),
                source_file=source_file,
                line_number=line_num
            ))

    return urls


def build_url_registry(url_entries: List[URLEntry]) -> Dict:
    """
    Build a URL registry from extracted URL entries.

    Args:
        url_entries: List of all URL entries from all files

    Returns:
        Dictionary with registry structure for JSON output
    """
    # Track unique URLs and duplicates
    url_map: Dict[str, List[URLEntry]] = {}

    for entry in url_entries:
        if entry.url not in url_map:
            url_map[entry.url] = []
        url_map[entry.url].append(entry)

    # Build the registry structure
    urls_list = []
    duplicates_list = []
    warnings_list = []

    for url, entries in url_map.items():
        # Use the first entry as the canonical one
        first_entry = entries[0]
        urls_list.append({
            "url": first_entry.url,
            "linkText": first_entry.display_text,
            "sourceFile": first_entry.source_file,
            "lineNumber": first_entry.line_number
        })

        # Track duplicates (same URL, different occurrences)
        if len(entries) > 1:
            dup_entry = {
                "url": url,
                "occurrences": len(entries),
                "locations": [
                    {
                        "sourceFile": e.source_file,
                        "lineNumber": e.line_number,
                        "linkText": e.display_text
                    }
                    for e in entries
                ]
            }
            duplicates_list.append(dup_entry)

        # Check for potential issues
        if not url.startswith("https://"):
            warnings_list.append({
                "type": "insecure_url",
                "url": url,
                "sourceFile": first_entry.source_file,
                "lineNumber": first_entry.line_number,
                "message": "URL uses HTTP instead of HTTPS"
            })

    # Build the final registry
    registry = {
        "metadata": {
            "generated": datetime.now().isoformat(),
            "version": "1.0",
            "totalURLs": len(url_entries),
            "totalUniqueURLs": len(url_map)
        },
        "urls": urls_list,
        "duplicates": duplicates_list,
        "warnings": warnings_list
    }

    return registry


def save_url_registry(registry: Dict, output_path: Path) -> bool:
    """
    Save the URL registry to a JSON file.

    Args:
        registry: Registry dictionary to save
        output_path: Path for the output JSON file

    Returns:
        True if saved successfully, False otherwise
    """
    try:
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"   ❌ Error saving URL registry: {e}")
        return False


def scan_hyperlinks(markdown_dir: Path, output_file: Path) -> bool:
    """
    Scan all markdown files for URL hyperlinks.

    Args:
        markdown_dir: Directory containing markdown files
        output_file: Path for the output JSON registry

    Returns:
        True if processing completed successfully, False otherwise
    """
    # Find all markdown files
    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("⚠️  No generated markdown files found")
        print("💡 Tip: Run 'make compile-all' first to generate files")
        return True

    # Collect all URLs
    all_urls: List[URLEntry] = []
    files_with_urls = 0
    failed_files = 0

    for md_file in md_files:
        print(f"   📝 Scanning: {md_file.name}")

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            source_name = md_file.stem
            urls = extract_urls_from_content(content, source_name)

            if urls:
                all_urls.extend(urls)
                files_with_urls += 1
                print(f"   ✅ Found {len(urls)} URLs")
            else:
                print(f"   ⚠️  No URLs found")

        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed_files += 1

    # Build and save URL registry
    if all_urls:
        print(f"\n📊 Building URL registry...")
        registry = build_url_registry(all_urls)

        if save_url_registry(registry, output_file):
            print(f"   ✅ URL registry saved: {output_file.name}")
            print(f"      Total URLs: {registry['metadata']['totalURLs']}")
            print(f"      Unique URLs: {registry['metadata']['totalUniqueURLs']}")
            if registry['duplicates']:
                print(f"      Duplicate URLs: {len(registry['duplicates'])}")
            if registry['warnings']:
                print(f"      Warnings: {len(registry['warnings'])}")
        else:
            print(f"   ❌ Failed to save URL registry")
            return False
    else:
        print(f"\n⚠️  No URL hyperlinks found in any file")

    # Summary
    total_files = len(md_files)
    print(f"\n📊 Hyperlink Scan Summary:")
    print(f"   📄 Files processed: {total_files}")
    print(f"   🔗 Files with URLs: {files_with_urls}")
    print(f"   🌐 Total URLs extracted: {len(all_urls)}")

    if failed_files > 0:
        print(f"   ❌ Failed files: {failed_files}")
        return False

    print(f"✅ Hyperlink scan complete: {len(all_urls)} URLs from {files_with_urls} files")
    return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Scan markdown files and extract URL hyperlinks"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to process"
    )
    parser.add_argument(
        "output_file",
        type=Path,
        help="Path where the URL registry JSON will be saved"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    print("🔗 Scanning URL hyperlinks from markdown files...")

    # Process files
    if scan_hyperlinks(args.markdown_dir, args.output_file):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some errors occurred


if __name__ == "__main__":
    main()
