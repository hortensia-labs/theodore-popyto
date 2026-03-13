#!/usr/bin/env python3
"""
Configuration module for the editorial build system.

This module provides typed access to build.config.json with validation
and path resolution utilities.

Usage:
    from config import load_config, get_book_config

    config = load_config()
    book = get_book_config(config, "libro1")
    print(book.title)  # "El Arte de la Integración"
"""

import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any


@dataclass
class SourcePaths:
    """Source directory paths for a book."""
    content: Path
    paratextuales: Path
    source_type: str = "flat"
    content_subdir: str = "content"


@dataclass
class OutputPaths:
    """Output directory paths for a book."""
    root: Path
    markdown: Path
    icml: Path
    data: Path


@dataclass
class ChapterConfig:
    """Chapter ordering and pattern configuration."""
    order: List[int]
    pattern: str
    sections: List[str] = field(default_factory=list)


@dataclass
class StyleConfig:
    """InDesign paragraph style mappings."""
    bibliography: str = "Paragraph Bibliography"
    glossary: str = "Definition Term"
    glossary_definition: str = "Definition Description"
    sidebar: str = "Sidebar Text"
    sidebar_title: str = "Sidebar Title"


@dataclass
class StyleMappingEntry:
    """A single source -> target paragraph style replacement."""
    source: str
    target: str


@dataclass
class FileStyleMapping:
    """Style mappings for a specific file."""
    file: str
    mappings: List[StyleMappingEntry]


@dataclass
class ImageDefaults:
    """Default image sizing for anchored images in ICML."""
    max_width: float
    fit_mode: str = "proportional"


@dataclass
class ImageOverride:
    """Per-image sizing override, keyed by filename stem."""
    width: Optional[float] = None
    height: Optional[float] = None
    offset_x: Optional[float] = None
    offset_y: Optional[float] = None
    image_width: Optional[float] = None
    image_height: Optional[float] = None


@dataclass
class ImageSettings:
    """Image sizing configuration for anchored images."""
    defaults: ImageDefaults
    overrides: Dict[str, ImageOverride] = field(default_factory=dict)


@dataclass
class InDesignBookConfig:
    """InDesign-specific configuration for a book."""
    book_file: str
    toc_document: str
    toc_style: str
    bibliography_file: str
    table_max_width: Optional[float] = None


@dataclass
class BookConfig:
    """Complete configuration for a single book."""
    id: str
    title: str
    prefix: str
    source: SourcePaths
    output: OutputPaths
    chapters: ChapterConfig
    paratextuales: List[str]
    styles: StyleConfig
    indesign: Optional[InDesignBookConfig] = None
    style_mappings: List[FileStyleMapping] = field(default_factory=list)
    table_max_width: Optional[float] = None
    image_settings: Optional[ImageSettings] = None


@dataclass
class PandocConfig:
    """Pandoc conversion configuration."""
    input_format: str
    output_format: str
    flags: List[str]
    id_prefix: str


@dataclass
class ProcessingConfig:
    """Processing options configuration."""
    remove_heading_numbers: bool
    normalize_unicode: bool
    parallel_workers: str  # "auto" or integer as string
    tab_placeholder: str = "\u2409"  # ␉ (Symbol for Horizontal Tabulation)


@dataclass
class GlobalInDesignConfig:
    """Global InDesign configuration."""
    temp_config_path: str = "/tmp/indesign-runner-config.json"
    bibliography_style: str = "Paragraph Bibliography"
    report_timestamp_format: str = "YYYY-MM-DD-HHmmss"


@dataclass
class Config:
    """Root configuration object."""
    version: str
    books: Dict[str, BookConfig]
    pandoc: PandocConfig
    processing: ProcessingConfig
    indesign: GlobalInDesignConfig = field(default_factory=GlobalInDesignConfig)
    project_root: Path = field(default_factory=lambda: Path.cwd())


def find_project_root() -> Path:
    """
    Find the project root directory by looking for build.config.json.

    Searches upward from the current working directory.

    Returns:
        Path to the project root

    Raises:
        FileNotFoundError: If project root cannot be found
    """
    current = Path.cwd().resolve()

    # Check if we're in the lib/ directory
    if current.name == 'lib' and (current.parent / 'build.config.json').exists():
        return current.parent

    # Search upward for build.config.json
    for parent in [current] + list(current.parents):
        if (parent / 'build.config.json').exists():
            return parent

    raise FileNotFoundError(
        "Could not find project root (build.config.json not found). "
        "Make sure you are running from within the project directory."
    )


def load_config(config_path: Optional[Path] = None) -> Config:
    """
    Load and validate build configuration from JSON file.

    Args:
        config_path: Optional path to config file. If not provided,
                    searches for build.config.json in project root.

    Returns:
        Validated Config object with resolved paths

    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config is invalid
        json.JSONDecodeError: If config is not valid JSON
    """
    # Find project root and config file
    if config_path is None:
        project_root = find_project_root()
        config_path = project_root / 'build.config.json'
    else:
        config_path = Path(config_path).resolve()
        project_root = config_path.parent

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    # Load JSON
    with open(config_path, 'r', encoding='utf-8') as f:
        raw_config = json.load(f)

    # Validate required fields
    required_fields = ['version', 'books', 'pandoc', 'processing']
    for field_name in required_fields:
        if field_name not in raw_config:
            raise ValueError(f"Missing required field in config: {field_name}")

    # Parse books
    books: Dict[str, BookConfig] = {}
    for book_id, book_data in raw_config['books'].items():
        books[book_id] = _parse_book_config(book_id, book_data, project_root)

    # Parse pandoc config
    pandoc_data = raw_config['pandoc']
    pandoc = PandocConfig(
        input_format=pandoc_data['input_format'],
        output_format=pandoc_data['output_format'],
        flags=pandoc_data['flags'],
        id_prefix=pandoc_data['id_prefix']
    )

    # Parse processing config
    proc_data = raw_config['processing']
    processing = ProcessingConfig(
        remove_heading_numbers=proc_data.get('remove_heading_numbers', True),
        normalize_unicode=proc_data.get('normalize_unicode', True),
        parallel_workers=str(proc_data.get('parallel_workers', 'auto')),
        tab_placeholder=proc_data.get('tab_placeholder', '\u2409')
    )

    # Parse global InDesign config
    indesign_data = raw_config.get('indesign', {})
    global_indesign = GlobalInDesignConfig(
        temp_config_path=indesign_data.get('tempConfigPath', '/tmp/indesign-runner-config.json'),
        bibliography_style=indesign_data.get('bibliographyStyle', 'Paragraph Bibliography'),
        report_timestamp_format=indesign_data.get('reportTimestampFormat', 'YYYY-MM-DD-HHmmss')
    )

    return Config(
        version=raw_config['version'],
        books=books,
        pandoc=pandoc,
        processing=processing,
        indesign=global_indesign,
        project_root=project_root
    )


def _parse_book_config(book_id: str, data: Dict[str, Any], project_root: Path) -> BookConfig:
    """
    Parse a single book configuration from raw dictionary.

    Args:
        book_id: Book identifier (e.g., "libro1")
        data: Raw configuration dictionary
        project_root: Project root for path resolution

    Returns:
        Parsed BookConfig object
    """
    # Parse source paths
    source_data = data['source']
    source_type = source_data.get('type', 'flat')
    content_subdir = source_data.get('content_subdir', 'content')

    if source_type == 'sections':
        content_path = project_root / source_data['root']
    else:
        content_path = project_root / source_data['content']

    para_path_str = source_data.get('paratextuales', '')
    para_path = project_root / para_path_str if para_path_str else project_root

    source = SourcePaths(
        content=content_path,
        paratextuales=para_path,
        source_type=source_type,
        content_subdir=content_subdir,
    )

    # Parse output paths
    output_data = data['output']
    output = OutputPaths(
        root=project_root / output_data['root'],
        markdown=project_root / output_data['markdown'],
        icml=project_root / output_data['icml'],
        data=project_root / output_data['data']
    )

    # Parse chapters
    chapters_data = data['chapters']
    chapters = ChapterConfig(
        order=chapters_data.get('order', []),
        pattern=chapters_data.get('pattern', '*.md'),
        sections=chapters_data.get('sections', []),
    )

    # Parse styles with defaults
    styles_data = data.get('styles', {})
    styles = StyleConfig(
        bibliography=styles_data.get('bibliography', 'Paragraph Bibliography'),
        glossary=styles_data.get('glossary', 'Definition Term'),
        glossary_definition=styles_data.get('glossary_definition', 'Definition Description'),
        sidebar=styles_data.get('sidebar', 'Sidebar Text'),
        sidebar_title=styles_data.get('sidebar_title', 'Sidebar Title')
    )

    # Parse custom style mappings
    style_mappings: List[FileStyleMapping] = []
    for mapping_data in data.get('styleMappings', []):
        entries = [
            StyleMappingEntry(source=m['source'], target=m['target'])
            for m in mapping_data.get('mappings', [])
        ]
        style_mappings.append(FileStyleMapping(
            file=mapping_data['file'],
            mappings=entries
        ))

    # Parse InDesign config
    indesign_data = data.get('indesign', {})
    table_max_width = indesign_data.get('tableMaxWidth')
    if table_max_width is not None:
        table_max_width = float(table_max_width)

    indesign_config = None
    if indesign_data:
        prefix = data['prefix']
        indesign_config = InDesignBookConfig(
            book_file=indesign_data.get('bookFile', f'{book_id}.indb'),
            toc_document=indesign_data.get('tocDocument', f'{prefix}_TOC'),
            toc_style=indesign_data.get('tocStyle', 'TOC Style'),
            bibliography_file=indesign_data.get('bibliographyFile', f'{prefix}_BIBLIOGRAFIA'),
            table_max_width=table_max_width
        )

    # Parse image settings
    image_settings = None
    image_settings_data = indesign_data.get('imageSettings')
    if image_settings_data:
        defaults_data = image_settings_data.get('defaults', {})
        image_defaults = ImageDefaults(
            max_width=float(defaults_data['maxWidth']),
            fit_mode=defaults_data.get('fitMode', 'proportional')
        )
        overrides: Dict[str, ImageOverride] = {}
        for stem, ovr_data in image_settings_data.get('overrides', {}).items():
            overrides[stem] = ImageOverride(
                width=ovr_data.get('width'),
                height=ovr_data.get('height'),
                offset_x=ovr_data.get('offsetX'),
                offset_y=ovr_data.get('offsetY'),
                image_width=ovr_data.get('imageWidth'),
                image_height=ovr_data.get('imageHeight'),
            )
        image_settings = ImageSettings(defaults=image_defaults, overrides=overrides)

    return BookConfig(
        id=data['id'],
        title=data['title'],
        prefix=data['prefix'],
        source=source,
        output=output,
        chapters=chapters,
        paratextuales=data['paratextuales'],
        styles=styles,
        indesign=indesign_config,
        style_mappings=style_mappings,
        table_max_width=table_max_width,
        image_settings=image_settings,
    )


def get_book_config(config: Config, book_id: str) -> BookConfig:
    """
    Get configuration for a specific book.

    Args:
        config: Loaded Config object
        book_id: Book identifier ("libro1" or "libro2")

    Returns:
        BookConfig for the specified book

    Raises:
        KeyError: If book_id is not found in configuration
    """
    if book_id not in config.books:
        available = ', '.join(config.books.keys())
        raise KeyError(f"Book '{book_id}' not found. Available: {available}")

    return config.books[book_id]


def validate_source_dirs(book_config: BookConfig) -> List[str]:
    """
    Validate that source directories exist and are accessible.

    Args:
        book_config: Book configuration to validate

    Returns:
        List of error messages (empty if all valid)
    """
    errors = []

    if book_config.source.source_type == 'sections':
        root = book_config.source.content
        subdir = book_config.source.content_subdir
        if not root.exists():
            errors.append(f"Sections root not found: {root}")
        elif not root.is_dir():
            errors.append(f"Sections root is not a directory: {root}")
        else:
            for section_name in book_config.chapters.sections:
                section_content = root / section_name / subdir
                if not section_content.exists():
                    errors.append(f"Section content dir not found: {section_content}")
    else:
        if not book_config.source.content.exists():
            errors.append(f"Content directory not found: {book_config.source.content}")
        elif not book_config.source.content.is_dir():
            errors.append(f"Content path is not a directory: {book_config.source.content}")

        para = book_config.source.paratextuales
        if str(para) != str(book_config.source.content.parent) and para.exists():
            if not para.is_dir():
                errors.append(f"Paratextuales path is not a directory: {para}")

    return errors


def ensure_output_dirs(book_config: BookConfig) -> None:
    """
    Ensure output directories exist, creating them if necessary.

    Args:
        book_config: Book configuration with output paths
    """
    book_config.output.root.mkdir(parents=True, exist_ok=True)
    book_config.output.markdown.mkdir(parents=True, exist_ok=True)
    book_config.output.icml.mkdir(parents=True, exist_ok=True)
    book_config.output.data.mkdir(parents=True, exist_ok=True)


def get_optimal_workers(config: Config) -> int:
    """
    Get the optimal number of parallel workers.

    Args:
        config: Configuration object

    Returns:
        Number of workers to use
    """
    workers_setting = config.processing.parallel_workers

    if workers_setting == 'auto':
        # Use CPU count, but cap at 8 for safety
        return min(os.cpu_count() or 4, 8)

    try:
        return int(workers_setting)
    except ValueError:
        return 4  # Default fallback


def resolve_paths(config: Config, project_root: Path) -> Config:
    """
    Resolve all relative paths in configuration to absolute paths.

    Note: This is typically called during load_config(), but can be
    used to re-resolve paths after changing project_root.

    Args:
        config: Configuration object
        project_root: New project root for path resolution

    Returns:
        Config with resolved paths (new object)
    """
    # Create new config with updated project root
    new_books = {}
    for book_id, book in config.books.items():
        new_books[book_id] = BookConfig(
            id=book.id,
            title=book.title,
            prefix=book.prefix,
            source=SourcePaths(
                content=project_root / book.source.content.relative_to(config.project_root),
                paratextuales=project_root / book.source.paratextuales.relative_to(config.project_root),
                source_type=book.source.source_type,
                content_subdir=book.source.content_subdir,
            ),
            output=OutputPaths(
                root=project_root / book.output.root.relative_to(config.project_root),
                markdown=project_root / book.output.markdown.relative_to(config.project_root),
                icml=project_root / book.output.icml.relative_to(config.project_root),
                data=project_root / book.output.data.relative_to(config.project_root)
            ),
            chapters=book.chapters,
            paratextuales=book.paratextuales,
            styles=book.styles,
            indesign=book.indesign,
            style_mappings=book.style_mappings,
            table_max_width=book.table_max_width,
            image_settings=book.image_settings,
        )

    return Config(
        version=config.version,
        books=new_books,
        pandoc=config.pandoc,
        processing=config.processing,
        indesign=config.indesign,
        project_root=project_root
    )


# CLI test functionality
if __name__ == "__main__":
    """Test configuration loading when run directly."""
    try:
        config = load_config()
        print(f"Configuration loaded successfully (v{config.version})")
        print(f"Project root: {config.project_root}")
        print(f"Books configured: {', '.join(config.books.keys())}")

        for book_id, book in config.books.items():
            print(f"\n{book.title} ({book_id}):")
            print(f"  Prefix: {book.prefix}")
            print(f"  Content: {book.source.content}")
            print(f"  Paratextuales: {book.source.paratextuales}")

            if book.indesign:
                print(f"  InDesign: book={book.indesign.book_file}, toc={book.indesign.toc_document}")

            if book.style_mappings:
                print(f"  Style mappings: {len(book.style_mappings)} file(s)")
                for fm in book.style_mappings:
                    print(f"    {fm.file}: {len(fm.mappings)} mapping(s)")

            # Validate source directories
            errors = validate_source_dirs(book)
            if errors:
                for error in errors:
                    print(f"  WARNING: {error}")
            else:
                print(f"  Source directories: OK")

        print(f"\nPandoc format: {config.pandoc.input_format} -> {config.pandoc.output_format}")
        print(f"Workers: {get_optimal_workers(config)}")

    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)
