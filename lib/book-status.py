#!/usr/bin/env python3
"""
Display compilation status for a book.

Supports both flat and sections source layouts.

Usage:
    python book-status.py <book_id> [--summary] [--config <config_file>]

Arguments:
    book_id:        Book identifier (from build.config.json)
    --summary:      Show only summary statistics
    --config:       Path to build.config.json

Example:
    python book-status.py phdbook
    python book-status.py phdbook --summary
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    validate_source_dirs,
    BookConfig,
    Config
)
from utils import count_words, natural_sort_key


class FileStatus(NamedTuple):
    """Status of a single file in the pipeline."""
    name: str
    source_path: Optional[Path]
    source_mtime: Optional[datetime]
    md_path: Optional[Path]
    md_mtime: Optional[datetime]
    icml_path: Optional[Path]
    icml_mtime: Optional[datetime]
    is_stale: bool


class SectionFileStatus(NamedTuple):
    """Status of a section (sections mode)."""
    name: str
    source_files: List[Path]
    latest_source_mtime: Optional[datetime]
    md_path: Optional[Path]
    md_mtime: Optional[datetime]
    icml_path: Optional[Path]
    icml_mtime: Optional[datetime]
    is_stale: bool
    word_count: int


class BuildStatus(NamedTuple):
    """Overall build status."""
    total_sources: int
    merged_files: int
    compiled_files: int
    stale_files: int
    last_merge: Optional[datetime]
    last_compile: Optional[datetime]
    total_words: int


def get_mtime(path: Path) -> Optional[datetime]:
    """Get modification time of a file."""
    if path.exists():
        return datetime.fromtimestamp(path.stat().st_mtime)
    return None


# =========================================================================
# Sections-mode collection
# =========================================================================

def collect_section_status(book_config: BookConfig) -> List[SectionFileStatus]:
    """Collect status for all sections (sections mode)."""
    statuses: List[SectionFileStatus] = []
    root = book_config.source.content
    subdir = book_config.source.content_subdir
    md_dir = book_config.output.markdown
    icml_dir = book_config.output.icml

    section_names = book_config.chapters.sections
    if not section_names:
        section_names = sorted(
            [d.name for d in root.iterdir()
             if d.is_dir() and (d / subdir).is_dir()],
            key=natural_sort_key
        )

    for section_name in section_names:
        section_path = root / section_name / subdir
        if not section_path.exists():
            continue

        source_files = sorted(
            section_path.glob('*.md'),
            key=lambda f: natural_sort_key(f.name)
        )

        if not source_files:
            continue

        source_mtimes = [get_mtime(f) for f in source_files]
        valid_mtimes = [m for m in source_mtimes if m is not None]
        latest_source = max(valid_mtimes) if valid_mtimes else None

        output_md = md_dir / f"{section_name}.md"
        output_icml = icml_dir / f"{section_name}.icml"
        md_mtime = get_mtime(output_md)
        icml_mtime = get_mtime(output_icml)

        is_stale = False
        if latest_source:
            if md_mtime and latest_source > md_mtime:
                is_stale = True
            if icml_mtime and latest_source > icml_mtime:
                is_stale = True
            if not md_mtime or not icml_mtime:
                is_stale = True

        total_words = sum(count_words(f) for f in source_files)

        statuses.append(SectionFileStatus(
            name=section_name,
            source_files=source_files,
            latest_source_mtime=latest_source,
            md_path=output_md if output_md.exists() else None,
            md_mtime=md_mtime,
            icml_path=output_icml if output_icml.exists() else None,
            icml_mtime=icml_mtime,
            is_stale=is_stale,
            word_count=total_words,
        ))

    return statuses


# =========================================================================
# Flat-mode collection (original)
# =========================================================================

def collect_file_status(book_config: BookConfig) -> List[FileStatus]:
    """Collect status for all files (flat mode)."""
    files: List[FileStatus] = []
    prefix = book_config.prefix

    md_dir = book_config.output.markdown
    icml_dir = book_config.output.icml

    content_dir = book_config.source.content
    if content_dir.exists():
        for source in sorted(content_dir.glob('*.md')):
            match = re.match(rf'^({prefix}_CAP\d+)_.+\.md', source.name, re.IGNORECASE)
            if match:
                output_name = match.group(1) + '.md'
            else:
                output_name = source.name

            output_stem = Path(output_name).stem

            source_mtime = get_mtime(source)
            md_path = md_dir / output_name
            md_mtime = get_mtime(md_path)
            icml_path = icml_dir / f"{output_stem}.icml"
            icml_mtime = get_mtime(icml_path)

            is_stale = False
            if source_mtime and md_mtime and source_mtime > md_mtime:
                is_stale = True
            if source_mtime and icml_mtime and source_mtime > icml_mtime:
                is_stale = True

            files.append(FileStatus(
                name=source.name,
                source_path=source,
                source_mtime=source_mtime,
                md_path=md_path if md_path.exists() else None,
                md_mtime=md_mtime,
                icml_path=icml_path if icml_path.exists() else None,
                icml_mtime=icml_mtime,
                is_stale=is_stale
            ))

    para_dir = book_config.source.paratextuales
    if para_dir.exists() and str(para_dir) != str(content_dir):
        for source in sorted(para_dir.glob('*.md')):
            source_mtime = get_mtime(source)
            md_path = md_dir / source.name
            md_mtime = get_mtime(md_path)
            icml_path = icml_dir / f"{source.stem}.icml"
            icml_mtime = get_mtime(icml_path)

            is_stale = False
            if source_mtime and md_mtime and source_mtime > md_mtime:
                is_stale = True
            if source_mtime and icml_mtime and source_mtime > icml_mtime:
                is_stale = True

            files.append(FileStatus(
                name=source.name,
                source_path=source,
                source_mtime=source_mtime,
                md_path=md_path if md_path.exists() else None,
                md_mtime=md_mtime,
                icml_path=icml_path if icml_path.exists() else None,
                icml_mtime=icml_mtime,
                is_stale=is_stale
            ))

    return files


# =========================================================================
# Build status calculation
# =========================================================================

def calculate_build_status_sections(
    sections: List[SectionFileStatus],
) -> BuildStatus:
    """Calculate overall build status from section statuses."""
    total = len(sections)
    merged = sum(1 for s in sections if s.md_path)
    compiled = sum(1 for s in sections if s.icml_path)
    stale = sum(1 for s in sections if s.is_stale)

    md_times = [s.md_mtime for s in sections if s.md_mtime]
    icml_times = [s.icml_mtime for s in sections if s.icml_mtime]

    return BuildStatus(
        total_sources=total,
        merged_files=merged,
        compiled_files=compiled,
        stale_files=stale,
        last_merge=max(md_times) if md_times else None,
        last_compile=max(icml_times) if icml_times else None,
        total_words=sum(s.word_count for s in sections),
    )


def calculate_build_status(
    files: List[FileStatus],
    book_config: BookConfig
) -> BuildStatus:
    """Calculate overall build status from file statuses (flat mode)."""
    total_sources = len(files)
    merged_files = sum(1 for f in files if f.md_path)
    compiled_files = sum(1 for f in files if f.icml_path)
    stale_files = sum(1 for f in files if f.is_stale)

    md_times = [f.md_mtime for f in files if f.md_mtime]
    icml_times = [f.icml_mtime for f in files if f.icml_mtime]

    last_merge = max(md_times) if md_times else None
    last_compile = max(icml_times) if icml_times else None

    total_words = sum(
        count_words(f.source_path)
        for f in files
        if f.source_path and f.source_path.exists()
    )

    return BuildStatus(
        total_sources=total_sources,
        merged_files=merged_files,
        compiled_files=compiled_files,
        stale_files=stale_files,
        last_merge=last_merge,
        last_compile=last_compile,
        total_words=total_words
    )


# =========================================================================
# Display
# =========================================================================

def format_datetime(dt: Optional[datetime]) -> str:
    """Format datetime for display."""
    if dt is None:
        return "Never"
    return dt.strftime("%Y-%m-%d %H:%M")


def show_summary(book_id: str, book_config: BookConfig, status: BuildStatus):
    """Show summary status."""
    unit = "sections" if book_config.source.source_type == 'sections' else "files"
    print(f"{book_config.title}:")
    print(f"  Sources: {status.total_sources} {unit}, {status.total_words:,} words")
    print(f"  Merged: {status.merged_files}/{status.total_sources}")
    print(f"  Compiled: {status.compiled_files}/{status.total_sources}")
    if status.stale_files > 0:
        print(f"  Stale: {status.stale_files} {unit} need recompilation")
    if status.last_compile:
        print(f"  Last build: {format_datetime(status.last_compile)}")


def show_detailed_sections(
    book_id: str,
    book_config: BookConfig,
    sections: List[SectionFileStatus],
    status: BuildStatus
):
    """Show detailed status for sections mode."""
    print(f"{book_config.title} ({book_id})")
    print("=" * 70)

    print(f"\nStatistics:")
    print(f"  Total sections: {status.total_sources}")
    print(f"  Total words: {status.total_words:,}")
    print(f"  Sections merged: {status.merged_files}")
    print(f"  Sections compiled: {status.compiled_files}")
    print(f"  Stale sections: {status.stale_files}")
    print(f"  Last merge: {format_datetime(status.last_merge)}")
    print(f"  Last compile: {format_datetime(status.last_compile)}")

    print(f"\nSection Status:")
    print("-" * 70)
    print(f"{'Section':<35} {'Files':>5} {'Words':>8} {'MD':<6} {'ICML':<6}")
    print("-" * 70)

    for sec in sections:
        md_flag = "[OK]" if sec.md_path else "[--]"
        icml_flag = "[OK]" if sec.icml_path else "[--]"
        stale_marker = " *STALE*" if sec.is_stale else ""

        display = sec.name[:33]
        print(f"  {display:<33} {len(sec.source_files):>5} {sec.word_count:>8,} {md_flag:<6} {icml_flag:<6}{stale_marker}")

    if status.stale_files > 0:
        print(f"\n* {status.stale_files} stale section(s) need recompilation")
        print(f"  Run: just compile {book_id}")


def show_detailed(
    book_id: str,
    book_config: BookConfig,
    files: List[FileStatus],
    status: BuildStatus
):
    """Show detailed status for flat mode."""
    print(f"{book_config.title} ({book_id})")
    print("=" * 70)

    print(f"\nStatistics:")
    print(f"  Total sources: {status.total_sources}")
    print(f"  Total words: {status.total_words:,}")
    print(f"  Files merged: {status.merged_files}")
    print(f"  Files compiled: {status.compiled_files}")
    print(f"  Stale files: {status.stale_files}")
    print(f"  Last merge: {format_datetime(status.last_merge)}")
    print(f"  Last compile: {format_datetime(status.last_compile)}")

    print(f"\nFile Status:")
    print("-" * 70)
    print(f"{'File':<40} {'Source':<10} {'MD':<10} {'ICML':<10}")
    print("-" * 70)

    for file_status in files:
        source_flag = "[OK]" if file_status.source_path else "[--]"
        md_flag = "[OK]" if file_status.md_path else "[--]"
        icml_flag = "[OK]" if file_status.icml_path else "[--]"

        stale_marker = " *STALE*" if file_status.is_stale else ""

        display_name = file_status.name[:38]
        print(f"{display_name:<40} {source_flag:<10} {md_flag:<10} {icml_flag:<10}{stale_marker}")

    if status.stale_files > 0:
        print(f"\n* {status.stale_files} stale file(s) need recompilation")
        print(f"  Run: just compile {book_id}")


# =========================================================================
# Stale check
# =========================================================================

def check_stale(book_id: str, config: Config) -> bool:
    """
    Check if a book has stale files that need recompilation.

    Returns True if there are stale files (exit code 0 = needs recompilation),
    False if everything is up to date (exit code 1 = no action needed).
    """
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    if book_config.source.source_type == 'sections':
        sections = collect_section_status(book_config)
        status = calculate_build_status_sections(sections)

        if status.stale_files > 0:
            stale_names = [s.name for s in sections if s.is_stale]
            print(f"{book_id}: {status.stale_files} stale section(s) need recompilation")
            for name in stale_names:
                print(f"  - {name}")
            return True
        elif status.total_sources == 0:
            print(f"{book_id}: No source sections found")
            return False
        elif status.compiled_files < status.total_sources:
            missing = status.total_sources - status.compiled_files
            print(f"{book_id}: {missing} section(s) not yet compiled")
            return True
        else:
            print(f"{book_id}: Up to date ({status.compiled_files} sections)")
            return False
    else:
        files = collect_file_status(book_config)
        status = calculate_build_status(files, book_config)

        if status.stale_files > 0:
            stale_names = [f.name for f in files if f.is_stale]
            print(f"{book_id}: {status.stale_files} stale file(s) need recompilation")
            for name in stale_names:
                print(f"  - {name}")
            return True
        elif status.total_sources == 0:
            print(f"{book_id}: No source files found")
            return False
        elif status.compiled_files < status.total_sources:
            missing = status.total_sources - status.compiled_files
            print(f"{book_id}: {missing} file(s) not yet compiled")
            return True
        else:
            print(f"{book_id}: Up to date ({status.compiled_files} files)")
            return False


# =========================================================================
# Main entry
# =========================================================================

def book_status(
    book_id: str,
    config: Config,
    summary_only: bool = False
) -> bool:
    """Display book status. Dispatches to sections or flat mode."""
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    if book_config.source.source_type == 'sections':
        sections = collect_section_status(book_config)
        status = calculate_build_status_sections(sections)
        if summary_only:
            show_summary(book_id, book_config, status)
        else:
            show_detailed_sections(book_id, book_config, sections, status)
    else:
        files = collect_file_status(book_config)
        status = calculate_build_status(files, book_config)
        if summary_only:
            show_summary(book_id, book_config, status)
        else:
            show_detailed(book_id, book_config, files, status)

    return True


if __name__ == "__main__":
    from cli import run_cli

    _check_stale = check_stale

    def _main(book_id, config, summary=False, check_stale=False, **kw):
        if check_stale:
            return _check_stale(book_id, config)
        return book_status(book_id, config, summary)

    run_cli(
        description="Display compilation status for a book",
        main_func=_main,
        extra_args=[
            {"name": ["--summary", "-s"], "action": "store_true", "help": "Show only summary statistics"},
            {"name": ["--check-stale"], "action": "store_true", "help": "Exit 0 if stale files exist (needs recompilation), exit 1 if up to date"},
        ],
    )
