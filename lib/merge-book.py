#!/usr/bin/env python3
"""
Merge and process markdown files for a book.

This script processes markdown files from content/ and paratextuales/
directories, normalizes them, and copies to the generated markdown output.

Supports two source layouts:
  - "flat": Single content directory with one file per chapter (original mode).
  - "sections": Multiple section directories, each containing content/ subfolder.
    All files within a section are concatenated into one output file.

Usage:
    python merge-book.py <book_id> --config <config_file> [--verbose]

Arguments:
    book_id:        Book identifier (from build.config.json)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python merge-book.py phdbook --config build.config.json
    python merge-book.py phdbook --config build.config.json --verbose
"""

import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional, Tuple

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    validate_source_dirs,
    ensure_output_dirs,
    get_optimal_workers,
    BookConfig,
    Config
)
from utils import (
    format_time,
    format_size,
    natural_sort_key,
    normalize_text_content,
    remove_heading_numbers,
    replace_tabs_with_placeholder
)


@dataclass
class MergeResult:
    """Result of processing a single file or section."""
    source_file: Path
    output_file: Path
    success: bool
    file_type: str  # 'chapter', 'paratextual', or 'section'
    processing_time: float
    input_size: int
    output_size: int
    headings_processed: int = 0
    tabs_replaced: int = 0
    source_count: int = 1
    error_message: Optional[str] = None


class FileInfo(NamedTuple):
    """Information about a source file."""
    path: Path
    name: str
    file_type: str  # 'chapter' or 'paratextual'
    sort_key: str
    output_name: str


@dataclass
class SectionInfo:
    """Information about a section and its source files."""
    name: str
    path: Path
    files: List[Path]
    output_name: str


# =========================================================================
# Flat-mode discovery (original behavior)
# =========================================================================

def extract_output_name(filename: str, book_prefix: str) -> str:
    """
    Extract simplified output name from source filename.

    Examples:
        L1_CAP03_Del_Espectaculo_al_Drama.md -> L1_CAP03.md
        L1_GLOSARIO.md -> L1_GLOSARIO.md
    """
    stem = Path(filename).stem

    chapter_pattern = rf'^({book_prefix}_CAP\d+)_'
    match = re.match(chapter_pattern, stem, re.IGNORECASE)
    if match:
        return match.group(1) + '.md'

    return filename


def discover_source_files(book_config: BookConfig) -> Tuple[List[FileInfo], List[str]]:
    """
    Discover markdown files in content/ and paratextuales/ directories.
    Used for flat source layout.
    """
    files: List[FileInfo] = []
    issues: List[str] = []
    prefix = book_config.prefix

    content_dir = book_config.source.content
    if content_dir.exists():
        md_files = sorted(content_dir.glob('*.md'))
        for md_file in md_files:
            match = re.match(rf'{prefix}_CAP(\d+)', md_file.stem, re.IGNORECASE)
            if match:
                sort_key = f"CAP{int(match.group(1)):03d}"
            else:
                sort_key = md_file.stem

            output_name = extract_output_name(md_file.name, prefix)

            files.append(FileInfo(
                path=md_file,
                name=md_file.name,
                file_type='chapter',
                sort_key=sort_key,
                output_name=output_name
            ))
    else:
        issues.append(f"Content directory not found: {content_dir}")

    para_dir = book_config.source.paratextuales
    if para_dir.exists() and str(para_dir) != str(book_config.source.content):
        md_files = sorted(para_dir.glob('*.md'))
        for md_file in md_files:
            para_order = {p: i for i, p in enumerate(book_config.paratextuales)}
            stem = md_file.stem
            sort_idx = para_order.get(stem, 999)
            sort_key = f"PARA{sort_idx:03d}_{stem}"

            files.append(FileInfo(
                path=md_file,
                name=md_file.name,
                file_type='paratextual',
                sort_key=sort_key,
                output_name=md_file.name
            ))
    else:
        if str(para_dir) != str(book_config.source.content):
            issues.append(f"Paratextuales directory not found: {para_dir}")

    return files, issues


# =========================================================================
# Sections-mode discovery
# =========================================================================

def discover_sections(book_config: BookConfig) -> Tuple[List[SectionInfo], List[str]]:
    """
    Discover section directories and their content files.
    Used for sections source layout.

    Each section directory contains a content/ subfolder with .md files.
    All .md files in a section are merged into one output file.
    """
    sections: List[SectionInfo] = []
    issues: List[str] = []
    root = book_config.source.content
    subdir = book_config.source.content_subdir

    if book_config.chapters.sections:
        section_dirs = book_config.chapters.sections
    else:
        section_dirs = sorted(
            [d.name for d in root.iterdir()
             if d.is_dir() and (d / subdir).is_dir()],
            key=natural_sort_key
        )

    for section_name in section_dirs:
        section_content = root / section_name / subdir
        if not section_content.exists():
            issues.append(f"Section content dir not found: {section_content}")
            continue

        md_files = sorted(
            section_content.glob('*.md'),
            key=lambda f: natural_sort_key(f.name)
        )

        if not md_files:
            issues.append(f"No .md files in {section_content}")
            continue

        sections.append(SectionInfo(
            name=section_name,
            path=section_content,
            files=md_files,
            output_name=f"{section_name}.md"
        ))

    return sections, issues


# =========================================================================
# Processing functions
# =========================================================================

def process_single_file(
    file_info: FileInfo,
    output_dir: Path,
    remove_numbers: bool = True,
    normalize_unicode: bool = True,
    tab_placeholder: str = ""
) -> MergeResult:
    """Process a single markdown file (flat mode)."""
    start_time = time.time()
    output_file = output_dir / file_info.output_name

    try:
        with open(file_info.path, 'r', encoding='utf-8') as f:
            content = f.read()

        input_size = len(content.encode('utf-8'))

        if normalize_unicode:
            content = normalize_text_content(content)

        headings_processed = 0
        if remove_numbers:
            content, headings_processed = remove_heading_numbers(content)

        tabs_replaced = 0
        if tab_placeholder:
            content, tabs_replaced = replace_tabs_with_placeholder(
                content, tab_placeholder
            )

        content = content.rstrip() + '\n'

        output_dir.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)

        output_size = len(content.encode('utf-8'))

        return MergeResult(
            source_file=file_info.path,
            output_file=output_file,
            success=True,
            file_type=file_info.file_type,
            processing_time=time.time() - start_time,
            input_size=input_size,
            output_size=output_size,
            headings_processed=headings_processed,
            tabs_replaced=tabs_replaced
        )

    except Exception as e:
        return MergeResult(
            source_file=file_info.path,
            output_file=output_file,
            success=False,
            file_type=file_info.file_type,
            processing_time=time.time() - start_time,
            input_size=0,
            output_size=0,
            error_message=str(e)
        )


def process_section(
    section: SectionInfo,
    output_dir: Path,
    remove_numbers: bool = True,
    normalize_unicode: bool = True,
    tab_placeholder: str = ""
) -> MergeResult:
    """
    Process a section: concatenate all source files into one output file.

    Files are concatenated in natural sort order with double-newline
    separators between them.
    """
    start_time = time.time()
    output_file = output_dir / section.output_name

    try:
        parts = []
        total_input_size = 0

        for md_file in section.files:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            total_input_size += len(content.encode('utf-8'))
            parts.append(content.rstrip())

        merged = '\n\n'.join(parts)

        if normalize_unicode:
            merged = normalize_text_content(merged)

        headings_processed = 0
        if remove_numbers:
            merged, headings_processed = remove_heading_numbers(merged)

        tabs_replaced = 0
        if tab_placeholder:
            merged, tabs_replaced = replace_tabs_with_placeholder(
                merged, tab_placeholder
            )

        merged = merged.rstrip() + '\n'

        output_dir.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(merged)

        output_size = len(merged.encode('utf-8'))

        return MergeResult(
            source_file=section.path,
            output_file=output_file,
            success=True,
            file_type='section',
            processing_time=time.time() - start_time,
            input_size=total_input_size,
            output_size=output_size,
            headings_processed=headings_processed,
            tabs_replaced=tabs_replaced,
            source_count=len(section.files)
        )

    except Exception as e:
        return MergeResult(
            source_file=section.path,
            output_file=output_file,
            success=False,
            file_type='section',
            processing_time=time.time() - start_time,
            input_size=0,
            output_size=0,
            error_message=str(e)
        )


# =========================================================================
# Main merge function
# =========================================================================

def merge_book(
    book_id: str,
    config: Config,
    verbose: bool = False
) -> bool:
    """
    Merge all markdown files for a book.

    Supports both flat and sections source layouts.
    """
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"Merging {book_config.title} ({book_id})...")

    errors = validate_source_dirs(book_config)
    if errors:
        print("Source directory errors:")
        for error in errors:
            print(f"  {error}")
        return False

    ensure_output_dirs(book_config)

    output_dir = book_config.output.markdown
    remove_numbers = config.processing.remove_heading_numbers
    normalize = config.processing.normalize_unicode
    tab_placeholder = config.processing.tab_placeholder

    if book_config.source.source_type == 'sections':
        return _merge_sections_mode(
            book_id, book_config, config, output_dir,
            remove_numbers, normalize, tab_placeholder, verbose
        )
    else:
        return _merge_flat_mode(
            book_id, book_config, config, output_dir,
            remove_numbers, normalize, tab_placeholder, verbose
        )


def _merge_sections_mode(
    book_id: str,
    book_config: BookConfig,
    config: Config,
    output_dir: Path,
    remove_numbers: bool,
    normalize: bool,
    tab_placeholder: str,
    verbose: bool
) -> bool:
    """Merge in sections mode: concatenate files per section."""
    sections, issues = discover_sections(book_config)

    if issues:
        for issue in issues:
            print(f"  Warning: {issue}")

    if not sections:
        print("  No sections found to process")
        return True

    total_files = sum(len(s.files) for s in sections)
    print(f"  Found {len(sections)} sections ({total_files} source files)")

    start_time = time.time()
    results: List[MergeResult] = []

    max_workers = get_optimal_workers(config)

    if len(sections) > 2 and max_workers > 1:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(
                    process_section,
                    section,
                    output_dir,
                    remove_numbers,
                    normalize,
                    tab_placeholder
                ): section
                for section in sections
            }

            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                if verbose:
                    section = futures[future]
                    status = "OK" if result.success else "FAILED"
                    print(f"    [{status}] {section.name} ({len(section.files)} files) -> {result.output_file.name}")
    else:
        for section in sections:
            result = process_section(
                section, output_dir,
                remove_numbers, normalize, tab_placeholder
            )
            results.append(result)
            if verbose:
                status = "OK" if result.success else "FAILED"
                print(f"    [{status}] {section.name} ({len(section.files)} files) -> {result.output_file.name}")

    total_time = time.time() - start_time

    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    total_input = sum(r.input_size for r in successful)
    total_output = sum(r.output_size for r in successful)
    total_headings = sum(r.headings_processed for r in successful)
    total_tabs = sum(r.tabs_replaced for r in successful)
    total_sources = sum(r.source_count for r in successful)

    print(f"\n  Results:")
    print(f"    Sections processed: {len(successful)}/{len(sections)}")
    print(f"    Source files merged: {total_sources}")
    print(f"    Input size: {format_size(total_input)}")
    print(f"    Output size: {format_size(total_output)}")
    if remove_numbers and total_headings > 0:
        print(f"    Heading numbers removed: {total_headings}")
    if total_tabs > 0:
        print(f"    Tabs replaced with placeholder: {total_tabs}")
    print(f"    Processing time: {format_time(total_time)}")

    if failed:
        print(f"\n  Failed sections:")
        for result in failed:
            print(f"    {result.source_file.name}: {result.error_message}")
        return False

    print(f"\n  Merge complete for {book_id}")
    return True


def _merge_flat_mode(
    book_id: str,
    book_config: BookConfig,
    config: Config,
    output_dir: Path,
    remove_numbers: bool,
    normalize: bool,
    tab_placeholder: str,
    verbose: bool
) -> bool:
    """Merge in flat mode: copy individual files (original behavior)."""
    files, issues = discover_source_files(book_config)

    if issues:
        for issue in issues:
            print(f"  Warning: {issue}")

    if not files:
        print("  No files found to process")
        return True

    files = sorted(files, key=lambda f: f.sort_key)

    chapters = [f for f in files if f.file_type == 'chapter']
    paratextuales = [f for f in files if f.file_type == 'paratextual']

    print(f"  Found {len(chapters)} chapters, {len(paratextuales)} paratextuales")

    start_time = time.time()
    results: List[MergeResult] = []

    max_workers = get_optimal_workers(config)

    if len(files) > 2 and max_workers > 1:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(
                    process_single_file,
                    file_info, output_dir,
                    remove_numbers, normalize, tab_placeholder
                ): file_info
                for file_info in files
            }

            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                if verbose:
                    status = "OK" if result.success else "FAILED"
                    print(f"    [{status}] {result.source_file.name} -> {result.output_file.name}")
    else:
        for file_info in files:
            result = process_single_file(
                file_info, output_dir,
                remove_numbers, normalize, tab_placeholder
            )
            results.append(result)
            if verbose:
                status = "OK" if result.success else "FAILED"
                print(f"    [{status}] {result.source_file.name} -> {result.output_file.name}")

    total_time = time.time() - start_time

    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]
    total_input = sum(r.input_size for r in successful)
    total_output = sum(r.output_size for r in successful)
    total_headings = sum(r.headings_processed for r in successful)
    total_tabs = sum(r.tabs_replaced for r in successful)

    print(f"\n  Results:")
    print(f"    Files processed: {len(successful)}/{len(files)}")
    print(f"    Input size: {format_size(total_input)}")
    print(f"    Output size: {format_size(total_output)}")
    if remove_numbers and total_headings > 0:
        print(f"    Heading numbers removed: {total_headings}")
    if total_tabs > 0:
        print(f"    Tabs replaced with placeholder: {total_tabs}")
    print(f"    Processing time: {format_time(total_time)}")

    if failed:
        print(f"\n  Failed files:")
        for result in failed:
            print(f"    {result.source_file.name}: {result.error_message}")
        return False

    print(f"\n  Merge complete for {book_id}")
    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Merge and process markdown files for a book",
        main_func=merge_book,
    )
