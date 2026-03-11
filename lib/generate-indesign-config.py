#!/usr/bin/env python3
"""
Generate InDesign configuration file for JSX scripts.

This script generates a JSON configuration file that InDesign JSX scripts
can read to obtain paths and settings specific to each book. This enables
the same JSX scripts to work with multiple books without hardcoded paths.

Usage:
    python3 lib/generate-indesign-config.py libro1 [--config build.config.json] [--verbose]
    python3 lib/generate-indesign-config.py libro2 --verbose

Output:
    generated/{libro}/data/indesign-config.json

The generated config contains:
    - Book metadata (id, prefix, title)
    - Absolute paths to all relevant directories
    - Registry file paths (crossref, hyperlink, citation)
    - Report output paths
    - InDesign-specific settings (TOC, bibliography)
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# Add lib directory to path for local imports
SCRIPT_DIR = Path(__file__).parent.resolve()
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import load_config, get_book_config, ensure_output_dirs


def generate_indesign_config(
    book_id: str,
    config_path: Optional[Path] = None,
    verbose: bool = False
) -> Dict[str, Any]:
    """
    Generate InDesign configuration dictionary for a book.

    Args:
        book_id: Book identifier (libro1 or libro2)
        config_path: Optional path to build.config.json
        verbose: Print detailed output

    Returns:
        Dictionary with complete InDesign configuration

    Raises:
        KeyError: If book_id is not found
        FileNotFoundError: If config file is not found
    """
    # Load main configuration
    config = load_config(config_path)
    book = get_book_config(config, book_id)
    project_root = config.project_root

    if verbose:
        print(f"Generating InDesign config for: {book.title}")
        print(f"Project root: {project_root}")

    # Ensure output directories exist
    ensure_output_dirs(book)

    # Create reports directories if they don't exist
    reports_dir = book.output.root / "reports"
    crossref_reports_dir = reports_dir / "crossref"
    hyperlink_reports_dir = reports_dir / "url-hyperlinks"

    crossref_reports_dir.mkdir(parents=True, exist_ok=True)
    hyperlink_reports_dir.mkdir(parents=True, exist_ok=True)

    if verbose:
        print(f"Reports directory: {reports_dir}")

    # Get InDesign settings from parsed config (no need to re-read raw JSON)
    book_ids = book.indesign
    global_ids = config.indesign

    # Build the configuration structure for JSX scripts
    indesign_config: Dict[str, Any] = {
        "version": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "generate-indesign-config.py",

        "book": {
            "id": book.id,
            "prefix": book.prefix,
            "title": book.title
        },

        "paths": {
            "projectRoot": str(project_root),
            "generatedRoot": str(book.output.root),
            "dataFolder": str(book.output.data),
            "icmlFolder": str(book.output.icml),
            "reportsFolder": str(reports_dir)
        },

        "registries": {
            "crossref": str(book.output.data / "crossref-registry.json"),
            "hyperlink": str(book.output.data / "hyperlink-registry.json"),
            "citation": str(book.output.data / "citation-registry.json")
        },

        "reports": {
            "crossref": str(crossref_reports_dir),
            "hyperlinks": str(hyperlink_reports_dir)
        },

        "indesign": {
            "bookFile": book_ids.book_file if book_ids else f"{book_id}.indb",
            "tocDocument": book_ids.toc_document if book_ids else f"{book.prefix}_TOC",
            "tocStyle": book_ids.toc_style if book_ids else "TOC Style",
            "bibliographyFile": book_ids.bibliography_file if book_ids else f"{book.prefix}_BIBLIOGRAFIA",
            "bibliographyStyle": global_ids.bibliography_style
        }
    }

    return indesign_config


def write_indesign_config(
    book_id: str,
    config_path: Optional[Path] = None,
    verbose: bool = False
) -> Path:
    """
    Generate and write InDesign configuration file.

    Args:
        book_id: Book identifier (libro1 or libro2)
        config_path: Optional path to build.config.json
        verbose: Print detailed output

    Returns:
        Path to the generated configuration file
    """
    # Generate config
    indesign_config = generate_indesign_config(book_id, config_path, verbose)

    # Determine output path
    output_path = Path(indesign_config["paths"]["dataFolder"]) / "indesign-config.json"

    # Write JSON with nice formatting (ExtendScript can parse this)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(indesign_config, f, indent=2, ensure_ascii=False)

    if verbose:
        print(f"\nGenerated configuration:")
        print(json.dumps(indesign_config, indent=2, ensure_ascii=False))

    return output_path


def validate_config(indesign_config: Dict[str, Any]) -> list[str]:
    """
    Validate that required directories and files exist.

    Args:
        indesign_config: Generated configuration dictionary

    Returns:
        List of warning messages (empty if all valid)
    """
    warnings = []

    # Check that key directories exist
    paths_to_check = [
        ("dataFolder", indesign_config["paths"]["dataFolder"]),
        ("icmlFolder", indesign_config["paths"]["icmlFolder"]),
        ("reportsFolder", indesign_config["paths"]["reportsFolder"]),
    ]

    for name, path_str in paths_to_check:
        path = Path(path_str)
        if not path.exists():
            warnings.append(f"Directory does not exist: {name} = {path_str}")

    # Check registries (optional, they may not exist yet)
    for registry_name, registry_path in indesign_config["registries"].items():
        if not Path(registry_path).exists():
            warnings.append(f"Registry not found (run 'just scan' first): {registry_name}")

    return warnings


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate InDesign configuration file for JSX scripts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python3 lib/generate-indesign-config.py libro1
    python3 lib/generate-indesign-config.py libro2 --verbose
    python3 lib/generate-indesign-config.py libro1 --config build.config.json

The generated file will be at:
    generated/{libro}/data/indesign-config.json
"""
    )

    parser.add_argument(
        "book_id",
        help="Book identifier (from build.config.json)"
    )

    parser.add_argument(
        "--config", "-c",
        type=Path,
        default=None,
        help="Path to build.config.json (default: auto-detect)"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed output"
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate generated config and report warnings"
    )

    args = parser.parse_args()

    try:
        # Generate and write config
        output_path = write_indesign_config(
            args.book_id,
            args.config,
            args.verbose
        )

        print(f"Generated: {output_path}")

        # Optionally validate
        if args.validate:
            indesign_config = generate_indesign_config(args.book_id, args.config)
            warnings = validate_config(indesign_config)
            if warnings:
                print("\nWarnings:")
                for warning in warnings:
                    print(f"  - {warning}")
            else:
                print("\nValidation: OK")

        return 0

    except KeyError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
