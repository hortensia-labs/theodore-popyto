#!/usr/bin/env python3
"""
List chapters and paratextuales of a book.

Supports both flat and sections source layouts.

Usage:
    python list-book-chapters.py <book_id> --config <config_file>

Arguments:
    book_id:        Book identifier (from build.config.json)
    --config:       Path to build.config.json

Example:
    python list-book-chapters.py phdbook --config build.config.json
"""

import re
import sys
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
    """Status information for a source file."""
    name: str
    display_name: str
    path: Path
    exists: bool
    word_count: int
    file_type: str  # 'chapter', 'paratextual', or 'section-file'
    has_generated_md: bool
    has_generated_icml: bool


class SectionStatus(NamedTuple):
    """Status for a section (sections mode)."""
    name: str
    files: List[FileStatus]
    total_words: int
    has_generated_md: bool
    has_generated_icml: bool


def format_word_count(count: int) -> str:
    """Format word count for display."""
    if count < 1000:
        return f"{count}"
    else:
        return f"{count:,}"


# =========================================================================
# Sections-mode discovery
# =========================================================================

def discover_sections_status(book_config: BookConfig, config: Config) -> List[SectionStatus]:
    """
    Discover all sections and their files for a book (sections mode).
    """
    sections: List[SectionStatus] = []
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

        md_files = sorted(
            section_path.glob('*.md'),
            key=lambda f: natural_sort_key(f.name)
        )

        file_statuses = []
        total_words = 0

        for md_file in md_files:
            wc = count_words(md_file)
            total_words += wc
            file_statuses.append(FileStatus(
                name=md_file.name,
                display_name=md_file.stem,
                path=md_file,
                exists=True,
                word_count=wc,
                file_type='section-file',
                has_generated_md=False,
                has_generated_icml=False,
            ))

        output_name = f"{section_name}.md"
        output_stem = section_name
        has_md = (md_dir / output_name).exists()
        has_icml = (icml_dir / f"{output_stem}.icml").exists()

        sections.append(SectionStatus(
            name=section_name,
            files=file_statuses,
            total_words=total_words,
            has_generated_md=has_md,
            has_generated_icml=has_icml,
        ))

    return sections


# =========================================================================
# Flat-mode discovery (original)
# =========================================================================

def discover_files(book_config: BookConfig, config: Config) -> List[FileStatus]:
    """
    Discover all source files for a book (flat mode).
    """
    files: List[FileStatus] = []
    prefix = book_config.prefix

    content_dir = book_config.source.content
    generated_md_dir = book_config.output.markdown
    generated_icml_dir = book_config.output.icml

    if content_dir.exists():
        md_files = sorted(content_dir.glob('*.md'))
        for md_file in md_files:
            match = re.match(rf'{prefix}_CAP(\d+)_(.+)\.md', md_file.name, re.IGNORECASE)
            if match:
                chapter_num = int(match.group(1))
                title = match.group(2).replace('_', ' ')
                display_name = f"Cap {chapter_num}: {title}"
            else:
                display_name = md_file.stem

            output_name = re.sub(rf'^({prefix}_CAP\d+)_.+\.md', r'\1.md', md_file.name)
            if output_name == md_file.name:
                output_name = md_file.name

            output_stem = Path(output_name).stem
            has_md = (generated_md_dir / output_name).exists()
            has_icml = (generated_icml_dir / f"{output_stem}.icml").exists()

            files.append(FileStatus(
                name=md_file.name,
                display_name=display_name,
                path=md_file,
                exists=True,
                word_count=count_words(md_file),
                file_type='chapter',
                has_generated_md=has_md,
                has_generated_icml=has_icml
            ))

    para_dir = book_config.source.paratextuales
    if para_dir.exists() and str(para_dir) != str(content_dir):
        md_files = sorted(para_dir.glob('*.md'))
        for md_file in md_files:
            display_name = md_file.stem.replace(f'{prefix}_', '').replace('_', ' ')
            has_md = (generated_md_dir / md_file.name).exists()
            has_icml = (generated_icml_dir / f"{md_file.stem}.icml").exists()

            files.append(FileStatus(
                name=md_file.name,
                display_name=display_name,
                path=md_file,
                exists=True,
                word_count=count_words(md_file),
                file_type='paratextual',
                has_generated_md=has_md,
                has_generated_icml=has_icml
            ))

    return files


# =========================================================================
# Display
# =========================================================================

def list_book_chapters(
    book_id: str,
    config: Config
) -> bool:
    """
    List all chapters and paratextuales for a book.
    Dispatches to sections or flat mode based on configuration.
    """
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"{book_config.title} ({book_id})")
    print("=" * 60)

    errors = validate_source_dirs(book_config)
    if errors:
        for error in errors:
            print(f"  Warning: {error}")
        print()

    if book_config.source.source_type == 'sections':
        return _list_sections_mode(book_config)
    else:
        return _list_flat_mode(book_config, config)


def _list_sections_mode(book_config: BookConfig) -> bool:
    """List in sections mode."""
    from config import load_config
    config = load_config()
    sections = discover_sections_status(book_config, config)

    if not sections:
        print("  No sections found")
        return True

    grand_total_words = 0
    compiled_sections = 0

    for section in sections:
        if section.has_generated_icml:
            status = "[COMPILED]"
            compiled_sections += 1
        elif section.has_generated_md:
            status = "[MERGED]"
        else:
            status = "[SOURCE]"

        word_str = format_word_count(section.total_words)
        grand_total_words += section.total_words
        file_count = len(section.files)

        print(f"\n  {status:12} {section.name}")
        print(f"  {'':12} {file_count} files, {word_str} words")

        for fs in section.files:
            w = format_word_count(fs.word_count)
            print(f"  {'':14} {fs.name:<40} {w:>8} words")

    print()
    print("-" * 60)
    print(f"  {'Total:':<52} {format_word_count(grand_total_words):>8} words")
    print()
    print(f"Status: {compiled_sections}/{len(sections)} sections compiled")

    return True


def _list_flat_mode(book_config: BookConfig, config: Config) -> bool:
    """List in flat mode (original behavior)."""
    files = discover_files(book_config, config)

    if not files:
        print("  No files found")
        return True

    chapters = [f for f in files if f.file_type == 'chapter']
    paratextuales = [f for f in files if f.file_type == 'paratextual']

    if chapters:
        print(f"\nChapters (content/):")
        print("-" * 60)

        total_words = 0
        for file_status in chapters:
            if file_status.has_generated_icml:
                status = "[COMPILED]"
            elif file_status.has_generated_md:
                status = "[MERGED]"
            else:
                status = "[SOURCE]"

            word_str = format_word_count(file_status.word_count)
            total_words += file_status.word_count

            print(f"  {status:12} {file_status.display_name[:40]:<40} {word_str:>8} words")

        print("-" * 60)
        print(f"  {'Total:':<52} {format_word_count(total_words):>8} words")

    if paratextuales:
        print(f"\nParatextuales:")
        print("-" * 60)

        for file_status in paratextuales:
            if file_status.has_generated_icml:
                status = "[COMPILED]"
            elif file_status.has_generated_md:
                status = "[MERGED]"
            else:
                status = "[SOURCE]"

            word_str = format_word_count(file_status.word_count)
            print(f"  {status:12} {file_status.display_name:<40} {word_str:>8} words")

    print()
    total_chapters = len(chapters)
    compiled_chapters = sum(1 for c in chapters if c.has_generated_icml)
    total_para = len(paratextuales)
    compiled_para = sum(1 for p in paratextuales if p.has_generated_icml)

    print(f"Status: {compiled_chapters}/{total_chapters} chapters compiled, "
          f"{compiled_para}/{total_para} paratextuales compiled")

    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="List chapters and paratextuales of a book",
        main_func=lambda book_id, config, **kw: list_book_chapters(book_id, config),
    )
