#!/usr/bin/env python3
"""
Sort lines in a text file alphabetically and save to a new file with 'sorted' suffix.

Usage: python lib/utils/sort-paragraphs.py <path_to_file>
Example: python scripts/sort-paragraphs.py "references/bibliography.md"
Output: references/bibliography-sorted.md
"""

import sys
import os
import re
from pathlib import Path


def get_sort_key(line):
    """Get the sorting key for a line, handling links that start with brackets."""
    line = line.strip()

    # Check if line starts with a bracket (markdown link reference)
    if line.startswith('['):
        # Extract the text between the first pair of brackets
        match = re.match(r'^\[([^\]]+)\]', line)
        if match:
            return match.group(1).lower()

    # For regular lines, use the line as-is
    return line.lower()


def sort_file_lines(input_path):
    """Sort lines in a file alphabetically and save to a new file."""
    input_file = Path(input_path)

    # Check if input file exists
    if not input_file.exists():
        print(f"Error: File '{input_path}' not found.")
        print(f"Current working directory: {os.getcwd()}")
        print(f"Absolute path attempted: {input_file.absolute()}")
        sys.exit(1)

    # Read all lines from the input file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file '{input_path}': {e}")
        sys.exit(1)

    # Sort lines alphabetically using custom key function
    sorted_lines = sorted(lines, key=get_sort_key)

    # Generate output filename
    stem = input_file.stem
    suffix = input_file.suffix
    output_file = input_file.parent / f"{stem}-sorted{suffix}"

    # Write sorted lines to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.writelines(sorted_lines)
        print(f"Sorted file saved as: {output_file}")
    except Exception as e:
        print(f"Error writing to file '{output_file}': {e}")
        sys.exit(1)


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/sort-bibliography.py <path_to_file>")
        print("Example: python scripts/sort-bibliography.py \"references/bibliography.md\"")
        sys.exit(1)

    input_path = sys.argv[1]
    sort_file_lines(input_path)


if __name__ == "__main__":
    main()