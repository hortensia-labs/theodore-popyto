#!/usr/bin/env python3
"""
Compile data from markdown files: citations, cross-references, and URL hyperlinks.

This script scans markdown files and extracts:
1. Citations (parenthetical references) with line numbers
2. URL hyperlinks in markdown format [text](url)

Usage:
    python compile-data.py <markdown_dir> <output_dir>

Arguments:
    markdown_dir: Directory containing markdown files to process
    output_dir:   Directory where extracted data files will be saved

Example:
    python compile-data.py generated/markdown generated/data

Output:
    - .ctcr.md files: Citations with line numbers per markdown file
    - url-registry.json: Registry of all URL hyperlinks for InDesign correction

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
from typing import Dict, List, NamedTuple, Optional, Set, Tuple


class Citation(NamedTuple):
    """Represents a citation with its context."""
    line_number: int
    content: str
    full_line: str


class URLEntry(NamedTuple):
    """Represents a URL hyperlink entry."""
    display_text: str
    url: str
    source_file: str
    line_number: int


class ProcessingResult(NamedTuple):
    """Results of processing a single file."""
    file_path: Path
    citations_found: int
    urls_found: int
    output_file: Optional[Path]
    success: bool
    error_message: Optional[str] = None


# Pattern to match markdown URL hyperlinks: [text](https://url) or [text](http://url)
URL_HYPERLINK_PATTERN = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')

# Pattern to match parenthetical content that's likely a citation
CITATION_PATTERN = re.compile(r'\([^)]*[a-zA-Z0-9][^)]*\)')


def extract_citations_from_content(content: str) -> List[Citation]:
    """
    Extract citations from markdown content.

    Looks for parenthetical references: (text) where text contains characters
    but excludes simple punctuation-only parentheses.

    Args:
        content: Markdown content to analyze

    Returns:
        List of Citation objects with line numbers and content
    """
    citations = []

    for line_num, line in enumerate(content.splitlines(), 1):
        matches = CITATION_PATTERN.findall(line)
        for match in matches:
            # Filter out very short or clearly non-citation parentheses
            if len(match.strip('()')) > 1:
                citations.append(Citation(
                    line_number=line_num,
                    content=match,
                    full_line=line.strip()
                ))

    return citations


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


def format_citations_output(citations: List[Citation]) -> str:
    """
    Format citations for output file.

    Args:
        citations: List of citations to format

    Returns:
        Formatted string ready for file output
    """
    if not citations:
        return ""

    lines = []
    for citation in citations:
        # Format: "- [full_line_content] @ [line_number]"
        formatted_line = f"- {citation.full_line} @ [{citation.line_number}]"
        lines.append(formatted_line)

    return "\n".join(lines) + "\n"


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
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"   ❌ Error saving URL registry: {e}")
        return False


def process_markdown_file(
    md_file: Path,
    output_dir: Path,
    all_urls: List[URLEntry]
) -> ProcessingResult:
    """
    Process a single markdown file and extract citations and URLs.

    Args:
        md_file: Path to markdown file to process
        output_dir: Directory where output file will be saved
        all_urls: List to append extracted URLs to

    Returns:
        ProcessingResult with processing details
    """
    try:
        # Read the markdown file
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract citations
        citations = extract_citations_from_content(content)

        # Extract URLs
        source_name = md_file.stem
        urls = extract_urls_from_content(content, source_name)
        all_urls.extend(urls)

        # Write citations file if citations found
        output_file = None
        if citations:
            section_name = md_file.stem
            output_file = output_dir / f"{section_name}.ctcr.md"
            formatted_output = format_citations_output(citations)
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(formatted_output)

        return ProcessingResult(
            file_path=md_file,
            citations_found=len(citations),
            urls_found=len(urls),
            output_file=output_file,
            success=True
        )

    except Exception as e:
        return ProcessingResult(
            file_path=md_file,
            citations_found=0,
            urls_found=0,
            output_file=None,
            success=False,
            error_message=str(e)
        )


def compile_data(markdown_dir: Path, output_dir: Path) -> bool:
    """
    Compile data from all markdown files: citations and URL hyperlinks.

    Args:
        markdown_dir: Directory containing markdown files
        output_dir: Directory for output files

    Returns:
        True if processing completed successfully, False otherwise
    """
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find all markdown files
    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("⚠️  No generated markdown files found")
        print("💡 Tip: Run 'make compile-all' first to generate files")
        return True

    # Process each file
    results = []
    all_urls: List[URLEntry] = []

    for md_file in md_files:
        print(f"   📝 Processing: {md_file.name}")
        result = process_markdown_file(md_file, output_dir, all_urls)
        results.append(result)

        if result.success:
            status_parts = []
            if result.citations_found > 0:
                status_parts.append(f"{result.citations_found} citations")
            if result.urls_found > 0:
                status_parts.append(f"{result.urls_found} URLs")

            if status_parts:
                print(f"   ✅ Found: {', '.join(status_parts)}")
            else:
                print(f"   ⚠️  No citations or URLs found")
        else:
            print(f"   ❌ Error: {result.error_message}")

    # Build and save URL registry
    if all_urls:
        print(f"\n📊 Building URL registry...")
        registry = build_url_registry(all_urls)
        registry_path = output_dir / "url-registry.json"

        if save_url_registry(registry, registry_path):
            print(f"   ✅ URL registry saved: {registry_path.name}")
            print(f"      Total URLs: {registry['metadata']['totalURLs']}")
            print(f"      Unique URLs: {registry['metadata']['totalUniqueURLs']}")
            if registry['duplicates']:
                print(f"      Duplicate URLs: {len(registry['duplicates'])}")
            if registry['warnings']:
                print(f"      Warnings: {len(registry['warnings'])}")
        else:
            print(f"   ❌ Failed to save URL registry")
    else:
        print(f"\n⚠️  No URL hyperlinks found in any file")

    # Summary statistics
    total_files = len(results)
    successful_files = sum(1 for r in results if r.success)
    files_with_citations = sum(1 for r in results if r.success and r.citations_found > 0)
    files_with_urls = sum(1 for r in results if r.success and r.urls_found > 0)
    total_citations = sum(r.citations_found for r in results if r.success)
    total_urls = sum(r.urls_found for r in results if r.success)
    failed_files = total_files - successful_files

    print(f"\n📊 Processing Summary:")
    print(f"   📄 Files processed: {total_files}")
    print(f"   ✅ Successfully processed: {successful_files}")
    print(f"   📝 Files with citations: {files_with_citations}")
    print(f"   🔗 Files with URLs: {files_with_urls}")
    print(f"   📖 Total citations extracted: {total_citations}")
    print(f"   🌐 Total URLs extracted: {total_urls}")

    if failed_files > 0:
        print(f"   ❌ Failed files: {failed_files}")
        return False

    print(f"✅ Compiled data from {total_files} markdown files")
    return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Compile data from markdown files: citations, cross-references, and URL hyperlinks"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to process"
    )
    parser.add_argument(
        "output_dir",
        type=Path,
        help="Directory where extracted data files will be saved"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    print("📊 Compiling data: citations, cross-references, and URL hyperlinks...")

    # Process files
    if compile_data(args.markdown_dir, args.output_dir):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some errors occurred


if __name__ == "__main__":
    main()
