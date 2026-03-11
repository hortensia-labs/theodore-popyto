#!/usr/bin/env python3
"""
Shared ICML processing functions.

This module provides functions for:
- Pandoc command building for ICML conversion
- Cross-reference compatibility fixes
- Paragraph style replacements
- Table layout normalization

Used by compile-icml.py and compile-chapter.py.

Style replacements operate on two forms found in ICML XML:
    - ParagraphStyle/StyleName  (attribute values)
    - "StyleName"               (standalone quoted references)
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple, TYPE_CHECKING

from config import FileStyleMapping, StyleMappingEntry

if TYPE_CHECKING:
    from config import Config


# ---------------------------------------------------------------------------
# Pandoc conversion helpers
# ---------------------------------------------------------------------------

def get_pandoc_command(
    input_file: Path,
    output_file: Path,
    config: "Config"
) -> List[str]:
    """
    Build the Pandoc command for ICML conversion.

    Args:
        input_file: Source markdown file
        output_file: Target ICML file
        config: Configuration object

    Returns:
        List of command arguments
    """
    pandoc_config = config.pandoc

    cmd = ['pandoc']
    cmd.extend(['-f', pandoc_config.input_format])
    cmd.extend(['-t', pandoc_config.output_format])
    cmd.append('-s')  # Standalone document

    for flag in pandoc_config.flags:
        cmd.append(flag)

    cmd.append(f'--id-prefix={pandoc_config.id_prefix}')
    cmd.append(str(input_file))
    cmd.extend(['-o', str(output_file)])

    return cmd


def restore_tabs_from_placeholder(content: str, placeholder: str) -> Tuple[str, int]:
    """
    Restore tab characters from placeholders in ICML content.

    Replaces every occurrence of the placeholder string with a literal
    tab character (U+0009).  InDesign interprets literal tabs inside
    <Content> elements using the paragraph style's tab stop settings.

    Args:
        content: ICML file content
        placeholder: The placeholder string to replace with tabs

    Returns:
        Tuple of (modified content, number of tabs restored)
    """
    count = content.count(placeholder)
    if count > 0:
        content = content.replace(placeholder, '\t')
    return content, count


def apply_crossref_fix(content: str) -> str:
    """
    Apply cross-reference compatibility fix.

    Fixes the HyperlinkTextDestination Name attribute to match
    InDesign's expected format.

    Args:
        content: ICML file content

    Returns:
        Fixed content
    """
    pattern = re.compile(
        r'(<HyperlinkTextDestination Self="HyperlinkTextDestination/(#[^"]*)" Name=")Destination(")',
        re.MULTILINE
    )
    return pattern.sub(r'\1\2\3', content)


# ---------------------------------------------------------------------------
# Paragraph style replacements
# ---------------------------------------------------------------------------

def apply_bibliography_styling(content: str, style_name: str) -> Tuple[str, int]:
    """
    Apply bibliography paragraph styles.

    Replaces standard Paragraph style with Bibliography style.

    Args:
        content: ICML file content
        style_name: Bibliography style name

    Returns:
        Tuple of (modified content, number of changes)
    """
    changes = 0

    # Replace ParagraphStyle/Paragraph with bibliography style
    old_style = 'ParagraphStyle/Paragraph'
    new_style = f'ParagraphStyle/{style_name}'
    if old_style in content:
        count = content.count(old_style)
        content = content.replace(old_style, new_style)
        changes += count

    # Replace quoted "Paragraph"
    old_quoted = '"Paragraph"'
    new_quoted = f'"{style_name}"'
    if old_quoted in content:
        count = content.count(old_quoted)
        content = content.replace(old_quoted, new_quoted)
        changes += count

    return content, changes


def apply_glossary_styling(
    content: str,
    term_style: str,
    definition_style: str
) -> Tuple[str, int]:
    """
    Apply glossary/definition list styles.

    Args:
        content: ICML file content
        term_style: Style for definition terms
        definition_style: Style for definitions

    Returns:
        Tuple of (modified content, number of changes)
    """
    changes = 0

    # Definition Term styling
    old_dt = 'ParagraphStyle/DefinitionTerm'
    new_dt = f'ParagraphStyle/{term_style}'
    if old_dt in content:
        count = content.count(old_dt)
        content = content.replace(old_dt, new_dt)
        changes += count

    # Definition Description styling
    old_dd = 'ParagraphStyle/DefinitionDescription'
    new_dd = f'ParagraphStyle/{definition_style}'
    if old_dd in content:
        count = content.count(old_dd)
        content = content.replace(old_dd, new_dd)
        changes += count

    return content, changes


def apply_custom_style_mappings(
    content: str,
    mappings: List[StyleMappingEntry]
) -> Tuple[str, int]:
    """
    Apply arbitrary paragraph style replacements to ICML content.

    For each mapping, replaces both the ParagraphStyle/X form and
    the standalone quoted "X" form.

    Args:
        content: ICML file content
        mappings: List of source -> target style replacements

    Returns:
        Tuple of (modified content, total number of changes)
    """
    total_changes = 0
    for mapping in mappings:
        # Replace ParagraphStyle/Source -> ParagraphStyle/Target
        old_ps = f'ParagraphStyle/{mapping.source}'
        new_ps = f'ParagraphStyle/{mapping.target}'
        count = content.count(old_ps)
        if count:
            content = content.replace(old_ps, new_ps)
            total_changes += count

        # Replace standalone quoted "Source" -> "Target"
        old_q = f'"{mapping.source}"'
        new_q = f'"{mapping.target}"'
        count = content.count(old_q)
        if count:
            content = content.replace(old_q, new_q)
            total_changes += count

    return content, total_changes


def get_mappings_for_file(
    section_name: str,
    style_mappings: List[FileStyleMapping]
) -> List[StyleMappingEntry]:
    """
    Return all style mappings that match the given section/file name.

    Matching rules:
        - Exact match: section_name == mapping.file
        - Prefix match: section_name starts with mapping.file + '_'

    This allows "L1_CAP01" to match both "L1_CAP01.icml" (exact)
    and a file named "L1_CAP01_Title.icml" (prefix).

    Args:
        section_name: The ICML file stem (without .icml extension)
        style_mappings: List of file-level style mapping configurations

    Returns:
        Aggregated list of StyleMappingEntry for all matching files
    """
    result: List[StyleMappingEntry] = []
    for fm in style_mappings:
        if section_name == fm.file or section_name.startswith(fm.file + '_'):
            result.extend(fm.mappings)
    return result


# ---------------------------------------------------------------------------
# Table layout normalization
# ---------------------------------------------------------------------------

# Regex matching a <Table ...> tag followed by one or more <Column .../> elements
_TABLE_COLUMNS_RE = re.compile(
    r'(<Table\b[^>]*>)'                        # group 1: Table opening tag
    r'((?:\s*<Column\b[^/]*/>\s*)+)',           # group 2: consecutive Column elements
    re.DOTALL
)

# Regex matching a SingleColumnWidth attribute value inside a <Column> element
_COLUMN_WIDTH_RE = re.compile(r'SingleColumnWidth="([^"]+)"')


def normalize_table_widths(
    content: str,
    max_width: Optional[float]
) -> Tuple[str, int]:
    """
    Scale table column widths so their sum equals max_width.

    For every <Table> block in the ICML content, reads all
    <Column SingleColumnWidth="..."> values, computes their sum,
    and proportionally scales each value so the total matches
    max_width.  Tables whose columns already sum to max_width
    (within a 0.01-point tolerance) are left untouched.

    Args:
        content: ICML file content
        max_width: Target total column width in points.
                   If None or <= 0, the content is returned unchanged.

    Returns:
        Tuple of (modified content, number of tables adjusted)
    """
    if not max_width or max_width <= 0:
        return content, 0

    tables_adjusted = 0

    def _scale_table(match: re.Match) -> str:
        nonlocal tables_adjusted

        table_tag = match.group(1)
        columns_text = match.group(2)

        # Extract current widths
        widths = [float(w) for w in _COLUMN_WIDTH_RE.findall(columns_text)]
        if not widths:
            return match.group(0)

        current_sum = sum(widths)
        if current_sum <= 0:
            return match.group(0)

        # Skip if already at target width (within tolerance)
        if abs(current_sum - max_width) < 0.01:
            return match.group(0)

        scale_factor = max_width / current_sum

        # Replace each width with its scaled value
        def _replace_width(w_match: re.Match) -> str:
            old_width = float(w_match.group(1))
            new_width = old_width * scale_factor
            return f'SingleColumnWidth="{new_width}"'

        new_columns = _COLUMN_WIDTH_RE.sub(_replace_width, columns_text)
        tables_adjusted += 1

        return table_tag + new_columns

    content = _TABLE_COLUMNS_RE.sub(_scale_table, content)
    return content, tables_adjusted
