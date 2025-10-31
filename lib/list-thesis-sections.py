#!/usr/bin/env python3
"""
List and validate thesis sections with enhanced reporting.

This script scans the sections directory to discover and validate thesis sections,
providing detailed information about their structure, file counts, and readiness
for compilation.

Usage:
    python list-thesis-sections.py <sections_root>

Arguments:
    sections_root: Root directory containing thesis sections

Example:
    python list-thesis-sections.py /Users/henry/Workbench/Theodore/sections

Features:
    - Comprehensive section validation
    - Color-coded status reporting
    - Detailed file statistics
    - Size and modification time analysis
    - Compilation readiness assessment
    - Export options for automation

Output Categories:
    ✅ Ready: Section has content/ folder with .md files
    ⚠️  Incomplete: Section has content/ folder but no .md files
    ❌ Invalid: Section missing content/ folder or other issues

Exit codes:
    0: Sections found and listed successfully
    1: No sections found or directory access errors
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional


class SectionInfo(NamedTuple):
    """Information about a thesis section."""
    name: str
    path: Path
    status: str  # 'ready', 'incomplete', 'invalid'
    has_content_folder: bool
    md_file_count: int
    total_files: int
    total_size: int  # in bytes
    last_modified: Optional[datetime]
    issues: List[str]


class ColorCodes:
    """ANSI color codes for terminal output."""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    GREEN = '\033[1;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[1;31m'
    CYAN = '\033[1;36m'
    WHITE = '\033[1;37m'


def get_directory_stats(directory: Path) -> tuple[int, int, Optional[datetime]]:
    """
    Get statistics for a directory.

    Args:
        directory: Path to analyze

    Returns:
        Tuple of (file_count, total_size_bytes, last_modified_datetime)
    """
    if not directory.exists() or not directory.is_dir():
        return 0, 0, None

    file_count = 0
    total_size = 0
    last_modified = None

    try:
        for item in directory.rglob('*'):
            if item.is_file():
                file_count += 1
                try:
                    stat = item.stat()
                    total_size += stat.st_size
                    item_modified = datetime.fromtimestamp(stat.st_mtime)
                    if last_modified is None or item_modified > last_modified:
                        last_modified = item_modified
                except (OSError, ValueError):
                    continue  # Skip files we can't access
    except (PermissionError, OSError):
        pass  # Return what we have so far

    return file_count, total_size, last_modified


def analyze_section(section_path: Path) -> SectionInfo:
    """
    Analyze a single thesis section directory.

    Args:
        section_path: Path to the section directory

    Returns:
        SectionInfo with comprehensive analysis
    """
    section_name = section_path.name
    issues = []

    # Check if it's a valid directory
    if not section_path.is_dir():
        return SectionInfo(
            name=section_name,
            path=section_path,
            status='invalid',
            has_content_folder=False,
            md_file_count=0,
            total_files=0,
            total_size=0,
            last_modified=None,
            issues=['Not a directory']
        )

    # Check for content folder
    content_path = section_path / 'content'
    has_content_folder = content_path.exists() and content_path.is_dir()

    if not has_content_folder:
        issues.append('Missing content/ folder')

    # Count markdown files
    md_file_count = 0
    if has_content_folder:
        try:
            md_files = list(content_path.glob('*.md'))
            md_file_count = len(md_files)
            if md_file_count == 0:
                issues.append('No .md files in content/')
        except (PermissionError, OSError) as e:
            issues.append(f'Cannot access content/: {e}')

    # Get directory statistics
    total_files, total_size, last_modified = get_directory_stats(section_path)

    # Determine status
    if has_content_folder and md_file_count > 0:
        status = 'ready'
    elif has_content_folder and md_file_count == 0:
        status = 'incomplete'
    else:
        status = 'invalid'

    return SectionInfo(
        name=section_name,
        path=section_path,
        status=status,
        has_content_folder=has_content_folder,
        md_file_count=md_file_count,
        total_files=total_files,
        total_size=total_size,
        last_modified=last_modified,
        issues=issues
    )


def format_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def format_time_ago(dt: datetime) -> str:
    """Format datetime as 'time ago' string."""
    now = datetime.now()
    diff = now - dt

    if diff.days > 0:
        return f"{diff.days} days ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hours ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minutes ago"
    else:
        return "just now"


def list_sections(sections_root: Path, show_details: bool = False, export_json: bool = False) -> bool:
    """
    List and analyze all thesis sections.

    Args:
        sections_root: Root directory containing sections
        show_details: Whether to show detailed information
        export_json: Whether to export results as JSON

    Returns:
        True if sections were found, False otherwise
    """
    if not sections_root.exists():
        print(f"❌ Error: Sections directory not found: {sections_root}")
        return False

    if not sections_root.is_dir():
        print(f"❌ Error: Not a directory: {sections_root}")
        return False

    # Find all potential section directories
    section_dirs = []
    try:
        for item in sections_root.iterdir():
            if item.is_dir() and not item.name.startswith('.'):
                section_dirs.append(item)
    except (PermissionError, OSError) as e:
        print(f"❌ Error accessing sections directory: {e}")
        return False

    if not section_dirs:
        print(f"⚠️  No section directories found in {sections_root}")
        return False

    # Analyze all sections
    sections = []
    for section_dir in sorted(section_dirs):
        section_info = analyze_section(section_dir)
        sections.append(section_info)

    # Display results
    print(f"{ColorCodes.BOLD}{ColorCodes.CYAN}📁 Available sections in {sections_root}:{ColorCodes.RESET}")
    print()

    ready_sections = []
    incomplete_sections = []
    invalid_sections = []

    for section in sections:
        if section.status == 'ready':
            ready_sections.append(section)
            color = ColorCodes.GREEN
            icon = "✅"
            status_text = f"({section.md_file_count} files)"
        elif section.status == 'incomplete':
            incomplete_sections.append(section)
            color = ColorCodes.YELLOW
            icon = "⚠️ "
            status_text = f"{ColorCodes.RED}(no .md files){ColorCodes.RESET}"
        else:
            invalid_sections.append(section)
            color = ColorCodes.RED
            icon = "❌"
            status_text = f"{ColorCodes.RED}({', '.join(section.issues)}){ColorCodes.RESET}"

        # Basic display
        print(f"  {color}{icon} {section.name}{ColorCodes.RESET} {ColorCodes.BOLD}{status_text}{ColorCodes.RESET}")

        # Detailed display
        if show_details and section.status == 'ready':
            print(f"    📄 Total files: {section.total_files}")
            print(f"    💾 Size: {format_size(section.total_size)}")
            if section.last_modified:
                print(f"    🕒 Last modified: {format_time_ago(section.last_modified)}")

    print()

    # Summary statistics
    total_sections = len(sections)
    print(f"{ColorCodes.BOLD}📊 Summary:{ColorCodes.RESET}")
    print(f"  Total sections: {total_sections}")
    print(f"  {ColorCodes.GREEN}✅ Ready: {len(ready_sections)}{ColorCodes.RESET}")
    print(f"  {ColorCodes.YELLOW}⚠️  Incomplete: {len(incomplete_sections)}{ColorCodes.RESET}")
    print(f"  {ColorCodes.RED}❌ Invalid: {len(invalid_sections)}{ColorCodes.RESET}")

    if ready_sections:
        total_md_files = sum(s.md_file_count for s in ready_sections)
        total_size = sum(s.total_size for s in ready_sections)
        print(f"  📝 Total .md files: {total_md_files}")
        print(f"  💾 Total size: {format_size(total_size)}")

    print()
    print(f"{ColorCodes.BOLD}{ColorCodes.GREEN}Ready sections{ColorCodes.RESET} can be compiled with: {ColorCodes.WHITE}make compile <section-name>{ColorCodes.RESET}")

    # Export JSON if requested
    if export_json:
        export_data = {
            'timestamp': datetime.now().isoformat(),
            'sections_root': str(sections_root),
            'summary': {
                'total': total_sections,
                'ready': len(ready_sections),
                'incomplete': len(incomplete_sections),
                'invalid': len(invalid_sections)
            },
            'sections': [
                {
                    'name': s.name,
                    'status': s.status,
                    'md_files': s.md_file_count,
                    'total_files': s.total_files,
                    'size_bytes': s.total_size,
                    'last_modified': s.last_modified.isoformat() if s.last_modified else None,
                    'issues': s.issues
                }
                for s in sections
            ]
        }

        json_file = sections_root.parent / 'generated' / 'reports' / 'sections-list.json'
        json_file.parent.mkdir(parents=True, exist_ok=True)

        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2)

        print(f"📄 Section data exported to: {json_file}")

    return len(sections) > 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="List and validate thesis sections with enhanced reporting"
    )
    parser.add_argument(
        "sections_root",
        type=Path,
        help="Root directory containing thesis sections"
    )
    parser.add_argument(
        "--details",
        action="store_true",
        help="Show detailed information for each section"
    )
    parser.add_argument(
        "--export-json",
        action="store_true",
        help="Export section data to JSON file"
    )

    args = parser.parse_args()

    # List sections
    if list_sections(args.sections_root, args.details, args.export_json):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # No sections found or errors


if __name__ == "__main__":
    main()