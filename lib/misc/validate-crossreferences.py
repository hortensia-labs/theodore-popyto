#!/usr/bin/env python3
"""
Validate internal cross-references against anchor registry.

This script scans markdown files for internal links [...](#anchor-id) and validates
that all referenced anchors exist in the cross-reference registry.

Usage:
    python validate-crossreferences.py <markdown_dir> <registry_file>

Arguments:
    markdown_dir: Directory containing markdown files to validate
    registry_file: Path to the JSON anchor registry file

Example:
    python validate-crossreferences.py generated/markdown generated/data/crossref-registry.json

Exit codes:
    0: All cross-references are valid
    1: Invalid cross-references found or other errors
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, NamedTuple, Set


class InvalidReference(NamedTuple):
    """Represents an invalid cross-reference."""
    file_path: Path
    line_number: int
    anchor: str
    link_text: str


def load_registry(registry_file: Path) -> Dict[str, str]:
    """
    Load the anchor registry from JSON file.

    Args:
        registry_file: Path to the registry JSON file

    Returns:
        Dictionary mapping anchor IDs to section names

    Raises:
        FileNotFoundError: If registry file doesn't exist
        json.JSONDecodeError: If registry file is invalid JSON
    """
    try:
        with open(registry_file, 'r', encoding='utf-8') as f:
            registry = json.load(f)

        if 'anchors' not in registry:
            raise ValueError("Registry file missing 'anchors' key")

        return registry['anchors']

    except Exception as e:
        print(f"❌ Error loading registry file {registry_file}: {e}")
        raise


def find_internal_links(content: str) -> List[tuple]:
    """
    Find all internal links in markdown content.

    Args:
        content: Markdown content to search

    Returns:
        List of tuples: (line_number, link_text, anchor)
    """
    # Pattern to match internal links: [text](#anchor-id)
    # Captures the link text and anchor ID
    link_pattern = re.compile(r'\[([^\]]+)\]\(#([a-zA-Z0-9_-]+)\)')

    links = []
    for line_num, line in enumerate(content.splitlines(), 1):
        matches = link_pattern.findall(line)
        for link_text, anchor in matches:
            links.append((line_num, link_text, anchor))

    return links


def validate_references(markdown_dir: Path, registry_file: Path) -> bool:
    """
    Validate all cross-references in markdown files.

    Args:
        markdown_dir: Directory containing markdown files
        registry_file: Path to anchor registry JSON file

    Returns:
        True if all references are valid, False otherwise
    """
    # Load the anchor registry
    try:
        anchors = load_registry(registry_file)
    except Exception:
        return False

    print(f"📊 Loaded registry with {len(anchors)} anchors")

    # Find all markdown files
    md_files = sorted(markdown_dir.glob('*.md'))
    if not md_files:
        print("⚠️  No markdown files found")
        return True

    invalid_references: List[InvalidReference] = []
    total_references = 0

    # Process each markdown file
    for md_file in md_files:
        print(f"   🔍 Validating: {md_file.name}")

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"❌ Error reading {md_file}: {e}")
            continue

        # Find internal links in this file
        links = find_internal_links(content)
        total_references += len(links)

        # Check each link against the registry
        for line_num, link_text, anchor in links:
            if anchor not in anchors:
                invalid_references.append(InvalidReference(
                    file_path=md_file,
                    line_number=line_num,
                    anchor=anchor,
                    link_text=link_text
                ))

    # Report results
    print(f"\n📈 Validation Summary:")
    print(f"   📄 Files processed: {len(md_files)}")
    print(f"   🔗 Total references: {total_references}")
    print(f"   ❌ Invalid references: {len(invalid_references)}")

    if invalid_references:
        print(f"\n❌ Invalid Cross-References Found:")
        print("=" * 50)

        # Group by file for better readability
        current_file = None
        for ref in sorted(invalid_references, key=lambda x: (x.file_path, x.line_number)):
            if ref.file_path != current_file:
                current_file = ref.file_path
                print(f"\n📄 {ref.file_path.name}:")

            print(f"   Line {ref.line_number}: [{ref.link_text}](#{ref.anchor})")
            print(f"   ❌ Anchor '#{ref.anchor}' not found in registry")

        print(f"\n💡 Tip: Run 'make scan-ref' to rebuild the anchor registry")
        return False

    else:
        print("✅ All cross-references are valid!")
        return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate internal cross-references against anchor registry"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to validate"
    )
    parser.add_argument(
        "registry_file",
        type=Path,
        help="Path to the JSON anchor registry file"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    # Validate registry file
    if not args.registry_file.exists():
        print(f"❌ Error: Registry file not found: {args.registry_file}")
        print("💡 Tip: Run 'make scan-ref' to generate the registry")
        sys.exit(1)

    print("🔗 Validating cross-references...")

    # Perform validation
    if validate_references(args.markdown_dir, args.registry_file):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Validation failed


if __name__ == "__main__":
    main()