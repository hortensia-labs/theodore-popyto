#!/usr/bin/env python3
"""
Apply custom paragraph style mappings to existing ICML files.

This script reads style mappings from build.config.json and applies
them to already-compiled ICML files, without re-running Pandoc.

Useful for applying or re-applying style changes after the ICML files
have already been generated.

Usage:
    python restyle-icml.py <book_id> [--config <config_file>] [--verbose]

Arguments:
    book_id:        Book identifier (libro1 or libro2)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python restyle-icml.py libro1
    python restyle-icml.py libro2 --config build.config.json --verbose
"""

import sys
import time
from pathlib import Path
from typing import List

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    BookConfig,
    Config,
    FileStyleMapping
)
from icml_styles import (
    apply_custom_style_mappings,
    get_mappings_for_file
)
from utils import format_time


def restyle_book(
    book_id: str,
    config: Config,
    verbose: bool = False
) -> bool:
    """
    Apply custom style mappings to all ICML files for a book.

    Args:
        book_id: Book identifier
        config: Configuration object
        verbose: Enable verbose output

    Returns:
        True if all files processed successfully
    """
    # Get book configuration
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    if not book_config.style_mappings:
        print(f"No custom style mappings configured for {book_id}.")
        return True

    icml_dir = book_config.output.icml

    if not icml_dir.exists():
        print(f"Error: ICML directory not found: {icml_dir}")
        print("  Tip: Run 'just icml {book_id}' first to generate ICML files.")
        return False

    print(f"Applying custom style mappings for {book_config.title} ({book_id})...")
    print(f"  ICML directory: {icml_dir}")
    print(f"  Configured mappings: {len(book_config.style_mappings)} file(s)")

    if verbose:
        for fm in book_config.style_mappings:
            print(f"    {fm.file}: {len(fm.mappings)} mapping(s)")
            for m in fm.mappings:
                print(f"      {m.source} -> {m.target}")

    start_time = time.time()
    files_processed = 0
    files_changed = 0
    total_changes = 0
    errors: List[str] = []

    # Iterate over ICML files
    for icml_file in sorted(icml_dir.glob('*.icml')):
        section_name = icml_file.stem
        mappings = get_mappings_for_file(section_name, book_config.style_mappings)

        if not mappings:
            continue

        files_processed += 1

        try:
            with open(icml_file, 'r', encoding='utf-8') as f:
                content = f.read()

            content, changes = apply_custom_style_mappings(content, mappings)

            if changes > 0:
                with open(icml_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_changed += 1
                total_changes += changes

                if verbose:
                    print(f"  [{changes} change(s)] {icml_file.name}")
            else:
                if verbose:
                    print(f"  [no changes] {icml_file.name}")

        except Exception as e:
            error_msg = f"{icml_file.name}: {e}"
            errors.append(error_msg)
            print(f"  Error: {error_msg}")

    elapsed = time.time() - start_time

    # Report results
    print(f"\n  Results:")
    print(f"    Files checked: {files_processed}")
    print(f"    Files modified: {files_changed}")
    print(f"    Total style changes: {total_changes}")
    print(f"    Time: {format_time(elapsed)}")

    if errors:
        print(f"\n  Errors ({len(errors)}):")
        for err in errors:
            print(f"    {err}")
        return False

    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Apply custom paragraph style mappings to ICML files",
        main_func=restyle_book,
    )
