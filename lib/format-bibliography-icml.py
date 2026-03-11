#!/usr/bin/env python3
"""
Script to format bibliography ICML files by replacing paragraph styles.

This script performs the following replacements:
* "Paragraph" -> "Paragraph Bibliography"
* "ParagraphStyle/Paragraph" -> "ParagraphStyle/Paragraph Bibliography"

Usage (new mode - preferred):
    python3 lib/format-bibliography-icml.py libro1 [--config build.config.json]
    python3 lib/format-bibliography-icml.py libro2

Usage (legacy mode - still supported):
    python3 lib/format-bibliography-icml.py /path/to/file.icml

The new mode reads configuration from build.config.json to locate the
bibliography ICML file for the specified book.
"""

import sys
import os
from pathlib import Path
from typing import Optional, Tuple

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))

from config import load_config, get_book_config, find_project_root

def format_bibliography_icml(file_path: str, style_name: str = "Paragraph Bibliography") -> bool:
    """
    Format the bibliography ICML file by replacing paragraph styles.

    Args:
        file_path: Path to the ICML file to process
        style_name: Target bibliography style name

    Returns:
        True if successful, False otherwise
    """
    try:
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' does not exist.")
            return False

        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        original_content = content

        # Replace "ParagraphStyle/Paragraph" first to avoid conflicts
        content = content.replace("ParagraphStyle/Paragraph", f"ParagraphStyle/{style_name}")

        # Then replace standalone "Paragraph"
        content = content.replace('"Paragraph"', f'"{style_name}"')

        if content == original_content:
            print(f"No changes needed in '{file_path}'.")
            return True

        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)

        print(f"Successfully processed '{file_path}'.")
        print(f"Applied style: {style_name}")
        return True

    except Exception as e:
        print(f"Error processing file '{file_path}': {str(e)}")
        return False


def resolve_bibliography_path(book_id: str, config_path: Optional[Path] = None) -> Tuple[Path, str]:
    """
    Resolve the path to the bibliography ICML file for a book.

    Uses the config module to load and parse build.config.json.

    Args:
        book_id: Book identifier (libro1 or libro2)
        config_path: Optional path to build.config.json

    Returns:
        Tuple of (path to bibliography ICML file, bibliography style name)

    Raises:
        FileNotFoundError: If config file not found
        KeyError: If book_id not in configuration
    """
    config = load_config(config_path)
    book_config = get_book_config(config, book_id)

    # Determine bibliography file name from InDesign config
    bibliography_file = None
    if book_config.indesign:
        bibliography_file = book_config.indesign.bibliography_file

    if not bibliography_file:
        # Fallback: search in paratextuales list
        for para in book_config.paratextuales:
            if 'BIBLIOGRAFIA' in para.upper():
                bibliography_file = para
                break
        if not bibliography_file:
            bibliography_file = f"{book_config.prefix}_BIBLIOGRAFIA"

    icml_path = book_config.output.icml / f"{bibliography_file}.icml"

    # Use global bibliography style from config
    style_name = config.indesign.bibliography_style

    return icml_path, style_name


def is_book_id(arg: str, config) -> bool:
    """Check if an argument is a book ID rather than a file path."""
    return arg in config.books


def _format_bibliography_cli(book_id, config, target=None, verbose=False, **kwargs):
    """CLI wrapper that supports both book ID and legacy file path modes."""
    # The 'book' positional arg from run_cli contains the target (book ID or file path)
    actual_target = book_id

    if is_book_id(actual_target, config):
        # Book ID mode: resolve from configuration
        if verbose:
            print(f"Resolving bibliography path for: {actual_target}")

        file_path, style_name = resolve_bibliography_path(actual_target, None)

        if verbose:
            print(f"Bibliography ICML: {file_path}")
            print(f"Style to apply: {style_name}")

        file_path_str = str(file_path)

    else:
        # Legacy mode: direct file path
        file_path_str = actual_target
        style_name = "Paragraph Bibliography"

        # Handle relative paths
        if not os.path.isabs(file_path_str):
            try:
                project_root = find_project_root()
                file_path_str = str(project_root / file_path_str)
            except FileNotFoundError:
                pass  # Use path as-is

    return format_bibliography_icml(file_path_str, style_name)


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Format bibliography ICML files by replacing paragraph styles",
        main_func=_format_bibliography_cli,
    )
