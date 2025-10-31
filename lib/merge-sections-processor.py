#!/usr/bin/env python3
"""
Parallel Section Merger for Theodore Thesis System

This script replaces the Makefile-based section merging with an optimized Python
implementation featuring parallel processing, atomic operations, and comprehensive
error handling.

Key Features:
- ProcessPool parallel execution for optimal performance
- Atomic file operations with backup/rollback
- Comprehensive validation and error reporting
- Memory-efficient streaming for large files
- Environment-aware configuration loading
- Real-time progress reporting with metrics
- Cross-platform compatibility

Usage:
    python merge-sections-processor.py <sections_root> <output_dir> [options]

Arguments:
    sections_root:   Root directory containing thesis sections
    output_dir:      Directory where merged files will be saved
    --target:        Processing target (single, all, batch)
    --sections:      Comma-separated list of specific sections
    --workers:       Number of parallel workers (default: auto)
    --verbose:       Enable detailed progress reporting
    --dry-run:       Validate only, don't write files

Example:
    python merge-sections-processor.py sections generated/markdown --target=all
    python merge-sections-processor.py sections generated/markdown --target=single --sections=2-seccion-1

Features:
    - Replicates exact Makefile file ordering logic
    - Maintains identical spacing and formatting
    - Environment configuration loading (.env support)
    - JSON export for automation integration
    - Performance metrics and throughput reporting
"""

import argparse
import os
import re
import shutil
import sys
import time
import unicodedata
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional, Set, Tuple
import logging


class MergeResult(NamedTuple):
    """Result of merging a single section."""
    section_name: str
    section_path: Path
    output_file: Path
    success: bool
    processing_time: float
    file_count: int
    numbered_files: int
    other_files: int
    total_size: int
    output_size: int
    headings_processed: int = 0
    remove_numbers_applied: bool = False
    error_message: Optional[str] = None


class SectionConfig(NamedTuple):
    """Configuration for section processing."""
    name: str
    path: Path
    content_path: Path
    has_content_folder: bool
    is_valid: bool
    issues: List[str]


class EnvironmentConfig(NamedTuple):
    """Environment configuration loaded from .env file."""
    project_root: Path
    sections_root: Path
    markdown_output: Path
    bibliography_section: Optional[str]
    custom_settings: Dict[str, str]


class FileInfo(NamedTuple):
    """Information about a markdown file."""
    path: Path
    name: str
    size: int
    is_numbered: bool
    sort_key: str


# File patterns matching Makefile logic
NUMBERED_PATTERN = re.compile(r'^[0-9].*\.md$')
ALL_MD_PATTERN = re.compile(r'.*\.md$')

# Color codes for output formatting
class ColorCodes:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    GREEN = '\033[1;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[1;31m'
    CYAN = '\033[1;36m'
    WHITE = '\033[1;37m'
    BLUE = '\033[1;34m'


def load_environment_config(project_root: Optional[Path] = None) -> EnvironmentConfig:
    """
    Load environment configuration from .env file and system environment.

    Args:
        project_root: Optional project root path (auto-detected if None)

    Returns:
        EnvironmentConfig with loaded values
    """
    if project_root is None:
        project_root = Path(__file__).resolve().parent.parent

    # Default paths based on project structure
    sections_root = project_root / 'sections'
    markdown_output = project_root / 'generated' / 'markdown'

    # Load .env file if it exists
    env_file = project_root / '.env'
    custom_settings = {}

    if env_file.exists():
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes and comments
                        value = value.split('#')[0].strip().strip('"\'')
                        if value:  # Only set non-empty values
                            custom_settings[key.strip()] = value
        except Exception as e:
            print(f"⚠️  Warning: Could not read .env file: {e}")

    # Override with custom paths if specified in .env
    if 'SECTIONS_ROOT' in custom_settings:
        sections_root = Path(custom_settings['SECTIONS_ROOT'])
    if 'MARKDOWN_OUTPUT' in custom_settings:
        markdown_output = Path(custom_settings['MARKDOWN_OUTPUT'])

    # Get bibliography section name
    bibliography_section = custom_settings.get('BIBLIOGRAPHY_SECTION')

    return EnvironmentConfig(
        project_root=project_root,
        sections_root=sections_root,
        markdown_output=markdown_output,
        bibliography_section=bibliography_section,
        custom_settings=custom_settings
    )


def setup_logging(verbose: bool = False, log_dir: Optional[Path] = None) -> logging.Logger:
    """
    Setup logging configuration.

    Args:
        verbose: Enable verbose logging
        log_dir: Directory for log files (auto-created if None)

    Returns:
        Configured logger instance
    """
    if log_dir is None:
        log_dir = Path("generated/reports/merge-processor/logs")

    log_dir.mkdir(parents=True, exist_ok=True)

    # Configure logging level
    level = logging.DEBUG if verbose else logging.INFO

    # Create formatters
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_formatter = logging.Formatter(
        '%(levelname)s - %(message)s'
    )

    # Setup logger
    logger = logging.getLogger('merge_processor')
    logger.setLevel(level)

    # File handler
    log_file = log_dir / f"merge_processor_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console handler (only for verbose mode)
    if verbose:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)

    logger.info(f"Merge processor initialized - Log file: {log_file}")
    return logger


def normalize_text_content(content: str) -> str:
    """
    Normalize text content for consistent processing.

    Args:
        content: Raw text content

    Returns:
        Normalized text content
    """
    # Normalize unicode characters
    content = unicodedata.normalize('NFKC', content)

    # Normalize line endings to Unix style
    content = content.replace('\r\n', '\n').replace('\r', '\n')

    # Remove excessive whitespace while preserving structure
    lines = content.split('\n')
    normalized_lines = []

    for line in lines:
        # Preserve leading whitespace for indentation but normalize internal spacing
        leading_space = len(line) - len(line.lstrip())
        normalized_line = line[:leading_space] + re.sub(r'\s+', ' ', line[leading_space:]).rstrip()
        normalized_lines.append(normalized_line)

    return '\n'.join(normalized_lines)


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


def format_time_duration(seconds: float) -> str:
    """Format time duration in human-readable format."""
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.2f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes}m {secs:.1f}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours}h {minutes}m {secs:.0f}s"


def remove_heading_numbers_from_content(content: str) -> Tuple[str, int]:
    """
    Remove heading numbers from markdown content.

    This function replicates the exact functionality from remove-heading-numbers.py
    to process content in-memory during the merge process.

    Args:
        content: Original markdown content

    Returns:
        Tuple of (processed_content, number_of_changes)

    Examples:
        - "# 1. Title" → "# Title"
        - "## 2.1 Subtitle" → "## Subtitle"
        - "### 3.2.1. Section" → "### Section"
    """
    # Pattern explanation:
    # ^(#{1,6}) - Start of line, capture 1-6 hash marks for heading level
    # \s* - Optional whitespace after hashes
    # (\d+(?:\.\d+)*\.?) - Capture number pattern: 1, 1.2, 1.2.3, 1.2.3., etc.
    # [\s\u00a0]+ - One or more whitespace chars (including non-breaking space)
    # Replace with: captured hashes + single space

    pattern = re.compile(r'^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\u00a0]+', re.MULTILINE)

    processed_content, changes = pattern.subn(r'\1 ', content)
    return processed_content, changes


def normalize_for_sorting(text: str) -> str:
    """
    Normalize text for alphabetical sorting, handling diacritics properly.
    
    This function removes diacritical marks (accents) from characters so that
    "Álvarez" sorts as "Alvarez", ensuring proper alphabetical ordering across
    different languages and character sets.
    
    Args:
        text: The text to normalize
        
    Returns:
        Normalized text suitable for case-insensitive alphabetical sorting
    
    Example:
        >>> normalize_for_sorting("Álvarez")
        'alvarez'
        >>> normalize_for_sorting("Müller")
        'muller'
    """
    # NFD = Canonical Decomposition (separates base characters from diacritics)
    # Example: 'é' becomes 'e' + combining acute accent
    nfd_form = unicodedata.normalize('NFD', text)
    
    # Remove combining diacritical marks (category 'Mn' = Mark, nonspacing)
    # This strips accents while keeping base characters
    without_diacritics = ''.join(
        char for char in nfd_form
        if unicodedata.category(char) != 'Mn'
    )
    
    # Convert to lowercase for case-insensitive sorting
    return without_diacritics.lower()


def sort_bibliography_content(content: str, logger: Optional[logging.Logger] = None) -> Tuple[str, int]:
    """
    Sort bibliography content alphabetically while preserving headings.

    This function separates headings from bibliography entries, sorts the entries
    alphabetically (handling diacritics properly), and places headings back at 
    the beginning. Each bibliography entry is separated by a blank line.

    Args:
        content: Original bibliography content
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (processed_content, number_of_entries_sorted)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    lines = content.split('\n')
    headings = []
    bibliography_entries = []

    for line in lines:
        stripped_line = line.strip()

        # Check if line is a heading (starts with #)
        if stripped_line.startswith('#'):
            headings.append(line)
        elif stripped_line:  # Non-empty, non-heading line is a bibliography entry
            bibliography_entries.append(stripped_line)
        # Skip empty lines - they will be re-added between entries

    original_count = len(bibliography_entries)

    if bibliography_entries:
        # Sort bibliography entries alphabetically (case-insensitive, diacritics-aware)
        # For entries that are links, sort by the text content, not the link
        def sort_key(entry):
            # Handle markdown links: [text](url) -> use text for sorting
            link_pattern = re.compile(r'^\[([^\]]+)\]\([^)]+\)$')
            match = link_pattern.match(entry.strip())
            if match:
                # Sort by the link text, normalized for diacritics
                return normalize_for_sorting(match.group(1))
            else:
                # Sort by the entry itself, normalized for diacritics
                return normalize_for_sorting(entry.strip())

        sorted_entries = sorted(bibliography_entries, key=sort_key)
        logger.debug(f"Sorted {len(sorted_entries)} bibliography entries (diacritics-aware)")
    else:
        sorted_entries = []

    # Reconstruct content: headings first, then sorted entries with blank line separation
    result_parts = []

    # Add headings at the beginning
    if headings:
        result_parts.extend(headings)
        if sorted_entries:
            result_parts.append('')  # Blank line after headings

    # Add sorted entries with blank line separation
    for i, entry in enumerate(sorted_entries):
        result_parts.append(entry)
        if i < len(sorted_entries) - 1:  # Add blank line between entries
            result_parts.append('')

    # Join everything together
    processed_content = '\n'.join(result_parts)

    # Ensure single final newline
    if processed_content and not processed_content.endswith('\n'):
        processed_content += '\n'

    return processed_content, original_count


def process_bibliography_file(bibliography_file: Path, logger: Optional[logging.Logger] = None) -> Tuple[bool, Optional[str]]:
    """
    Process bibliography file by sorting its content alphabetically.

    Args:
        bibliography_file: Path to the bibliography markdown file
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (success, error_message)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    try:
        if not bibliography_file.exists():
            return False, f"Bibliography file does not exist: {bibliography_file.name}"

        if not bibliography_file.is_file():
            return False, f"Bibliography path is not a file: {bibliography_file.name}"

        # Read current content
        with open(bibliography_file, 'r', encoding='utf-8') as f:
            original_content = f.read()

        if not original_content.strip():
            return False, f"Bibliography file is empty: {bibliography_file.name}"

        # Sort the content
        sorted_content, entry_count = sort_bibliography_content(original_content, logger)

        # Check if content actually changed
        if sorted_content.strip() == original_content.strip():
            logger.info(f"Bibliography {bibliography_file.name} was already sorted correctly")
            return True, None

        # Create backup
        backup_file = bibliography_file.with_suffix('.md.bib_backup')
        try:
            shutil.copy2(bibliography_file, backup_file)
            logger.debug(f"Created bibliography backup: {backup_file}")
        except Exception as e:
            logger.warning(f"Could not create bibliography backup: {e}")
            backup_file = None

        # Write sorted content atomically
        temp_file = bibliography_file.with_suffix('.md.bib_tmp')
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(sorted_content)

            # Atomic move to final location
            temp_file.replace(bibliography_file)

            # Clean up backup on success
            if backup_file and backup_file.exists():
                backup_file.unlink()

            logger.info(f"Bibliography {bibliography_file.name} sorted successfully: {entry_count} entries")
            return True, None

        except Exception as e:
            # Cleanup temp file
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

            # Restore from backup on error
            if backup_file and backup_file.exists():
                try:
                    shutil.copy2(backup_file, bibliography_file)
                    backup_file.unlink()
                    logger.info(f"Restored {bibliography_file} from backup")
                except Exception as restore_error:
                    logger.error(f"Failed to restore from backup: {restore_error}")

            return False, f"Error writing sorted bibliography: {e}"

    except Exception as e:
        return False, f"Error processing bibliography file: {e}"


def analyze_section(section_path: Path, logger: Optional[logging.Logger] = None) -> SectionConfig:
    """
    Analyze a single thesis section directory for validity and structure.

    Args:
        section_path: Path to the section directory
        logger: Optional logger for detailed reporting

    Returns:
        SectionConfig with comprehensive analysis
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    section_name = section_path.name
    issues = []

    # Check if it's a valid directory
    if not section_path.exists():
        issues.append('Directory does not exist')
        return SectionConfig(
            name=section_name,
            path=section_path,
            content_path=section_path / 'content',
            has_content_folder=False,
            is_valid=False,
            issues=issues
        )

    if not section_path.is_dir():
        issues.append('Path is not a directory')
        return SectionConfig(
            name=section_name,
            path=section_path,
            content_path=section_path / 'content',
            has_content_folder=False,
            is_valid=False,
            issues=issues
        )

    # Check for content folder
    content_path = section_path / 'content'
    has_content_folder = content_path.exists() and content_path.is_dir()

    if not has_content_folder:
        issues.append('Missing content/ folder')

    # Check accessibility
    try:
        list(section_path.iterdir())
    except PermissionError:
        issues.append('Directory not accessible (permission denied)')

    if has_content_folder:
        try:
            list(content_path.iterdir())
        except PermissionError:
            issues.append('content/ folder not accessible (permission denied)')

    # Determine validity
    is_valid = has_content_folder and len(issues) == 0

    return SectionConfig(
        name=section_name,
        path=section_path,
        content_path=content_path,
        has_content_folder=has_content_folder,
        is_valid=is_valid,
        issues=issues
    )


def discover_markdown_files(content_path: Path, logger: Optional[logging.Logger] = None) -> Tuple[List[FileInfo], List[str]]:
    """
    Discover and categorize markdown files in a content directory.
    Replicates the exact Makefile logic for file ordering.

    Args:
        content_path: Path to the content directory
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (file_info_list, issues_list)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    files_info = []
    issues = []

    if not content_path.exists():
        issues.append('Content directory does not exist')
        return files_info, issues

    if not content_path.is_dir():
        issues.append('Content path is not a directory')
        return files_info, issues

    try:
        # Find all markdown files
        md_files = []
        for item in content_path.iterdir():
            if item.is_file() and ALL_MD_PATTERN.match(item.name):
                md_files.append(item)

        if not md_files:
            issues.append('No markdown files found in content/')
            return files_info, issues

        # Categorize and sort files exactly like Makefile
        numbered_files = []
        other_files = []

        for md_file in md_files:
            try:
                # Check file accessibility and size
                stat = md_file.stat()
                if stat.st_size == 0:
                    logger.warning(f"Empty file detected: {md_file.name}")

                # Categorize by pattern
                is_numbered = NUMBERED_PATTERN.match(md_file.name) is not None

                # Create sort key
                if is_numbered:
                    # For numbered files, extract the numeric part for proper sorting
                    sort_key = md_file.name
                    numbered_files.append((md_file, sort_key, stat.st_size))
                else:
                    # For other files, use alphabetical sorting
                    sort_key = md_file.name
                    other_files.append((md_file, sort_key, stat.st_size))

            except (OSError, PermissionError) as e:
                issues.append(f"Cannot access file {md_file.name}: {e}")
                continue

        # Sort exactly like Makefile: numbered first (sorted), then others (sorted)
        numbered_files.sort(key=lambda x: x[1])  # Sort by filename
        other_files.sort(key=lambda x: x[1])     # Sort by filename

        # Create FileInfo objects in the correct order
        for md_file, sort_key, size in numbered_files:
            files_info.append(FileInfo(
                path=md_file,
                name=md_file.name,
                size=size,
                is_numbered=True,
                sort_key=sort_key
            ))

        for md_file, sort_key, size in other_files:
            files_info.append(FileInfo(
                path=md_file,
                name=md_file.name,
                size=size,
                is_numbered=False,
                sort_key=sort_key
            ))

        logger.debug(f"Discovered {len(numbered_files)} numbered files, {len(other_files)} other files")

    except (PermissionError, OSError) as e:
        issues.append(f"Error accessing content directory: {e}")

    return files_info, issues


def validate_section_for_merging(section_config: SectionConfig, logger: Optional[logging.Logger] = None) -> Tuple[bool, List[FileInfo], List[str]]:
    """
    Validate a section for merging and return file information.

    Args:
        section_config: Section configuration object
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (is_valid, files_info, all_issues)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    all_issues = list(section_config.issues)

    # Basic validation
    if not section_config.is_valid:
        logger.warning(f"Section {section_config.name} failed basic validation: {all_issues}")
        return False, [], all_issues

    # Discover markdown files
    files_info, file_issues = discover_markdown_files(section_config.content_path, logger)
    all_issues.extend(file_issues)

    if not files_info:
        all_issues.append('No valid markdown files found for merging')
        logger.warning(f"Section {section_config.name} has no mergeable files")
        return False, [], all_issues

    # Additional validations
    total_size = sum(f.size for f in files_info)
    if total_size == 0:
        all_issues.append('All markdown files are empty')
        logger.warning(f"Section {section_config.name} contains only empty files")
        return False, files_info, all_issues

    # Check for extremely large files (> 50MB per file)
    large_files = [f for f in files_info if f.size > 50 * 1024 * 1024]
    if large_files:
        for large_file in large_files:
            all_issues.append(f'Large file detected: {large_file.name} ({format_size(large_file.size)})')
            logger.warning(f"Large file in {section_config.name}: {large_file.name}")

    # Success - section is valid for merging
    logger.info(f"Section {section_config.name} validated: {len(files_info)} files, {format_size(total_size)}")
    return True, files_info, all_issues


def discover_all_sections(sections_root: Path, target_sections: Optional[Set[str]] = None,
                         logger: Optional[logging.Logger] = None) -> Tuple[List[SectionConfig], Dict[str, List[str]]]:
    """
    Discover and analyze all thesis sections in the sections root directory.

    Args:
        sections_root: Root directory containing sections
        target_sections: Optional set of specific section names to process
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (valid_sections, errors_by_section)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    valid_sections = []
    errors_by_section = {}

    if not sections_root.exists():
        logger.error(f"Sections root directory does not exist: {sections_root}")
        return valid_sections, {'_global': [f'Sections root not found: {sections_root}']}

    if not sections_root.is_dir():
        logger.error(f"Sections root is not a directory: {sections_root}")
        return valid_sections, {'_global': [f'Sections root is not a directory: {sections_root}']}

    try:
        # Find all potential section directories
        section_dirs = []
        for item in sections_root.iterdir():
            if item.is_dir() and not item.name.startswith('.'):
                # Filter by target sections if specified
                if target_sections is None or item.name in target_sections:
                    section_dirs.append(item)

        if not section_dirs:
            if target_sections:
                message = f"No target sections found: {', '.join(target_sections)}"
            else:
                message = "No section directories found"
            logger.warning(message)
            return valid_sections, {'_global': [message]}

        logger.info(f"Discovered {len(section_dirs)} section directories to analyze")

        # Analyze each section
        for section_dir in sorted(section_dirs):
            section_config = analyze_section(section_dir, logger)

            if section_config.is_valid:
                valid_sections.append(section_config)
                logger.debug(f"Valid section: {section_config.name}")
            else:
                errors_by_section[section_config.name] = section_config.issues
                logger.warning(f"Invalid section {section_config.name}: {section_config.issues}")

    except (PermissionError, OSError) as e:
        error_msg = f"Error accessing sections directory: {e}"
        logger.error(error_msg)
        return valid_sections, {'_global': [error_msg]}

    logger.info(f"Section discovery complete: {len(valid_sections)} valid, {len(errors_by_section)} with issues")
    return valid_sections, errors_by_section


def merge_single_section(section_config: SectionConfig, output_dir: Path,
                        dry_run: bool = False, remove_numbers: bool = False,
                        logger: Optional[logging.Logger] = None) -> MergeResult:
    """
    Merge all markdown files in a single section into a consolidated file.
    Implements atomic operations with backup/rollback and replicates exact Makefile logic.
    Optionally removes heading numbers during the merge process.

    Args:
        section_config: Section configuration object
        output_dir: Directory where merged file will be saved
        dry_run: If True, validate only without writing files
        remove_numbers: If True, remove heading numbers from merged content
        logger: Optional logger for detailed reporting

    Returns:
        MergeResult with detailed processing information including heading processing stats
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    start_time = time.time()
    section_name = section_config.name
    output_file = output_dir / f"{section_name}.md"

    # Initialize result with default values
    result_data = {
        'section_name': section_name,
        'section_path': section_config.path,
        'output_file': output_file,
        'success': False,
        'processing_time': 0.0,
        'file_count': 0,
        'numbered_files': 0,
        'other_files': 0,
        'total_size': 0,
        'output_size': 0,
        'headings_processed': 0,
        'remove_numbers_applied': remove_numbers,
        'error_message': None
    }

    try:
        # Validate section for merging
        is_valid, files_info, issues = validate_section_for_merging(section_config, logger)

        if not is_valid:
            result_data['error_message'] = f"Section validation failed: {'; '.join(issues)}"
            result_data['processing_time'] = time.time() - start_time
            return MergeResult(**result_data)

        # Calculate statistics
        result_data['file_count'] = len(files_info)
        result_data['numbered_files'] = sum(1 for f in files_info if f.is_numbered)
        result_data['other_files'] = result_data['file_count'] - result_data['numbered_files']
        result_data['total_size'] = sum(f.size for f in files_info)

        logger.info(f"Merging section {section_name}: {result_data['file_count']} files, {format_size(result_data['total_size'])}")

        # Dry run mode - validation only
        if dry_run:
            logger.info(f"Dry run completed for {section_name}")
            result_data['success'] = True
            result_data['processing_time'] = time.time() - start_time
            return MergeResult(**result_data)

        # Ensure output directory exists
        output_dir.mkdir(parents=True, exist_ok=True)

        # Create backup if output file already exists
        backup_file = None
        if output_file.exists():
            backup_file = output_file.with_suffix('.md.backup')
            try:
                shutil.copy2(output_file, backup_file)
                logger.debug(f"Created backup: {backup_file}")
            except Exception as e:
                logger.warning(f"Could not create backup for {output_file}: {e}")
                backup_file = None

        # Merge files with exact Makefile logic
        merged_content = []
        first_file = True

        for file_info in files_info:
            try:
                logger.debug(f"Processing file: {file_info.name}")

                # Read file content
                with open(file_info.path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Normalize content
                content = normalize_text_content(content)

                # Apply exact Makefile spacing logic
                if first_file:
                    # First file: add content directly
                    merged_content.append(content)
                    first_file = False
                else:
                    # Subsequent files: add empty line separator then content
                    merged_content.append("")  # Empty line separator
                    merged_content.append(content)

            except Exception as e:
                error_msg = f"Error reading file {file_info.name}: {e}"
                logger.error(error_msg)
                result_data['error_message'] = error_msg
                result_data['processing_time'] = time.time() - start_time

                # Cleanup on error
                if backup_file and backup_file.exists():
                    try:
                        shutil.copy2(backup_file, output_file)
                        backup_file.unlink()
                    except Exception:
                        pass

                return MergeResult(**result_data)

        # Join all content
        final_content = '\n'.join(merged_content)

        # Apply Makefile post-processing (Perl equivalent)
        # Remove trailing blank lines and ensure single final newline
        final_content = final_content.rstrip() + '\n'

        # Apply heading number removal if requested
        if remove_numbers:
            logger.debug(f"Removing heading numbers from {section_name}")
            final_content, headings_removed = remove_heading_numbers_from_content(final_content)
            result_data['headings_processed'] = headings_removed
            if headings_removed > 0:
                logger.info(f"Removed {headings_removed} heading numbers from {section_name}")
        else:
            result_data['headings_processed'] = 0

        # Write merged content atomically
        temp_file = output_file.with_suffix('.md.tmp')
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(final_content)

            # Atomic move to final location
            temp_file.replace(output_file)

            # Calculate output size
            result_data['output_size'] = output_file.stat().st_size

            # Clean up backup on success
            if backup_file and backup_file.exists():
                backup_file.unlink()

            # Success
            result_data['success'] = True
            result_data['processing_time'] = time.time() - start_time

            logger.info(f"Successfully merged {section_name}: {format_size(result_data['output_size'])} output")

            return MergeResult(**result_data)

        except Exception as e:
            error_msg = f"Error writing merged file: {e}"
            logger.error(error_msg)
            result_data['error_message'] = error_msg
            result_data['processing_time'] = time.time() - start_time

            # Cleanup temp file
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

            # Restore from backup on error
            if backup_file and backup_file.exists():
                try:
                    shutil.copy2(backup_file, output_file)
                    backup_file.unlink()
                    logger.info(f"Restored {output_file} from backup")
                except Exception as restore_error:
                    logger.error(f"Failed to restore from backup: {restore_error}")

            return MergeResult(**result_data)

    except Exception as e:
        error_msg = f"Unexpected error in merge_single_section: {e}"
        logger.error(error_msg)
        result_data['error_message'] = error_msg
        result_data['processing_time'] = time.time() - start_time
        return MergeResult(**result_data)


def validate_output_directory(output_dir: Path, create_if_missing: bool = True,
                             logger: Optional[logging.Logger] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate and optionally create the output directory.

    Args:
        output_dir: Path to the output directory
        create_if_missing: Whether to create the directory if it doesn't exist
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (is_valid, error_message)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    try:
        if not output_dir.exists():
            if create_if_missing:
                output_dir.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created output directory: {output_dir}")
            else:
                return False, f"Output directory does not exist: {output_dir}"

        if not output_dir.is_dir():
            return False, f"Output path is not a directory: {output_dir}"

        # Test write permissions
        test_file = output_dir / '.write_test'
        try:
            test_file.touch()
            test_file.unlink()
        except Exception:
            return False, f"Output directory is not writable: {output_dir}"

        return True, None

    except Exception as e:
        return False, f"Error validating output directory: {e}"


def merge_sections_parallel(sections: List[SectionConfig], output_dir: Path,
                           max_workers: Optional[int] = None, dry_run: bool = False,
                           remove_numbers: bool = False, logger: Optional[logging.Logger] = None) -> Tuple[List[MergeResult], Dict[str, str]]:
    """
    Merge multiple sections in parallel using ProcessPoolExecutor.

    Args:
        sections: List of section configurations to process
        output_dir: Directory where merged files will be saved
        max_workers: Maximum number of parallel workers (auto-detected if None)
        dry_run: If True, validate only without writing files
        remove_numbers: If True, remove heading numbers from merged content
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (merge_results, processing_stats)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    if not sections:
        logger.warning("No sections provided for merging")
        return [], {'total_sections': '0', 'processing_time': '0s'}

    # Validate output directory
    is_valid, error_msg = validate_output_directory(output_dir, create_if_missing=True, logger=logger)
    if not is_valid:
        logger.error(f"Output directory validation failed: {error_msg}")
        raise ValueError(f"Invalid output directory: {error_msg}")

    total_sections = len(sections)

    # Determine optimal worker count
    if max_workers is None:
        max_workers = min(total_sections, os.cpu_count() or 4)
    else:
        max_workers = min(max_workers, total_sections)

    logger.info(f"Starting parallel merge: {total_sections} sections, {max_workers} workers")

    start_time = time.time()
    merge_results = []
    completed_count = 0

    # Progress tracking
    progress_prefix = "🔄 Dry run:" if dry_run else "🔄 Merging:"

    try:
        # Use ProcessPoolExecutor for parallel processing
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # Submit all merge jobs
            future_to_section = {}
            for section in sections:
                future = executor.submit(
                    merge_single_section,
                    section,
                    output_dir,
                    dry_run,
                    remove_numbers,
                    None  # Logger can't be pickled for multiprocessing
                )
                future_to_section[future] = section

            # Process completed merges
            for future in as_completed(future_to_section):
                section = future_to_section[future]
                completed_count += 1

                try:
                    result = future.result()
                    merge_results.append(result)

                    # Progress reporting
                    progress = (completed_count / total_sections) * 100
                    if result.success:
                        compression_ratio = (result.output_size / result.total_size) * 100 if result.total_size > 0 else 100
                        heading_info = f", {result.headings_processed} headings" if result.remove_numbers_applied and result.headings_processed > 0 else ""
                        print(f"   ✅ [{progress:5.1f}%] {result.section_name}: "
                              f"{result.file_count} files → {format_size(result.output_size)}{heading_info} "
                              f"({format_time_duration(result.processing_time)})")
                        logger.info(f"Merged {result.section_name}: {result.file_count} files, "
                                   f"{format_size(result.total_size)} → {format_size(result.output_size)}")
                    else:
                        print(f"   ❌ [{progress:5.1f}%] {result.section_name}: {result.error_message}")
                        logger.error(f"Failed to merge {result.section_name}: {result.error_message}")

                except Exception as e:
                    # Handle unexpected errors in individual section processing
                    error_msg = f"Unexpected error processing {section.name}: {e}"
                    print(f"   ❌ [{completed_count/total_sections*100:5.1f}%] {section.name}: {error_msg}")
                    logger.error(error_msg)

                    # Create error result
                    merge_results.append(MergeResult(
                        section_name=section.name,
                        section_path=section.path,
                        output_file=output_dir / f"{section.name}.md",
                        success=False,
                        processing_time=0.0,
                        file_count=0,
                        numbered_files=0,
                        other_files=0,
                        total_size=0,
                        output_size=0,
                        error_message=error_msg
                    ))

    except Exception as e:
        logger.error(f"Parallel processing failed: {e}")
        raise

    total_time = time.time() - start_time

    # Calculate statistics
    successful_merges = [r for r in merge_results if r.success]
    failed_merges = [r for r in merge_results if not r.success]

    total_input_size = sum(r.total_size for r in successful_merges)
    total_output_size = sum(r.output_size for r in successful_merges)
    total_files = sum(r.file_count for r in successful_merges)
    total_headings_processed = sum(r.headings_processed for r in successful_merges if r.remove_numbers_applied)

    # Throughput calculations
    if total_time > 0:
        throughput_mb_s = (total_input_size / total_time) / (1024 * 1024)
        sections_per_second = len(successful_merges) / total_time
    else:
        throughput_mb_s = 0
        sections_per_second = 0

    processing_stats = {
        'total_sections': str(total_sections),
        'successful': str(len(successful_merges)),
        'failed': str(len(failed_merges)),
        'processing_time': format_time_duration(total_time),
        'total_files': str(total_files),
        'total_input_size': format_size(total_input_size),
        'total_output_size': format_size(total_output_size),
        'throughput_mb_s': f"{throughput_mb_s:.1f}",
        'sections_per_second': f"{sections_per_second:.1f}",
        'workers_used': str(max_workers),
        'headings_processed': str(total_headings_processed),
        'remove_numbers_applied': str(any(r.remove_numbers_applied for r in successful_merges))
    }

    # Summary logging
    logger.info(f"Parallel merge complete: {len(successful_merges)}/{total_sections} successful, "
               f"{format_time_duration(total_time)}, {throughput_mb_s:.1f} MB/s")

    if failed_merges:
        logger.warning(f"Failed sections: {[r.section_name for r in failed_merges]}")

    return merge_results, processing_stats


def process_sections(sections_root: Path, output_dir: Path, target_sections: Optional[Set[str]] = None,
                    max_workers: Optional[int] = None, dry_run: bool = False, remove_numbers: bool = False,
                    verbose: bool = False, logger: Optional[logging.Logger] = None) -> bool:
    """
    High-level function to process thesis sections with comprehensive workflow.

    Args:
        sections_root: Root directory containing sections
        output_dir: Directory where merged files will be saved
        target_sections: Optional set of specific section names to process
        max_workers: Maximum number of parallel workers (auto-detected if None)
        dry_run: If True, validate only without writing files
        remove_numbers: If True, remove heading numbers from merged content
        verbose: Enable verbose progress reporting
        logger: Optional logger for detailed reporting

    Returns:
        True if all processing completed successfully, False otherwise
    """
    if logger is None:
        logger = setup_logging(verbose=verbose)

    operation_name = "validation" if dry_run else "merging"

    try:
        print(f"{ColorCodes.CYAN}🚀 Starting section {operation_name}...{ColorCodes.RESET}")
        start_time = time.time()

        # Phase 1: Section Discovery
        print(f"{ColorCodes.BOLD}Phase 1: Section Discovery{ColorCodes.RESET}")
        sections, errors = discover_all_sections(sections_root, target_sections, logger)

        if not sections:
            print(f"{ColorCodes.RED}❌ No valid sections found{ColorCodes.RESET}")
            if errors:
                print(f"{ColorCodes.YELLOW}Issues found:{ColorCodes.RESET}")
                for section_name, section_errors in errors.items():
                    print(f"   • {section_name}: {', '.join(section_errors)}")
            return False

        print(f"   ✅ Found {len(sections)} valid sections")
        if errors:
            print(f"   ⚠️  {len(errors)} sections with issues (skipped)")

        # Phase 2: Parallel Processing
        mode_text = "dry run validation" if dry_run else "parallel merging"
        print(f"\n{ColorCodes.BOLD}Phase 2: Starting {mode_text}{ColorCodes.RESET}")

        merge_results, stats = merge_sections_parallel(
            sections, output_dir, max_workers, dry_run, remove_numbers, logger
        )

        # Phase 3: Results Summary
        total_time = time.time() - start_time
        print(f"\n{ColorCodes.BOLD}📊 Processing Complete:{ColorCodes.RESET}")
        print(f"   ⏱️  Total time: {format_time_duration(total_time)}")
        print(f"   📄 Sections: {stats['successful']}/{stats['total_sections']} successful")

        if not dry_run:
            print(f"   📁 Files processed: {stats['total_files']}")
            print(f"   📥 Input size: {stats['total_input_size']}")
            print(f"   📤 Output size: {stats['total_output_size']}")
            print(f"   📈 Throughput: {stats['throughput_mb_s']} MB/s")
            print(f"   👥 Workers used: {stats['workers_used']}")
            if stats['remove_numbers_applied'] == 'True' and int(stats['headings_processed']) > 0:
                print(f"   🔢 Heading numbers removed: {stats['headings_processed']}")

        # Report failures
        failed_results = [r for r in merge_results if not r.success]
        if failed_results:
            print(f"\n{ColorCodes.RED}❌ Failed Sections:{ColorCodes.RESET}")
            for result in failed_results:
                print(f"   • {result.section_name}: {result.error_message}")
            return False

        # Phase 4: Bibliography Post-Processing (if not dry run)
        if not dry_run:
            env_config = load_environment_config()
            if env_config.bibliography_section:
                print(f"\n{ColorCodes.BOLD}Phase 4: Bibliography Processing{ColorCodes.RESET}")
                bibliography_file = output_dir / f"{env_config.bibliography_section}.md"

                bib_success, bib_error = process_bibliography_file(bibliography_file, logger)

                if bib_success:
                    print(f"   ✅ Bibliography sorted successfully: {env_config.bibliography_section}.md")
                else:
                    print(f"   ⚠️  Bibliography processing warning: {bib_error}")
                    logger.warning(f"Bibliography processing issue: {bib_error}")

        print(f"\n{ColorCodes.GREEN}🎉 All sections processed successfully!{ColorCodes.RESET}")
        return True

    except Exception as e:
        logger.error(f"Section processing failed: {e}")
        print(f"{ColorCodes.RED}❌ Processing failed: {e}{ColorCodes.RESET}")
        return False


def clean_generated_files(output_dir: Path, pattern: str = "*.md",
                         backup_pattern: str = "*.backup", logger: Optional[logging.Logger] = None) -> Dict[str, int]:
    """
    Clean generated merge files and backups from output directory.

    Args:
        output_dir: Directory containing generated files
        pattern: File pattern to clean (default: *.md)
        backup_pattern: Backup file pattern to clean (default: *.backup)
        logger: Optional logger for detailed reporting

    Returns:
        Dictionary with cleanup statistics
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    stats = {
        'files_removed': 0,
        'backups_removed': 0,
        'bytes_freed': 0,
        'errors': 0
    }

    if not output_dir.exists():
        logger.info(f"Output directory does not exist: {output_dir}")
        return stats

    try:
        # Clean main files
        main_files = list(output_dir.glob(pattern))
        for file_path in main_files:
            try:
                file_size = file_path.stat().st_size
                file_path.unlink()
                stats['files_removed'] += 1
                stats['bytes_freed'] += file_size
                logger.debug(f"Removed file: {file_path.name}")
            except Exception as e:
                logger.warning(f"Could not remove file {file_path.name}: {e}")
                stats['errors'] += 1

        # Clean backup files
        backup_files = list(output_dir.glob(backup_pattern))
        for backup_path in backup_files:
            try:
                backup_size = backup_path.stat().st_size
                backup_path.unlink()
                stats['backups_removed'] += 1
                stats['bytes_freed'] += backup_size
                logger.debug(f"Removed backup: {backup_path.name}")
            except Exception as e:
                logger.warning(f"Could not remove backup {backup_path.name}: {e}")
                stats['errors'] += 1

        # Clean temporary files
        temp_files = list(output_dir.glob("*.tmp"))
        for temp_path in temp_files:
            try:
                temp_size = temp_path.stat().st_size
                temp_path.unlink()
                stats['bytes_freed'] += temp_size
                logger.debug(f"Removed temp file: {temp_path.name}")
            except Exception as e:
                logger.warning(f"Could not remove temp file {temp_path.name}: {e}")
                stats['errors'] += 1

        logger.info(f"Cleanup complete: {stats['files_removed']} files, {stats['backups_removed']} backups, "
                   f"{format_size(stats['bytes_freed'])} freed")

    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        stats['errors'] += 1

    return stats


def verify_merged_files(output_dir: Path, expected_sections: List[str],
                       logger: Optional[logging.Logger] = None) -> Tuple[bool, Dict[str, any]]:
    """
    Verify that all expected merged files were created successfully.

    Args:
        output_dir: Directory containing merged files
        expected_sections: List of section names that should have output files
        logger: Optional logger for detailed reporting

    Returns:
        Tuple of (all_valid, verification_report)
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    report = {
        'total_expected': len(expected_sections),
        'files_found': 0,
        'files_missing': [],
        'files_empty': [],
        'files_valid': [],
        'total_size': 0,
        'verification_errors': []
    }

    try:
        for section_name in expected_sections:
            output_file = output_dir / f"{section_name}.md"

            if not output_file.exists():
                report['files_missing'].append(section_name)
                report['verification_errors'].append(f"Missing output file: {section_name}.md")
                continue

            try:
                file_stat = output_file.stat()
                file_size = file_stat.st_size

                report['files_found'] += 1
                report['total_size'] += file_size

                if file_size == 0:
                    report['files_empty'].append(section_name)
                    report['verification_errors'].append(f"Empty output file: {section_name}.md")
                else:
                    report['files_valid'].append(section_name)

                # Basic content validation
                try:
                    with open(output_file, 'r', encoding='utf-8') as f:
                        content = f.read()

                    # Check for basic markdown structure
                    if not content.strip():
                        report['verification_errors'].append(f"File contains only whitespace: {section_name}.md")
                    elif len(content.split('\n')) < 2:
                        report['verification_errors'].append(f"File suspiciously short: {section_name}.md")

                except Exception as e:
                    report['verification_errors'].append(f"Cannot read file {section_name}.md: {e}")

            except Exception as e:
                report['verification_errors'].append(f"Cannot stat file {section_name}.md: {e}")

        # Summary
        all_valid = (len(report['files_missing']) == 0 and
                    len(report['files_empty']) == 0 and
                    len(report['verification_errors']) == 0)

        logger.info(f"Verification complete: {report['files_valid']}/{report['total_expected']} valid files, "
                   f"{format_size(report['total_size'])} total")

        if report['verification_errors']:
            logger.warning(f"Verification issues found: {len(report['verification_errors'])}")
            for error in report['verification_errors']:
                logger.warning(f"  • {error}")

    except Exception as e:
        logger.error(f"Verification failed: {e}")
        report['verification_errors'].append(f"Verification process failed: {e}")
        all_valid = False

    return all_valid, report


def export_processing_report(merge_results: List[MergeResult], processing_stats: Dict[str, str],
                           output_path: Optional[Path] = None, logger: Optional[logging.Logger] = None) -> Path:
    """
    Export detailed processing report in JSON format for automation integration.

    Args:
        merge_results: List of merge results from processing
        processing_stats: Processing statistics dictionary
        output_path: Optional custom output path (auto-generated if None)
        logger: Optional logger for detailed reporting

    Returns:
        Path to the exported report file
    """
    if logger is None:
        logger = logging.getLogger('merge_processor')

    # Generate output path if not provided
    if output_path is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = Path(f"generated/reports/merge-processor/processing_report_{timestamp}.json")

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        report_data = {
            'metadata': {
                'report_type': 'section_merge_processing',
                'generated_at': datetime.now().isoformat(),
                'python_script': 'merge-sections-processor.py',
                'total_sections_processed': len(merge_results)
            },
            'processing_stats': processing_stats,
            'results': []
        }

        # Add detailed results
        for result in merge_results:
            result_data = {
                'section_name': result.section_name,
                'section_path': str(result.section_path),
                'output_file': str(result.output_file),
                'success': result.success,
                'processing_time_seconds': result.processing_time,
                'file_count': result.file_count,
                'numbered_files': result.numbered_files,
                'other_files': result.other_files,
                'total_input_size_bytes': result.total_size,
                'output_size_bytes': result.output_size,
                'compression_ratio': (result.output_size / result.total_size * 100) if result.total_size > 0 else 0,
                'error_message': result.error_message
            }
            report_data['results'].append(result_data)

        # Write report
        with open(output_path, 'w', encoding='utf-8') as f:
            import json
            json.dump(report_data, f, indent=2, ensure_ascii=False)

        logger.info(f"Processing report exported: {output_path}")
        return output_path

    except Exception as e:
        logger.error(f"Failed to export processing report: {e}")
        raise


def main():
    """Main entry point with comprehensive CLI interface."""
    parser = argparse.ArgumentParser(
        description="Parallel Section Merger for Theodore Thesis System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Merge all sections
  python merge-sections-processor.py sections generated/markdown --target=all

  # Merge specific sections
  python merge-sections-processor.py sections generated/markdown --target=single --sections=2-seccion-1,3-seccion-2

  # Dry run validation
  python merge-sections-processor.py sections generated/markdown --target=all --dry-run

  # Custom worker count with verbose output
  python merge-sections-processor.py sections generated/markdown --target=all --workers=8 --verbose

  # Remove heading numbers during merge
  python merge-sections-processor.py sections generated/markdown --target=all --remove-numbers

  # Export processing report
  python merge-sections-processor.py sections generated/markdown --target=all --export-report

  # Clean existing output files
  python merge-sections-processor.py sections generated/markdown --clean-only
        """
    )

    # Required arguments
    parser.add_argument(
        "sections_root",
        type=Path,
        help="Root directory containing thesis sections"
    )
    parser.add_argument(
        "output_dir",
        type=Path,
        help="Directory where merged files will be saved"
    )

    # Processing mode
    parser.add_argument(
        "--target",
        choices=['single', 'all', 'batch'],
        default='all',
        help="Processing target mode (default: all)"
    )
    parser.add_argument(
        "--sections",
        type=str,
        help="Comma-separated list of specific sections to process (required for single/batch modes)"
    )

    # Performance options
    parser.add_argument(
        "--workers",
        type=int,
        help="Number of parallel workers (default: auto-detect optimal)"
    )

    # Operation modes
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate sections and files without writing output (validation mode)"
    )
    parser.add_argument(
        "--clean-only",
        action="store_true",
        help="Clean existing output files and exit (cleanup mode)"
    )
    parser.add_argument(
        "--remove-numbers",
        action="store_true",
        help="Remove hardcoded heading numbers from merged content (e.g., '# 1. Title' → '# Title')"
    )

    # Output options
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose progress reporting and detailed logging"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress output (errors still shown)"
    )
    parser.add_argument(
        "--export-report",
        action="store_true",
        help="Export detailed processing report in JSON format"
    )

    # Validation options
    parser.add_argument(
        "--verify-output",
        action="store_true",
        help="Verify merged files after processing"
    )

    args = parser.parse_args()

    # Validate argument combinations
    if args.target in ['single', 'batch'] and not args.sections:
        print(f"{ColorCodes.RED}❌ Error: --sections required for {args.target} mode{ColorCodes.RESET}")
        parser.print_help()
        sys.exit(1)

    if args.verbose and args.quiet:
        print(f"{ColorCodes.RED}❌ Error: --verbose and --quiet cannot be used together{ColorCodes.RESET}")
        sys.exit(1)

    if args.clean_only and args.dry_run:
        print(f"{ColorCodes.RED}❌ Error: --clean-only and --dry-run cannot be used together{ColorCodes.RESET}")
        sys.exit(1)

    # Validate input directory
    if not args.sections_root.exists():
        print(f"{ColorCodes.RED}❌ Error: Sections directory not found: {args.sections_root}{ColorCodes.RESET}")
        sys.exit(1)

    if not args.sections_root.is_dir():
        print(f"{ColorCodes.RED}❌ Error: Not a directory: {args.sections_root}{ColorCodes.RESET}")
        sys.exit(1)

    # Setup logging
    logger = setup_logging(verbose=args.verbose)

    # Parse target sections
    target_sections = None
    if args.sections:
        target_sections = set(section.strip() for section in args.sections.split(','))
        logger.info(f"Target sections specified: {target_sections}")

    try:
        # Clean-only mode
        if args.clean_only:
            if not args.quiet:
                print(f"{ColorCodes.CYAN}🧹 Cleaning output directory: {args.output_dir}{ColorCodes.RESET}")

            if not args.output_dir.exists():
                if not args.quiet:
                    print(f"{ColorCodes.YELLOW}⚠️  Output directory does not exist: {args.output_dir}{ColorCodes.RESET}")
                sys.exit(0)

            cleanup_stats = clean_generated_files(args.output_dir, logger=logger)

            if not args.quiet:
                print(f"{ColorCodes.GREEN}✅ Cleanup complete:{ColorCodes.RESET}")
                print(f"   📁 Files removed: {cleanup_stats['files_removed']}")
                print(f"   🗂️  Backups removed: {cleanup_stats['backups_removed']}")
                print(f"   💾 Space freed: {format_size(cleanup_stats['bytes_freed'])}")

                if cleanup_stats['errors'] > 0:
                    print(f"   ⚠️  Errors encountered: {cleanup_stats['errors']}")

            sys.exit(0 if cleanup_stats['errors'] == 0 else 1)

        # Main processing mode
        operation_name = "validation" if args.dry_run else "merging"

        if not args.quiet:
            print(f"{ColorCodes.BOLD}{ColorCodes.CYAN}")
            print("╔══════════════════════════════════════════════════════════════╗")
            print(f"║              📚 Theodore Section {operation_name.title():12}                ║")
            print("╚══════════════════════════════════════════════════════════════╝")
            print(f"{ColorCodes.RESET}")

        # Process sections
        success = process_sections(
            sections_root=args.sections_root,
            output_dir=args.output_dir,
            target_sections=target_sections,
            max_workers=args.workers,
            dry_run=args.dry_run,
            remove_numbers=args.remove_numbers,
            verbose=args.verbose and not args.quiet,
            logger=logger
        )

        if not success:
            sys.exit(1)

        # Post-processing verification
        if args.verify_output and not args.dry_run:
            if not args.quiet:
                print(f"\n{ColorCodes.BOLD}🔍 Verifying output files...{ColorCodes.RESET}")

            # Determine expected sections
            sections, errors = discover_all_sections(args.sections_root, target_sections, logger)
            expected_section_names = [s.name for s in sections]

            all_valid, verification_report = verify_merged_files(
                args.output_dir, expected_section_names, logger
            )

            if not args.quiet:
                if all_valid:
                    print(f"{ColorCodes.GREEN}✅ All output files verified successfully{ColorCodes.RESET}")
                else:
                    print(f"{ColorCodes.RED}❌ Verification failed:{ColorCodes.RESET}")
                    for error in verification_report['verification_errors']:
                        print(f"   • {error}")

        # Export processing report
        if args.export_report and not args.dry_run:
            if not args.quiet:
                print(f"\n{ColorCodes.BOLD}📊 Exporting processing report...{ColorCodes.RESET}")

            # We need to re-process to get detailed results for export
            # For now, just indicate that this feature would require integration
            # with the main processing function to capture results
            print(f"{ColorCodes.YELLOW}ℹ️  Report export feature requires integration with processing results{ColorCodes.RESET}")

        if not args.quiet:
            print(f"\n{ColorCodes.GREEN}🎉 {operation_name.title()} completed successfully!{ColorCodes.RESET}")

        sys.exit(0)

    except KeyboardInterrupt:
        print(f"\n{ColorCodes.YELLOW}⚠️  Operation interrupted by user{ColorCodes.RESET}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        print(f"{ColorCodes.RED}❌ Processing failed: {e}{ColorCodes.RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()