#!/usr/bin/env python3
"""
Scan markdown files and build anchor registry for cross-references.

This script scans markdown files for anchor patterns {#anchor-id} and builds
a JSON registry mapping anchors to their containing sections.

Usage:
    python scan-crossreference-destinations.py <markdown_dir> <output_file>

Arguments:
    markdown_dir: Directory containing markdown files to scan
    output_file:  Path where the JSON registry will be saved

Example:
    python scan-crossreference-destinations.py generated/markdown generated/data/crossref-registry.json
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict


def scan_anchors(markdown_dir: Path, output_file: Path) -> None:
    """
    Scan markdown files for anchors and build registry.

    Args:
        markdown_dir: Directory containing generated markdown files
        output_file: Output path for the JSON registry
    """
    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Pattern to match anchor definitions: {#anchor-id}
    anchor_pattern = re.compile(r'\{#([a-zA-Z0-9_-]+)\}')

    anchors: Dict[str, str] = {}
    anchor_count = 0

    # Process all .md files in the markdown directory
    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("⚠️  No markdown files found in generated markdown directory")
        print("💡 Tip: Run 'make compile-all' first to generate files")

    for md_file in md_files:
        section_name = md_file.stem  # filename without extension
        print(f"   📝 Scanning: {md_file.name}")

        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Find all anchor matches in the file
            matches = anchor_pattern.findall(content)

            for anchor in matches:
                anchors[anchor] = section_name
                anchor_count += 1

        except Exception as e:
            print(f"❌ Error reading {md_file}: {e}")
            continue

    # Build the registry JSON structure
    registry = {
        "anchors": anchors,
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_anchors": anchor_count
        }
    }

    # Write the registry to file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2, ensure_ascii=False)

        if anchor_count == 0:
            print("⚠️  No anchors found in generated markdown files")
            print("💡 Tip: Make sure markdown files contain {#anchor-id} patterns")
        else:
            print(f"✅ Registry built: {anchor_count} anchors")
            print(f"📄 Registry saved to: {output_file}")

    except Exception as e:
        print(f"❌ Error writing registry file: {e}")
        raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Scan markdown files and build anchor registry for cross-references"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to scan"
    )
    parser.add_argument(
        "output_file",
        type=Path,
        help="Path where the JSON registry will be saved"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    print("🔍 Scanning anchors and building registry...")
    scan_anchors(args.markdown_dir, args.output_file)


if __name__ == "__main__":
    main()