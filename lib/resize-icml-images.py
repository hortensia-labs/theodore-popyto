#!/usr/bin/env python3
"""
Resize anchored images in existing ICML files.

Reads imageSettings from build.config.json and rewrites Rectangle/Image
geometry in already-compiled ICML files, without re-running Pandoc.

Usage:
    python resize-icml-images.py <book_id> [--config <config_file>] [--verbose]

Arguments:
    book_id:        Book identifier (e.g. phdbook)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python resize-icml-images.py phdbook
    python resize-icml-images.py phdbook --config build.config.json --verbose
"""

import sys
import time
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    BookConfig,
    Config,
)
from icml_images import resize_anchored_images
from utils import format_time


def resize_book_images(
    book_id: str,
    config: Config,
    verbose: bool = False,
) -> bool:
    """
    Resize anchored images in all ICML files for a book.

    Args:
        book_id: Book identifier
        config: Configuration object
        verbose: Enable verbose output

    Returns:
        True if all files processed successfully
    """
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    if not book_config.image_settings:
        print(f"No image settings configured for {book_id}.")
        return True

    icml_dir = book_config.output.icml

    if not icml_dir.exists():
        print(f"Error: ICML directory not found: {icml_dir}")
        print(f"  Tip: Run 'just icml {book_id}' first to generate ICML files.")
        return False

    image_settings = book_config.image_settings
    print(f"Resizing anchored images for {book_config.title} ({book_id})...")
    print(f"  ICML directory: {icml_dir}")
    print(f"  Default maxWidth: {image_settings.defaults.max_width} pt")
    print(f"  Fit mode: {image_settings.defaults.fit_mode}")

    if image_settings.overrides:
        print(f"  Per-image overrides: {len(image_settings.overrides)}")
        if verbose:
            for stem, ovr in image_settings.overrides.items():
                parts = []
                if ovr.width is not None:
                    parts.append(f"{ovr.width}×{ovr.height}")
                if ovr.offset_x is not None:
                    parts.append(f"offset=({ovr.offset_x},{ovr.offset_y})")
                print(f"    {stem}: {', '.join(parts) if parts else '(defaults)'}")

    start_time = time.time()
    files_checked = 0
    files_modified = 0
    total_resized = 0
    errors: List[str] = []

    for icml_file in sorted(icml_dir.glob('*.icml')):
        files_checked += 1

        try:
            with open(icml_file, 'r', encoding='utf-8') as f:
                content = f.read()

            content, resized = resize_anchored_images(content, image_settings)

            if resized > 0:
                with open(icml_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_modified += 1
                total_resized += resized

                if verbose:
                    print(f"  [{resized} image(s)] {icml_file.name}")
            else:
                if verbose:
                    print(f"  [no images] {icml_file.name}")

        except Exception as e:
            error_msg = f"{icml_file.name}: {e}"
            errors.append(error_msg)
            print(f"  Error: {error_msg}")

    elapsed = time.time() - start_time

    print(f"\n  Results:")
    print(f"    Files checked: {files_checked}")
    print(f"    Files modified: {files_modified}")
    print(f"    Images resized: {total_resized}")
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
        description="Resize anchored images in ICML files",
        main_func=resize_book_images,
    )
