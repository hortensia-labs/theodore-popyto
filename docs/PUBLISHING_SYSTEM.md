# Publishing System Documentation

**Sistema de Compilación Editorial** — A configuration-driven pipeline for compiling Markdown manuscripts into InDesign-ready ICML, with cross-reference validation, bibliography formatting, and InDesign automation.

This document explains how to use, configure, and extend the publishing system. The system is **configuration-driven**: all books are defined in `build.config.json`; no code changes are required to add a new book.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start](#3-quick-start)
4. [Configuration](#4-configuration)
5. [Adding a New Book](#5-adding-a-new-book)
6. [Command Reference](#6-command-reference)
7. [Pipeline Architecture](#7-pipeline-architecture)
8. [Directory Structure](#8-directory-structure)
9. [Python Scripts (lib/)](#9-python-scripts-lib)
10. [InDesign Integration](#10-indesign-integration)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

The system compiles Markdown source files into ICML (InDesign’s native format) and drives InDesign automation (links, hyperlinks, cross-references, TOC). It supports multiple books from a single configuration file.

**Key characteristics:**

- **Configuration-driven** — Books defined in `build.config.json`; the list of books is derived at runtime.
- **Pipeline stages** — Merge → ICML conversion → Style mapping → Image resize → Scan (registries) → Validate.
- **InDesign integration** — AppleScript + JSX scripts for link updates, hyperlink fixes, cross-reference processing, TOC generation.
- **Platform** — macOS (AppleScript required for InDesign); compilation works on any OS.

---

## 2. Prerequisites

### Required

- **Python 3.9+**
- **Pandoc 2.19+**
- **just** (command runner)
- **build.config.json** at project root

### Optional

- **gum** — Nicer terminal output (banners, colors, progress)
- **Adobe InDesign 2021+** (macOS) — For full publishing pipeline

### Verify dependencies

```bash
just check-deps
```

---

## 3. Quick Start

```bash
# List configured books
just list-books

# Compile a book
just compile libro1

# Full publish (compile + bibliography + InDesign)
just publish libro1
```

**First-time setup:** Ensure `build.config.json` exists and contains at least one book. Run `just test-config` to validate.

---

## 4. Configuration

Configuration lives in **`build.config.json`** at the project root. All paths are relative to the project root unless otherwise noted.

**Convention:** Most keys use `snake_case` (e.g. `input_format`, `remove_heading_numbers`). InDesign-related keys use `camelCase` (e.g. `bookFile`, `tocDocument`, `bibliographyStyle`).

### 4.1 Root-level properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `version` | string | Yes | Schema version (e.g. `"1.0"`). Used for compatibility checks. |
| `books` | object | Yes | Map of book ID → book configuration. Keys are the book identifiers used in commands. |
| `pandoc` | object | Yes | Global Pandoc conversion settings (input format, output format, flags). |
| `processing` | object | Yes | Global processing options (Unicode normalization, parallel workers, etc.). |
| `indesign` | object | No | Global InDesign settings. Defaults apply if omitted. |

---

### 4.2 Book configuration (per-book)

Each key under `books` is the book ID (e.g. `libro1`). The corresponding object defines that book’s sources, outputs, and InDesign behaviour.

#### Required book properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Book identifier. Must match the key under `books`. |
| `title` | string | Display title used in status output and InDesign config. |
| `prefix` | string | Short prefix for file names (e.g. `"L1"`, `"L2"`). Used in chapter patterns and default InDesign document names. |
| `source` | object | Source paths (see below). |
| `output` | object | Output paths (see below). |
| `chapters` | object | Chapter discovery and ordering (see below). |
| `paratextuales` | string[] | List of paratextual file names **without extension**, in the order they appear in the merged output. Examples: `["L1_GLOSARIO", "L1_CRONOLOGIA", "L1_BIBLIOGRAFIA"]`. |

#### Book `source` object

| Property | Type | Description |
|----------|------|-------------|
| `content` | string | Path to the directory containing chapter Markdown files. Files must match `chapters.pattern`. |
| `paratextuales` | string | Path to the directory containing paratextual files (glossary, chronology, bibliography, etc.). File names must match entries in the `paratextuales` array. |

#### Book `output` object

| Property | Type | Description |
|----------|------|-------------|
| `root` | string | Base output directory for this book. All other output paths are typically under this. |
| `markdown` | string | Where merged Markdown files are written. |
| `icml` | string | Where converted ICML files are written (Pandoc output). |
| `data` | string | Where JSON registries and metadata are stored (crossref, hyperlink, citation, indesign-config.json). |

#### Book `chapters` object

| Property | Type | Description |
|----------|------|-------------|
| `order` | number[] | Chapter numbers in the order they should appear in the book. Example: `[1, 2, 3, 4, 5, 6, 7, 8]`. |
| `pattern` | string | Python `str.format` pattern for discovering chapter files. Use `{:02d}` for zero-padded chapter numbers. Example: `"L1_CAP{:02d}_*.md"` matches `L1_CAP01_Introduccion.md`, `L1_CAP02_Contexto.md`, etc. The `*` matches any suffix. |

#### Optional book properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `indesign` | object | — | Per-book InDesign settings. If omitted, InDesign-related commands are not fully configured. |
| `styles` | object | (see below) | Overrides for paragraph style names used in this book. |
| `styleMappings` | array | `[]` | Per-file style mappings applied during `restyle-icml`. |

#### Book `styles` object (optional overrides)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `bibliography` | string | `"Paragraph Bibliography"` | InDesign paragraph style for bibliography entries. Used by `format-bibliography-icml`. |
| `glossary` | string | `"Definition Term"` | Style for glossary term headings. |
| `glossary_definition` | string | `"Definition Description"` | Style for glossary definitions. |
| `sidebar` | string | `"Sidebar Text"` | Style for sidebar body text. |
| `sidebar_title` | string | `"Sidebar Title"` | Style for sidebar titles. |

#### Book `styleMappings` array

Maps Pandoc-style names to InDesign paragraph styles, per file. Each entry:

| Property | Type | Description |
|----------|------|-------------|
| `file` | string | Target file name (without extension), e.g. `"L1_GLOSARIO"`. |
| `mappings` | array | List of `{ "source": "...", "target": "..." }` pairs. `source` is the Pandoc/ICML style name; `target` is the InDesign style. |

Example:

```json
{
  "file": "L1_GLOSARIO",
  "mappings": [
    { "source": "Paragraph", "target": "Definition Term" },
    { "source": "Header2", "target": "Glosario Subheader" }
  ]
}
```

#### Book `indesign` object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `bookFile` | string | `"{book_id}.indb"` | InDesign book file name (e.g. `"libro1.indb"`). |
| `tocDocument` | string | `"{prefix}_TOC"` | Document name used for the table of contents in the book. |
| `tocStyle` | string | `"TOC Style"` | InDesign paragraph style for the generated TOC. |
| `bibliographyFile` | string | `"{prefix}_BIBLIOGRAFIA"` | ICML document name for the bibliography in the book. |
| `tableMaxWidth` | number | — | Optional maximum table width in points. Used by JSX for table layout. |
| `imageSettings` | object | — | Anchored image sizing configuration. Contains `defaults` and `overrides`. |

#### Book `indesign.imageSettings` object

Controls how Pandoc-generated anchored images are resized in ICML files. Images exported by Pandoc use their native SVG dimensions, which are typically far too large for InDesign text frames. This setting drives the `resize-images` step.

**`defaults` (required when `imageSettings` is present):**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxWidth` | number | — | Target frame width in points, matching the InDesign column/text-frame width. Height is derived from the native aspect ratio when `fitMode` is `"proportional"`. |
| `fitMode` | string | `"proportional"` | `"proportional"` calculates height from native aspect ratio; `"explicit"` requires per-image `width`+`height` in overrides. |

**`overrides` (optional, keyed by image filename stem):**

Each key is the image filename without extension (e.g. `fig-E-estructura-tesis` for `fig-E-estructura-tesis.svg`). Images are matched by the stem extracted from the `LinkResourceURI` attribute in ICML.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | number | — | Frame width (PathPointArray). Both `width` and `height` required if present. |
| `height` | number | — | Frame height (PathPointArray). |
| `offsetX` | number | `width/2` | Rectangle ItemTransform tx. |
| `offsetY` | number | `-height/2` | Rectangle ItemTransform ty. |
| `imageWidth` | number | `width` | GraphicBounds Right (rendered image width). |
| `imageHeight` | number | `height` | GraphicBounds Bottom (rendered image height). |

Example:

```json
{
  "imageSettings": {
    "defaults": {
      "maxWidth": 450,
      "fitMode": "proportional"
    },
    "overrides": {
      "fig-E-estructura-tesis": {
        "width": 450,
        "height": 660,
        "offsetX": 250,
        "offsetY": -200,
        "imageWidth": 450,
        "imageHeight": 550
      }
    }
  }
}
```

---

### 4.3 Global `pandoc` object

| Property | Type | Description |
|----------|------|-------------|
| `input_format` | string | Pandoc input format string. Example: `"markdown+footnotes+definition_lists+smart"` enables footnotes, definition lists, and smart typography. |
| `output_format` | string | Pandoc output format. Must be `"icml"` for InDesign. |
| `flags` | string[] | Flags passed to Pandoc. Common: `["--wrap=none", "--reference-links"]` to avoid wrapping and use reference-style links. |
| `id_prefix` | string | Prefix for generated element IDs (e.g. `"book-"`) to avoid collisions across documents. |

---

### 4.4 Global `processing` object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `remove_heading_numbers` | boolean | `true` | If true, strip leading numbers from Markdown headings (e.g. `"1. Introducción"` → `"Introducción"`) during merge. |
| `normalize_unicode` | boolean | `true` | Normalize Unicode (e.g. NFC) during merge. |
| `parallel_workers` | string | `"auto"` | `"auto"` uses CPU count (capped at 8), or an integer string (e.g. `"4"`) for a fixed worker count. |
| `tab_placeholder` | string | `"\u2409"` (␉) | Character replacing literal tabs in source. Used to avoid Pandoc/ICML issues with raw tabs. |

---

### 4.5 Global `indesign` object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tempConfigPath` | string | `"/tmp/indesign-runner-config.json"` | Path where AppleScript/JSX temporary configuration is written. |
| `bibliographyStyle` | string | `"Paragraph Bibliography"` | Global default for bibliography paragraph style. Overridden by book-level `styles.bibliography` if set. |
| `reportTimestampFormat` | string | `"YYYY-MM-DD-HHmmss"` | Format for timestamps in InDesign JSX report filenames. |

---

## 5. Adding a New Book

To add a new book (e.g. `libro3`):

1. **Add an entry under `books` in `build.config.json`:**

    ```json
    "libro3": {
      "id": "libro3",
      "title": "Third Book",
      "prefix": "L3",
      "source": {
        "content": "outputs/capitulos/libro3/content",
        "paratextuales": "outputs/capitulos/libro3/paratextuales"
      },
      "output": {
        "root": "generated/libro3",
        "markdown": "generated/libro3/markdown",
        "icml": "generated/libro3/icml",
        "data": "generated/libro3/data"
      },
      "chapters": {
        "order": [1, 2, 3],
        "pattern": "L3_CAP{:02d}_*.md"
      },
      "paratextuales": ["L3_BIBLIOGRAFIA"],
      "indesign": {
        "bookFile": "libro3.indb",
        "tocDocument": "L3_TOC",
        "tocStyle": "TOC Style",
        "bibliographyFile": "L3_BIBLIOGRAFIA"
      }
    }
    ```

2. **Create the source directories** — Add content under `outputs/capitulos/libro3/content/` and `outputs/capitulos/libro3/paratextuales/` with files matching `chapters.pattern` and `paratextuales`.

3. **Run commands** — The new book is picked up automatically:

```bash
just list-books   # Shows libro3
just compile libro3
just publish libro3
```

No changes to `justfile` or Python scripts are needed.

---

## 6. Command Reference

All commands use **just**. Replace `libro1` with any book ID from `build.config.json`.

### Discovery

| Command | Description |
|---------|-------------|
| `just list-books` | List configured books |
| `just status` | Project status for all books |
| `just help` | Full help |
| `just --list` | List all recipes |

### Compilation

| Command | Description |
|---------|-------------|
| `just compile libro1` | Full compile (merge → ICML → restyle → resize-images → scan → validate) |
| `just compile-all` | Compile all books |
| `just compile-if-needed libro1` | Compile only if sources changed |
| `just compile-all-if-needed` | Compile stale books only |
| `just compile-chapter libro1 L1_CAP03` | Compile a single chapter |

### Granular steps

| Command | Description |
|---------|-------------|
| `just merge libro1` | Merge Markdown only |
| `just icml libro1` | Convert Markdown to ICML |
| `just resize-images libro1` | Resize anchored images in ICML |
| `just scan libro1` | Build crossref/hyperlink/citation registries |
| `just validate libro1` | Validate cross-references |

### InDesign (requires InDesign open with book)

| Command | Description |
|---------|-------------|
| `just indesign-config libro1` | Generate config for JSX scripts |
| `just update-links` | Update links of open book |
| `just fix-hyperlinks libro1` | Fix Pandoc URL hyperlinks |
| `just crossref-process libro1` | Convert #anchors to cross-refs |
| `just update-book` | Sync styles, numbering, preflight |
| `just update-toc libro1` | Regenerate table of contents |
| `just reformat-bibliography libro1` | Apply bibliography style to ICML |
| `just indesign-full libro1` | Full InDesign pipeline |

### Publishing

| Command | Description |
|---------|-------------|
| `just publish libro1` | Compile + bibliography + InDesign full |
| `just publish-all` | Publish all books (one at a time) |

### Utilities

| Command | Description |
|---------|-------------|
| `just list libro1` | List chapters |
| `just list-all` | List chapters for all books |
| `just clean libro1` | Remove generated files |
| `just clean-all` | Remove all generated files |

### Shortcuts (project-specific)

| Command | Alias |
|---------|-------|
| `just l1` | compile libro1 |
| `just l2` | compile libro2 |
| `just p1` | publish libro1 |
| `just p2` | publish libro2 |

---

## 7. Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         build.config.json                                │
│  (Single source of truth for books, paths, styles, InDesign settings)   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPILATION PHASE                                                       │
│  1. merge         → Copy/normalize Markdown from content + paratextuales │
│  2. icml          → Pandoc: Markdown → ICML                              │
│  3. restyle-icml  → Apply styleMappings (source → target)               │
│  4. resize-images → Resize anchored images to configured dimensions     │
│  5. scan          → Build registries (crossref, hyperlink, citation)     │
│  6. validate      → Check cross-reference integrity                     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PUBLISHING PHASE (InDesign open with .indb)                              │
│  1. reformat-bibliography → Apply bibliography style to ICML             │
│  2. update-links         → Update linked documents                      │
│  3. fix-hyperlinks       → Correct URL hyperlinks                        │
│  4. crossref-process     → Convert anchors to native cross-refs         │
│  5. update-book          → Sync styles, numbering, preflight             │
│  6. update-toc           → Regenerate table of contents                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data flow:** Scripts receive `book_id` and load config via `lib/config.py`. All paths and settings come from `build.config.json`.

---

## 8. Directory Structure

```
dev/
├── build.config.json          # Main configuration
├── justfile                   # Command definitions
├── lib/                       # Python scripts
│   ├── config.py              # Config loading and validation
│   ├── get-book-ids.py        # Prints book IDs (used by justfile)
│   ├── merge-book.py          # Merge Markdown
│   ├── compile-icml.py        # Markdown → ICML
│   ├── restyle-icml.py        # Style mappings
│   ├── scan-book.py           # Build registries
│   ├── validate-book.py       # Cross-ref validation
│   ├── format-bibliography-icml.py
│   ├── generate-indesign-config.py
│   ├── book-status.py
│   ├── list-book-chapters.py
│   ├── compile-chapter.py
│   ├── cli.py                 # Shared CLI boilerplate
│   ├── gum-helpers.sh         # Terminal styling
│   └── adobe/                 # InDesign JSX + AppleScript
│       ├── *.applescript
│       └── *.jsx
├── outputs/                   # Source content (per book)
│   └── capitulos/
│       └── libro1/
│           ├── content/       # Chapter Markdown
│           └── paratextuales/ # Glossary, bibliography, etc.
└── generated/                 # Build output (per book)
    └── libro1/
        ├── markdown/          # Merged Markdown
        ├── icml/              # ICML files
        ├── data/              # Registries, indesign-config.json
        └── reports/           # InDesign JSX reports
```

---

## 9. Python Scripts (lib/)

### Core scripts

| Script | Purpose |
|--------|---------|
| `config.py` | Load `build.config.json`, parse books, resolve paths |
| `get-book-ids.py` | Print space-separated book IDs (used by justfile) |
| `merge-book.py` | Merge and normalize Markdown from content + paratextuales |
| `compile-icml.py` | Convert Markdown to ICML via Pandoc |
| `restyle-icml.py` | Apply `styleMappings` to ICML files |
| `resize-icml-images.py` | Resize anchored images in ICML files |
| `icml_images.py` | Image resizing logic (used by `resize-icml-images.py`) |
| `scan-book.py` | Build crossref, hyperlink, citation registries |
| `validate-book.py` | Validate cross-references against registries |
| `format-bibliography-icml.py` | Apply bibliography style to bibliography ICML |
| `generate-indesign-config.py` | Generate `indesign-config.json` for JSX |
| `book-status.py` | Report book status (stale check, summary) |
| `list-book-chapters.py` | List chapters for a book |
| `compile-chapter.py` | Compile a single chapter |
| `cli.py` | Shared argparse + config loading for scripts |

### Invocation

Scripts expect a book ID and optional `--config` / `--verbose`:

```bash
python3 lib/merge-book.py libro1
python3 lib/merge-book.py libro1 --config build.config.json --verbose
```

Invalid book IDs produce a clear error with the list of available books.

---

## 10. InDesign Integration

### Requirements

- macOS
- Adobe InDesign 2021+
- InDesign book (.indb) open
- `osascript` available

### Flow

1. `just indesign-config libro1` generates `generated/libro1/data/indesign-config.json`
2. AppleScript invokes JSX scripts, which read this config for paths and settings
3. Scripts operate on the currently open book

### JSX scripts

Located in `lib/adobe/`. They use paths from `indesign-config.json` for:

- Hyperlink correction
- Cross-reference processing
- Reports (crossref, hyperlinks)

### Important

- Only one book can be open at a time
- `just update-links` and `just update-book` act on the open book
- `just publish-all` prompts to switch books between runs

---

## 11. Troubleshooting

### "Invalid book 'X'. Run 'just list-books' for valid options"

- The book ID is not in `build.config.json`
- Run `just list-books` to see valid IDs
- Add the book under `books` in the config (see [Adding a New Book](#5-adding-a-new-book))

### "Could not load config" / script fails

- Ensure `build.config.json` exists at project root
- Run from project root: `cd /path/to/dev && just ...`
- Validate config: `python3 lib/config.py` or `just test-config`

### Pandoc errors

- Check Pandoc version: `pandoc --version` (2.19+ required)
- Inspect Markdown for invalid syntax
- Use `just icml-verbose libro1` for details

### InDesign scripts fail

- Confirm InDesign is open with the correct .indb
- Check `generated/<book>/data/indesign-config.json` exists
- Ensure AppleScript can control InDesign (System Preferences → Security & Privacy → Automation)

### Stale detection

- `just compile-if-needed` uses file mtimes
- Force recompile with `just clean libro1` then `just compile libro1`

### Dependencies

- Run `just check-deps` to verify Python, Pandoc, just, and config

---

## Appendix: Config Schema Summary

Quick reference. See [Configuration (§4)](#4-configuration) for full property descriptions and defaults.

```json
{
  "version": "1.0",
  "books": {
    "<book_id>": {
      "id": "<book_id>",
      "title": "Display Title",
      "prefix": "L1",
      "source": {
        "content": "outputs/capitulos/<book>/content",
        "paratextuales": "outputs/capitulos/<book>/paratextuales"
      },
      "output": {
        "root": "generated/<book>",
        "markdown": "generated/<book>/markdown",
        "icml": "generated/<book>/icml",
        "data": "generated/<book>/data"
      },
      "chapters": {
        "order": [1, 2, 3, ...],
        "pattern": "L1_CAP{:02d}_*.md"
      },
      "paratextuales": ["L1_GLOSARIO", "L1_BIBLIOGRAFIA"],
      "indesign": {
        "bookFile": "libro1.indb",
        "tocDocument": "L1_TOC",
        "tocStyle": "TOC Style",
        "bibliographyFile": "L1_BIBLIOGRAFIA",
        "tableMaxWidth": 360,
        "imageSettings": {
          "defaults": { "maxWidth": 450, "fitMode": "proportional" },
          "overrides": { }
        }
      },
      "styles": { },
      "styleMappings": [ ]
    }
  },
  "pandoc": { },
  "processing": { },
  "indesign": { }
}
```

---

*Last updated: March 2026*
