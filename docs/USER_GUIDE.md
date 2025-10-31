# Theodore User Guide

A comprehensive guide for thesis authors using the Theodore system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Creating Your First Section](#creating-your-first-section)
4. [Content Organization](#content-organization)
5. [Using the Build System](#using-the-build-system)
6. [AI-Assisted Writing Workflow](#ai-assisted-writing-workflow)
7. [Publishing Your Thesis](#publishing-your-thesis)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before using Theodore, ensure you have:

- **pandoc** (≥2.0) installed
- **make** command available
- A text editor or IDE (like Cursor, VS Code, or Vim)
- Basic familiarity with markdown

### Initial Setup

1. **Clone or download** the Theodore system to your project directory
2. **Navigate** to your project directory
3. **Verify** the system works:

```bash
make help
```

You should see a list of available commands.

## Project Structure

### Understanding the Layout

```text
your-thesis/
├── sections/                    # Your thesis content
│   ├── 0-preliminares/         # Section folder
│   │   ├── content/            # Required: final content
│   │   ├── fuentes/            # Optional: research materials
│   │   ├── revision/           # Optional: revision notes
│   │   └── estructura/         # Optional: planning docs
│   └── ...
├── generated/                   # Auto-generated files
│   ├── markdown/               # Merged markdown files
│   └── icml/                   # InDesign-ready files
└── scripts/                    # Build system
```

### Section Folder Structure

Each section folder can contain:

- **`content/`** (Required): Your final thesis content in markdown files
- **`fuentes/`** (Optional): Research materials, sources, notes
- **`revision/`** (Optional): Revision notes, feedback, drafts
- **`estructura/`** (Optional): Planning documents, outlines
- **Any other folders** you need for organization

## Creating Your First Section

### Step 1: Create a Section Folder

```bash
mkdir sections/1-introduction
mkdir sections/1-introduction/content
```

### Step 2: Add Your First Content File

Create a markdown file in the `content/` folder:

```bash
# Create your first content file
touch sections/1-introduction/content/1.0-introduction.md
```

### Step 3: Write Your Content

Edit the file with your content:

```markdown
# Introduction

This is the introduction to my thesis. Here I will:

1. Present the research problem
2. Outline the methodology
3. Preview the main findings

## Background

The background section provides context for the research...

## Research Questions

The main research questions are:

1. What is the primary research question?
2. What are the secondary questions?
```

### Step 4: Compile Your Section

```bash
make compile 1-introduction
```

This will:

1. Validate your section structure
2. Merge your content files
3. Convert to ICML format
4. Place files in `generated/` folders

## Content Organization

### File Naming Conventions

#### Numbered Files (Recommended)

Use numbered files for automatic ordering:

```text
1.0-introduction.md
1.1-background.md
1.2-methodology.md
1.3-results.md
1.4-conclusion.md
```

#### Named Files

Use descriptive names for non-sequential content:

```text
bibliography.md
appendix-a.md
glossary.md
```

#### Mixed Approach

Combine both approaches:

```text
1.0-introduction.md
1.1-methodology.md
bibliography.md
appendix-a.md
```

### Content Structure Best Practices

#### Use Clear Headings

```markdown
# Main Chapter Title
## Section Title
### Subsection Title
#### Sub-subsection Title
```

#### Organize by Topics

Break large sections into smaller, focused files:

```text
1.0-introduction.md          # Overview and motivation
1.1-literature-review.md     # Literature review
1.2-research-questions.md    # Research questions
1.3-methodology.md           # Research methodology
1.4-expected-outcomes.md     # Expected outcomes
```

#### Use Consistent Formatting

- Use `##` for main sections
- Use `###` for subsections
- Use `####` for sub-subsections
- Use numbered lists for sequential items
- Use bullet points for non-sequential items

## Using the Build System

### Main Commands

#### Complete Workflow

```bash
# Compile a specific section (recommended)
make compile 1-introduction

# Compile all sections
make compile-all
```

#### Individual Steps

```bash
# Validate section structure
make validate-section 1-introduction

# Merge markdown files only
make merge-section 1-introduction

# Convert to ICML only
make compile-icml 1-introduction
```

#### Utility Commands

```bash
# List all available sections
make list-sections

# Remove heading numbers for InDesign
make remove-numbers

# Clean all generated files
make clean
```

### Understanding the Output

After compilation, you'll find:

- **`generated/markdown/[section].md`**: Merged markdown file
- **`generated/icml/[section].icml`**: InDesign-ready ICML file

After running `make compile-data`, you'll also find:

- **`generated/data/[section].ctcr.md`**: Extracted citations and cross-references with line numbers

## AI-Assisted Writing Workflow

### Leveraging AI Tools

#### 1. Content Generation

Use AI to generate initial content:

```text
Prompt: "Write an introduction section for a PhD thesis on [your topic]. Include:
- Problem statement
- Research objectives
- Methodology overview
- Expected contributions"
```

#### 2. Content Expansion

Use AI to expand existing content:

```text
Prompt: "Expand this section on methodology to include:
- Detailed research design
- Data collection methods
- Analysis procedures
- Ethical considerations"
```

#### 3. Content Revision

Use AI to improve existing content:

```text
Prompt: "Review and improve this section for:
- Clarity and flow
- Academic tone
- Logical structure
- Grammar and style"
```

### Organizing AI-Generated Content

#### Create Revision Folders

```text
sections/1-introduction/
├── content/                   # Final content
├── revision/                  # AI-generated content
│   ├── ronda-1/              # First round of AI assistance
│   ├── ronda-2/              # Second round
│   └── ronda-3/              # Third round
└── fuentes/                   # Research materials
```

#### Track AI Prompts

Keep a record of effective prompts:

```markdown
# AI Prompts for Introduction

## Content Generation
- "Generate introduction for thesis on [topic]"
- "Create methodology section with [specific requirements]"

## Content Improvement
- "Improve clarity and flow of this section"
- "Add more academic tone to this paragraph"

## Content Expansion
- "Expand this section to include [specific elements]"
- "Add more detail to the literature review"
```

### Iterative Writing Process

1. **Initial Draft**: Write basic content in markdown files
2. **AI Enhancement**: Use AI to improve and expand content
3. **Human Review**: Review and refine AI-generated content
4. **Integration**: Move final content to `content/` folder
5. **Compilation**: Use build system to generate output
6. **Review**: Check generated files and iterate

## Publishing Your Thesis

### Preparing for InDesign

#### Step 1: Generate All Content

```bash
make compile-all
```

#### Step 2: Remove Heading Numbers (Optional)

```bash
make remove-numbers
```

This removes hardcoded numbers to let InDesign handle numbering automatically.

#### Step 3: Import to InDesign

1. Open InDesign
2. Create a new document or book
3. Import ICML files from `generated/icml/`
4. Apply your preferred styles
5. Set up automatic numbering if desired

### InDesign Integration Tips

#### Automatic Numbering Setup

1. Define paragraph styles for each heading level
2. Set up automatic numbering in paragraph styles
3. Use the `remove-numbers` command to strip hardcoded numbers
4. Let InDesign handle all numbering automatically

#### Manual Numbering

1. Keep hardcoded numbers in your markdown
2. Import ICML files directly
3. Numbers will be preserved from markdown

### Final Output Options

#### PDF Generation

- Export from InDesign to PDF
- Use print-ready settings
- Include bookmarks and hyperlinks

#### Print Preparation

- Set up proper margins and bleeds
- Use high-resolution images
- Check color profiles for print

## Citation Analysis and Data Extraction

### Extracting Citations and Cross-References

The `compile-data` command helps you analyze your thesis citations and cross-references:

```bash
# Extract all citations from generated files
make compile-data
```

### What It Does

- Processes all generated markdown files
- Extracts text between parentheses (citations, cross-references)
- Creates analysis files with line numbers
- Reports processing statistics

### Understanding the Output

Each section gets a corresponding `.ctcr.md` file in `generated/data/`:

```text
generated/data/
├── 1-introduccion.ctcr.md
├── 2-seccion-1.ctcr.md
└── 3-seccion-2.ctcr.md
```

### Citation Format

Each extracted citation appears as:

```text
- (Bosch, 2012) @ [45]
- (see Section 2.1) @ [78]
- (Figure 3.4) @ [123]
```

Where `[45]` indicates the line number where the citation was found.

### Use Cases

#### 1. Citation Verification

- Ensure all citations are properly formatted
- Check for missing references
- Verify citation consistency

#### 2. Cross-Reference Tracking

- Find all internal references (e.g., "see Section 2.1")
- Ensure all referenced sections exist
- Check figure and table references

#### 3. Bibliography Preparation

- Extract all citations for bibliography compilation
- Identify citation patterns
- Prepare reference lists

#### 4. Quality Control

- Review citation frequency
- Check for duplicate or missing citations
- Ensure academic integrity

### Example Workflow

```bash
# 1. Compile your thesis sections
make compile-all

# 2. Extract citations for analysis
make compile-data

# 3. Review extracted citations
cat generated/data/2-seccion-1.ctcr.md

# 4. Check specific citations by line number
sed -n '45p' generated/markdown/2-seccion-1.md
```

### Tips for Effective Citation Analysis

1. **Regular Extraction**: Run `compile-data` after major writing sessions
2. **Review Patterns**: Look for citation clustering or gaps
3. **Verify References**: Ensure all cross-references point to existing sections
4. **Check Consistency**: Maintain consistent citation formats
5. **Track Changes**: Use version control to track citation evolution

## Best Practices

### Content Organization

1. **Start Small**: Begin with one section and expand gradually
2. **Use Descriptive Names**: Make section and file names clear
3. **Number Sequentially**: Use numbered files for main content flow
4. **Keep Research Separate**: Use `fuentes/` for research materials
5. **Track Revisions**: Use `revision/` folders for AI-generated content

### Writing Process

1. **Write First, Perfect Later**: Get content down, then refine
2. **Use AI Strategically**: Leverage AI for specific tasks
3. **Maintain Human Control**: Always review and edit AI output
4. **Version Control**: Use git to track changes
5. **Regular Compilation**: Test your build system regularly

### File Management

1. **Consistent Naming**: Use consistent naming conventions
2. **Backup Regularly**: Keep backups of your work
3. **Clean Generated Files**: Use `make clean` when needed
4. **Organize Research**: Keep research materials well-organized
5. **Document Changes**: Keep notes on major changes

### AI Integration

1. **Specific Prompts**: Be specific in your AI prompts
2. **Iterative Improvement**: Use multiple rounds of AI assistance
3. **Quality Control**: Always review AI-generated content
4. **Prompt Library**: Keep a library of effective prompts
5. **Human-AI Collaboration**: Combine human creativity with AI efficiency

## Troubleshooting

### Common Issues

#### "Section not found"

- Check that the section folder exists in `sections/`
- Verify the folder name spelling
- Use `make list-sections` to see available sections

#### "No markdown files found"

- Ensure files have `.md` extension
- Check files are in `content/` subdirectory
- Verify files are not empty

#### "ICML conversion failed"

- Run `make merge-section <section>` first
- Check markdown syntax is valid
- Ensure pandoc is installed and working

#### "Validation failed"

- Review specific file errors in output
- Ensure proper file encoding (UTF-8)
- Check file permissions

### Getting Help

```bash
# Get comprehensive help
make help

# List available sections
make list-sections

# Validate specific section
make validate-section <section-name>
```

### Recovery Steps

1. **Check Section Structure**: Ensure `content/` folder exists
2. **Validate Files**: Use validation commands to identify issues
3. **Clean and Rebuild**: Use `make clean` then rebuild
4. **Check Dependencies**: Ensure pandoc and make are working
5. **Review Error Messages**: Read error messages carefully for guidance

## Next Steps

1. **Set up your first section** following this guide
2. **Experiment with the build system** using the examples
3. **Integrate AI tools** into your writing process
4. **Explore advanced features** in the Technical Guide
5. **Customize the system** for your specific needs

---

**Ready to start writing?** Create your first section and begin your AI-assisted thesis writing journey!
