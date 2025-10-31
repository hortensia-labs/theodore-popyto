#!/usr/bin/env python3
"""
Remove hardcoded heading numbers from markdown files (parallel processing).

This script removes hardcoded heading numbers from markdown files using parallel
processing for optimal performance. It processes multiple files simultaneously
using Python's ProcessPool for CPU-intensive regex operations.

Usage:
    python remove-heading-numbers.py <markdown_dir>

Arguments:
    markdown_dir: Directory containing markdown files to process

Example:
    python remove-heading-numbers.py generated/markdown

Features:
    - Parallel processing using ProcessPool for maximum performance
    - Comprehensive error handling and logging
    - Real-time progress reporting
    - Detailed processing statistics
    - Safe in-place file modification with backup on error

The script removes patterns like:
    - "# 1. Title" → "# Title"
    - "## 2.1 Subtitle" → "## Subtitle"
    - "### 3.2.1. Section" → "### Section"

Exit codes:
    0: All files processed successfully
    1: Some files failed processing or other errors
"""

import argparse
import os
import re
import shutil
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import List, NamedTuple, Optional


class ProcessingResult(NamedTuple):
    """Result of processing a single markdown file."""
    file_path: Path
    success: bool
    changes_made: int
    processing_time: float
    error_message: Optional[str] = None
    original_size: int = 0
    final_size: int = 0


def remove_heading_numbers_from_content(content: str) -> tuple[str, int]:
    """
    Remove heading numbers from markdown content.

    Args:
        content: Original markdown content

    Returns:
        Tuple of (processed_content, number_of_changes)
    """
    # Pattern explanation:
    # ^(#{1,6}) - Start of line, capture 1-6 hash marks
    # \s* - Optional whitespace
    # (\d+(?:\.\d+)*\.?) - Capture number pattern: 1, 1.2, 1.2.3, 1.2.3., etc.
    # [\s\u00a0]+ - One or more whitespace chars (including non-breaking space)
    # Replace with: captured hashes + single space

    pattern = re.compile(r'^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\u00a0]+', re.MULTILINE)

    processed_content, changes = pattern.subn(r'\1 ', content)
    return processed_content, changes


def process_single_file(file_path: Path) -> ProcessingResult:
    """
    Process a single markdown file to remove heading numbers.

    Args:
        file_path: Path to the markdown file to process

    Returns:
        ProcessingResult with processing details
    """
    start_time = time.time()

    try:
        # Read original file
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        original_size = len(original_content)

        # Process content
        processed_content, changes_made = remove_heading_numbers_from_content(original_content)
        final_size = len(processed_content)

        # Only write if changes were made
        if changes_made > 0:
            # Create backup in case of issues
            backup_path = file_path.with_suffix('.md.backup')
            shutil.copy2(file_path, backup_path)

            try:
                # Write processed content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(processed_content)

                # Remove backup on success
                backup_path.unlink()

            except Exception as e:
                # Restore from backup on write error
                if backup_path.exists():
                    shutil.copy2(backup_path, file_path)
                    backup_path.unlink()
                raise e

        processing_time = time.time() - start_time

        return ProcessingResult(
            file_path=file_path,
            success=True,
            changes_made=changes_made,
            processing_time=processing_time,
            original_size=original_size,
            final_size=final_size
        )

    except Exception as e:
        processing_time = time.time() - start_time
        return ProcessingResult(
            file_path=file_path,
            success=False,
            changes_made=0,
            processing_time=processing_time,
            error_message=str(e)
        )


def remove_numbers_parallel(markdown_dir: Path) -> bool:
    """
    Remove heading numbers from all markdown files using parallel processing.

    Args:
        markdown_dir: Directory containing markdown files

    Returns:
        True if all files processed successfully, False otherwise
    """
    # Find all markdown files
    md_files = sorted(markdown_dir.glob('*.md'))

    if not md_files:
        print("⚠️  No generated markdown files found")
        print("💡 Tip: Run 'make compile-all' first to generate files")
        return True

    total_files = len(md_files)
    max_workers = min(total_files, os.cpu_count() or 4)

    print(f"🚀 Processing {total_files} files using {max_workers} parallel workers...")

    start_time = time.time()
    results = []
    completed_count = 0

    # Process files in parallel
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all jobs
        future_to_file = {
            executor.submit(process_single_file, file_path): file_path
            for file_path in md_files
        }

        # Process completed jobs as they finish
        for future in as_completed(future_to_file):
            file_path = future_to_file[future]
            completed_count += 1

            try:
                result = future.result()
                results.append(result)

                # Progress reporting
                progress = (completed_count / total_files) * 100
                if result.success:
                    if result.changes_made > 0:
                        print(f"   ✅ [{progress:5.1f}%] {file_path.name}: {result.changes_made} headings processed ({result.processing_time:.3f}s)")
                    else:
                        print(f"   ℹ️  [{progress:5.1f}%] {file_path.name}: No heading numbers found ({result.processing_time:.3f}s)")
                else:
                    print(f"   ❌ [{progress:5.1f}%] {file_path.name}: Error - {result.error_message}")

            except Exception as e:
                print(f"   ❌ [{completed_count/total_files*100:5.1f}%] {file_path.name}: Unexpected error - {e}")
                results.append(ProcessingResult(
                    file_path=file_path,
                    success=False,
                    changes_made=0,
                    processing_time=0.0,
                    error_message=str(e)
                ))

    total_time = time.time() - start_time

    # Generate comprehensive statistics
    successful_results = [r for r in results if r.success]
    failed_results = [r for r in results if not r.success]
    files_with_changes = [r for r in successful_results if r.changes_made > 0]

    total_changes = sum(r.changes_made for r in successful_results)
    avg_processing_time = sum(r.processing_time for r in successful_results) / len(successful_results) if successful_results else 0
    total_bytes_processed = sum(r.original_size for r in successful_results)

    print(f"\n📊 Processing Statistics:")
    print(f"   ⏱️  Total time: {total_time:.2f}s (avg: {avg_processing_time:.3f}s per file)")
    print(f"   🔧 Workers used: {max_workers}")
    print(f"   📄 Files processed: {len(successful_results)}/{total_files}")
    print(f"   ✅ Files with changes: {len(files_with_changes)}")
    print(f"   🔢 Total heading numbers removed: {total_changes}")
    print(f"   💾 Data processed: {total_bytes_processed / 1024:.1f} KB")

    if failed_results:
        print(f"   ❌ Failed files: {len(failed_results)}")
        print("\n❌ Failed Files Details:")
        for result in failed_results:
            print(f"      • {result.file_path.name}: {result.error_message}")

    # Performance metrics
    if total_time > 0:
        files_per_second = total_files / total_time
        throughput = total_bytes_processed / total_time / 1024  # KB/s
        print(f"   📈 Performance: {files_per_second:.1f} files/sec, {throughput:.1f} KB/sec")

    success = len(failed_results) == 0
    if success:
        if total_changes > 0:
            print(f"✅ Successfully processed {total_files} markdown files and removed {total_changes} heading numbers!")
        else:
            print(f"✅ Processed {total_files} markdown files - no heading numbers found to remove")
    else:
        print(f"⚠️  Completed with {len(failed_results)} errors out of {total_files} files")

    return success


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Remove hardcoded heading numbers from markdown files (parallel processing)"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing markdown files to process"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    print("🔢 Removing hardcoded heading numbers from generated files...")

    # Process files
    if remove_numbers_parallel(args.markdown_dir):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Some errors occurred


if __name__ == "__main__":
    main()