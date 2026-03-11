#!/usr/bin/env python3
"""
Unified CLI module for the editorial build system.

Encapsulates the common argparse boilerplate shared by all scripts:
book argument, --config, --verbose, config loading, error handling, exit codes.

Usage:
    from cli import run_cli

    def process_book(book_id, config, verbose=False):
        # ... do work ...
        return True  # success

    if __name__ == "__main__":
        run_cli(
            description="Process book files",
            main_func=process_book,
        )
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence

from config import load_config, Config


def run_cli(
    description: str,
    main_func: Callable,
    extra_args: Optional[List[Dict[str, Any]]] = None,
    book_required: bool = True,
) -> None:
    """
    Run a CLI script with standard argument handling.

    Creates an argparse parser with common arguments (book, --config, --verbose),
    loads configuration, calls main_func, and handles errors/exit codes.

    Args:
        description: Script description for --help
        main_func: Callable to invoke. Receives (book_id, config, **kwargs)
                   where kwargs includes verbose and any extra arguments.
                   Must return True for success, False for failure.
        extra_args: Optional list of extra argument definitions. Each dict
                    contains 'name' (str or list of str for flags) and any
                    kwargs accepted by argparse.add_argument().
                    Example: [
                        {"name": "chapter", "help": "Chapter identifier"},
                        {"name": ["--summary", "-s"], "action": "store_true"},
                    ]
        book_required: Whether 'book' positional arg is required (default True)
    """
    parser = argparse.ArgumentParser(
        description=description,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Common arguments
    if book_required:
        parser.add_argument(
            "book",
            help="Book identifier (from build.config.json)",
        )

    parser.add_argument(
        "--config", "-c",
        type=Path,
        default=None,
        help="Path to build.config.json (default: auto-detect)",
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output",
    )

    # Add extra arguments
    if extra_args:
        for arg_def in extra_args:
            arg_def = dict(arg_def)  # don't mutate original
            name = arg_def.pop("name")
            if isinstance(name, list):
                parser.add_argument(*name, **arg_def)
            else:
                parser.add_argument(name, **arg_def)

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    # Build kwargs for main_func
    kwargs: Dict[str, Any] = {}
    kwargs["verbose"] = args.verbose

    if extra_args:
        for arg_def in extra_args:
            name = arg_def["name"]
            # Derive the attribute name argparse would use
            if isinstance(name, list):
                # For flags like ["--summary", "-s"], argparse uses the long form
                attr = name[0].lstrip("-").replace("-", "_")
            else:
                attr = name.lstrip("-").replace("-", "_")
            if attr not in ("book", "config", "verbose"):
                kwargs[attr] = getattr(args, attr)

    # Call main function
    try:
        book_id = args.book if book_required else None
        if book_required:
            result = main_func(book_id, config, **kwargs)
        else:
            result = main_func(config, **kwargs)

        sys.exit(0 if result else 1)

    except KeyError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"File not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)
