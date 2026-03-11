#!/usr/bin/env python3
"""
Shared utility functions for the editorial build system.

This module centralizes common helper functions used across multiple
scripts to avoid duplication.

Usage:
    from utils import format_time, format_size, normalize_text_content
"""

import re
import unicodedata
from pathlib import Path
from typing import Tuple


def format_time(seconds: float) -> str:
    """Format time duration for display.

    Args:
        seconds: Duration in seconds

    Returns:
        Human-readable time string (e.g., "42ms", "1.23s")
    """
    if seconds < 1:
        return f"{seconds * 1000:.0f}ms"
    return f"{seconds:.2f}s"


def format_size(size_bytes: int) -> str:
    """Format file size in human-readable format.

    Args:
        size_bytes: Size in bytes

    Returns:
        Human-readable size string (e.g., "1.2 KB", "3.4 MB")
    """
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def normalize_text_content(content: str) -> str:
    """
    Normalize text content for consistent processing.

    - Normalizes Unicode (NFKC)
    - Converts line endings to Unix style
    - Removes trailing whitespace per line

    Args:
        content: Raw text content

    Returns:
        Normalized text content
    """
    content = unicodedata.normalize('NFKC', content)
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    lines = content.split('\n')
    normalized_lines = [line.rstrip() for line in lines]
    return '\n'.join(normalized_lines)


def replace_tabs_with_placeholder(content: str, placeholder: str) -> Tuple[str, int]:
    """
    Replace tab characters with a placeholder in non-code-block text.

    Skips content inside fenced code blocks (``` or ~~~) so that
    tabs used for code indentation are not affected.

    Args:
        content: Markdown text content
        placeholder: String to substitute for each tab character

    Returns:
        Tuple of (processed content, number of tabs replaced)
    """
    lines = content.split('\n')
    result_lines = []
    total_replaced = 0
    in_code_block = False

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith('```') or stripped.startswith('~~~'):
            in_code_block = not in_code_block
            result_lines.append(line)
            continue

        if in_code_block:
            result_lines.append(line)
            continue

        count = line.count('\t')
        if count > 0:
            total_replaced += count
            line = line.replace('\t', placeholder)
        result_lines.append(line)

    return '\n'.join(result_lines), total_replaced


def remove_heading_numbers(content: str) -> Tuple[str, int]:
    """
    Remove heading numbers from markdown content.

    Examples:
        - "# 1. Title" -> "# Title"
        - "## 2.1 Subtitle" -> "## Subtitle"
        - "### 3.2.1. Section" -> "### Section"

    Args:
        content: Original markdown content

    Returns:
        Tuple of (processed_content, number_of_changes)
    """
    pattern = re.compile(r'^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\u00a0]+', re.MULTILINE)
    processed_content, changes = pattern.subn(r'\1 ', content)
    return processed_content, changes


def natural_sort_key(text: str) -> list:
    """
    Generate a sort key for natural ordering of filenames.

    Splits into numeric and non-numeric parts so that numeric segments
    are compared as integers (e.g., "10" > "2").

    Handles patterns like:
        3.1.1-cuerpo.md   → [3, '.', 1, '.', 1, '-cuerpo']
        3.1.1b-paradigmas  → [3, '.', 1, '.', 1, 'b-paradigmas']
        10-correspondencia → [10, '-correspondencia']
        abstract           → ['abstract']
    """
    parts = re.split(r'(\d+)', text)
    return [int(part) if part.isdigit() else part.lower() for part in parts]


def count_words(file_path: Path) -> int:
    """
    Count words in a markdown file, stripping markdown syntax.

    Args:
        file_path: Path to markdown file

    Returns:
        Approximate word count
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'```[\s\S]*?```', '', content)
        content = re.sub(r'`[^`]+`', '', content)
        content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)
        content = re.sub(r'^#{1,6}\s*', '', content, flags=re.MULTILINE)
        content = re.sub(r'[*_]{1,3}', '', content)
        return len(content.split())
    except Exception:
        return 0
