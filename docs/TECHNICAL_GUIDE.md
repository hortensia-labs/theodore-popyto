# Theodore Technical Guide

Technical documentation for developers and advanced users of the Theodore system.

## 📖 Table of Contents

1. [System Architecture](#system-architecture)
2. [Build System Details](#build-system-details)
3. [File Processing Pipeline](#file-processing-pipeline)
4. [ICML Conversion](#icml-conversion)
5. [Customization](#customization)
6. [Scripts and Utilities](#scripts-and-utilities)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Extending the System](#extending-the-system)

## System Architecture

### Core Components

```text
Theodore System
├── Makefile                    # Main build orchestrator
├── scripts/
│   ├── utils/
│   │   ├── pandoc-common.sh   # Pandoc utilities
│   │   └── validate-files.sh  # File validation
│   └── merge-*.sh             # Section-specific merge scripts
├── sections/                   # Content source
└── generated/                  # Build output
    ├── markdown/              # Intermediate format
    ├── icml/                  # Final format
    └── data/                  # Extracted data (citations, cross-references)
```

### Data Flow

```text
Markdown Files → Validation → Merging → ICML Conversion → InDesign
     ↓              ↓           ↓           ↓              ↓
sections/*/    validate-    merge-     compile-icml    Professional
content/*.md   section      section                    Output
     ↓
Generated MD → Data Extraction → Citation Analysis
     ↓              ↓                ↓
generated/     compile-data      generated/
markdown/*.md                      data/*.ctcr.md
```

### Dependencies

- **pandoc** (≥2.0): Document conversion engine
- **make**: Build system orchestrator
- **bash**: Shell scripting environment
- **perl**: Text processing for line break handling
- **find/sort**: File discovery and ordering

## Build System Details

### Makefile Structure

The Makefile uses a generic approach that works with any section structure:

```makefile
# Configuration
SECTIONS_ROOT = /path/to/sections
GENERATED_ROOT = /path/to/generated
MARKDOWN_OUTPUT = $(GENERATED_ROOT)/markdown
ICML_OUTPUT = $(GENERATED_ROOT)/icml

# File patterns
NUMBERED_PATTERN = [0-9]*.md
ALL_MD_PATTERN = *.md

# Pandoc configuration
PANDOC_FLAGS = -f markdown+footnotes+definition_lists+smart -t icml -s --wrap=none --reference-links --id-prefix="thesis-"
```

### Target Dependencies

```makefile
compile: validate-section merge-section compile-icml
├── validate-section
│   └── _validate-section-internal
├── merge-section
│   └── _merge-section-internal
└── compile-icml
    └── _compile-icml-internal
```

### Generic Section Processing

The system automatically discovers sections using:

```bash
for dir in $(SECTIONS_ROOT)/*/; do
    section_name=$(basename "$dir")
    # Process each section
done
```

## File Processing Pipeline

### 1. Validation Phase

**Purpose**: Ensure section structure and files are valid

**Process**:

1. Check section folder exists
2. Verify `content/` subdirectory exists
3. Find markdown files matching patterns
4. Validate file readability and encoding
5. Report file counts and status

**Script**: `scripts/utils/validate-files.sh`

```bash
# Validation checks
- Directory exists and is readable
- Markdown files found (any .md files)
- Files are readable and not empty
- Proper file encoding (UTF-8)
```

### 2. Merging Phase

**Purpose**: Combine multiple markdown files into single file

**Process**:

1. Create empty output file
2. Find numbered files first (sorted numerically)
3. Find other markdown files (sorted alphabetically)
4. Concatenate files with proper line breaks
5. Clean trailing whitespace
6. Ensure single final newline

**File Ordering Logic**:

```bash
# Numbered files first (1.0, 1.1, 1.2, etc.)
numbered_files=$(find ... -name '[0-9]*.md' | sort)

# Other files second (alphabetically)
other_files=$(find ... -name '*.md' -not -name '[0-9]*.md' | sort)
```

**Line Break Handling**:

- First file: added directly (no leading line break)
- Subsequent files: single line break before content
- Final file: single newline at end

### 3. ICML Conversion Phase

**Purpose**: Convert merged markdown to InDesign-compatible ICML

**Process**:

1. Check merged markdown file exists
2. Create ICML output directory
3. Run pandoc with production flags
4. Generate ICML file with proper styling

**Pandoc Configuration**:

```bash
pandoc -f markdown+footnotes+definition_lists+smart \
       -t icml \
       -s \
       --wrap=none \
       --reference-links \
       --id-prefix="thesis-" \
       input.md -o output.icml
```

## ICML Conversion

### Pandoc Flags Explained

| Flag | Purpose |
|------|---------|
| `-f markdown+footnotes+definition_lists+smart` | Input format with extensions |
| `-t icml` | Output format (InCopy Markup Language) |
| `-s` | Standalone document with headers |
| `--wrap=none` | Don't wrap long lines |
| `--reference-links` | Use reference-style links |
| `--id-prefix="thesis-"` | Prefix for element IDs |

### ICML Output Features

**Paragraph Styles**:

- Automatic style generation based on heading levels
- Proper hierarchy (H1, H2, H3, etc.)
- Consistent formatting across sections

**Character Styles**:

- Bold, italic, and emphasis handling
- Code formatting preservation
- Link styling

**Advanced Features**:

- Footnote support
- Table formatting
- Cross-reference handling
- List formatting (ordered and unordered)

### Style Mapping

```markdown
# Heading 1 → <ParagraphStyleRange AppliedParagraphStyle="Heading1">
## Heading 2 → <ParagraphStyleRange AppliedParagraphStyle="Heading2">
### Heading 3 → <ParagraphStyleRange AppliedParagraphStyle="Heading3">
**Bold** → <CharacterStyleRange AppliedCharacterStyle="Bold">
*Italic* → <CharacterStyleRange AppliedCharacterStyle="Italic">
```

## Data Extraction

### Citation and Cross-Reference Extraction

The `compile-data` command extracts citations and cross-references from generated markdown files for analysis and verification purposes.

### Process Overview

1. **Input**: All `.md` files in `generated/markdown/`
2. **Pattern Matching**: Uses regex `([^)]*)` to find text within parentheses
3. **Line Numbering**: Tracks line numbers where citations appear
4. **Output**: Creates `.ctcr.md` files in `generated/data/`

### Extraction Logic

```bash
# Core extraction command
grep -n '([^)]*)' "$md_file" | sed 's/^\([0-9]*\):\(.*\)/- \2 @ [\1]/'
```

**Pattern Explanation**:

- `([^)]*)`: Matches opening parenthesis, any characters except closing parenthesis, closing parenthesis
- Captures citations like `(Author, 2023)`, `(see Section 2.1)`, `(Figure 3.4)`

### Output Format

Each extracted citation appears as:

```text
- (citation text) @ [line_number]
```

**Example**:

```text
- (Bosch, 2012) @ [45]
- (see Section 2.1) @ [78]
- (Figure 3.4) @ [123]
```

### Use Cases

- **Citation Analysis**: Verify reference consistency across sections
- **Cross-Reference Tracking**: Ensure all internal references are valid
- **Quality Control**: Identify missing or malformed citations
- **Bibliography Preparation**: Extract all citations for bibliography compilation
- **Academic Integrity**: Check citation patterns and frequency

### File Organization

```text
generated/data/
├── 1-introduccion.ctcr.md
├── 2-seccion-1.ctcr.md
├── 3-seccion-2.ctcr.md
└── ...
```

Each file contains all citations found in the corresponding markdown file with line number references.

## Customization

### Modifying Pandoc Flags

Edit the `PANDOC_FLAGS` variable in the Makefile:

```makefile
# Add custom pandoc flags
PANDOC_FLAGS = -f markdown+footnotes+definition_lists+smart \
               -t icml \
               -s \
               --wrap=none \
               --reference-links \
               --id-prefix="thesis-" \
               --filter=pandoc-citeproc \
               --bibliography=references.bib
```

### Custom File Patterns

Modify file discovery patterns:

```makefile
# Custom numbered pattern
NUMBERED_PATTERN = [0-9][0-9]*.md

# Custom markdown pattern
ALL_MD_PATTERN = *.md
```

### Adding Custom Processing

Create custom processing steps:

```makefile
# Custom processing target
custom-process:
 @echo "Running custom processing..."
 @# Your custom commands here
 @echo "Custom processing complete"

# Integrate with main workflow
compile: validate-section merge-section custom-process compile-icml
```

### Section-Specific Processing

Create section-specific merge scripts:

```bash
# scripts/merge-special-section.sh
#!/bin/bash
# Custom processing for special sections

source "$(dirname "$0")/utils/pandoc-common.sh"

# Custom logic here
echo "Processing special section..."
```

## Scripts and Utilities

### Core Scripts

#### `scripts/utils/pandoc-common.sh`

**Purpose**: Common functions for pandoc operations

**Functions**:

- `check_pandoc()`: Verify pandoc installation
- `merge_markdown_files()`: Merge files with custom logic
- `validate_output()`: Validate generated files
- Color output functions

#### `scripts/utils/validate-files.sh`

**Purpose**: Validate source files and structure

**Features**:

- Directory validation
- File readability checks
- Content validation
- Error reporting

### Utility Functions

#### Color Output

```bash
# Available color functions
print_error "Error message"
print_warning "Warning message"
print_success "Success message"
print_info "Info message"
```

#### File Validation

```bash
# Validate directory
validate_directory "/path/to/dir"

# Validate markdown files
validate_markdown_files "/path/to/dir" "*.md"
```

### Creating Custom Scripts

#### Template for New Scripts

```bash
#!/bin/bash
# script-name.sh
# Description of what the script does

set -euo pipefail

# Source common functions
source "$(dirname "$0")/utils/pandoc-common.sh"

# Script logic here
main() {
    # Your script logic
}

# Run main function
main "$@"
```

## Error Handling

### Error Categories

#### 1. Configuration Errors

- Missing required directories
- Invalid file paths
- Missing dependencies

#### 2. Validation Errors

- Invalid section structure
- Missing content files
- File permission issues

#### 3. Processing Errors

- Pandoc conversion failures
- File merge errors
- Output generation failures

### Error Recovery

#### Automatic Recovery

```bash
# The system provides automatic recovery suggestions
if [ ! -f "$markdown_file" ]; then
    echo "💡 Tip: Run 'make merge-section $section' first"
fi
```

#### Manual Recovery

```bash
# Clean and rebuild
make clean
make compile-all

# Validate specific section
make validate-section <section-name>

# Check dependencies
pandoc --version
make --version
```

### Debugging

#### Enable Debug Mode

```bash
# Add debug output to Makefile
DEBUG = 1

# Use in targets
ifeq ($(DEBUG),1)
    @echo "Debug: Processing file $<"
endif
```

#### Verbose Output

```bash
# Run make with verbose output
make -n compile 2-seccion-1  # Dry run
make -d compile 2-seccion-1  # Debug output
```

## Performance Considerations

### File Processing Optimization

#### Parallel Processing

```makefile
# Process multiple sections in parallel
.PHONY: compile-parallel
compile-parallel:
 @for section in $(SECTIONS); do \
  $(MAKE) compile $$section & \
 done; \
 wait
```

#### Incremental Builds

```makefile
# Only rebuild if source files changed
$(MARKDOWN_OUTPUT)/%.md: $(wildcard $(SECTIONS_ROOT)/%/content/*.md)
 @$(MAKE) _merge-section-internal SECTION=$*
```

### Memory Management

#### Large File Handling

- Process files individually to avoid memory issues
- Use streaming for very large files
- Clean up temporary files

#### Pandoc Optimization

```bash
# Optimize pandoc for large documents
PANDOC_FLAGS += --resource-path=. \
                --standalone \
                --self-contained
```

### Caching

#### Build Result Caching

```makefile
# Cache build results
.cache/$(SECTION).md: $(wildcard $(SECTIONS_ROOT)/$(SECTION)/content/*.md)
 @mkdir -p .cache
 @$(MAKE) _merge-section-internal SECTION=$(SECTION)
 @cp $(MARKDOWN_OUTPUT)/$(SECTION).md .cache/$(SECTION).md
```

## Extending the System

### Adding New Output Formats

#### 1. Create Conversion Function

```makefile
# Add new format target
compile-docx:
 @echo "Converting to DOCX..."
 @pandoc $(PANDOC_FLAGS) -t docx \
  $(MARKDOWN_OUTPUT)/$(SECTION).md \
  -o $(DOCX_OUTPUT)/$(SECTION).docx
```

#### 2. Integrate with Main Workflow

```makefile
compile: validate-section merge-section compile-icml compile-docx
```

### Adding New Content Types

#### 1. Define New Patterns

```makefile
# Add new file patterns
IMAGE_PATTERN = *.{png,jpg,jpeg,gif,svg}
BIBLIOGRAPHY_PATTERN = *.bib
```

#### 2. Create Processing Logic

```makefile
# Process new content types
process-images:
 @echo "Processing images..."
 @# Your image processing logic
```

### Integration with External Tools

#### Git Integration

```makefile
# Git-based versioning
git-commit:
 @git add sections/
 @git commit -m "Update thesis content"

git-push:
 @git push origin main
```

#### CI/CD Integration

```yaml
# GitHub Actions example
name: Build Thesis
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install pandoc
        run: sudo apt-get install pandoc
      - name: Build thesis
        run: make compile-all
```

### Plugin System

#### Create Plugin Structure

```bash
plugins/
├── base-plugin.sh
├── citation-plugin.sh
├── image-plugin.sh
└── custom-plugin.sh
```

#### Plugin Interface

```bash
# base-plugin.sh
plugin_name() {
    echo "Plugin Name"
}

plugin_process() {
    local input_file="$1"
    local output_file="$2"
    # Plugin processing logic
}
```

## Monitoring and Logging

### Build Logging

```makefile
# Add logging to targets
compile:
 @echo "$(date): Starting compilation" >> build.log
 @$(MAKE) _compile-internal
 @echo "$(date): Compilation complete" >> build.log
```

### Performance Monitoring

```bash
# Add timing to operations
time make compile-all

# Monitor resource usage
top -p $(pgrep -f "make compile")
```

## Security Considerations

### File Permissions

- Ensure proper file permissions on generated files
- Validate input files before processing
- Sanitize file paths to prevent directory traversal

### Input Validation

- Validate markdown syntax before processing
- Check file sizes to prevent resource exhaustion
- Validate file encodings

### Output Security

- Sanitize output files
- Validate generated ICML structure
- Check for malicious content

---

**Ready to customize?** Start with the [Workflow Guide](WORKFLOW_GUIDE.md) to see how to integrate these technical features into your thesis writing process!
