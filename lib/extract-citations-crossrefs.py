#!/usr/bin/env python3
"""
Extract citations and cross-references from markdown files.

This script scans markdown files for citations (parenthetical references) and
extracts them with line numbers for further analysis and processing.

Usage:
    python extract-citations-crossrefs.py <markdown_dir> <output_dir>

Arguments:
    markdown_dir: Directory containing markdown files to process
    output_dir:   Directory where extracted citation files will be saved

Example:
    python extract-citations-crossrefs.py generated/markdown generated/data

Output:
    Creates .ctcr.md files for each processed markdown file containing:
    - Citations with line numbers
    - Cross-references and parenthetical content
    - Formatted as: "- [content] @ [line_number]"

Exit codes:
    0: Processing completed successfully
    1: Error occurred during processing
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, NamedTuple, Optional


class Citation(NamedTuple):
    """Represents a citation with its context."""
    line_number: int
    content: str
    full_line: str


class ProcessingResult(NamedTuple):
    """Results of processing a single file."""
    file_path: Path
    citations_found: int
    output_file: Optional[Path]
    success: bool
    error_message: Optional[str] = None


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

    # Pattern to match parenthetical content that's likely a citation
    # Matches: (some text) but excludes: (), (.), (,), etc.
    citation_pattern = re.compile(r'\([^)]*[a-zA-Z0-9][^)]*\)')

    for line_num, line in enumerate(content.splitlines(), 1):
        matches = citation_pattern.findall(line)
        for match in matches:
            # Filter out very short or clearly non-citation parentheses
            if len(match.strip('()')) > 1:
                citations.append(Citation(
                    line_number=line_num,
                    content=match,
                    full_line=line.strip()
                ))

    return citations


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


def process_markdown_file(md_file: Path, output_dir: Path) -> ProcessingResult:
    """
    Process a single markdown file and extract citations.

    Args:
        md_file: Path to markdown file to process
        output_dir: Directory where output file will be saved

    Returns:
        ProcessingResult with processing details
    """
    try:
        # Read the markdown file
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract citations
        citations = extract_citations_from_content(content)

        if not citations:
            return ProcessingResult(
                file_path=md_file,
                citations_found=0,
                output_file=None,
                success=True
            )

        # Create output file path
        section_name = md_file.stem
        output_file = output_dir / f"{section_name}.ctcr.md"

        # Format and write citations
        formatted_output = format_citations_output(citations)

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(formatted_output)

        return ProcessingResult(
            file_path=md_file,
            citations_found=len(citations),
            output_file=output_file,
            success=True
        )

    except Exception as e:
        return ProcessingResult(
            file_path=md_file,
            citations_found=0,
            output_file=None,
            success=False,
            error_message=str(e)
        )


def extract_citations_and_crossrefs(markdown_dir: Path, output_dir: Path) -> bool:
    """
    Extract citations and cross-references from all markdown files.

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
    for md_file in md_files:
        print(f"   📝 Processing: {md_file.name}")
        result = process_markdown_file(md_file, output_dir)
        results.append(result)

        if result.success:
            if result.citations_found > 0:
                print(f"   ✅ Extracted citations to: {result.output_file.name}")
            else:
                print(f"   ⚠️  No citations found in: {md_file.name}")
        else:
            print(f"   ❌ Error processing {md_file.name}: {result.error_message}")

    # Summary statistics
    total_files = len(results)
    successful_files = sum(1 for r in results if r.success)
    files_with_citations = sum(1 for r in results if r.success and r.citations_found > 0)
    total_citations = sum(r.citations_found for r in results if r.success)
    failed_files = total_files - successful_files

    print(f"\n📊 Processing Summary:")
    print(f"   📄 Files processed: {total_files}")
    print(f"   ✅ Successfully processed: {successful_files}")
    print(f"   📝 Files with citations: {files_with_citations}")
    print(f"   🔗 Total citations extracted: {total_citations}")

    if failed_files > 0:
        print(f"   ❌ Failed files: {failed_files}")
        return False

    print(f"✅ Processed {total_files} markdown files, extracted data from {files_with_citations} files")
    return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Extract citations and cross-references from markdown files"
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

    print("📊 Extracting citations and cross-references...")

    # Process files
    if extract_citations_and_crossrefs(args.markdown_dir, args.output_dir):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some errors occurred


if __name__ == "__main__":
    main()