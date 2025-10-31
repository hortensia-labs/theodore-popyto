# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Theodore is a comprehensive thesis writing system that leverages AI tools to streamline the process of writing, revising, and publishing a doctoral thesis. It uses a Makefile-based build system to convert modular markdown content into professional ICML format for InDesign.

## Key Commands

### Build and Compilation

- `make list-sections` - List all available thesis sections
- `make compile <section-name>` - Compile a specific section (validates, merges, and converts to ICML)
- `make compile-all` - Compile all valid sections
- `make merge-all` - Parallel merge all sections (optimized)
- `make merge-all-r` - Parallel merge all sections with heading number removal
- `make merge-parallel` - Parallel merge with verbose output and verification
- `make merge-parallel-r` - Parallel merge with heading number removal and verbose output
- `make remove-numbers` - Remove hardcoded heading numbers from generated markdown files

### Individual Steps

- `make validate-section <section>` - Validate section structure and files
- `make merge-section <section>` - Merge markdown files into a single file
- `make compile-icml [section]` - Convert merged markdown to ICML format
- `make clean-merged` - Clean merged markdown files only

### Maintenance

- `make clean` - Remove all generated files

## Project Structure

```text
sections/                    # Thesis content organized by sections
├── [section-name]/         # Each section folder (e.g., 0-preliminares, 1-introduccion)
│   ├── content/           # Required: Final markdown files for the section
│   ├── fuentes/           # Optional: Research materials and sources
│   ├── revision/          # Optional: Revision notes and drafts
│   └── estructura/        # Optional: Planning and structure documents

generated/                  # Auto-generated output files
├── markdown/              # Merged markdown files (one per section)
├── icml/                  # InDesign-ready ICML files
├── data/                  # Generated data files and analysis
└── reports/              # Processing and validation reports

lib/                        # Core system libraries and modules
├── adobe/                 # Adobe InDesign integration modules
│   └── modules/          # Specialized Adobe functionality
├── components/            # Reusable workflow components (CRV, DRS, IRA)
├── recipes/              # Processing recipes and templates
└── utils/                # General utility functions

docs/                       # System documentation
├── MAKEFILE_REFERENCE.md  # Complete Makefile command reference
├── CROSSREFERENCE_*.md    # Cross-reference optimization documentation
├── USER_GUIDE.md         # User-facing documentation
└── TECHNICAL_GUIDE.md    # Technical implementation details

references/                 # Bibliography and citation management
├── data/                 # Reference data files
├── logs/                 # Citation processing logs
├── reports/              # Citation validation reports
└── tests/                # Reference testing files

tests/                      # Test suite
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── fixtures/             # Test data and fixtures
```

## Content Organization

### File Naming Convention

- Numbered files (e.g., `1.0-intro.md`, `1.1-methods.md`) are processed first in sorted order
- Non-numbered files are processed after numbered files in alphabetical order
- All markdown files in `content/` folders are automatically included

### Section Requirements

- Each section must have a `content/` folder containing at least one `.md` file
- Section folder names can be anything (typically numbered like `2-seccion-1`)
- The build system automatically discovers and processes all valid sections

## Technical Details

### Environment

- **Makefile paths**: Uses absolute paths configured at the top of Makefile
- **Scripts location**: Core utilities moved from `scripts/` to `lib/` directory
- **Pandoc configuration**: Uses markdown with footnotes, smart quotes, and reference links
- **ICML output**: Configured for InDesign with proper ID prefixes

### Dependencies

- `pandoc` (≥2.0) - Document conversion engine
- `make` - Build system
- `bash` - Shell scripting
- `python` (≥3.8) - Python utilities and processing scripts
- `perl` - Text processing for heading number removal

### Validation Process

The build system validates:

1. Section folder exists
2. `content/` subfolder exists
3. At least one markdown file is present
4. Files are readable and properly formatted

## Common Development Tasks

### Adding a New Section

1. Create a new folder under `sections/` (e.g., `sections/6-conclusion/`)
2. Create a `content/` subfolder
3. Add markdown files to `content/`
4. Run `make compile <section-name>` to process

### Processing All Sections

```bash
make compile-all        # Compile everything
make merge-all-r        # Fast parallel merge with heading number removal
make merge-parallel-r   # Parallel merge with number removal and detailed progress
make remove-numbers     # Prepare for InDesign auto-numbering (legacy)
```

### Optimized Parallel Processing

The system now includes high-performance parallel processing for section merging:

- **`make merge-all`** - Fast parallel merge of all sections using optimized Python processor
- **`make merge-all-r`** - Fast parallel merge with integrated heading number removal
- **`make merge-parallel-r`** - Parallel merge with heading removal, verbose output, and verification

The new merge processor provides:
- 3-4x performance improvement through parallel processing
- Integrated heading number removal (eliminates need for separate `remove-numbers` step)
- Comprehensive progress reporting and validation
- Atomic file operations with backup/rollback protection
- Cross-platform compatibility and memory-efficient processing

### Checking Available Sections

```bash
make list-sections      # Shows all sections with file counts and status
```

## Advanced Features

### Bibliography and Citation Management

- `make reformat-bibliography` - Format bibliography entries to standardized format
- `make update-links` - Update and validate citation links
- `make validate-citations` - Comprehensive citation validation

### Adobe InDesign Integration

- Cross-reference optimization tools in `lib/adobe/modules/crossref/`
- Extended logging system for InDesign automation
- ICML processing with proper Adobe formatting

### AI Workflow Components

- **IRA (Intelligent Revision Assistant)** - Text analysis and revision workflows
- **CRV (Citation Reference Validator)** - Citation validation and processing
- **DRS (Document Revision System)** - Document comparison and revision tracking

### Testing and Quality Assurance

- Comprehensive test suite in `tests/` directory
- Unit and integration testing capabilities
- Fixture-based testing for complex workflows
