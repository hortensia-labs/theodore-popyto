# Theodore Makefile Reference

Complete reference for all Makefile commands and options in the Theodore system.

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Main Commands](#main-commands)
3. [Individual Operations](#individual-operations)
4. [Utility Commands](#utility-commands)
5. [Configuration Options](#configuration-options)
6. [Error Handling](#error-handling)
7. [Examples and Use Cases](#examples-and-use-cases)
8. [Advanced Usage](#advanced-usage)

## Quick Reference

### Most Common Commands

```bash
# Get help
make help

# List available sections
make list-sections

# Compile a specific section (complete workflow)
make compile <section-name>

# Compile all sections (with optimized parallel processing)
make compile-all

# Compile all sections and remove heading numbers
make compile-all-r

# Compile all sections and update InDesign links
make compile-all-u

# Compile all sections, remove numbers, and update everything
make compile-all-ru

# Parallel merge operations (optimized)
make merge-all                    # Fast parallel merge
make merge-all-r                  # Fast parallel merge with heading number removal
make merge-parallel              # Parallel merge with verbose output
make merge-parallel-r            # Parallel merge with number removal and verbose output

# Citation validation workflow
make validate-citations          # Full validation with AI analysis
make validate-citations-quick    # Quick validation without AI
make validate-citations-watch    # Watch mode validation

# Extract citations and cross-references
make compile-data

# Update InDesign book document links
make update-links

# Update InDesign book (sync styles, update numbers, preflight)
make update-book

# Process cross-references in InDesign book documents
make crossref-process

# Reformat bibliography ICML file paragraph styles
make reformat-bibliography

# Update Table of Contents in InDesign
make update-toc

# Apply IRA (Iterative Refinement and Authenticity) revision workflow
make ira-revision <markdown-file>

# Remove heading numbers for InDesign (legacy - use merge-all-r instead)
make remove-numbers

# Clean generated files
make clean
make clean-merged                # Clean merged files only
make clean-validation           # Clean citation validation cache
```

## Main Commands

### `make help`

**Purpose**: Display comprehensive help information

**Usage**: `make help`

**Output**: Shows all available commands with descriptions and examples

**Example**:

```bash
make help
```

### `make compile <section>`

**Purpose**: Complete workflow for a specific section

**Usage**: `make compile <section-name>`

**What it does**:

1. Validates section structure and files
2. Merges markdown files into single file
3. Converts merged file to ICML format

**Examples**:

```bash
make compile 1-introduccion
make compile 2-marco-teorico
make compile 3-metodologia
```

**Error handling**: If section not found, shows available sections

### `make compile-all`

**Purpose**: Compile all valid sections automatically

**Usage**: `make compile-all`

**What it does**:

- Discovers all sections in `sections/` directory
- Validates each section
- Compiles valid sections
- Skips invalid sections with warning

**Example**:

```bash
make compile-all
```

**Output**: Shows progress for each section processed using optimized parallel processing

### `make compile-all-r`

**Purpose**: Compile all valid sections with heading number removal automatically

**Usage**: `make compile-all-r`

**What it does**:

1. Parallel merge all sections with integrated heading number removal
2. Parallel ICML conversion for all sections
3. Scan anchors and build cross-reference registry
4. Validate cross-references

**Example**:

```bash
make compile-all-r
```

**Output**: Shows progress for each section processed with heading numbers removed

### `make compile-all-u`

**Purpose**: Compile all sections and update InDesign book document links

**Usage**: `make compile-all-u`

**What it does**:

1. Parallel merge all sections
2. Parallel ICML conversion for all sections
3. Scan anchors and build cross-reference registry
4. Validate cross-references
5. Update InDesign book document links

**Example**:

```bash
make compile-all-u
```

**Output**: Complete compilation workflow with automatic InDesign link updates

### `make compile-all-ru`

**Purpose**: Complete thesis preparation workflow with heading removal and full InDesign updates

**Usage**: `make compile-all-ru`

**What it does**:

1. Parallel merge all sections with heading number removal
2. Parallel ICML conversion for all sections
3. Scan anchors and build cross-reference registry
4. Validate cross-references
5. Update InDesign book document links
6. Process cross-references in InDesign
7. Synchronize book, update numbering, and preflight
8. Update Table of Contents

**Example**:

```bash
make compile-all-ru
```

**Output**: Complete end-to-end thesis preparation workflow

### `make compile-data`

**Purpose**: Extract citations and cross-references from generated markdown files

**Usage**: `make compile-data`

**What it does**:

- Processes all `.md` files in `generated/markdown/`
- Extracts text between parentheses (citations and cross-references)
- Creates corresponding `.ctcr.md` files in `generated/data/`
- Includes line numbers where citations were found
- Reports processing statistics

**Output format**: Each citation is listed as:

```text
- (citation text) @ [line_number]
```

**Example output**:

```text
📊 Extracting citations and cross-references...
   📝 Processing: 2-seccion-1.md
   ✅ Extracted citations to: 2-seccion-1.ctcr.md
   📝 Processing: 3-seccion-2.md
   ⚠️  No citations found in: 3-seccion-2.md
✅ Processed 5 markdown files, extracted data from 3 files
```

**Generated files**:

- `generated/data/[section-name].ctcr.md` - Contains extracted citations with line numbers

**Use case**: Analyze citation patterns, verify references, or prepare citation data for further processing

## Individual Operations

### `make validate-section <section>`

**Purpose**: Validate section structure and files

**Usage**: `make validate-section <section-name>`

**What it checks**:

- Section folder exists
- `content/` subdirectory exists
- Markdown files found in `content/`
- Files are readable and valid

**Examples**:

```bash
make validate-section 1-introduccion
make validate-section 2-marco-teorico
```

**Output**: Detailed validation report with file counts

### `make merge-section <section>`

**Purpose**: Merge markdown files into single file

**Usage**: `make merge-section <section-name>`

**What it does**:

- Finds all `.md` files in `content/` directory
- Processes numbered files first (sorted numerically)
- Processes other files (sorted alphabetically)
- Merges files with proper line breaks
- Saves to `generated/markdown/<section>.md`

**Examples**:

```bash
make merge-section 1-introduccion
make merge-section 2-marco-teorico
```

**File ordering**:

1. Numbered files: `1.0-intro.md`, `1.1-methods.md`, `1.2-results.md`
2. Other files: `bibliography.md`, `appendix.md`

### `make merge-all`

**Purpose**: Parallel merge all sections using optimized Python processor

**Usage**: `make merge-all`

**What it does**:

- Discovers all valid sections automatically
- Processes sections in parallel for maximum performance
- Merges markdown files with proper ordering and formatting
- Creates merged files in `generated/markdown/`
- 3-4x performance improvement over sequential processing

**Example**:

```bash
make merge-all
```

**Performance**: Optimized for speed with parallel processing and memory-efficient operations

### `make merge-all-r`

**Purpose**: Parallel merge all sections with integrated heading number removal

**Usage**: `make merge-all-r`

**What it does**:

- All features of `merge-all`
- Integrated heading number removal during merge process
- Eliminates need for separate `remove-numbers` step
- Prepares files for InDesign automatic numbering

**Examples**:

- `## 1.1 Introduction` → `## Introduction`
- `### 1.2.3 Methodology` → `### Methodology`

**Example**:

```bash
make merge-all-r
```

**Use case**: Preferred method for InDesign preparation workflows

### `make merge-parallel`

**Purpose**: Parallel merge with comprehensive progress reporting and verification

**Usage**: `make merge-parallel`

**What it does**:

- All features of `merge-all`
- Verbose progress reporting with detailed status
- File verification and validation after merge
- Comprehensive logging and error reporting
- Atomic operations with backup/rollback protection

**Example**:

```bash
make merge-parallel
```

**Output**: Detailed progress reports and verification results

### `make merge-parallel-r`

**Purpose**: Parallel merge with heading removal, verbose output, and verification

**Usage**: `make merge-parallel-r`

**What it does**:

- Combines `merge-parallel` and `merge-all-r` features
- Parallel processing with heading number removal
- Comprehensive progress reporting and verification
- Cross-platform compatibility and error handling

**Example**:

```bash
make merge-parallel-r
```

**Use case**: Development and debugging workflows requiring detailed feedback

### `make clean-merged`

**Purpose**: Clean merged markdown files only (preserves ICML and other generated files)

**Usage**: `make clean-merged`

**What it does**:

- Removes all `.md` files from `generated/markdown/`
- Preserves ICML files, data files, and reports
- Selective cleanup for re-merging workflows

**Example**:

```bash
make clean-merged
```

**Use case**: Re-run merge operations without full cleanup

### `make compile-icml [section]`

**Purpose**: Convert markdown to ICML format

**Usage**:

- `make compile-icml <section-name>` - Convert specific section
- `make compile-icml` - Convert all sections

**What it does**:

- Checks merged markdown file exists
- Runs pandoc with production flags
- Generates ICML file for InDesign
- Saves to `generated/icml/<section>.icml`

**Examples**:

```bash
# Convert specific section
make compile-icml 1-introduccion

# Convert all sections
make compile-icml
```

**Pandoc flags used**:

```bash
-f markdown+footnotes+definition_lists+smart
-t icml
-s
--wrap=none
--reference-links
--id-prefix="thesis-"
```

## Citation Validation Commands

### `make validate-citations`

**Purpose**: Comprehensive citation validation with AI-powered analysis

**Usage**: `make validate-citations`

**What it does**:

- Extracts all inline citations from thesis content
- Processes bibliography entries and validates formatting
- Validates citations against bibliography database
- Applies AI-powered citation analysis for quality assessment
- Generates comprehensive validation reports
- Creates action items for citation improvements

**Prerequisites**:

- Compiled thesis sections in `generated/markdown/`
- Bibliography files in proper location
- Python 3 with required dependencies

**Example output**:

```text
🔍 Starting Citation Validation Workflow
══════════════════════════════════════════════
📝 Processing: 2-seccion-1.md
✅ Extracted 45 citations
📚 Processing bibliography entries...
✅ Found 178 bibliography entries
🤖 Running AI analysis...
✅ Generated validation report
✅ Citation validation complete!
📊 Reports available at:
  • generated/reports/crv/final/validation-report.md
  • generated/reports/crv/final/action-items.md
  • generated/reports/crv/final/validation-summary.json
```

**Generated files**:

- `generated/reports/crv/final/validation-report.md` - Detailed validation results
- `generated/reports/crv/final/action-items.md` - Specific improvement recommendations
- `generated/reports/crv/final/validation-summary.json` - Machine-readable summary

### `make validate-citations-quick`

**Purpose**: Fast citation validation without AI analysis

**Usage**: `make validate-citations-quick`

**What it does**:

- Extracts citations and validates against bibliography
- Skips AI-powered analysis for faster processing
- Ideal for rapid validation during development

**Example**:

```bash
make validate-citations-quick
```

**Use case**: Quick validation during active writing and editing

### `make validate-citations-watch`

**Purpose**: Continuous citation validation in watch mode

**Usage**: `make validate-citations-watch`

**What it does**:

- Runs `validate-citations-quick` every 60 seconds
- Provides continuous feedback during writing
- Press Ctrl+C to stop monitoring

**Example**:

```bash
make validate-citations-watch
```

**Output**: Continuous validation updates with timestamp

### `make validate-citations-step`

**Purpose**: Run specific steps of the citation validation workflow

**Usage**: `make validate-citations-step STEP=<step>`

**Available steps**:

- `extraction` - Extract citations from thesis content only
- `bibliography` - Process bibliography entries only
- `validation` - Validate citations against bibliography
- `agent` - Run AI-powered analysis only
- `reports` - Generate final reports only

**Examples**:

```bash
make validate-citations-step STEP=extraction
make validate-citations-step STEP=bibliography
make validate-citations-step STEP=validation
make validate-citations-step STEP=agent
make validate-citations-step STEP=reports
```

**Use case**: Debug specific validation issues or re-run individual steps

### `make clean-validation`

**Purpose**: Clean citation validation cache and reports

**Usage**: `make clean-validation`

**What it does**:

- Removes cached citation data from `references/data/cache/`
- Clears validation logs from `references/logs/`
- Removes draft reports from `references/reports/drafts/`
- Preserves final reports

**Example**:

```bash
make clean-validation
```

**Use case**: Reset validation state for fresh analysis

### `make test-citations`

**Purpose**: Run citation validation test suite

**Usage**: `make test-citations`

**What it does**:

- Executes comprehensive test suite for citation validation
- Tests extraction, bibliography processing, and validation logic
- Generates test report with results

**Example**:

```bash
make test-citations
```

**Output**: Test results and report location

### `make extract-citations`

**Purpose**: Extract citations from thesis content only

**Usage**: `make extract-citations`

**What it does**:

- Processes all markdown files in thesis sections
- Extracts inline citations using pattern matching
- Saves extracted citations to `generated/reports/crv/inline-citations.md`
- Does not perform validation or analysis

**Example**:

```bash
make extract-citations
```

**Use case**: Quick citation extraction for manual review

### `make process-bibliography`

**Purpose**: Process bibliography entries only

**Usage**: `make process-bibliography`

**What it does**:

- Processes bibliography files and formats entries
- Validates bibliography structure and formatting
- Does not validate against thesis citations

**Example**:

```bash
make process-bibliography
```

**Use case**: Bibliography validation independent of thesis content

### `make generate-validation-report`

**Purpose**: Generate validation report from existing data

**Usage**: `make generate-validation-report`

**What it does**:

- Uses previously extracted citations and bibliography data
- Generates validation reports without re-running extraction
- Requires previous extraction and bibliography processing

**Prerequisites**:

- Previous execution of `extract-citations` and `process-bibliography`
- Citation and bibliography data files must exist

**Example**:

```bash
make generate-validation-report
```

**Use case**: Regenerate reports after data modifications

## Utility Commands

### `make list-sections`

**Purpose**: List all available sections with status

**Usage**: `make list-sections`

**Output**:

- ✅ Ready sections (complete structure with files)
- ❌ Missing `content/` folder
- ⚠️ No markdown files found

**Example output**:

```text
📁 Available sections in /path/to/sections:

  ✅ 1-introduccion (5 files)
  ✅ 2-marco-teorico (8 files)
  ⚠️ 3-metodologia (no .md files)
  ❌ 4-resultados (missing content/ folder)

Ready sections can be compiled with: make compile <section-name>
```

### `make remove-numbers`

**Purpose**: Remove hardcoded heading numbers from generated files

**Usage**: `make remove-numbers`

**What it does**:

- Processes all `.md` files in `generated/markdown/`
- Removes numbered prefixes from headings
- Preserves heading structure for InDesign auto-numbering

**Examples**:

- `## 1.1 Introduction` → `## Introduction`
- `### 1.2.3 Methodology` → `### Methodology`

**Use case**: Prepare files for InDesign automatic numbering

### `make clean`

**Purpose**: Remove all generated files

**Usage**: `make clean`

**What it removes**:

- All `.md` files in `generated/markdown/`
- All `.icml` files in `generated/icml/`

**Use case**: Start fresh or clean up after testing

### `make update-links`

**Purpose**: Update InDesign book document links using AppleScript

**Usage**: `make update-links`

**What it does**:

- Runs the AppleScript `scripts/update-links-of-book-documents.scpt`
- Updates all outdated links in InDesign book documents
- Provides detailed feedback on link update status
- Processes all documents in the book automatically

**Prerequisites**:

- InDesign must be running
- Book document must be open in InDesign
- AppleScript file must exist

**Example output**:

```text
🔗 Updating InDesign book document links...
Working in 1-introduccion.indd --------------
1-introduccion.indd has 1 outdated links
links were successfully updated!
Working in 2-seccion-1.indd --------------
2-seccion-1.indd has 1 outdated links
links were successfully updated!
✅ InDesign book document links updated successfully!
```

**Use case**: Update links after importing new ICML files to InDesign

### `make update-book`

**Purpose**: Update InDesign book (synchronize styles, update numbers, preflight)

**Usage**: `make update-book`

**What it does**:

- Runs the AppleScript `scripts/adobe/book-sync-update-preflight.scpt`
- Synchronizes paragraph and character styles across all book documents
- Updates all automatic numbering (headings, figures, tables, etc.)
- Runs preflight checks on all documents
- Ensures consistency across the entire book

**Prerequisites**:

- InDesign must be running
- Book document must be open in InDesign
- AppleScript file must exist

**Example output**:

```text
📚 Updating InDesign book (sync styles, update numbers, preflight)...
Synchronizing styles across book documents...
Updating automatic numbering...
Running preflight checks...
✅ InDesign book updated successfully (styles synced, numbers updated, preflighted)!
```

**Use case**: Final preparation before publishing or after major content updates

### `make crossref-process`

**Purpose**: Process cross-references in InDesign book documents

**Usage**: `make crossref-process`

**What it does**:

- Runs the AppleScript `scripts/adobe/runner.scpt` with `crossref-process.jsx`
- Executes the JSX script `scripts/adobe/crossref-process.jsx` in InDesign
- Updates all cross-references throughout the book documents
- Ensures all internal references point to correct locations
- Updates reference numbers and text

**Prerequisites**:

- InDesign must be running
- Book document must be open in InDesign
- Both AppleScript and JSX files must exist
- Cross-reference registry should be up-to-date (run `make compile-all` first)

**Example output**:

```text
🔗 Processing cross-references in InDesign book documents...
Running crossref-process.jsx in InDesign...
Processing cross-references in 1-introduccion.indd...
Processing cross-references in 2-seccion-1.indd...
✅ Cross-references processed successfully in all InDesign book documents!
```

**Use case**: Update cross-references after content changes or before final publication

### `make reformat-bibliography`

**Purpose**: Reformat bibliography ICML file paragraph styles

**Usage**: `make reformat-bibliography`

**What it does**:

- Reads the `.env` file to get the `BIBLIOGRAPHY_SECTION` environment variable
- Processes the ICML file `generated/icml/{BIBLIOGRAPHY_SECTION}.icml`
- Replaces paragraph styles for proper bibliography formatting:
  - `"Paragraph"` → `"Paragraph Bibliography"`
  - `"ParagraphStyle/Paragraph"` → `"ParagraphStyle/Paragraph Bibliography"`
- Creates a backup of the original file before modification
- Reports processing results

**Prerequisites**:

- `.env` file must exist in project root
- `BIBLIOGRAPHY_SECTION` environment variable must be set in `.env`
- Bibliography ICML file must exist in `generated/icml/`
- Python 3 must be installed

**Environment Variables Required**:

```bash
# In .env file
BIBLIOGRAPHY_SECTION=7-bibliografia
```

**Example output**:

```text
🔗 Reformat Bibliography...
Processing bibliography ICML file: /path/to/generated/icml/7-bibliografia.icml
✅ Bibliography paragraph styles reformatted successfully
📄 Processed 45 paragraph style replacements
🎉 Bibliography reformatted!
```

**Use case**: Apply consistent bibliography styling after ICML generation and before final InDesign import

### `make update-toc`

**Purpose**: Update Table of Contents in InDesign

**Usage**: `make update-toc`

**What it does**:

- Reads the `.env` file to get `TOC_DOCUMENT` and `TOC_STYLE` environment variables
- Connects to InDesign via AppleScript
- Locates the specified TOC document in the open book
- Finds the specified TOC style in the document
- Regenerates the Table of Contents using the specified style
- Includes overset content in the TOC generation
- Reports success/failure status

**Prerequisites**:

- `.env` file must exist in project root
- `TOC_DOCUMENT` and `TOC_STYLE` environment variables must be set in `.env`
- InDesign must be running
- Book document must be open in InDesign
- TOC document must exist in the book
- TOC style must exist in the TOC document
- AppleScript file must exist: `scripts/adobe/update-toc.applescript`

**Environment Variables Required**:

```bash
# In .env file
TOC_DOCUMENT=0-TOC              # Name of TOC document (without .indd extension)
TOC_STYLE=Table of Contents     # Name of the TOC style to use
```

**Example output**:

```text
📑 Updating Table of Contents...
Updating TOC: 0-TOC.indd with style: Table of Contents
TOC updated successfully
🎉 Table of Contents updated!
```

**Error handling**:

- Checks if InDesign is running
- Verifies book is open
- Validates TOC document exists
- Confirms TOC style exists
- Provides detailed error messages for troubleshooting

**Use case**: Regenerate Table of Contents after content updates, heading changes, or page number modifications

### `make ira-revision`

**Purpose**: Apply IRA (Iterative Refinement and Authenticity) revision workflow to humanize AI-generated text

**Usage**: `make ira-revision <markdown-file>`

**What it does**:

- Loads a source markdown file for revision
- Auto-generates diagnostic report path based on source file name
- Parses an XML diagnostic report containing AI pattern analysis
- Applies targeted revisions using specialized AI agents:
  - **Architect Agent**: Fixes burstiness and syntactic repetition
  - **Voice Agent**: Injects hedging language and refines vocabulary
  - **Transition Agent**: Refines formulaic transitions
- Generates a timestamped revised file with comprehensive revision tracking
- Preserves original content while applying humanization techniques

**Prerequisites**:

- Source markdown file must exist and be readable
- Python 3 must be installed
- IRA revision orchestrator script must be available
- Diagnostic report will be auto-generated at `generated/reports/ira/<source-name>-diagnostic-report.xml`

**Required Parameters**:

```bash
# <markdown-file>: Path to the markdown file to be revised
# The diagnostic report path is automatically generated
```

**Example usage**:

```bash
# Basic usage
make ira-revision generated/markdown/2-seccion-1.md

# Using absolute paths
make ira-revision /path/to/section.md

# With compiled sections
make ira-revision generated/markdown/1-introduccion.md
```

**Example output**:

```text
🚀 Starting IRA (Iterative Refinement and Authenticity) Revision Workflow
══════════════════════════════════════════════════════════════════════════
📄 Source File: generated/markdown/2-seccion-1.md
📊 Diagnostic Report: generated/reports/ira/2-seccion-1-diagnostic-report.xml
💡 Note: Report path auto-generated from source file name

✓ Loaded source text: 15420 characters
✓ Parsed diagnostic report: 8 issues identified
✓ Extracted 8 issues for processing

🔄 Processing 8 identified issues...

[1/8] Processing Low Burstiness (Severity: high)
  → Applying burstiness revision to Lines 7-11
  → Applying burstiness revision to Lines 21-25

[2/8] Processing Syntactic Repetition (Severity: medium)
  → Applying syntactic variation to Lines 21-25

[3/8] Processing Missing Hedging Language (Severity: medium)
  → Applying hedging language injection to Line 49

[4/8] Processing Generic Vocabulary (Severity: low)
  → Applying vocabulary refinement to Lines 15-20

✓ Revised file created: generated/markdown/2-seccion-1-rev1-20241220_143022.md
✓ Applied 6 revisions

🎯 IRA Revision Pass Complete!
📤 Output: generated/markdown/2-seccion-1-rev1-20241220_143022.md
📈 Statistics: 6 revisions applied out of 8 issues identified

✅ IRA Revision Workflow Complete!
📤 Check the source file directory for the revised output file
📈 Review the revision tracking metadata in the output file
📊 Diagnostic report saved to: generated/reports/ira/
```

**Generated files**:

- `{original-name}-rev1-{timestamp}.md` - Revised file with tracking metadata
- `generated/reports/ira/{source-name}-diagnostic-report.xml` - Auto-generated diagnostic report
- Revision tracking header includes:
  - Source file path
  - Auto-generated diagnostic report path
  - Revision date and time
  - Number of issues processed
  - Number of revisions applied
  - Detailed revision log

**Revision tracking format**:

```html
<!-- IRA REVISION TRACKING -->
<!-- Source: generated/markdown/2-seccion-1.md -->
<!-- Diagnostic Report: generated/reports/ira/2-seccion-1-diagnostic-report.xml -->
<!-- Revision Date: 2024-12-20T14:30:22.123456 -->
<!-- Issues Processed: 8 -->
<!-- Revisions Applied: 6 -->
<!--
REVISION LOG:
- BURSTINESS: Varied sentence lengths in Lines 7-11
- SYNTACTIC_VARIATION: Eliminated repetitive openings in Lines 21-25
- HEDGING: Added intellectual caution to absolute claim in Line 49
- VOCABULARY: Replaced generic terms with specific alternatives
- TRANSITION: Refined formulaic transition in Line 59
- HEDGING: Applied general hedging language throughout text
-->
```

**Error handling**:

- Validates that source file parameter is provided
- Checks that source file exists and is readable
- Auto-generates diagnostic report path and creates directory if needed
- Provides detailed error messages with troubleshooting tips
- Exits with appropriate error codes for script integration

**Use cases**:

- Humanize AI-generated academic text
- Apply targeted revisions based on diagnostic analysis
- Iteratively improve text authenticity and readability
- Process large documents with systematic revision tracking
- Integrate with automated text processing workflows

**Integration with other commands**:

```bash
# Complete workflow: compile → revise → recompile
make compile 2-seccion-1
make ira-revision generated/markdown/2-seccion-1.md
make compile-icml 2-seccion-1-rev1-20241220_143022
```

**Advanced usage**:

```bash
# Process multiple files in batch
for file in generated/markdown/*.md; do
    make ira-revision "$file"
done

# Integration with version control
make ira-revision generated/markdown/2-seccion-1.md
git add generated/markdown/2-seccion-1-rev1-*.md
git add generated/reports/ira/2-seccion-1-diagnostic-report.xml
git commit -m "Apply IRA revision to section 2"
```

## Configuration Options

### Environment Variables

You can customize the system by setting environment variables:

```bash
# Custom sections root
export SECTIONS_ROOT="/custom/path/to/sections"

# Custom output directory
export GENERATED_ROOT="/custom/path/to/generated"

# Custom pandoc flags
export PANDOC_FLAGS="-f markdown -t icml -s --custom-flag"

# Bibliography section name (for reformat-bibliography command)
export BIBLIOGRAPHY_SECTION="7-bibliografia"

# TOC document and style (for update-toc command)
export TOC_DOCUMENT="0-TOC"
export TOC_STYLE="Table of Contents"
```

### Makefile Variables

The Makefile uses these configurable variables:

```makefile
# Paths
SECTIONS_ROOT = /Users/henry/Workbench/Theodore/sections
GENERATED_ROOT = /Users/henry/Workbench/Theodore/generated
MARKDOWN_OUTPUT = $(GENERATED_ROOT)/markdown
ICML_OUTPUT = $(GENERATED_ROOT)/icml
SCRIPTS_ROOT = /Users/henry/Workbench/Theodore/lib

# File patterns
NUMBERED_PATTERN = [0-9]*.md
ALL_MD_PATTERN = *.md

# Pandoc configuration
PANDOC_FLAGS = -f markdown+footnotes+definition_lists+smart -t icml -s --wrap=none --reference-links --id-prefix="thesis-"
```

## Error Handling

### Common Error Messages

#### "Section not found"

**Cause**: Section folder doesn't exist in `sections/`

**Solution**:

```bash
# Check available sections
make list-sections

# Verify folder name spelling
ls sections/

# Create missing section
mkdir -p sections/<section-name>/content
```

#### "No markdown files found"

**Cause**: No `.md` files in `content/` directory

**Solution**:

```bash
# Check content directory
ls sections/<section-name>/content/

# Create markdown files
touch sections/<section-name>/content/1.0-intro.md
```

#### "ICML conversion failed"

**Cause**: Pandoc error or missing merged file

**Solution**:

```bash
# Run merge first
make merge-section <section-name>

# Check pandoc installation
pandoc --version

# Verify markdown syntax
```

#### "Validation failed"

**Cause**: File structure or content issues

**Solution**:

```bash
# Check specific validation errors
make validate-section <section-name>

# Verify file permissions
ls -la sections/<section-name>/content/

# Check file encoding
file sections/<section-name>/content/*.md
```

#### "BIBLIOGRAPHY_SECTION not set in .env file"

**Cause**: Missing or incorrect `.env` file configuration for `reformat-bibliography`

**Solution**:

```bash
# Create or edit .env file
echo "BIBLIOGRAPHY_SECTION=7-bibliografia" >> .env

# Verify .env file contents
cat .env

# Ensure bibliography ICML file exists
ls generated/icml/${BIBLIOGRAPHY_SECTION}.icml
```

#### "TOC_DOCUMENT and/or TOC_STYLE not set in .env file"

**Cause**: Missing or incorrect `.env` file configuration for `update-toc`

**Solution**:

```bash
# Add required environment variables to .env file
echo "TOC_DOCUMENT=0-TOC" >> .env
echo "TOC_STYLE=Table of Contents" >> .env

# Verify .env file contents
cat .env

# Check InDesign is running and book is open
# Verify TOC document exists in the book
# Confirm TOC style exists in the document
```

#### "Please specify a source file"

**Cause**: Missing required source file parameter for `ira-revision`

**Solution**:

```bash
# Check command syntax
make ira-revision generated/markdown/2-seccion-1.md

# Verify file exists
ls -la generated/markdown/2-seccion-1.md

# Use absolute paths if needed
make ira-revision /full/path/to/file.md
```

#### "Source file not found"

**Cause**: Source file specified doesn't exist

**Solution**:

```bash
# Check if source file exists
ls -la generated/markdown/2-seccion-1.md

# Generate missing files first
make compile 2-seccion-1  # Generate source file

# Verify file permissions
chmod 644 generated/markdown/2-seccion-1.md
```

#### "Error parsing XML report" or "Error reading report file"

**Cause**: Invalid XML format in auto-generated diagnostic report file

**Solution**:

```bash
# Check auto-generated report file
ls -la generated/reports/ira/2-seccion-1-diagnostic-report.xml

# Validate XML syntax
xmllint --noout generated/reports/ira/2-seccion-1-diagnostic-report.xml

# Check file encoding
file generated/reports/ira/2-seccion-1-diagnostic-report.xml

# Verify XML structure matches expected format
head -20 generated/reports/ira/2-seccion-1-diagnostic-report.xml
```

#### "Could not find TOC document named: [name]"

**Cause**: TOC document not found in the open InDesign book

**Solution**:

```bash
# Check TOC_DOCUMENT value in .env
grep TOC_DOCUMENT .env

# Verify document exists in InDesign book
# Ensure document name matches exactly (case-sensitive)
# Check that .indd extension is not included in TOC_DOCUMENT value
```

### Error Recovery

#### Complete Reset

```bash
# Clean everything
make clean

# Rebuild from scratch
make compile-all
```

#### Section-Specific Recovery

```bash
# Clean specific section
rm generated/markdown/<section>.md
rm generated/icml/<section>.icml

# Rebuild section
make compile <section>
```

## Examples and Use Cases

### Basic Workflow

```bash
# 1. Check what's available
make list-sections

# 2. Compile a section
make compile 1-introduccion

# 3. Check the results
ls generated/markdown/
ls generated/icml/

# 4. Compile all sections (optimized parallel processing)
make compile-all
```

### Development Workflow

```bash
# 1. Start with validation
make validate-section 1-introduccion

# 2. Test merging (optimized)
make merge-section 1-introduccion

# 3. Test ICML conversion
make compile-icml 1-introduccion

# 4. Full compilation
make compile 1-introduccion
```

### High-Performance Workflow (Recommended)

```bash
# 1. Check available sections
make list-sections

# 2. Fast parallel merge of all sections
make merge-all

# 3. Parallel ICML conversion
make compile-icml

# 4. Build cross-reference registry
make scan-ref

# 5. Validate cross-references
make validate-crossreferences
```

### Publishing Workflow (Complete End-to-End)

```bash
# 1. Complete thesis preparation with all optimizations
make compile-all-ru

# This single command does:
# - Parallel merge with heading number removal
# - Parallel ICML conversion
# - Cross-reference registry building and validation
# - InDesign link updates
# - Cross-reference processing
# - Book synchronization and preflight
# - Table of Contents update
```

### Legacy Publishing Workflow (Individual Steps)

```bash
# 1. Compile all content (optimized parallel processing)
make compile-all

# 2. Remove numbers for InDesign (legacy - use merge-all-r instead)
make remove-numbers

# 3. Reformat bibliography styles
make reformat-bibliography

# 4. Check final output
ls generated/icml/

# 5. Import to InDesign
# (Manual step)

# 6. Update Table of Contents
make update-toc

# 7. Update cross-references
make crossref-process
```

### Citation Validation Workflow

```bash
# 1. Compile thesis content first
make compile-all

# 2. Full citation validation with AI analysis
make validate-citations

# 3. Review validation reports
cat generated/reports/crv/final/validation-report.md
cat generated/reports/crv/final/action-items.md

# 4. Quick re-validation during editing
make validate-citations-quick

# 5. Continuous monitoring during writing
make validate-citations-watch
```

### AI Text Humanization Workflow

```bash
# 1. Compile source content (using optimized parallel processing)
make compile 2-seccion-1

# 2. Apply IRA revision workflow (auto-generates diagnostic report)
make ira-revision generated/markdown/2-seccion-1.md

# 3. Review revised output and diagnostic report
ls generated/markdown/2-seccion-1-rev1-*.md
ls generated/reports/ira/2-seccion-1-diagnostic-report.xml

# 4. Compile revised content to ICML
make compile-icml 2-seccion-1-rev1-20241220_143022

# 5. Continue with optimized publishing workflow
make compile-all-u
```

### Performance-Optimized Development Workflow

```bash
# 1. Fast parallel merge during development
make merge-all-r

# 2. Quick ICML conversion
make compile-icml

# 3. Validate citations without AI (fast)
make validate-citations-quick

# 4. Test specific section changes
make compile 2-seccion-1

# 5. Full validation before publishing
make validate-citations
```

### Testing Workflow

```bash
# 1. Clean previous builds
make clean

# 2. Test individual sections
make compile 1-introduccion
make compile 2-marco-teorico

# 3. Test parallel processing
make merge-parallel-r

# 4. Test full compilation with optimizations
make compile-all

# 5. Test citation validation
make test-citations

# 6. Verify output
ls generated/markdown/
ls generated/icml/
ls generated/reports/
```

## Advanced Usage

### Custom Section Processing

Create custom processing for specific sections:

```bash
# Create custom merge script
cat > scripts/merge-special-section.sh << 'EOF'
#!/bin/bash
# Custom processing for special sections
source "$(dirname "$0")/utils/pandoc-common.sh"

echo "Processing special section..."
# Custom logic here
EOF

chmod +x scripts/merge-special-section.sh
```

### Batch Operations

Process multiple sections with custom logic:

```bash
# Process all sections with custom validation
for section in $(ls sections/); do
    echo "Processing $section..."
    make validate-section $section
    if [ $? -eq 0 ]; then
        make compile $section
    fi
done
```

### Integration with External Tools

#### Git Integration

```bash
# Commit changes after compilation
make compile-all
git add sections/
git commit -m "Update thesis content"
git push
```

#### CI/CD Integration

```yaml
# GitHub Actions example
- name: Build Thesis
  run: |
    make compile-all
    make remove-numbers
    # Additional steps
```

### Monitoring and Logging

#### Add Logging to Commands

```bash
# Log compilation results
make compile-all 2>&1 | tee build.log

# Monitor file changes
watch -n 5 'ls -la generated/markdown/'
```

#### Performance Monitoring

```bash
# Time compilation
time make compile-all

# Monitor resource usage
top -p $(pgrep -f "make compile")
```

## Command Reference Summary

| Command | Purpose | Usage |
|---------|---------|-------|
| `help` | Show help | `make help` |
| `compile <section>` | Complete workflow for single section | `make compile <section>` |
| `compile-all` | Compile all sections with parallel processing | `make compile-all` |
| `compile-all-r` | Compile all sections with heading number removal | `make compile-all-r` |
| `compile-all-u` | Compile all sections and update InDesign links | `make compile-all-u` |
| `compile-all-ru` | Complete end-to-end thesis preparation | `make compile-all-ru` |
| `merge-all` | Fast parallel merge of all sections | `make merge-all` |
| `merge-all-r` | Parallel merge with heading number removal | `make merge-all-r` |
| `merge-parallel` | Parallel merge with verbose output | `make merge-parallel` |
| `merge-parallel-r` | Parallel merge with removal and verbose output | `make merge-parallel-r` |
| `validate-citations` | Full citation validation with AI analysis | `make validate-citations` |
| `validate-citations-quick` | Quick citation validation without AI | `make validate-citations-quick` |
| `validate-citations-watch` | Citation validation in watch mode | `make validate-citations-watch` |
| `clean-validation` | Clean citation validation cache | `make clean-validation` |
| `test-citations` | Run citation validation tests | `make test-citations` |
| `extract-citations` | Extract citations only | `make extract-citations` |
| `process-bibliography` | Process bibliography only | `make process-bibliography` |
| `generate-validation-report` | Generate validation report only | `make generate-validation-report` |
| `validate-citations-step` | Run specific validation step | `make validate-citations-step STEP=<step>` |
| `compile-data` | Extract citations and cross-references | `make compile-data` |
| `scan-ref` | Build anchor registry | `make scan-ref` |
| `validate-crossreferences` | Validate cross-references | `make validate-crossreferences` |
| `update-links` | Update InDesign book document links | `make update-links` |
| `update-book` | Update InDesign book (sync, numbers, preflight) | `make update-book` |
| `crossref-process` | Process cross-references in InDesign | `make crossref-process` |
| `reformat-bibliography` | Reformat bibliography ICML styles | `make reformat-bibliography` |
| `update-toc` | Update Table of Contents in InDesign | `make update-toc` |
| `ira-revision` | Apply IRA revision workflow | `make ira-revision <file>` |
| `validate-section <section>` | Validate section structure | `make validate-section <section>` |
| `merge-section <section>` | Merge single section files | `make merge-section <section>` |
| `compile-icml [section]` | Convert to ICML format | `make compile-icml [section]` |
| `list-sections` | List all available sections | `make list-sections` |
| `remove-numbers` | Remove heading numbers (legacy) | `make remove-numbers` |
| `clean` | Clean all generated files | `make clean` |
| `clean-merged` | Clean merged files only | `make clean-merged` |

## Best Practices

### Command Usage

1. **Always validate first**: Use `validate-section` before compiling
2. **Test incrementally**: Compile one section at a time during development
3. **Clean regularly**: Use `clean` to start fresh when needed
4. **Monitor output**: Check generated files after compilation
5. **Use help**: Run `help` when unsure about commands

### Error Prevention

1. **Check prerequisites**: Ensure pandoc and make are installed
2. **Verify structure**: Use `list-sections` to check section status
3. **Test changes**: Compile after making changes
4. **Keep backups**: Use version control for important changes
5. **Read errors**: Pay attention to error messages and suggestions

### Performance Tips

1. **Use parallel commands**: Prefer `merge-all`, `merge-all-r` over individual section merging
2. **Optimize workflows**: Use `compile-all-r` instead of `compile-all` + `remove-numbers`
3. **Smart cleaning**: Use `clean-merged` for selective cleanup, `clean-validation` for citation cache
4. **Development efficiency**: Use `validate-citations-quick` during active writing
5. **Monitor with watch mode**: Use `validate-citations-watch` for continuous feedback
6. **Batch operations**: Use `compile-all-ru` for complete end-to-end processing
7. **Leverage caching**: Citation validation uses intelligent caching for performance

### Terminal Output Improvements

The Theodore system now includes enhanced terminal output with improved logging and visual feedback:

1. **Consistent Color Coding**:
   - 🔍 Cyan for analysis and scanning operations
   - ✅ Green for successful completions
   - ❌ Red for errors and failures
   - ⚠️ Yellow for warnings and notes
   - 📝 Blue for processing and information

2. **Progress Reporting**:
   - Real-time progress percentages for long operations
   - File-by-file processing status with timing information
   - Detailed completion statistics and summaries

3. **Enhanced Status Messages**:
   - Emoji-based status indicators for quick visual scanning
   - Structured output formatting for better readability
   - Clear section headers and operation boundaries

4. **Improved Error Handling**:
   - Detailed error messages with troubleshooting hints
   - Context-aware suggestions for common issues
   - Graceful failure handling with cleanup operations

5. **Parallel Processing Feedback**:
   - Multi-threaded operation status reporting
   - Memory and performance monitoring output
   - Comprehensive operation summaries

These improvements provide a more professional and user-friendly command-line experience, making it easier to monitor thesis build processes and quickly identify any issues that arise.

---

**Need more help?** Check the [User Guide](USER_GUIDE.md) for step-by-step instructions or the [Technical Guide](TECHNICAL_GUIDE.md) for advanced customization options!
