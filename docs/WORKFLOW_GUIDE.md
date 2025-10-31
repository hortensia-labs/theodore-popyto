# Theodore Workflow Guide

A step-by-step guide to the complete thesis writing process using the Theodore system.

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Project Setup](#phase-1-project-setup)
3. [Phase 2: Content Planning](#phase-2-content-planning)
4. [Phase 3: Research and Writing](#phase-3-research-and-writing)
5. [Phase 4: AI-Assisted Development](#phase-4-ai-assisted-development)
6. [Phase 5: Review and Revision](#phase-5-review-and-revision)
7. [Phase 6: Compilation and Publishing](#phase-6-compilation-and-publishing)
8. [Phase 7: Final Production](#phase-7-final-production)
9. [Troubleshooting Workflows](#troubleshooting-workflows)

## Overview

The Theodore workflow is designed to leverage AI tools effectively while maintaining human control over the writing process. The workflow follows a structured approach that scales from initial planning to final publication.

### Workflow Phases

```text
Planning → Research → Writing → AI Enhancement → Review → Compilation → Publishing
    ↓         ↓         ↓           ↓            ↓         ↓           ↓
  Setup    Content   Initial    AI-Assisted   Human    Build      Final
  Phase    Planning   Draft     Development   Review   System     Output
```

## Phase 1: Project Setup

### Step 1.1: Initialize Project Structure

```bash
# Create your thesis project directory
mkdir my-thesis
cd my-thesis

# Copy Theodore system files
cp -r /path/to/Theodore/* .

# Verify installation
make help
```

### Step 1.2: Plan Your Thesis Structure

Create a high-level outline of your thesis:

```text
sections/
├── 0-preliminares/          # Front matter
├── 1-introduccion/          # Introduction
├── 2-marco-teorico/         # Literature review
├── 3-metodologia/           # Methodology
├── 4-resultados/            # Results
├── 5-discusion/             # Discussion
├── 6-conclusiones/          # Conclusions
├── 7-bibliografia/          # References
└── 8-anexos/                # Appendices
```

### Step 1.3: Create Section Folders

```bash
# Create all section folders
for section in 0-preliminares 1-introduccion 2-marco-teorico 3-metodologia 4-resultados 5-discusion 6-conclusiones 7-bibliografia 8-anexos; do
    mkdir -p sections/$section/content
    mkdir -p sections/$section/fuentes
    mkdir -p sections/$section/revision
    mkdir -p sections/$section/estructura
done
```

### Step 1.4: Set Up Version Control

```bash
# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << EOF
generated/
*.log
.DS_Store
EOF

# Initial commit
git add .
git commit -m "Initial thesis project setup"
```

## Phase 2: Content Planning

### Step 2.1: Create Section Outlines

For each section, create a planning document:

```bash
# Example for introduction section
cat > sections/1-introduccion/estructura/outline.md << EOF
# Introduction Outline

## 1.0 Problem Statement
- Research problem description
- Significance of the problem
- Research gap identification

## 1.1 Research Objectives
- Primary objective
- Secondary objectives
- Research questions

## 1.2 Methodology Overview
- Research approach
- Data collection methods
- Analysis procedures

## 1.3 Expected Contributions
- Theoretical contributions
- Practical implications
- Novel insights
EOF
```

### Step 2.2: Define Content Structure

Create numbered content files for each section:

```bash
# Example for introduction section
touch sections/1-introduccion/content/1.0-problema.md
touch sections/1-introduccion/content/1.1-objetivos.md
touch sections/1-introduccion/content/1.2-metodologia.md
touch sections/1-introduccion/content/1.3-contribuciones.md
```

### Step 2.3: Set Up Research Materials

Organize your research materials:

```bash
# Create research folders
mkdir -p sections/2-marco-teorico/fuentes/articulos
mkdir -p sections/2-marco-teorico/fuentes/libros
mkdir -p sections/2-marco-teorico/fuentes/tesis
mkdir -p sections/2-marco-teorico/fuentes/informes
```

## Phase 3: Research and Writing

### Step 3.1: Research Phase

#### Collect Research Materials

1. **Articles**: Save PDFs and create summary notes
2. **Books**: Extract key quotes and concepts
3. **Theses**: Analyze similar work and methodologies
4. **Reports**: Collect relevant data and statistics

#### Organize Research Notes

```bash
# Create research note template
cat > sections/2-marco-teorico/fuentes/template-research-note.md << EOF
# Research Note: [Source Title]

## Source Information
- **Author**: 
- **Year**: 
- **Type**: Article/Book/Thesis/Report
- **Key Findings**: 

## Relevant Quotes
> "Quote 1"
> "Quote 2"

## Key Concepts
- Concept 1: Description
- Concept 2: Description

## Connection to My Research
- How this relates to my work
- Potential citations
- Areas for further investigation
EOF
```

### Step 3.2: Initial Writing Phase

#### Write First Drafts

1. **Start with outlines**: Use your planning documents as guides
2. **Write freely**: Don't worry about perfection initially
3. **Focus on content**: Get your ideas down first
4. **Use placeholders**: Mark areas that need more research

#### Example First Draft

```markdown
# 1.0 Problem Statement

## Research Problem

The problem I'm investigating is [describe the problem]. This is important because [explain significance].

## Research Gap

Previous research has shown [cite sources], but there is a gap in [identify gap]. This gap is significant because [explain why].

## Research Questions

The main research question is: [state primary question]

Secondary questions include:
1. [Question 1]
2. [Question 2]
3. [Question 3]

[TODO: Add more specific examples and citations]
```

### Step 3.3: Content Organization

#### Use Consistent Structure

- **Headings**: Use clear, descriptive headings
- **Numbering**: Use numbered files for main content flow
- **Cross-references**: Link related sections
- **Citations**: Use consistent citation format

#### File Naming Strategy

```text
1.0-problema.md          # Main problem statement
1.1-objetivos.md         # Research objectives
1.2-metodologia.md       # Methodology overview
1.3-contribuciones.md    # Expected contributions
bibliografia.md          # References (if section-specific)
```

## Phase 4: AI-Assisted Development

### Step 4.1: AI Content Generation

#### Generate Initial Content

Use AI to generate content for specific sections:

```text
Prompt: "Write a methodology section for a PhD thesis on [your topic]. Include:
- Research design
- Data collection methods
- Analysis procedures
- Ethical considerations
- Limitations

Use academic tone and include placeholders for specific details."
```

#### Organize AI-Generated Content

```bash
# Create AI content folders
mkdir -p sections/3-metodologia/revision/ai-generated
mkdir -p sections/3-metodologia/revision/ai-enhanced
mkdir -p sections/3-metodologia/revision/human-edited
```

### Step 4.2: AI Content Enhancement

#### Expand Existing Content

```text
Prompt: "Expand this methodology section to include more detail on:
- Specific data collection procedures
- Analysis software and tools
- Quality assurance measures
- Timeline and milestones"
```

#### Improve Writing Quality

```text
Prompt: "Review and improve this section for:
- Clarity and flow
- Academic tone
- Logical structure
- Grammar and style
- Consistency with thesis format"
```

### Step 4.3: AI Research Assistance

#### Literature Review Enhancement

```text
Prompt: "Help me identify key themes for my literature review on [topic]. 
Include:
- Major theoretical frameworks
- Recent developments
- Controversies or debates
- Gaps in current research
- Potential sources to investigate"
```

#### Methodology Refinement

```text
Prompt: "Review my methodology and suggest improvements for:
- Research design validity
- Data collection efficiency
- Analysis rigor
- Ethical considerations
- Practical feasibility"
```

### Step 4.4: Content Integration

#### Merge AI and Human Content

1. **Review AI output**: Check for accuracy and relevance
2. **Edit and refine**: Adapt AI content to your specific needs
3. **Integrate smoothly**: Ensure consistent voice and style
4. **Add personal insights**: Include your unique perspective
5. **Update content files**: Move final content to `content/` folder

## Phase 5: Review and Revision

### Step 5.1: Self-Review Process

#### Content Review Checklist

- [ ] **Completeness**: All required sections included
- [ ] **Accuracy**: Facts and citations verified
- [ ] **Clarity**: Ideas clearly expressed
- [ ] **Coherence**: Logical flow between sections
- [ ] **Consistency**: Formatting and style consistent
- [ ] **Originality**: Original contribution clear

#### Technical Review

```bash
# Validate all sections
make list-sections

# Check for compilation issues
make compile-all

# Review generated output
ls -la generated/markdown/
ls -la generated/icml/
```

### Step 5.2: Peer Review Process

#### Prepare for Review

1. **Generate clean output**: Use `make compile-all`
2. **Create review copies**: Export to PDF for reviewers
3. **Prepare feedback forms**: Create structured feedback templates
4. **Set review timeline**: Establish clear deadlines

#### Review Integration

```bash
# Create review folders
mkdir -p sections/*/revision/peer-review
mkdir -p sections/*/revision/advisor-feedback
mkdir -p sections/*/revision/final-revisions
```

### Step 5.3: Revision Workflow

#### Track Revisions

```bash
# Create revision tracking
cat > sections/1-introduccion/revision/revision-log.md << EOF
# Revision Log - Introduction

## Round 1 (Date)
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]
- [ ] Issue 3: [Description]

## Round 2 (Date)
- [ ] Issue 1: [Status]
- [ ] Issue 2: [Status]
- [ ] Issue 3: [Status]
EOF
```

#### Implement Changes

1. **Address feedback**: Work through review comments systematically
2. **Update content**: Make necessary changes to markdown files
3. **Test compilation**: Ensure changes don't break the build
4. **Document changes**: Keep track of what was modified

## Phase 6: Compilation and Publishing

### Step 6.1: Final Compilation

#### Generate All Content

```bash
# Compile all sections
make compile-all

# Check for errors
make list-sections

# Review generated files
ls -la generated/markdown/
ls -la generated/icml/
```

#### Quality Assurance

```bash
# Validate all sections
for section in $(ls sections/); do
    make validate-section $section
done

# Check file sizes and content
wc -l generated/markdown/*.md
```

### Step 6.2: Format Preparation

#### Choose Numbering Strategy

**Option A: Automatic Numbering (Recommended)**

```bash
# Remove hardcoded numbers for InDesign
make remove-numbers

# Import to InDesign with automatic numbering
```

**Option B: Manual Numbering**

```bash
# Keep hardcoded numbers
# Import ICML files directly to InDesign
```

#### Prepare for InDesign

1. **Review ICML files**: Check formatting and structure
2. **Test import**: Import sample files to InDesign
3. **Adjust styles**: Modify paragraph and character styles
4. **Set up numbering**: Configure automatic numbering if desired

### Step 6.3: Final Output Generation

#### Generate Publication Files

```bash
# Create final output directory
mkdir -p final-output

# Copy ICML files
cp generated/icml/*.icml final-output/

# Create backup
tar -czf thesis-backup-$(date +%Y%m%d).tar.gz sections/ generated/
```

## Phase 7: Final Production

### Step 7.1: InDesign Integration

#### Import Process

1. **Create InDesign document**: Set up proper page size and margins
2. **Import ICML files**: Place each section as a separate story
3. **Apply styles**: Use consistent paragraph and character styles
4. **Set up numbering**: Configure automatic heading numbering
5. **Add page numbers**: Set up automatic page numbering

#### Style Configuration

```text
Paragraph Styles:
- Heading1: Chapter titles
- Heading2: Section titles
- Heading3: Subsection titles
- Body: Main text
- Caption: Figure and table captions
- Quote: Block quotes
- Bibliography: Reference list
```

### Step 7.2: Final Review

#### Pre-Publication Checklist

- [ ] **Content**: All sections complete and accurate
- [ ] **Formatting**: Consistent throughout document
- [ ] **Numbering**: Headings and pages numbered correctly
- [ ] **References**: All citations properly formatted
- [ ] **Figures/Tables**: All properly captioned and referenced
- [ ] **Spelling**: No spelling or grammar errors
- [ ] **Layout**: Professional appearance

#### Final Testing

```bash
# Test compilation one more time
make clean
make compile-all

# Verify all files generated
ls -la generated/markdown/
ls -la generated/icml/
```

### Step 7.3: Publication

#### Export Options

1. **PDF for Review**: High-quality PDF for final review
2. **Print PDF**: Print-ready PDF with proper bleeds
3. **Digital PDF**: Optimized for digital distribution
4. **Print Copy**: Physical printing if required

#### Version Control

```bash
# Tag final version
git tag -a v1.0-final -m "Final thesis version"
git push origin v1.0-final

# Create release archive
git archive --format=tar.gz --prefix=thesis-final/ v1.0-final > thesis-final.tar.gz
```

## Troubleshooting Workflows

### Common Issues and Solutions

#### Issue: Section Compilation Fails

```bash
# Debug steps
1. Check section structure: make validate-section <section>
2. Verify files exist: ls sections/<section>/content/
3. Check file permissions: ls -la sections/<section>/content/
4. Test individual steps: make merge-section <section>
```

#### Issue: ICML Conversion Fails

```bash
# Debug steps
1. Check pandoc installation: pandoc --version
2. Verify markdown syntax: Check for malformed markdown
3. Test with simple file: Create minimal test file
4. Check file encoding: Ensure UTF-8 encoding
```

#### Issue: InDesign Import Problems

```bash
# Debug steps
1. Check ICML file validity: Open in text editor
2. Verify file encoding: Ensure proper UTF-8
3. Test with simple section: Import one section at a time
4. Check InDesign version: Ensure compatibility
```

### Recovery Procedures

#### Content Recovery

```bash
# Restore from backup
tar -xzf thesis-backup-YYYYMMDD.tar.gz

# Recover from git
git checkout HEAD -- sections/<section>/content/

# Rebuild from scratch
make clean
make compile-all
```

#### System Recovery

```bash
# Reinstall dependencies
# Install pandoc
# Verify make installation
# Test with simple example
```

## Workflow Monitoring

### Progress Tracking

#### Content Progress

```bash
# Track section completion
for section in $(ls sections/); do
    echo "Section: $section"
    echo "Files: $(ls sections/$section/content/ | wc -l)"
    echo "Size: $(du -sh sections/$section/content/)"
done
```

#### Build Status

```bash
# Check build status
make list-sections

# Monitor generated files
ls -la generated/markdown/
ls -la generated/icml/
```

### Quality Metrics

#### Content Metrics

- **Word count per section**: Track writing progress
- **File count per section**: Monitor content organization
- **Revision rounds**: Track improvement cycles
- **AI assistance usage**: Monitor AI tool effectiveness

#### Technical Metrics

- **Compilation success rate**: Track build reliability
- **Error frequency**: Monitor system stability
- **Processing time**: Track performance
- **Output quality**: Monitor generated file quality

---

**Ready to start?** Begin with [Phase 1: Project Setup](#phase-1-project-setup) and work through each phase systematically. Remember, this workflow is designed to be flexible - adapt it to your specific needs and timeline!
