#!/usr/bin/env python3
"""
Scan markdown files and generate data registries.

This script scans generated markdown files and produces JSON registries for:
- Cross-reference anchors and references
- External hyperlinks
- Citations (Chicago author-date format)

Usage:
    python scan-book.py <book_id> --config <config_file> [--verbose]

Arguments:
    book_id:        Book identifier (libro1 or libro2)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python scan-book.py libro1 --config build.config.json
    python scan-book.py libro2 --config build.config.json --verbose

Output:
    Creates in generated/{book}/data/:
    - crossref-registry.json: Anchor definitions and references
    - hyperlink-registry.json: External URL links
    - citation-registry.json: Author-date citations
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, NamedTuple, Optional

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    ensure_output_dirs,
    BookConfig,
    Config
)


# =============================================================================
# Data Structures
# =============================================================================

class AnchorInfo(NamedTuple):
    """Information about an anchor definition."""
    anchor_id: str
    file: str
    line: int
    heading: Optional[str]


class ReferenceInfo(NamedTuple):
    """Information about an internal reference."""
    target: str
    file: str
    line: int
    text: str


class HyperlinkInfo(NamedTuple):
    """Information about an external hyperlink."""
    url: str
    text: str
    file: str
    line: int


class CitationInfo(NamedTuple):
    """Information about a citation."""
    key: str
    file: str
    line: int
    context: str


# =============================================================================
# Regex Patterns
# =============================================================================

# Anchor definitions: {#anchor-id}
ANCHOR_PATTERN = re.compile(r'\{#([a-zA-Z0-9_-]+)\}')

# Heading with anchor: # Title {#anchor-id}
HEADING_WITH_ANCHOR = re.compile(r'^(#{1,6})\s+(.+?)\s*\{#([a-zA-Z0-9_-]+)\}\s*$')

# Internal links: [text](#anchor-id)
INTERNAL_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\(#([a-zA-Z0-9_-]+)\)')

# External URLs: [text](https://...) or [text](http://...)
EXTERNAL_URL_PATTERN = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')

# Chicago author-date: (Author, Year) or (Author Year) or (Author et al., Year)
# Matches: (Text, ####) where #### is a 4-digit year
CHICAGO_AUTHOR_DATE = re.compile(
    r'\(([A-Za-záéíóúñÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s\-&]+?),?\s+(\d{4}[a-z]?)(?:,\s*(?:p\.|pp\.)?\s*\d+(?:-\d+)?)?\)'
)

# Footnote references: [^1], [^note-name]
FOOTNOTE_REF_PATTERN = re.compile(r'\[\^([^\]]+)\]')


# =============================================================================
# Scanning Functions
# =============================================================================

def scan_anchors(content: str, filename: str) -> List[AnchorInfo]:
    """
    Scan content for anchor definitions.

    Args:
        content: File content
        filename: Source filename

    Returns:
        List of AnchorInfo objects
    """
    anchors = []
    lines = content.split('\n')

    for line_num, line in enumerate(lines, 1):
        # Check for heading with anchor
        heading_match = HEADING_WITH_ANCHOR.match(line)
        if heading_match:
            heading_text = heading_match.group(2).strip()
            anchor_id = heading_match.group(3)
            anchors.append(AnchorInfo(
                anchor_id=anchor_id,
                file=filename,
                line=line_num,
                heading=heading_text
            ))
            continue

        # Check for standalone anchors
        for match in ANCHOR_PATTERN.finditer(line):
            anchor_id = match.group(1)
            # Get context (the line content)
            context = line.strip()
            # Try to extract heading if this is a heading line
            heading_match = re.match(r'^#+\s+(.+)', context)
            heading = heading_match.group(1).rstrip() if heading_match else None

            anchors.append(AnchorInfo(
                anchor_id=anchor_id,
                file=filename,
                line=line_num,
                heading=heading
            ))

    return anchors


def scan_references(content: str, filename: str) -> List[ReferenceInfo]:
    """
    Scan content for internal cross-references.

    Args:
        content: File content
        filename: Source filename

    Returns:
        List of ReferenceInfo objects
    """
    references = []
    lines = content.split('\n')

    for line_num, line in enumerate(lines, 1):
        for match in INTERNAL_LINK_PATTERN.finditer(line):
            link_text = match.group(1)
            target = match.group(2)
            references.append(ReferenceInfo(
                target=f"#{target}",
                file=filename,
                line=line_num,
                text=link_text
            ))

    return references


def scan_hyperlinks(content: str, filename: str) -> List[HyperlinkInfo]:
    """
    Scan content for external hyperlinks.

    Args:
        content: File content
        filename: Source filename

    Returns:
        List of HyperlinkInfo objects
    """
    hyperlinks = []
    lines = content.split('\n')

    for line_num, line in enumerate(lines, 1):
        for match in EXTERNAL_URL_PATTERN.finditer(line):
            link_text = match.group(1)
            url = match.group(2)
            hyperlinks.append(HyperlinkInfo(
                url=url,
                text=link_text,
                file=filename,
                line=line_num
            ))

    return hyperlinks


def scan_citations(content: str, filename: str) -> List[CitationInfo]:
    """
    Scan content for Chicago author-date citations.

    Args:
        content: File content
        filename: Source filename

    Returns:
        List of CitationInfo objects
    """
    citations = []
    lines = content.split('\n')

    for line_num, line in enumerate(lines, 1):
        for match in CHICAGO_AUTHOR_DATE.finditer(line):
            author = match.group(1).strip()
            year = match.group(2)
            key = f"{author}, {year}"

            # Get context (surrounding text)
            start = max(0, match.start() - 30)
            end = min(len(line), match.end() + 30)
            context = line[start:end]
            if start > 0:
                context = "..." + context
            if end < len(line):
                context = context + "..."

            citations.append(CitationInfo(
                key=key,
                file=filename,
                line=line_num,
                context=context.strip()
            ))

    return citations


# =============================================================================
# Registry Building
# =============================================================================

def build_crossref_registry(
    anchors: List[AnchorInfo],
    references: List[ReferenceInfo]
) -> Dict[str, Any]:
    """
    Build cross-reference registry from scanned data.

    Args:
        anchors: List of anchor definitions
        references: List of internal references

    Returns:
        Registry dictionary for JSON output
    """
    anchors_dict = {}
    for anchor in anchors:
        anchors_dict[anchor.anchor_id] = {
            "file": anchor.file,
            "line": anchor.line,
            "heading": anchor.heading
        }

    references_list = []
    for ref in references:
        references_list.append({
            "target": ref.target,
            "file": ref.file,
            "line": ref.line,
            "text": ref.text
        })

    return {
        "anchors": anchors_dict,
        "references": references_list,
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_anchors": len(anchors),
            "total_references": len(references)
        }
    }


def build_hyperlink_registry(hyperlinks: List[HyperlinkInfo]) -> Dict[str, Any]:
    """
    Build hyperlink registry from scanned data.

    Args:
        hyperlinks: List of hyperlinks

    Returns:
        Registry dictionary for JSON output
    """
    # Track unique URLs and duplicates
    url_map: Dict[str, List[HyperlinkInfo]] = {}
    for link in hyperlinks:
        if link.url not in url_map:
            url_map[link.url] = []
        url_map[link.url].append(link)

    urls_list = []
    duplicates_list = []
    warnings_list = []

    for url, entries in url_map.items():
        first = entries[0]
        urls_list.append({
            "url": url,
            "text": first.text,
            "file": first.file,
            "line": first.line
        })

        # Track duplicates
        if len(entries) > 1:
            duplicates_list.append({
                "url": url,
                "occurrences": len(entries),
                "locations": [
                    {"file": e.file, "line": e.line, "text": e.text}
                    for e in entries
                ]
            })

        # Check for HTTP (not HTTPS)
        if url.startswith("http://"):
            warnings_list.append({
                "type": "insecure_url",
                "url": url,
                "file": first.file,
                "line": first.line,
                "message": "URL uses HTTP instead of HTTPS"
            })

    return {
        "urls": urls_list,
        "duplicates": duplicates_list,
        "warnings": warnings_list,
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_urls": len(hyperlinks),
            "unique_urls": len(url_map)
        }
    }


def build_citation_registry(citations: List[CitationInfo]) -> Dict[str, Any]:
    """
    Build citation registry from scanned data.

    Args:
        citations: List of citations

    Returns:
        Registry dictionary for JSON output
    """
    citations_list = []
    for citation in citations:
        citations_list.append({
            "key": citation.key,
            "file": citation.file,
            "line": citation.line,
            "context": citation.context
        })

    # Count unique citations
    unique_keys = set(c.key for c in citations)

    return {
        "citations": citations_list,
        "format": "chicago-author-date",
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_citations": len(citations),
            "unique_citations": len(unique_keys)
        }
    }


# =============================================================================
# Main Scanning Function
# =============================================================================

def scan_book(
    book_id: str,
    config: Config,
    verbose: bool = False
) -> bool:
    """
    Scan all markdown files for a book and generate registries.

    Args:
        book_id: Book identifier
        config: Configuration object
        verbose: Enable verbose output

    Returns:
        True if scanning completed successfully
    """
    # Get book configuration
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"Scanning {book_config.title} ({book_id})...")

    # Ensure output directories exist
    ensure_output_dirs(book_config)

    # Find markdown files
    markdown_dir = book_config.output.markdown
    data_dir = book_config.output.data

    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("  No markdown files found in generated directory")
        print("  Tip: Run merge first to generate markdown files")
        return True

    print(f"  Scanning {len(md_files)} files...")

    # Collect all data
    all_anchors: List[AnchorInfo] = []
    all_references: List[ReferenceInfo] = []
    all_hyperlinks: List[HyperlinkInfo] = []
    all_citations: List[CitationInfo] = []

    for md_file in md_files:
        if verbose:
            print(f"    Scanning: {md_file.name}")

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            filename = md_file.stem

            # Scan for each type
            anchors = scan_anchors(content, filename)
            references = scan_references(content, filename)
            hyperlinks = scan_hyperlinks(content, filename)
            citations = scan_citations(content, filename)

            all_anchors.extend(anchors)
            all_references.extend(references)
            all_hyperlinks.extend(hyperlinks)
            all_citations.extend(citations)

            if verbose:
                parts = []
                if anchors:
                    parts.append(f"{len(anchors)} anchors")
                if references:
                    parts.append(f"{len(references)} refs")
                if hyperlinks:
                    parts.append(f"{len(hyperlinks)} urls")
                if citations:
                    parts.append(f"{len(citations)} cites")
                if parts:
                    print(f"      Found: {', '.join(parts)}")

        except Exception as e:
            print(f"    Error reading {md_file.name}: {e}")
            continue

    # Build and save registries
    print("\n  Building registries...")

    # Cross-reference registry
    crossref_registry = build_crossref_registry(all_anchors, all_references)
    crossref_file = data_dir / "crossref-registry.json"
    with open(crossref_file, 'w', encoding='utf-8') as f:
        json.dump(crossref_registry, f, indent=2, ensure_ascii=False)
    print(f"    Cross-refs: {len(all_anchors)} anchors, {len(all_references)} references")

    # Hyperlink registry
    hyperlink_registry = build_hyperlink_registry(all_hyperlinks)
    hyperlink_file = data_dir / "hyperlink-registry.json"
    with open(hyperlink_file, 'w', encoding='utf-8') as f:
        json.dump(hyperlink_registry, f, indent=2, ensure_ascii=False)
    print(f"    Hyperlinks: {hyperlink_registry['metadata']['unique_urls']} unique URLs")

    # Citation registry
    citation_registry = build_citation_registry(all_citations)
    citation_file = data_dir / "citation-registry.json"
    with open(citation_file, 'w', encoding='utf-8') as f:
        json.dump(citation_registry, f, indent=2, ensure_ascii=False)
    print(f"    Citations: {citation_registry['metadata']['unique_citations']} unique citations")

    # Report warnings
    if hyperlink_registry['warnings']:
        print(f"\n  Warnings ({len(hyperlink_registry['warnings'])}):")
        for warning in hyperlink_registry['warnings'][:5]:  # Show first 5
            print(f"    {warning['file']}:{warning['line']}: {warning['message']}")
        if len(hyperlink_registry['warnings']) > 5:
            print(f"    ... and {len(hyperlink_registry['warnings']) - 5} more")

    print(f"\n  Scan complete for {book_id}")
    print(f"  Registries saved to: {data_dir}")
    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Scan markdown files and generate data registries",
        main_func=scan_book,
    )
