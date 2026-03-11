#!/usr/bin/env python3
"""
Compile markdown files to ICML format using Pandoc.

This script converts markdown files from the generated/markdown directory
to InCopy ICML format, with post-processing for cross-references and styles.

Usage:
    python compile-icml.py <book_id> --config <config_file> [--verbose]

Arguments:
    book_id:        Book identifier (libro1 or libro2)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python compile-icml.py libro1 --config build.config.json
    python compile-icml.py libro2 --config build.config.json --verbose

Features:
    - Parallel markdown to ICML conversion using Pandoc
    - Cross-reference compatibility post-processing
    - Bibliography paragraph style application
    - Glossary definition list style application
"""

import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    ensure_output_dirs,
    get_optimal_workers,
    BookConfig,
    Config
)
from icml_styles import (
    get_pandoc_command,
    apply_crossref_fix,
    apply_bibliography_styling,
    apply_glossary_styling,
    apply_custom_style_mappings,
    get_mappings_for_file,
    normalize_table_widths,
    restore_tabs_from_placeholder
)
from utils import format_time, format_size


@dataclass
class ConversionResult:
    """Result of converting a single file."""
    markdown_file: Path
    icml_file: Path
    success: bool
    processing_time: float
    pandoc_time: float
    postprocess_time: float
    file_size: int
    style_applied: Optional[str] = None
    error_message: Optional[str] = None


def convert_single_file(
    markdown_file: Path,
    icml_dir: Path,
    config: Config,
    book_config: BookConfig
) -> ConversionResult:
    """
    Convert a single markdown file to ICML.

    Args:
        markdown_file: Source markdown file
        icml_dir: Output directory for ICML files
        config: Configuration object
        book_config: Book-specific configuration

    Returns:
        ConversionResult with processing details
    """
    start_time = time.time()
    section_name = markdown_file.stem
    icml_file = icml_dir / f"{section_name}.icml"

    try:
        # Ensure output directory exists
        icml_dir.mkdir(parents=True, exist_ok=True)

        # Phase 1: Pandoc conversion
        pandoc_start = time.time()
        pandoc_cmd = get_pandoc_command(markdown_file, icml_file, config)

        result = subprocess.run(
            pandoc_cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode != 0:
            return ConversionResult(
                markdown_file=markdown_file,
                icml_file=icml_file,
                success=False,
                processing_time=time.time() - start_time,
                pandoc_time=time.time() - pandoc_start,
                postprocess_time=0.0,
                file_size=0,
                error_message=f"Pandoc error: {result.stderr.strip()}"
            )

        pandoc_time = time.time() - pandoc_start

        # Phase 2: Post-processing
        postprocess_start = time.time()

        if not icml_file.exists():
            return ConversionResult(
                markdown_file=markdown_file,
                icml_file=icml_file,
                success=False,
                processing_time=time.time() - start_time,
                pandoc_time=pandoc_time,
                postprocess_time=0.0,
                file_size=0,
                error_message="ICML file not created by Pandoc"
            )

        # Read ICML content
        with open(icml_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Apply cross-reference fix
        content = apply_crossref_fix(content)

        # Restore tab characters from placeholders
        tab_placeholder = config.processing.tab_placeholder
        if tab_placeholder:
            content, tabs_restored = restore_tabs_from_placeholder(
                content, tab_placeholder
            )

        # Apply specialized styling based on file type
        style_applied = None

        # Check if this is a bibliography file
        if 'BIBLIOGRAFIA' in section_name.upper():
            content, changes = apply_bibliography_styling(
                content,
                book_config.styles.bibliography
            )
            if changes > 0:
                style_applied = 'bibliography'

        # Check if this is a glossary file
        elif 'GLOSARIO' in section_name.upper():
            content, changes = apply_glossary_styling(
                content,
                book_config.styles.glossary,
                book_config.styles.glossary_definition
            )
            if changes > 0:
                style_applied = 'glossary'

        # Apply custom style mappings from config
        custom_mappings = get_mappings_for_file(
            section_name, book_config.style_mappings
        )
        if custom_mappings:
            content, custom_changes = apply_custom_style_mappings(
                content, custom_mappings
            )
            if custom_changes > 0:
                style_applied = style_applied or 'custom'

        # Normalize table column widths to configured max width
        if book_config.table_max_width:
            content, table_changes = normalize_table_widths(
                content, book_config.table_max_width
            )
            if table_changes > 0:
                style_applied = style_applied or 'tables'

        # Write processed content
        with open(icml_file, 'w', encoding='utf-8') as f:
            f.write(content)

        postprocess_time = time.time() - postprocess_start
        file_size = icml_file.stat().st_size

        return ConversionResult(
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=True,
            processing_time=time.time() - start_time,
            pandoc_time=pandoc_time,
            postprocess_time=postprocess_time,
            file_size=file_size,
            style_applied=style_applied
        )

    except subprocess.TimeoutExpired:
        return ConversionResult(
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=False,
            processing_time=time.time() - start_time,
            pandoc_time=0.0,
            postprocess_time=0.0,
            file_size=0,
            error_message="Pandoc conversion timed out"
        )
    except Exception as e:
        return ConversionResult(
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=False,
            processing_time=time.time() - start_time,
            pandoc_time=0.0,
            postprocess_time=0.0,
            file_size=0,
            error_message=str(e)
        )


def compile_icml(
    book_id: str,
    config: Config,
    verbose: bool = False
) -> bool:
    """
    Compile all markdown files for a book to ICML.

    Args:
        book_id: Book identifier
        config: Configuration object
        verbose: Enable verbose output

    Returns:
        True if all files compiled successfully
    """
    # Get book configuration
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"Compiling ICML for {book_config.title} ({book_id})...")

    # Ensure output directories exist
    ensure_output_dirs(book_config)

    # Find markdown files
    markdown_dir = book_config.output.markdown
    icml_dir = book_config.output.icml

    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("  No markdown files found in generated directory")
        print("  Tip: Run merge first to generate markdown files")
        return True

    print(f"  Found {len(md_files)} files to convert")

    # Check Pandoc availability
    try:
        subprocess.run(['pandoc', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("  Error: Pandoc not found. Install with: brew install pandoc")
        return False

    # Process files
    start_time = time.time()
    results: List[ConversionResult] = []

    max_workers = get_optimal_workers(config)

    if len(md_files) > 2 and max_workers > 1:
        # Parallel processing
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(
                    convert_single_file,
                    md_file,
                    icml_dir,
                    config,
                    book_config
                ): md_file
                for md_file in md_files
            }

            for future in as_completed(futures):
                result = future.result()
                results.append(result)

                if verbose:
                    status = "OK" if result.success else "FAILED"
                    style_info = f" [{result.style_applied}]" if result.style_applied else ""
                    print(f"    [{status}] {result.markdown_file.name} -> {result.icml_file.name}{style_info}")
    else:
        # Sequential processing
        for md_file in md_files:
            result = convert_single_file(md_file, icml_dir, config, book_config)
            results.append(result)

            if verbose:
                status = "OK" if result.success else "FAILED"
                style_info = f" [{result.style_applied}]" if result.style_applied else ""
                print(f"    [{status}] {result.markdown_file.name} -> {result.icml_file.name}{style_info}")

    total_time = time.time() - start_time

    # Calculate statistics
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    total_size = sum(r.file_size for r in successful)
    avg_pandoc_time = sum(r.pandoc_time for r in successful) / len(successful) if successful else 0
    styled_count = sum(1 for r in successful if r.style_applied)

    # Report results
    print(f"\n  Results:")
    print(f"    Files converted: {len(successful)}/{len(md_files)}")
    print(f"    Total ICML size: {format_size(total_size)}")
    print(f"    Avg Pandoc time: {format_time(avg_pandoc_time)}")
    if styled_count > 0:
        print(f"    Files with styling: {styled_count}")
    print(f"    Total time: {format_time(total_time)}")

    if failed:
        print(f"\n  Failed conversions:")
        for result in failed:
            print(f"    {result.markdown_file.name}: {result.error_message}")
        return False

    print(f"\n  ICML compilation complete for {book_id}")
    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Compile markdown files to ICML format",
        main_func=compile_icml,
    )
