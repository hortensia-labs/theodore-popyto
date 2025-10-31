# Theodore: AI-Powered Thesis Writing System

A comprehensive system designed to leverage the agentic capabilities of modern IDEs (like Cursor) and AI code generators (like Claude) to streamline the entire process of writing, revising, laying out, and publishing a doctoral thesis.

## 🎯 What is Theodore?

Theodore is a structured workflow system that transforms the traditional thesis writing process into an efficient, AI-assisted pipeline. It combines:

- **Modular Content Management**: Organize your thesis into manageable sections with flexible folder structures
- **AI-Assisted Writing**: Leverage modern AI tools for content generation, revision, and enhancement
- **Automated Publishing Pipeline**: Convert markdown content to professional ICML format for InDesign
- **Version Control Integration**: Track changes and collaborate effectively
- **Professional Output**: Generate publication-ready documents with proper formatting

## 🚀 Quick Start

```bash
# Clone and navigate to your thesis project
cd your-thesis-project

# See what sections are available
make list-sections

# Compile a specific section (complete workflow)
make compile 2-seccion-1

# Compile all sections at once
make compile-all

# Extract citations and cross-references for analysis
make compile-data

# Remove heading numbers for InDesign auto-numbering
make remove-numbers
```

## 📁 Project Structure

```text
your-thesis/
├── sections/                    # Your thesis content
│   ├── 0-cover-matter/         # Section folders (name as you like)
│   │   ├── content/            # Required: final content files
│   │   │   ├── 0-acknowledgements.md
│   │   │   └── 1-abstract.md
│   │   ├── sources/            # Optional: research materials
│   │   ├── revision/           # Optional: revision notes
│   │   └── structure/          # Optional: planning documents
│   ├── 1-introduction/
│   └── 2-section-1/
├── generated/                   # Auto-generated files
│   ├── markdown/               # Merged markdown files
│   ├── icml/                   # InDesign-ready ICML files
│   └── data/                   # Extracted citations and cross-references
├── scripts/                    # Build system utilities
└── Makefile                    # Main build system
```

## 🎨 Key Features

### 🤖 AI-Powered Writing

- **Modular Approach**: Break your thesis into manageable chunks that AI can effectively process
- **Research Integration**: Organize research materials alongside your writing
- **Revision Tracking**: Track multiple rounds of AI-assisted revisions
- **Content Generation**: Use AI to generate, expand, and refine content

### 📝 Flexible Content Management

- **Any Section Names**: Name your sections however you want (e.g., `introduction`, `methodology`, `results`)
- **Numbered Files**: Use numbered markdown files for automatic ordering (`1.0-intro.md`, `1.1-methods.md`)
- **Mixed Content**: Combine numbered and named files as needed
- **Research Materials**: Keep research notes, sources, and drafts in the same section folder

### 🔄 Automated Publishing Pipeline

- **Markdown to ICML**: Automatic conversion to InDesign-compatible format
- **Professional Styling**: Proper paragraph and character styles for academic publishing
- **Heading Management**: Support for both manual and automatic numbering
- **Cross-References**: Full support for academic cross-referencing

### 🛠️ Developer-Friendly

- **Makefile-Based**: Simple, reliable build system
- **Validation**: Automatic validation of content structure and files
- **Error Handling**: Clear error messages and recovery suggestions
- **Batch Operations**: Process single sections or entire thesis at once

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for thesis authors
- **[Technical Guide](docs/TECHNICAL_GUIDE.md)** - Technical details and customization
- **[Workflow Guide](docs/WORKFLOW_GUIDE.md)** - Step-by-step thesis writing process
- **[Makefile Reference](docs/MAKEFILE_REFERENCE.md)** - Complete command reference

## 🎯 Ideal For

- **PhD Students** writing their dissertation
- **Researchers** working on long-form academic documents
- **Academic Writers** who want to leverage AI tools effectively
- **Publishing Teams** who need consistent, professional output

## 🔧 Requirements

- **pandoc** (≥2.0) - Document conversion
- **make** - Build system
- **bash** - Shell scripting
- **perl** - Text processing

## 🚀 Getting Started

1. **Set up your project structure** following the pattern in `sections/`
2. **Create your content** in markdown files within each section's `content/` folder
3. **Use the build system** to compile and convert your content
4. **Import to InDesign** for final layout and publishing

## 💡 Philosophy

Theodore is built on the principle that modern AI tools work best with well-structured, modular content. By organizing your thesis into clear sections with numbered files, you can:

- Leverage AI for content generation and revision
- Maintain version control and collaboration
- Generate professional output consistently
- Focus on writing rather than formatting

## 🤝 Contributing

This system is designed to be adapted to your specific needs. The modular structure allows you to:

- Add new section types
- Customize the build process
- Integrate with your preferred tools
- Extend functionality as needed

## 📄 License

This build system is part of the Theodore thesis project. Adapt and use as needed for your academic work.

---

**Ready to revolutionize your thesis writing?** Start with the [User Guide](docs/USER_GUIDE.md) to learn how to set up your first section!
