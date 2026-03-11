#!/usr/bin/env python3
"""
Validate cross-references against anchor registry.

This script validates that all internal cross-references point to
existing anchors in the generated markdown files.

Usage:
    python validate-book.py <book_id> --config <config_file> [--verbose]

Arguments:
    book_id:        Book identifier (libro1 or libro2)
    --config:       Path to build.config.json
    --verbose:      Enable detailed logging

Example:
    python validate-book.py libro1 --config build.config.json
    python validate-book.py libro2 --config build.config.json --verbose

Exit codes:
    0: All cross-references are valid
    1: Invalid cross-references found or other errors
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, NamedTuple, Set

# Add lib directory to path for config import
sys.path.insert(0, str(Path(__file__).parent))
from config import (
    load_config,
    get_book_config,
    BookConfig,
    Config
)


class InvalidReference(NamedTuple):
    """Information about an invalid reference."""
    file: str
    line: int
    target: str
    text: str


class ValidationResult(NamedTuple):
    """Result of validation."""
    total_anchors: int
    total_references: int
    valid_references: int
    invalid_references: List[InvalidReference]
    orphan_anchors: List[str]


def load_crossref_registry(registry_file: Path) -> Dict:
    """
    Load cross-reference registry from JSON file.

    Args:
        registry_file: Path to crossref-registry.json

    Returns:
        Registry dictionary

    Raises:
        FileNotFoundError: If registry doesn't exist
        json.JSONDecodeError: If registry is invalid
    """
    if not registry_file.exists():
        raise FileNotFoundError(
            f"Cross-reference registry not found: {registry_file}\n"
            "Tip: Run 'just scan <book>' first to generate the registry"
        )

    with open(registry_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_references(
    registry: Dict,
    verbose: bool = False
) -> ValidationResult:
    """
    Validate all references against anchors.

    Args:
        registry: Cross-reference registry
        verbose: Enable verbose output

    Returns:
        ValidationResult with validation details
    """
    anchors = registry.get('anchors', {})
    references = registry.get('references', [])

    # Track which anchors are referenced
    referenced_anchors: Set[str] = set()
    invalid_refs: List[InvalidReference] = []
    valid_count = 0

    for ref in references:
        target = ref['target']
        # Remove leading # if present
        anchor_id = target.lstrip('#')

        if anchor_id in anchors:
            valid_count += 1
            referenced_anchors.add(anchor_id)
            if verbose:
                print(f"    OK: [{ref['text']}](#{anchor_id}) in {ref['file']}:{ref['line']}")
        else:
            invalid_refs.append(InvalidReference(
                file=ref['file'],
                line=ref['line'],
                target=anchor_id,
                text=ref['text']
            ))
            if verbose:
                print(f"    INVALID: [{ref['text']}](#{anchor_id}) in {ref['file']}:{ref['line']}")

    # Find orphan anchors (defined but never referenced)
    all_anchors = set(anchors.keys())
    orphan_anchors = sorted(all_anchors - referenced_anchors)

    return ValidationResult(
        total_anchors=len(anchors),
        total_references=len(references),
        valid_references=valid_count,
        invalid_references=invalid_refs,
        orphan_anchors=orphan_anchors
    )


def validate_book(
    book_id: str,
    config: Config,
    verbose: bool = False
) -> bool:
    """
    Validate cross-references for a book.

    Args:
        book_id: Book identifier
        config: Configuration object
        verbose: Enable verbose output

    Returns:
        True if all references are valid
    """
    # Get book configuration
    try:
        book_config = get_book_config(config, book_id)
    except KeyError as e:
        print(f"Error: {e}")
        return False

    print(f"Validating {book_config.title} ({book_id})...")

    # Load registry
    registry_file = book_config.output.data / "crossref-registry.json"

    try:
        registry = load_crossref_registry(registry_file)
    except FileNotFoundError as e:
        print(f"  Error: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"  Error: Invalid registry JSON: {e}")
        return False

    # Perform validation
    if verbose:
        print("  Checking references...")

    result = validate_references(registry, verbose)

    # Report results
    print(f"\n  Summary:")
    print(f"    Total anchors: {result.total_anchors}")
    print(f"    Total references: {result.total_references}")
    print(f"    Valid references: {result.valid_references}")
    print(f"    Invalid references: {len(result.invalid_references)}")

    # Report invalid references
    if result.invalid_references:
        print(f"\n  Invalid Cross-References:")
        print("  " + "=" * 50)

        # Group by file
        by_file: Dict[str, List[InvalidReference]] = {}
        for ref in result.invalid_references:
            if ref.file not in by_file:
                by_file[ref.file] = []
            by_file[ref.file].append(ref)

        for file, refs in sorted(by_file.items()):
            print(f"\n  {file}:")
            for ref in sorted(refs, key=lambda r: r.line):
                print(f"    Line {ref.line}: [{ref.text}](#{ref.target})")
                print(f"      Anchor '#{ref.target}' not found in registry")

        print(f"\n  Tip: Run 'just scan {book_id}' to rebuild the anchor registry")
        return False

    # Report orphan anchors (informational only)
    if result.orphan_anchors and verbose:
        print(f"\n  Unused anchors ({len(result.orphan_anchors)}):")
        for anchor in result.orphan_anchors[:10]:
            anchor_info = registry['anchors'].get(anchor, {})
            file = anchor_info.get('file', 'unknown')
            line = anchor_info.get('line', '?')
            print(f"    #{anchor} ({file}:{line})")
        if len(result.orphan_anchors) > 10:
            print(f"    ... and {len(result.orphan_anchors) - 10} more")

    print(f"\n  All cross-references are valid!")
    return True


if __name__ == "__main__":
    from cli import run_cli
    run_cli(
        description="Validate cross-references against anchor registry",
        main_func=validate_book,
    )
