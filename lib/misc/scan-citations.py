#!/usr/bin/env python3
"""
Scan markdown files and extract citations.

This script scans markdown files for APA 7 style parenthetical citations and extracts them
with line numbers and URLs from Zotero mappings for further analysis and processing.

Usage:
    python scan-citations.py <markdown_dir> <output_dir>

Arguments:
    markdown_dir: Directory containing markdown files to process
    output_dir:   Directory where citation registry JSON file will be saved

Example:
    python scan-citations.py generated/markdown generated/data

Output:
    Creates citation-registry.json in the output directory containing:
    - document: source markdown file name
    - line: line number where citation was found
    - citation: the citation text (e.g., "(Author, 2023)")
    - content: the full line content
    - url: matched URL from Zotero mappings (if found)

Exit codes:
    0: Processing completed successfully
    1: Error occurred during processing
    2: Failed to fetch Zotero mappings
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import List, Dict, Optional, Any


# Pattern to match APA 7 style citations: (Author, Year) or (Author et al., Year)
# Matches: (Text, ####) where #### is a 4-digit year
# This captures the entire parenthetical group which may contain multiple citations
CITATION_PATTERN = re.compile(r'\([^)]*?\d{4}[a-z]?(?:\s*;\s*[^)]*?\d{4}[a-z]?)*\)')

# Pattern to split individual citations within a parenthetical group
# Matches: Author, Year (with optional letter suffix)
INDIVIDUAL_CITATION_PATTERN = re.compile(r'([^;]+?,\s*\d{4}[a-z]?)')

# Pattern to match markdown links to exclude them from citation extraction
# Matches: [text](url) or [text](#anchor)
MARKDOWN_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\([^)]+\)')

# Zotero mappings API endpoint
ZOTERO_MAPPINGS_URL = "http://localhost:3000/api/zotero-mappings"


def fetch_zotero_mappings() -> Dict[str, Dict[str, str]]:
    """
    Fetch Zotero URL mappings from the API endpoint.

    Returns:
        Dictionary mapping URLs to citation information
        Format: {url: {key: str, citation: str}}

    Raises:
        Exception if API request fails
    """
    try:
        with urllib.request.urlopen(ZOTERO_MAPPINGS_URL) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except Exception as e:
        raise Exception(f"Failed to fetch Zotero mappings: {e}")


def remove_markdown_links(line: str) -> str:
    """
    Remove markdown link syntax from a line to avoid false citation matches.

    Args:
        line: Line of text potentially containing markdown links

    Returns:
        Line with markdown links removed
    """
    # Replace [text](url) with just the text content
    return MARKDOWN_LINK_PATTERN.sub(r'\1', line)


def normalize_citation(citation: str) -> str:
    """
    Normalize citation text to match Zotero mappings format.

    Converts Spanish "y" to English "&" for author conjunctions.
    Example: (Nonaka y Takeuchi, 1995) -> (Nonaka & Takeuchi, 1995)

    Args:
        citation: Citation text to normalize

    Returns:
        Normalized citation text
    """
    # Replace " y " with " & " (Spanish to English conjunction)
    # Use word boundaries to avoid replacing "y" within author names
    normalized = re.sub(r'\s+y\s+', ' & ', citation)
    return normalized


def extract_citations_from_content(content: str, document_name: str) -> List[Dict[str, Any]]:
    """
    Extract APA 7 style citations from markdown content.

    Looks for parenthetical references matching pattern: (Author, Year)
    Handles multiple citations in the same parentheses: (Author1, Year1; Author2, Year2)
    Excludes citations within markdown link syntax.

    Args:
        content: Markdown content to analyze
        document_name: Name of the source document

    Returns:
        List of citation dictionaries with document, line, citation, and content
    """
    citations = []

    for line_num, line in enumerate(content.splitlines(), 1):
        # Remove markdown links before extracting citations
        clean_line = remove_markdown_links(line)

        # Find all parenthetical citation groups
        matches = CITATION_PATTERN.findall(clean_line)

        for match in matches:
            # Remove outer parentheses
            inner_content = match.strip('()')

            # Check if this contains multiple citations (separated by semicolons)
            if ';' in inner_content:
                # Split by semicolon and process each individual citation
                individual_citations = INDIVIDUAL_CITATION_PATTERN.findall(inner_content)
                for individual_citation in individual_citations:
                    # Reconstruct citation with parentheses
                    formatted_citation = f"({individual_citation.strip()})"
                    citations.append({
                        "document": document_name,
                        "line": line_num,
                        "citation": formatted_citation,
                        "content": line.strip(),
                        "url": None  # Will be populated later
                    })
            else:
                # Single citation - use as is
                citations.append({
                    "document": document_name,
                    "line": line_num,
                    "citation": match,
                    "content": line.strip(),
                    "url": None  # Will be populated later
                })

    return citations


def match_citations_with_urls(citations: List[Dict[str, Any]],
                              zotero_mappings: Dict[str, Dict[str, str]]) -> None:
    """
    Match extracted citations with URLs from Zotero mappings.

    Modifies citations list in-place, adding URL field where matches are found.
    Normalizes citations before matching to handle language differences (e.g., "y" -> "&").

    Args:
        citations: List of citation dictionaries
        zotero_mappings: Dictionary of URL to citation mappings from Zotero
    """
    # Create reverse mapping: citation text -> URL (first match)
    citation_to_url = {}
    for url, mapping in zotero_mappings.items():
        citation_text = mapping.get("citation", "")
        if citation_text and citation_text not in citation_to_url:
            citation_to_url[citation_text] = url

    # Match citations with URLs
    for citation in citations:
        citation_text = citation["citation"]

        # Try exact match first
        if citation_text in citation_to_url:
            citation["url"] = citation_to_url[citation_text]
        else:
            # Try normalized match (converts "y" to "&")
            normalized_citation = normalize_citation(citation_text)
            if normalized_citation in citation_to_url:
                citation["url"] = citation_to_url[normalized_citation]
                # Update the citation text to the normalized version for consistency
                citation["citation"] = normalized_citation


def process_markdown_file(md_file: Path, zotero_mappings: Dict[str, Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Process a single markdown file and extract citations.

    Args:
        md_file: Path to markdown file to process
        zotero_mappings: Zotero URL mappings

    Returns:
        List of citation dictionaries

    Raises:
        Exception if file processing fails
    """
    # Read the markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract citations
    document_name = md_file.stem
    citations = extract_citations_from_content(content, document_name)

    # Match with URLs from Zotero
    match_citations_with_urls(citations, zotero_mappings)

    return citations


def scan_citations(markdown_dir: Path, output_dir: Path) -> bool:
    """
    Scan all markdown files for citations and generate citation registry.

    Args:
        markdown_dir: Directory containing markdown files
        output_dir: Directory for output JSON file

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

    # Fetch Zotero mappings
    print("🔗 Fetching Zotero mappings...")
    try:
        zotero_mappings = fetch_zotero_mappings()
        print(f"   ✅ Loaded {len(zotero_mappings)} URL mappings")
    except Exception as e:
        print(f"   ❌ Error fetching Zotero mappings: {e}")
        print("   ⚠️  Continuing without URL matching")
        zotero_mappings = {}

    # Process each file and collect all citations
    all_citations = []
    failed_files = []

    for md_file in md_files:
        print(f"   📝 Scanning: {md_file.name}")
        try:
            citations = process_markdown_file(md_file, zotero_mappings)
            all_citations.extend(citations)

            if citations:
                matched_urls = sum(1 for c in citations if c.get("url"))
                print(f"   ✅ Found {len(citations)} citations ({matched_urls} with URLs)")
            else:
                print(f"   ⚠️  No citations found")

        except Exception as e:
            print(f"   ❌ Error processing {md_file.name}: {e}")
            failed_files.append(md_file.name)

    # Write citation registry JSON file
    output_file = output_dir / "citation-registry.json"
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_citations, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Citation registry saved to: {output_file}")
    except Exception as e:
        print(f"\n❌ Error writing citation registry: {e}")
        return False

    # Summary statistics
    total_files = len(md_files)
    successful_files = total_files - len(failed_files)
    files_with_citations = len(set(c["document"] for c in all_citations))
    total_citations = len(all_citations)
    citations_with_urls = sum(1 for c in all_citations if c.get("url"))

    print(f"\n📊 Citation Scan Summary:")
    print(f"   📄 Files processed: {total_files}")
    print(f"   ✅ Successfully processed: {successful_files}")
    print(f"   📝 Files with citations: {files_with_citations}")
    print(f"   📖 Total citations extracted: {total_citations}")
    print(f"   🔗 Citations with URLs: {citations_with_urls}")

    if failed_files:
        print(f"   ❌ Failed files: {len(failed_files)}")
        for failed_file in failed_files:
            print(f"      - {failed_file}")
        return False

    print(f"✅ Citation scan complete: {total_citations} citations from {files_with_citations} files")
    return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Scan markdown files and extract citations"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to process"
    )
    parser.add_argument(
        "output_dir",
        type=Path,
        help="Directory where extracted citation files will be saved"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    print("📝 Scanning citations from markdown files...")

    # Process files
    if scan_citations(args.markdown_dir, args.output_dir):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some errors occurred


if __name__ == "__main__":
    main()
