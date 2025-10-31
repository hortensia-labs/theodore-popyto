#!/usr/bin/env python3
"""
Comprehensive ICML compilation processor with parallel processing and style application.

This script handles the complete ICML processing pipeline:
1. Parallel markdown to ICML conversion using Pandoc
2. Cross-reference compatibility post-processing
3. Environment-aware specialized styling (bibliography, cover matter)
4. Comprehensive validation and error handling

Usage:
    python compile-icml-processor.py <markdown_dir> <icml_output_dir> [--target=single|all|batch] [--sections=list]

Arguments:
    markdown_dir:   Directory containing merged markdown files
    icml_output_dir: Directory where ICML files will be saved
    --target:       Processing target (single, all, batch)
    --sections:     Comma-separated list of specific sections (for batch mode)

Environment Variables (optional):
    BIBLIOGRAPHY_SECTION:  Section to receive bibliography paragraph styles
    COVER_MATTER_SECTION:  Section to receive cover matter paragraph styles

Example:
    python compile-icml-processor.py generated/markdown generated/icml --target=all
    python compile-icml-processor.py generated/markdown generated/icml --target=single --sections=2-chapter-1

Features:
    - ProcessPool parallel processing for optimal performance
    - Environment-aware conditional styling
    - Comprehensive validation and error handling
    - Real-time progress reporting
    - Atomic operations with backup/rollback
    - Integration-ready structured output
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional, Set


class ConversionResult(NamedTuple):
    """Result of converting a single markdown file to ICML."""
    section_name: str
    markdown_file: Path
    icml_file: Path
    success: bool
    processing_time: float
    pandoc_time: float
    postprocess_time: float
    file_size: int
    error_message: Optional[str] = None


class StyleResult(NamedTuple):
    """Result of applying specialized styling to an ICML file."""
    section_name: str
    icml_file: Path
    style_type: str  # 'bibliography' or 'cover_matter'
    success: bool
    processing_time: float
    changes_made: int
    error_message: Optional[str] = None


class EnvironmentConfig(NamedTuple):
    """Environment configuration for specialized styling."""
    bibliography_section: Optional[str]
    cover_matter_section: Optional[str]
    project_root: Path


# Pandoc configuration (from Makefile)
PANDOC_FLAGS = [
    '-f', 'markdown+footnotes+definition_lists+smart',
    '-t', 'icml',
    '-s',
    '--wrap=none',
    '--reference-links',
    '--id-prefix=thesis-'
]

# Cross-reference regex pattern (from Makefile)
CROSSREF_PATTERN = re.compile(
    r'(<HyperlinkTextDestination Self="HyperlinkTextDestination/(#[^"]*)" Name=")Destination(")',
    re.MULTILINE
)


def load_environment_config() -> EnvironmentConfig:
    """
    Load environment configuration for specialized styling.

    Returns:
        EnvironmentConfig with loaded values
    """
    # Find project root
    project_root = Path(__file__).resolve().parent.parent

    # Load .env file if it exists
    env_file = project_root / '.env'
    env_vars = {}

    if env_file.exists():
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes and comments
                        value = value.split('#')[0].strip().strip('"\'')
                        if value:  # Only set non-empty values
                            env_vars[key.strip()] = value
        except Exception as e:
            print(f"⚠️  Warning: Could not read .env file: {e}")

    # Get configuration values (prefer .env, fallback to system env)
    bibliography_section = env_vars.get('BIBLIOGRAPHY_SECTION') or os.getenv('BIBLIOGRAPHY_SECTION')
    cover_matter_section = env_vars.get('COVER_MATTER_SECTION') or os.getenv('COVER_MATTER_SECTION')

    return EnvironmentConfig(
        bibliography_section=bibliography_section if bibliography_section else None,
        cover_matter_section=cover_matter_section if cover_matter_section else None,
        project_root=project_root
    )


def convert_single_markdown_to_icml(markdown_file: Path, icml_output_dir: Path) -> ConversionResult:
    """
    Convert a single markdown file to ICML format.

    Args:
        markdown_file: Path to the markdown file
        icml_output_dir: Directory where ICML file will be saved

    Returns:
        ConversionResult with processing details
    """
    start_time = time.time()
    section_name = markdown_file.stem
    icml_file = icml_output_dir / f"{section_name}.icml"

    try:
        # Ensure output directory exists
        icml_output_dir.mkdir(parents=True, exist_ok=True)

        # Phase 1: Pandoc conversion
        pandoc_start = time.time()

        pandoc_cmd = ['pandoc'] + PANDOC_FLAGS + [str(markdown_file), '-o', str(icml_file)]

        result = subprocess.run(
            pandoc_cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout per file
        )

        if result.returncode != 0:
            return ConversionResult(
                section_name=section_name,
                markdown_file=markdown_file,
                icml_file=icml_file,
                success=False,
                processing_time=time.time() - start_time,
                pandoc_time=time.time() - pandoc_start,
                postprocess_time=0.0,
                file_size=0,
                error_message=f"Pandoc failed: {result.stderr}"
            )

        pandoc_time = time.time() - pandoc_start

        # Phase 2: Cross-reference post-processing
        postprocess_start = time.time()

        if not icml_file.exists():
            return ConversionResult(
                section_name=section_name,
                markdown_file=markdown_file,
                icml_file=icml_file,
                success=False,
                processing_time=time.time() - start_time,
                pandoc_time=pandoc_time,
                postprocess_time=0.0,
                file_size=0,
                error_message="ICML file not created by Pandoc"
            )

        # Read ICML content for post-processing
        with open(icml_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Apply cross-reference compatibility fix
        processed_content = CROSSREF_PATTERN.sub(r'\1\2\3', content)

        # Write processed content back
        with open(icml_file, 'w', encoding='utf-8') as f:
            f.write(processed_content)

        postprocess_time = time.time() - postprocess_start
        file_size = icml_file.stat().st_size

        return ConversionResult(
            section_name=section_name,
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=True,
            processing_time=time.time() - start_time,
            pandoc_time=pandoc_time,
            postprocess_time=postprocess_time,
            file_size=file_size
        )

    except subprocess.TimeoutExpired:
        return ConversionResult(
            section_name=section_name,
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=False,
            processing_time=time.time() - start_time,
            pandoc_time=0.0,
            postprocess_time=0.0,
            file_size=0,
            error_message="Pandoc conversion timed out"
        )
    except Exception as e:
        return ConversionResult(
            section_name=section_name,
            markdown_file=markdown_file,
            icml_file=icml_file,
            success=False,
            processing_time=time.time() - start_time,
            pandoc_time=0.0,
            postprocess_time=0.0,
            file_size=0,
            error_message=str(e)
        )


def apply_bibliography_styling(icml_file: Path) -> StyleResult:
    """
    Apply bibliography paragraph styles to an ICML file.

    Args:
        icml_file: Path to the ICML file to style

    Returns:
        StyleResult with styling details
    """
    start_time = time.time()
    section_name = icml_file.stem

    try:
        # Create backup before modification
        backup_file = icml_file.with_suffix('.icml.backup')
        shutil.copy2(icml_file, backup_file)

        # Read file content
        with open(icml_file, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # Apply bibliography-specific paragraph style replacements
        # Replace "ParagraphStyle/Paragraph" first to avoid conflicts
        if "ParagraphStyle/Paragraph" in content:
            content = content.replace("ParagraphStyle/Paragraph", "ParagraphStyle/Paragraph Bibliography")
            changes_made += content.count("ParagraphStyle/Paragraph Bibliography") - original_content.count("ParagraphStyle/Paragraph Bibliography")

        # Then replace standalone "Paragraph"
        if '"Paragraph"' in content:
            content = content.replace('"Paragraph"', '"Paragraph Bibliography"')
            changes_made += content.count('"Paragraph Bibliography"') - original_content.count('"Paragraph Bibliography"')

        if changes_made > 0:
            # Write modified content
            with open(icml_file, 'w', encoding='utf-8') as f:
                f.write(content)

        # Remove backup on success
        backup_file.unlink()

        return StyleResult(
            section_name=section_name,
            icml_file=icml_file,
            style_type='bibliography',
            success=True,
            processing_time=time.time() - start_time,
            changes_made=changes_made
        )

    except Exception as e:
        # Restore from backup on error
        if backup_file.exists():
            shutil.copy2(backup_file, icml_file)
            backup_file.unlink()

        return StyleResult(
            section_name=section_name,
            icml_file=icml_file,
            style_type='bibliography',
            success=False,
            processing_time=time.time() - start_time,
            changes_made=0,
            error_message=str(e)
        )


def apply_cover_matter_styling(icml_file: Path) -> StyleResult:
    """
    Apply cover matter paragraph styles to an ICML file.

    Args:
        icml_file: Path to the ICML file to style

    Returns:
        StyleResult with styling details
    """
    start_time = time.time()
    section_name = icml_file.stem

    try:
        # Create backup before modification
        backup_file = icml_file.with_suffix('.icml.backup')
        shutil.copy2(icml_file, backup_file)

        # Read file content
        with open(icml_file, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        # Apply cover matter-specific paragraph style replacements
        # Replace ParagraphStyle/Header[x] first
        heading_replacements = [
            ('ParagraphStyle/Header1', 'ParagraphStyle/Cover Heading'),
            ('ParagraphStyle/Header2', 'ParagraphStyle/Cover Heading'),
            ('ParagraphStyle/Header3', 'ParagraphStyle/Cover Heading'),
            ('ParagraphStyle/Header4', 'ParagraphStyle/Cover Heading'),
            ('ParagraphStyle/Header5', 'ParagraphStyle/Cover Heading'),
            ('ParagraphStyle/Header6', 'ParagraphStyle/Cover Heading'),
        ]

        for old_style, new_style in heading_replacements:
            if old_style in content:
                old_count = content.count(old_style)
                content = content.replace(old_style, new_style)
                changes_made += old_count

        # Then replace standalone quoted headers
        quoted_heading_replacements = [
            ('"Header1"', '"Cover Heading"'),
            ('"Header2"', '"Cover Heading"'),
            ('"Header3"', '"Cover Heading"'),
            ('"Header4"', '"Cover Heading"'),
            ('"Header5"', '"Cover Heading"'),
            ('"Header6"', '"Cover Heading"'),
        ]

        for old_style, new_style in quoted_heading_replacements:
            if old_style in content:
                old_count = content.count(old_style)
                content = content.replace(old_style, new_style)
                changes_made += old_count

        if changes_made > 0:
            # Write modified content
            with open(icml_file, 'w', encoding='utf-8') as f:
                f.write(content)

        # Remove backup on success
        backup_file.unlink()

        return StyleResult(
            section_name=section_name,
            icml_file=icml_file,
            style_type='cover_matter',
            success=True,
            processing_time=time.time() - start_time,
            changes_made=changes_made
        )

    except Exception as e:
        # Restore from backup on error
        if backup_file.exists():
            shutil.copy2(backup_file, icml_file)
            backup_file.unlink()

        return StyleResult(
            section_name=section_name,
            icml_file=icml_file,
            style_type='cover_matter',
            success=False,
            processing_time=time.time() - start_time,
            changes_made=0,
            error_message=str(e)
        )


def process_icml_files(markdown_dir: Path, icml_output_dir: Path,
                      target_sections: Optional[Set[str]] = None) -> bool:
    """
    Process markdown files to ICML with parallel conversion and optional styling.

    Args:
        markdown_dir: Directory containing markdown files
        icml_output_dir: Directory for ICML output
        target_sections: Optional set of specific sections to process

    Returns:
        True if all processing completed successfully, False otherwise
    """
    # Load environment configuration
    env_config = load_environment_config()

    # Find markdown files
    md_files = list(markdown_dir.glob('*.md'))
    if target_sections:
        md_files = [f for f in md_files if f.stem in target_sections]

    if not md_files:
        print("⚠️  No markdown files found to process")
        return True

    total_files = len(md_files)
    max_workers = min(total_files, os.cpu_count() or 4)

    print(f"🔄 Phase 1: Converting {total_files} markdown files to ICML...")
    print(f"🚀 Using {max_workers} parallel workers")

    start_time = time.time()
    conversion_results = []
    completed_count = 0

    # Phase 1: Parallel conversion
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submit all conversion jobs
        future_to_file = {
            executor.submit(convert_single_markdown_to_icml, md_file, icml_output_dir): md_file
            for md_file in md_files
        }

        # Process completed conversions
        for future in as_completed(future_to_file):
            md_file = future_to_file[future]
            completed_count += 1

            try:
                result = future.result()
                conversion_results.append(result)

                # Progress reporting
                progress = (completed_count / total_files) * 100
                if result.success:
                    size_mb = result.file_size / (1024 * 1024)
                    print(f"   ✅ [{progress:5.1f}%] {result.section_name}: {size_mb:.1f}MB "
                          f"(pandoc: {result.pandoc_time:.2f}s, post: {result.postprocess_time:.2f}s)")
                else:
                    print(f"   ❌ [{progress:5.1f}%] {result.section_name}: {result.error_message}")

            except Exception as e:
                print(f"   ❌ [{completed_count/total_files*100:5.1f}%] {md_file.stem}: Unexpected error - {e}")
                conversion_results.append(ConversionResult(
                    section_name=md_file.stem,
                    markdown_file=md_file,
                    icml_file=icml_output_dir / f"{md_file.stem}.icml",
                    success=False,
                    processing_time=0.0,
                    pandoc_time=0.0,
                    postprocess_time=0.0,
                    file_size=0,
                    error_message=str(e)
                ))

    conversion_time = time.time() - start_time

    # Phase 1 Statistics
    successful_conversions = [r for r in conversion_results if r.success]
    failed_conversions = [r for r in conversion_results if not r.success]

    print(f"\n📊 Phase 1 Complete:")
    print(f"   ⏱️  Conversion time: {conversion_time:.2f}s")
    print(f"   ✅ Successful: {len(successful_conversions)}/{total_files}")
    print(f"   ❌ Failed: {len(failed_conversions)}")

    if successful_conversions:
        total_size = sum(r.file_size for r in successful_conversions)
        avg_pandoc_time = sum(r.pandoc_time for r in successful_conversions) / len(successful_conversions)
        throughput = total_size / conversion_time / (1024 * 1024)  # MB/s
        print(f"   📈 Throughput: {throughput:.1f} MB/s, avg pandoc: {avg_pandoc_time:.2f}s")

    # Phase 2: Specialized styling (if configured and files exist)
    style_results = []

    if env_config.bibliography_section or env_config.cover_matter_section:
        print(f"\n🎨 Phase 2: Applying specialized styles...")

        # Process bibliography section
        if env_config.bibliography_section:
            biblio_icml = icml_output_dir / f"{env_config.bibliography_section}.icml"
            if biblio_icml.exists():
                print(f"   📚 Applying bibliography styles to: {env_config.bibliography_section}")
                style_result = apply_bibliography_styling(biblio_icml)
                style_results.append(style_result)

                if style_result.success:
                    print(f"   ✅ Bibliography styled: {style_result.changes_made} changes ({style_result.processing_time:.2f}s)")
                else:
                    print(f"   ❌ Bibliography styling failed: {style_result.error_message}")
            else:
                print(f"   ⚠️  Bibliography section '{env_config.bibliography_section}' not found, skipping styling")

        # Process cover matter section
        if env_config.cover_matter_section:
            cover_icml = icml_output_dir / f"{env_config.cover_matter_section}.icml"
            if cover_icml.exists():
                print(f"   📋 Applying cover matter styles to: {env_config.cover_matter_section}")
                style_result = apply_cover_matter_styling(cover_icml)
                style_results.append(style_result)

                if style_result.success:
                    print(f"   ✅ Cover matter styled: {style_result.changes_made} changes ({style_result.processing_time:.2f}s)")
                else:
                    print(f"   ❌ Cover matter styling failed: {style_result.error_message}")
            else:
                print(f"   ⚠️  Cover matter section '{env_config.cover_matter_section}' not found, skipping styling")

    else:
        print(f"\nℹ️  No specialized styling configured (BIBLIOGRAPHY_SECTION or COVER_MATTER_SECTION not set)")

    # Final statistics
    total_time = time.time() - start_time
    successful_styling = [r for r in style_results if r.success]
    failed_styling = [r for r in style_results if not r.success]

    print(f"\n🎉 Processing Complete:")
    print(f"   ⏱️  Total time: {total_time:.2f}s")
    print(f"   📄 Conversions: {len(successful_conversions)}/{total_files} successful")
    if style_results:
        print(f"   🎨 Styling: {len(successful_styling)}/{len(style_results)} successful")

    # Report any failures
    if failed_conversions:
        print(f"\n❌ Conversion Failures:")
        for result in failed_conversions:
            print(f"   • {result.section_name}: {result.error_message}")

    if failed_styling:
        print(f"\n❌ Styling Failures:")
        for result in failed_styling:
            print(f"   • {result.section_name} ({result.style_type}): {result.error_message}")

    # Success if no conversion failures (styling failures are non-critical)
    return len(failed_conversions) == 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Comprehensive ICML compilation processor with parallel processing"
    )
    parser.add_argument(
        "markdown_dir",
        type=Path,
        help="Directory containing merged markdown files"
    )
    parser.add_argument(
        "icml_output_dir",
        type=Path,
        help="Directory where ICML files will be saved"
    )
    parser.add_argument(
        "--target",
        choices=['single', 'all', 'batch'],
        default='all',
        help="Processing target mode"
    )
    parser.add_argument(
        "--sections",
        help="Comma-separated list of specific sections to process"
    )

    args = parser.parse_args()

    # Validate input directory
    if not args.markdown_dir.exists():
        print(f"❌ Error: Markdown directory not found: {args.markdown_dir}")
        sys.exit(1)

    if not args.markdown_dir.is_dir():
        print(f"❌ Error: Not a directory: {args.markdown_dir}")
        sys.exit(1)

    # Parse target sections
    target_sections = None
    if args.target in ['single', 'batch'] and args.sections:
        target_sections = set(section.strip() for section in args.sections.split(','))
    elif args.target == 'single' and not args.sections:
        print("❌ Error: --sections required for single mode")
        sys.exit(1)

    print("🔄 Starting ICML compilation processor...")

    # Process files
    if process_icml_files(args.markdown_dir, args.icml_output_dir, target_sections):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Conversion failures occurred


if __name__ == "__main__":
    main()