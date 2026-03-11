#!/usr/bin/env python3
"""
Compile a single chapter/section (merge + ICML).

Supports both flat and sections source layouts.

In flat mode, the chapter identifier matches a source file prefix.
In sections mode, the chapter identifier is a section directory name.

Usage:
    python compile-chapter.py <book_id> <chapter_name> [--config <config_file>]

Arguments:
    book_id:        Book identifier (from build.config.json)
    chapter_name:   Chapter/section identifier
    --config:       Path to build.config.json

Example:
    python compile-chapter.py phdbook 3-fundamentos-1
    python compile-chapter.py phdbook 8-bibliografia
"""

import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, List

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    ensure_output_dirs,
    BookConfig,
    Config
)
from icml_styles import (
    get_pandoc_command,
    apply_crossref_fix,
    apply_bibliography_styling,
    apply_custom_style_mappings,
    get_mappings_for_file,
    normalize_table_widths,
    restore_tabs_from_placeholder
)
from utils import (
    format_time,
    natural_sort_key,
    normalize_text_content,
    remove_heading_numbers,
    replace_tabs_with_placeholder
)


# =========================================================================
# Flat-mode source finding (original)
# =========================================================================

def find_source_file(
    book_config: BookConfig,
    chapter_name: str
) -> Optional[Path]:
    """Find the source file for a chapter (flat mode)."""
    prefix = book_config.prefix

    content_dir = book_config.source.content
    if content_dir.exists():
        for md_file in content_dir.glob('*.md'):
            if md_file.stem == chapter_name:
                return md_file
            if md_file.stem.startswith(chapter_name + '_'):
                return md_file

    para_dir = book_config.source.paratextuales
    if para_dir.exists():
        for md_file in para_dir.glob('*.md'):
            if md_file.stem == chapter_name:
                return md_file

    return None


def get_output_name(source_file: Path, book_prefix: str) -> str:
    """Get simplified output name (flat mode)."""
    stem = source_file.stem
    chapter_pattern = rf'^({book_prefix}_CAP\d+)_'
    match = re.match(chapter_pattern, stem, re.IGNORECASE)
    if match:
        return match.group(1) + '.md'
    return source_file.name


# =========================================================================
# Sections-mode source finding
# =========================================================================

def find_section_files(
    book_config: BookConfig,
    section_name: str
) -> Optional[List[Path]]:
    """
    Find source files for a section (sections mode).

    Returns sorted list of .md files, or None if section not found.
    """
    root = book_config.source.content
    subdir = book_config.source.content_subdir
    section_path = root / section_name / subdir

    if not section_path.exists():
        return None

    md_files = sorted(
        section_path.glob('*.md'),
        key=lambda f: natural_sort_key(f.name)
    )

    return md_files if md_files else None


# =========================================================================
# Main compilation
# =========================================================================

def compile_chapter(
    book_id: str,
    chapter_name: str,
    config: Config
) -> bool:
    """Compile a single chapter/section. Dispatches based on source type."""
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"Compiling {chapter_name} from {book_config.title}...")
    ensure_output_dirs(book_config)

    if book_config.source.source_type == 'sections':
        return _compile_section(chapter_name, book_config, config)
    else:
        return _compile_flat(chapter_name, book_config, config)


def _compile_section(
    section_name: str,
    book_config: BookConfig,
    config: Config
) -> bool:
    """Compile a single section (sections mode)."""
    source_files = find_section_files(book_config, section_name)
    if source_files is None:
        print(f"  Error: Section '{section_name}' not found")
        root = book_config.source.content
        subdir = book_config.source.content_subdir
        print(f"  Searched in: {root / section_name / subdir}")
        if book_config.chapters.sections:
            print(f"  Available sections: {', '.join(book_config.chapters.sections)}")
        return False

    print(f"  Source: {len(source_files)} files in {section_name}/")

    # Phase 1: Merge (concatenate + normalize)
    print("  Phase 1: Merging and normalizing...")
    start_time = time.time()

    try:
        parts = []
        for md_file in source_files:
            with open(md_file, 'r', encoding='utf-8') as f:
                parts.append(f.read().rstrip())

        content = '\n\n'.join(parts)

        if config.processing.normalize_unicode:
            content = normalize_text_content(content)

        headings_removed = 0
        if config.processing.remove_heading_numbers:
            content, headings_removed = remove_heading_numbers(content)

        tabs_replaced = 0
        tab_placeholder = config.processing.tab_placeholder
        if tab_placeholder:
            content, tabs_replaced = replace_tabs_with_placeholder(
                content, tab_placeholder
            )

        content = content.rstrip() + '\n'

        md_output = book_config.output.markdown / f"{section_name}.md"
        with open(md_output, 'w', encoding='utf-8') as f:
            f.write(content)

        merge_time = time.time() - start_time
        print(f"    Done: {md_output.name} ({format_time(merge_time)})")
        if headings_removed > 0:
            print(f"    Removed {headings_removed} heading numbers")
        if tabs_replaced > 0:
            print(f"    Tabs replaced with placeholder: {tabs_replaced}")

    except Exception as e:
        print(f"  Error during merge: {e}")
        return False

    # Phase 2: ICML conversion
    return _convert_to_icml(md_output, section_name, book_config, config, tab_placeholder, merge_time)


def _compile_flat(
    chapter_name: str,
    book_config: BookConfig,
    config: Config
) -> bool:
    """Compile a single chapter (flat mode)."""
    source_file = find_source_file(book_config, chapter_name)
    if source_file is None:
        print(f"  Error: Chapter '{chapter_name}' not found")
        print(f"  Searched in:")
        print(f"    - {book_config.source.content}")
        print(f"    - {book_config.source.paratextuales}")
        return False

    print(f"  Source: {source_file.name}")

    # Phase 1: Merge (normalize)
    print("  Phase 1: Normalizing...")
    start_time = time.time()

    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            content = f.read()

        if config.processing.normalize_unicode:
            content = normalize_text_content(content)

        headings_removed = 0
        if config.processing.remove_heading_numbers:
            content, headings_removed = remove_heading_numbers(content)

        tabs_replaced = 0
        tab_placeholder = config.processing.tab_placeholder
        if tab_placeholder:
            content, tabs_replaced = replace_tabs_with_placeholder(
                content, tab_placeholder
            )

        content = content.rstrip() + '\n'

        output_name = get_output_name(source_file, book_config.prefix)
        md_output = book_config.output.markdown / output_name

        with open(md_output, 'w', encoding='utf-8') as f:
            f.write(content)

        merge_time = time.time() - start_time
        print(f"    Done: {md_output.name} ({format_time(merge_time)})")
        if headings_removed > 0:
            print(f"    Removed {headings_removed} heading numbers")
        if tabs_replaced > 0:
            print(f"    Tabs replaced with placeholder: {tabs_replaced}")

    except Exception as e:
        print(f"  Error during normalization: {e}")
        return False

    section_name = md_output.stem
    return _convert_to_icml(md_output, section_name, book_config, config, tab_placeholder, merge_time)


def _convert_to_icml(
    md_output: Path,
    section_name: str,
    book_config: BookConfig,
    config: Config,
    tab_placeholder: str,
    merge_time: float
) -> bool:
    """Convert merged markdown to ICML (shared by both modes)."""
    print("  Phase 2: Converting to ICML...")
    start_time = time.time()

    icml_output = book_config.output.icml / f"{md_output.stem}.icml"
    pandoc_cmd = get_pandoc_command(md_output, icml_output, config)

    try:
        result = subprocess.run(
            pandoc_cmd,
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode != 0:
            print(f"  Pandoc error: {result.stderr.strip()}")
            return False

        with open(icml_output, 'r', encoding='utf-8') as f:
            icml_content = f.read()

        icml_content = apply_crossref_fix(icml_content)

        if tab_placeholder:
            icml_content, tabs_restored = restore_tabs_from_placeholder(
                icml_content, tab_placeholder
            )
            if tabs_restored > 0:
                print(f"    Tabs restored in ICML: {tabs_restored}")

        if 'BIBLIOGRAFIA' in section_name.upper():
            icml_content, _bib_changes = apply_bibliography_styling(
                icml_content, book_config.styles.bibliography
            )

        custom_mappings = get_mappings_for_file(
            section_name, book_config.style_mappings
        )
        if custom_mappings:
            icml_content, custom_changes = apply_custom_style_mappings(
                icml_content, custom_mappings
            )
            if custom_changes > 0:
                print(f"    Applied {custom_changes} custom style mapping(s)")

        if book_config.table_max_width:
            icml_content, table_changes = normalize_table_widths(
                icml_content, book_config.table_max_width
            )
            if table_changes > 0:
                print(f"    Normalized {table_changes} table(s) to {book_config.table_max_width}pt width")

        with open(icml_output, 'w', encoding='utf-8') as f:
            f.write(icml_content)

        icml_time = time.time() - start_time
        icml_size = icml_output.stat().st_size / 1024
        print(f"    Done: {icml_output.name} ({icml_size:.1f} KB, {format_time(icml_time)})")

    except subprocess.TimeoutExpired:
        print("  Error: Pandoc conversion timed out")
        return False
    except Exception as e:
        print(f"  Error during ICML conversion: {e}")
        return False

    total_time = merge_time + (time.time() - start_time)
    print(f"\n  Compilation complete ({format_time(total_time)} total)")
    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Compile a single chapter (merge + ICML)",
        main_func=lambda book_id, config, chapter=None, **kw: compile_chapter(book_id, chapter, config),
        extra_args=[
            {"name": "chapter", "help": "Chapter/section identifier (e.g., 3-fundamentos-1)"},
        ],
    )
