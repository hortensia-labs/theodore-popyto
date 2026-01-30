# URL Hyperlink Correction System - Product Requirements Document

## Document Information

- **Document Version**: 1.0
- **Created**: January 2026
- **Project**: Theodore Thesis Writing System
- **Component**: URL Hyperlink Correction and Validation System
- **Status**: Specification Phase
- **Dependencies**: Cross-Reference Processing System, Data Compilation Pipeline

---

## Executive Summary

This PRD defines the requirements for an automated URL hyperlink correction system that resolves malformed URL destinations created during the Markdown-to-ICML conversion process. The system will extract URL hyperlinks from source Markdown files, validate them against InDesign documents, intelligently correct mismatched destinations, remove orphaned entries, and provide comprehensive reporting—all integrated seamlessly into the existing thesis build workflow.

---

## Table of Contents

1. [Project Context](#project-context)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Component Specifications](#component-specifications)
5. [Data Structures](#data-structures)
6. [Processing Workflow](#processing-workflow)
7. [Integration Requirements](#integration-requirements)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Reporting Requirements](#reporting-requirements)
10. [Performance Requirements](#performance-requirements)
11. [Quality Assurance](#quality-assurance)
12. [Success Criteria](#success-criteria)

---

## Project Context

### Current State Analysis

**Existing Workflow:**

The Theodore thesis writing system processes markdown files through a multi-stage pipeline:

```
Markdown Source (sections/*/content/*.md)
    ↓ [Merge] (make merge-all)
    ↓
Merged Markdown (generated/markdown/*.md)
    ↓ [Pandoc Conversion] (make compile-icml)
    ↓
ICML Files (generated/icml/*.icml)
    ↓ [InDesign Import] (make update-links)
    ↓
InDesign Documents (book/chapters/*.indd)
    ↓ [Cross-Reference Processing] (make crossref-process)
    ↓
Final Documents with Cross-References
```

**Two Distinct Hyperlink Systems:**

1. **Internal Cross-References** (Working Correctly):
   - Markdown syntax: `[text](#anchor-id)`
   - Converts to: InDesign `ParagraphDestination` + `CrossReferenceSource`
   - Managed by: `crossref-process.jsx`
   - Registry: `generated/data/crossref-registry.json`
   - Status: **Production-ready, must not be modified**

2. **External URL Hyperlinks** (Currently Broken):
   - Markdown syntax: `[text](https://url.com)`
   - Should convert to: InDesign `HyperlinkURLDestination` + `Hyperlink`
   - Current state: **Malformed by Pandoc ICML conversion**
   - Status: **Requires automated correction**

### Strategic Objectives

1. **Automatic Correction**: Eliminate manual URL destination fixing in InDesign
2. **Validation**: Ensure all markdown URLs are correctly represented in final documents
3. **Consistency**: Maintain uniform URL handling across all thesis chapters
4. **Integration**: Seamlessly integrate into existing `compile-all-ru` workflow
5. **Non-Interference**: Preserve critical cross-reference processing integrity
6. **Transparency**: Provide detailed reporting of all corrections and issues

---

## Problem Statement

### Root Cause Analysis

**Pandoc ICML Conversion Defect:**

When Pandoc converts markdown URLs to ICML format, it creates three InDesign objects:

1. **HyperlinkTextSource**: Contains the correct link text (e.g., "Made by Henry")
2. **Hyperlink**: Has the hyperlink name set to the intended URL (e.g., "https://evelas.co")
3. **HyperlinkURLDestination**: Created with a **hardcoded placeholder URL** (e.g., "http://example.com")

**The Critical Issue:**

The `Hyperlink` object correctly references the `HyperlinkURLDestination` via `DestinationUniqueKey`, but that destination contains the wrong URL. The intended URL is only stored in the hyperlink's **name property**, not in the destination's URL property.

**Example of Malformed Output:**

```xml
<!-- ICML Output -->
<HyperlinkTextSource Self="u1001" Name="Hyperlink 1">
    <Content>Made by Henry</Content>
</HyperlinkTextSource>

<Hyperlink Self="u1006" Name="https://evelas.co" Source="u1001" DestinationUniqueKey="57">
    <Properties>
        <Destination type="object">HyperlinkURLDestination/link</Destination>
    </Properties>
</Hyperlink>

<HyperlinkURLDestination Self="HyperlinkURLDestination/link"
                          Name="link"
                          DestinationURL="http://example.com"
                          DestinationUniqueKey="57" />
```

**Observed Symptoms:**

- Hyperlink name: "https://evelas.co" (correct)
- Destination URL: "http://example.com" (wrong)
- Result: Clicking the link goes to the wrong destination

**Accumulation Problem:**

Over multiple ICML conversions, orphaned destinations accumulate:

- 19 `HyperlinkURLDestination` objects observed
- Most pointing to placeholder URLs ("http://example.com", "https://www.apple.com")
- Only a fraction are actually referenced by hyperlinks
- No automatic cleanup occurs

### Impact Assessment

**Current Manual Workaround:**

Users must manually:

1. Open each InDesign document
2. Navigate to Hyperlinks panel
3. Identify each incorrect URL destination
4. Edit the destination URL to match the hyperlink name
5. Delete orphaned destinations
6. Repeat for all documents in the book

**Effort Required:**

- ~20 minutes per document
- ~15 documents per thesis
- **Total: 5 hours of manual work per compilation cycle**

**Risk Factors:**

- Human error in URL transcription
- Missed hyperlinks lead to broken links in final PDF
- Inconsistent URL formatting across documents
- No validation that all markdown URLs are preserved

---

## Solution Architecture

### Architectural Principles

1. **Trust the Source**: Hyperlink name is the source of truth for intended URL
2. **Intelligent Reuse**: Prefer existing destinations over creating duplicates
3. **Safe Cleanup**: Only remove truly orphaned destinations
4. **Book-Wide Context**: Process all documents with full awareness of book structure
5. **Registry Validation**: Cross-reference InDesign state with markdown source
6. **Non-Destructive**: Warn-and-continue error handling to prevent workflow blockage
7. **Separation of Concerns**: Complete independence from cross-reference processing

### System Components

#### Component 1: URL Registry Generator (Python)

**File**: `lib/compile-data.py` (renamed from `extract-citations-crossrefs.py`)

**Purpose**: Extract all URL hyperlinks from merged markdown files and create ground-truth registry

**Responsibilities**:

- Scan all merged markdown files in `generated/markdown/`
- Extract URL hyperlinks using regex pattern: `\[([^\]]+)\]\((https?://[^\)]+)\)`
- Exclude internal anchor references: `\[text\](#anchor)`
- Build structured URL registry with source file mapping
- Output to `generated/data/url-registry.json`
- Maintain existing citation and cross-reference extraction
- Validate URL format (basic protocol and structure checks)

**Integration Point**: `make compile-data` target

---

#### Component 2: URL Hyperlink Correction Script (ExtendScript)

**File**: `lib/adobe/hyperlink-process.jsx` (enhanced from current investigation script)

**Purpose**: Automatically correct malformed URL destinations in all InDesign book documents

**Responsibilities**:

- Load URL registry from `generated/data/url-registry.json` (with graceful fallback)
- Access InDesign book structure via `BookManager.getActiveBook()`
- Recursively process all accessible documents in the book
- Discover and analyze all `Hyperlink` and `HyperlinkURLDestination` objects
- Implement intelligent URL reconciliation strategy
- Create, update, or reuse URL destinations as needed
- Clean up orphaned destinations
- Generate comprehensive JSON report
- Return success status even with warnings (warn-and-continue)

**Integration Point**: New `make fix-url-hyperlinks` target via `runner.applescript`

---

#### Component 3: Makefile Integration

**File**: `Makefile`

**Purpose**: Integrate URL correction into existing compilation workflow

**Changes Required**:

1. Rename `extract-citations-crossrefs.py` reference to `compile-data.py`
2. Add new target: `fix-url-hyperlinks`
3. Insert `fix-url-hyperlinks` into `compile-all-ru` workflow
4. Position between `update-links` (Step 5) and `crossref-process` (Step 6)

**Workflow Sequence**:

```makefile
compile-all-ru:
    Step 1: merge-all-r          # Merge markdown files
    Step 2: compile-icml         # Convert to ICML
    Step 3: scan-ref             # Build anchor registry
    Step 4: validate-crossrefs   # Validate cross-references
    Step 5: update-links         # Load ICML into InDesign
    Step 5.5: fix-url-hyperlinks # ← NEW: Fix URL hyperlinks
    Step 6: crossref-process     # Convert cross-references
    Step 7: update-book          # Sync styles, update numbers
    Step 8: update-toc           # Update table of contents
```

---

## Component Specifications

### Component 1: URL Registry Generator (`compile-data.py`)

#### Input Requirements

**Source Files**:

- All merged markdown files from `generated/markdown/*.md`
- Files must exist and be readable
- UTF-8 encoding expected

**Processing Scope**:

- Process all `.md` files in the directory
- Ignore non-markdown files
- Skip empty or malformed files with warning

#### Extraction Logic

**URL Pattern Detection**:

Regex pattern to match markdown URL links:

```
\[([^\]]+)\]\((https?://[^\)]+)\)
```

**Pattern Breakdown**:

- `\[([^\]]+)\]`: Capture link text (anything except closing bracket)
- `\(`: Opening parenthesis for URL
- `(https?://[^\)]+)`: Capture URL (http or https protocol)
- `\)`: Closing parenthesis

**Exclusion Criteria**:

- Internal anchors: `[text](#anchor-id)` - Skip these entirely
- Relative paths: `[text](../path)` - Skip
- Mailto links: `[text](mailto:email)` - Include with mailto protocol
- Empty URLs: `[text]()` - Log as warning, skip

**URL Validation**:

Basic validation rules:

1. Must start with `http://` or `https://` or `mailto:`
2. Must contain valid domain characters after protocol
3. Length: minimum 10 characters, maximum 2000 characters
4. Special characters properly encoded (warn if suspicious)

**Source File Tracking**:

For each URL extracted, record:

- Source markdown file name (e.g., "3-marco-resistencia")
- Line number where URL appears
- Link text (for verification)
- Full URL

#### Output Format

**File Location**: `generated/data/url-registry.json`

**JSON Structure**:

```json
{
  "metadata": {
    "generated": "2026-01-30T14:23:45.123Z",
    "version": "1.0",
    "sourceDirectory": "generated/markdown",
    "totalFiles": 15,
    "totalURLs": 47,
    "generator": "compile-data.py"
  },
  "urls": [
    {
      "url": "https://evelas.co",
      "linkText": "Made by Henry",
      "sourceFile": "0-covermatter",
      "lineNumber": 3,
      "protocol": "https",
      "domain": "evelas.co"
    },
    {
      "url": "https://www.apple.com/case",
      "linkText": "Apple Case Study",
      "sourceFile": "3-marco-resistencia",
      "lineNumber": 145,
      "protocol": "https",
      "domain": "www.apple.com"
    }
  ],
  "duplicates": [
    {
      "url": "https://www.apple.com",
      "occurrences": 3,
      "locations": [
        { "sourceFile": "2-fundamentos", "lineNumber": 89 },
        { "sourceFile": "3-marco-resistencia", "lineNumber": 234 },
        { "sourceFile": "5-conclusiones", "lineNumber": 12 }
      ]
    }
  ],
  "warnings": [
    "Line 156 in 4-metodologia: Empty URL in link [broken link]()"
  ]
}
```

**Field Specifications**:

- `url` (string, required): The complete URL as it appears in markdown
- `linkText` (string, required): The display text for the hyperlink
- `sourceFile` (string, required): Markdown filename without extension
- `lineNumber` (integer, required): Line number in source file
- `protocol` (string, required): Extracted protocol (http, https, mailto)
- `domain` (string, required): Extracted domain for quick lookup

**Duplicate Handling**:

- Same URL appearing multiple times is normal and expected
- Record all occurrences in `duplicates` array
- All references to the same URL should point to the same destination in InDesign

#### Error Handling

**Non-Fatal Errors** (warn and continue):

- Markdown file not readable: Log warning, skip file
- Malformed URL syntax: Log warning with line number, skip URL
- Empty link text: Log warning, include URL anyway
- Suspicious characters in URL: Log warning, include with note

**Fatal Errors** (abort processing):

- Source directory does not exist
- Cannot write to output file
- JSON serialization failure

**Logging**:

- Write warnings to console during processing
- Include all warnings in output JSON
- Generate summary: "Extracted 47 URLs from 15 files with 3 warnings"

---

### Component 2: URL Hyperlink Correction Script (`hyperlink-process.jsx`)

#### Initialization Phase

**Module Imports**:

```javascript
// Required includes
#include "modules/json2.js"
#include "modules/indesign/book-manager.jsx"
```

**Configuration**:

```javascript
var CONFIG = {
    REGISTRY_PATH: "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto/generated/data/url-registry.json",
    REPORTS_DIR: "/Users/henry/Workbench/PopytoNoPhd/theodore-popyto/generated/reports/url-hyperlinks",
    VERSION: "1.0.0"
};
```

**Session State Structure**:

```javascript
var sessionState = {
    currentBook: null,
    bookContents: [],
    urlRegistry: null,                    // Loaded from JSON
    destinationMap: {},                   // URL → HyperlinkURLDestination
    destinationReferenceCount: {},        // DestinationID → count
    stats: {
        startTime: new Date().getTime(),
        documentsProcessed: 0,
        hyperlinksFound: 0,
        hyperlinksFixed: 0,
        destinationsCreated: 0,
        destinationsReused: 0,
        destinationsUpdated: 0,
        orphansRemoved: 0,
        errors: 0,
        warnings: 0
    },
    capturedLogs: {
        errors: [],
        warnings: [],
        fixes: []
    }
};
```

#### Phase 1: Registry Loading

**Purpose**: Load URL registry for validation (optional dependency)

**Process**:

1. Attempt to open `url-registry.json`
2. If file exists:
   - Read and parse JSON
   - Validate structure (metadata + urls array)
   - Build quick-lookup map: URL → registry entry
   - Store in `sessionState.urlRegistry`
3. If file doesn't exist or parse fails:
   - Log warning: "URL registry not found, using name-based correction"
   - Set `sessionState.urlRegistry = null`
   - Continue processing (graceful degradation)

**Fallback Behavior**:

- Registry is optional for correction
- Script can operate in "name-based" mode without registry
- Registry enhances validation and reporting, but isn't required for core functionality

#### Phase 2: Book Initialization

**Purpose**: Access InDesign book and get all documents

**Process** (identical to crossref-process.jsx):

1. Check if InDesign is running and book is open:

   ```javascript
   if (app.documents.length === 0) {
       return "ERROR: No documents open";
   }
   ```

2. Get active book:

   ```javascript
   var bookResult = BookManager.getActiveBook();
   if (!bookResult.success) {
       return "FATAL_ERROR: " + bookResult.error;
   }
   sessionState.currentBook = bookResult.book;
   ```

3. Get all accessible documents:

   ```javascript
   var documentsResult = BookManager.getAccessibleDocuments(
       sessionState.currentBook,
       null
   );
   sessionState.bookContents = documentsResult.documents;
   ```

4. Validate accessibility:
   - Must have at least 1 accessible document
   - Log count of accessible vs inaccessible documents
   - Warn if some documents are inaccessible (but continue)

**Critical Requirement**:

- Must use `BookManager` module for consistency with crossref-process
- Must handle InCopy workflow story locking
- Must track which documents were already open vs opened by script

#### Phase 3: Global Discovery

**Purpose**: Build complete map of all URL destinations across all documents

**Process**:

For each document in `sessionState.bookContents`:

1. **Open Document**:

   ```javascript
   var openResult = BookManager.openDocument(bookContent, null);
   if (!openResult.success) {
       log("WARN", "Could not open document", {document: documentName});
       continue;  // Skip this document
   }
   var doc = openResult.document;
   ```

2. **Scan URL Destinations**:

   ```javascript
   var urlDestinations = doc.hyperlinkURLDestinations;
   for (var i = 0; i < urlDestinations.length; i++) {
       var destination = urlDestinations[i];
       var url = destination.destinationURL;

       // Build destination map: URL → destination object
       if (!sessionState.destinationMap[url]) {
           sessionState.destinationMap[url] = [];
       }
       sessionState.destinationMap[url].push({
           destination: destination,
           document: documentName,
           destinationId: destination.id
       });
   }
   ```

3. **Scan Hyperlinks**:

   ```javascript
   var hyperlinks = doc.hyperlinks;
   for (var h = 0; h < hyperlinks.length; h++) {
       var link = hyperlinks[h];

       // Count references to each destination
       if (link.destination && link.destination.id) {
           var destId = link.destination.id;
           if (!sessionState.destinationReferenceCount[destId]) {
               sessionState.destinationReferenceCount[destId] = 0;
           }
           sessionState.destinationReferenceCount[destId]++;
       }

       sessionState.stats.hyperlinksFound++;
   }
   ```

4. **Close Document** (if we opened it):

   ```javascript
   if (!openResult.wasAlreadyOpen) {
       BookManager.closeDocument(doc, false, null);
   }
   ```

**Output of This Phase**:

- `destinationMap`: Complete registry of all URL destinations by URL
- `destinationReferenceCount`: Reference count for every destination
- Knowledge of which destinations are orphaned (count === 0)

#### Phase 4: URL Correction

**Purpose**: Fix all hyperlinks to point to correct URL destinations

**Strategy**: Three-tier approach for each hyperlink

**Processing Loop**:

For each document in `sessionState.bookContents`:

1. **Open Document** (same pattern as Phase 3)

2. **Discover URL Hyperlinks**:

   ```javascript
   var hyperlinks = doc.hyperlinks;
   var urlHyperlinks = [];

   for (var h = 0; h < hyperlinks.length; h++) {
       var link = hyperlinks[h];

       // CRITICAL: Skip internal cross-references
       if (link.name.indexOf("#") === 0) {
           continue;  // This is an anchor reference, not a URL
       }

       // Check if name looks like a URL
       if (isValidURL(link.name)) {
           urlHyperlinks.push(link);
       }
   }
   ```

3. **Apply Correction Strategy** for each URL hyperlink:

   **Tier 1: Find Existing Destination with Correct URL**

   ```javascript
   var intendedURL = link.name;  // Trust the hyperlink name
   var matchingDests = sessionState.destinationMap[intendedURL];

   if (matchingDests && matchingDests.length > 0) {
       // Perfect match exists - reuse it
       var targetDest = matchingDests[0].destination;
       relinkHyperlink(link, targetDest);
       sessionState.stats.destinationsReused++;
       sessionState.stats.hyperlinksFixed++;
       continue;
   }
   ```

   **Tier 2: Update Orphaned Destination**

   ```javascript
   var currentDest = link.destination;
   var currentDestId = currentDest.id;
   var refCount = sessionState.destinationReferenceCount[currentDestId];

   if (currentDest && refCount === 1) {
       // This destination is only used by this hyperlink - safe to update
       currentDest.destinationURL = intendedURL;
       currentDest.name = generateDestinationName(intendedURL);
       sessionState.destinationMap[intendedURL] = [currentDest];
       sessionState.stats.destinationsUpdated++;
       sessionState.stats.hyperlinksFixed++;
       continue;
   }
   ```

   **Tier 3: Create New Destination**

   ```javascript
   // Need to create a new destination
   var newDestName = generateUniqueDestinationName(doc, intendedURL);
   var newDest = doc.hyperlinkURLDestinations.add(intendedURL, {
       name: newDestName,
       hidden: false
   });

   relinkHyperlink(link, newDest);
   sessionState.destinationMap[intendedURL] = [newDest];
   sessionState.stats.destinationsCreated++;
   sessionState.stats.hyperlinksFixed++;
   ```

4. **Validate Correction** (if registry available):

   ```javascript
   if (sessionState.urlRegistry) {
       var registryEntry = sessionState.urlRegistry.lookup[intendedURL];
       if (!registryEntry) {
           log("WARN", "URL not found in markdown source", {
               url: intendedURL,
               document: documentName,
               linkText: link.source.sourceText.contents
           });
       }
   }
   ```

5. **Close Document** (if we opened it)

**Helper Functions Required**:

```javascript
function isValidURL(str) {
    // Check if string looks like a URL
    return (str.indexOf("http://") === 0 ||
            str.indexOf("https://") === 0 ||
            str.indexOf("mailto:") === 0);
}

function relinkHyperlink(hyperlink, newDestination) {
    // Change hyperlink destination
    hyperlink.destination = newDestination;
}

function generateDestinationName(url) {
    // Create readable name from URL
    // Example: "https://evelas.co" → "evelas_co"
    var name = url.replace(/https?:\/\//, "")
                  .replace(/\//g, "_")
                  .substring(0, 50);
    return "URL_" + name;
}

function generateUniqueDestinationName(doc, url) {
    // Ensure name is unique in document
    var baseName = generateDestinationName(url);
    var counter = 1;
    var finalName = baseName;

    while (destinationNameExists(doc, finalName)) {
        finalName = baseName + "_" + counter;
        counter++;
    }

    return finalName;
}

function destinationNameExists(doc, name) {
    try {
        var dest = doc.hyperlinkURLDestinations.itemByName(name);
        return dest.isValid;
    } catch (e) {
        return false;
    }
}
```

#### Phase 5: Orphan Cleanup

**Purpose**: Remove URL destinations that are no longer referenced

**Process**:

For each document in `sessionState.bookContents`:

1. **Open Document**

2. **Identify Orphans**:

   ```javascript
   var urlDestinations = doc.hyperlinkURLDestinations;
   var orphans = [];

   for (var i = 0; i < urlDestinations.length; i++) {
       var destination = urlDestinations[i];
       var destId = destination.id;
       var refCount = sessionState.destinationReferenceCount[destId] || 0;

       if (refCount === 0) {
           orphans.push(destination);
       }
   }
   ```

3. **Remove Orphans**:

   ```javascript
   for (var o = 0; o < orphans.length; o++) {
       try {
           var orphan = orphans[o];
           log("INFO", "Removing orphaned destination", {
               document: documentName,
               destinationName: orphan.name,
               destinationURL: orphan.destinationURL
           });
           orphan.remove();
           sessionState.stats.orphansRemoved++;
       } catch (e) {
           log("WARN", "Could not remove orphan", {
               error: e.message
           });
       }
   }
   ```

4. **Close Document**

**Safety Check**:

- Only remove destinations with `refCount === 0`
- Never remove destinations created/updated in Phase 4
- Log all removals for audit trail

#### Phase 6: Final Verification

**Purpose**: Validate that all corrections were successful

**Verification Checks**:

1. **Hyperlink Count Validation**:

   ```javascript
   if (sessionState.urlRegistry) {
       var expectedCount = sessionState.urlRegistry.urls.length;
       var actualCount = sessionState.stats.hyperlinksFixed;

       if (actualCount < expectedCount) {
           log("WARN", "Some markdown URLs not found in InDesign", {
               expected: expectedCount,
               actual: actualCount,
               missing: expectedCount - actualCount
           });
       }
   }
   ```

2. **Destination Integrity Check**:
   - Scan all hyperlinks again
   - Verify each points to a destination with matching URL
   - Count any remaining mismatches

3. **Orphan Verification**:
   - Count remaining URL destinations
   - Verify all have at least one reference
   - Report any unexpected orphans

**Quality Metrics**:

- Correction success rate: `hyperlinksFixed / hyperlinksFound`
- Reuse efficiency: `destinationsReused / (destinationsReused + destinationsCreated)`
- Cleanup effectiveness: `orphansRemoved` count

#### Error Handling Requirements

**Error Classification**:

1. **Fatal Errors** (return error, stop processing):
   - InDesign not running
   - No book document open
   - Cannot access book structure
   - JSON report generation failure (if critical)

2. **Document Errors** (skip document, continue):
   - Cannot open specific document
   - Document is locked or corrupted
   - Story checkout failure

3. **Hyperlink Errors** (log warning, continue):
   - Cannot parse hyperlink name as URL
   - Destination creation fails
   - Relink operation fails
   - Registry validation fails

**Recovery Strategy**:

For all non-fatal errors:

1. Log detailed error information
2. Increment error/warning counters
3. Capture error in `sessionState.capturedLogs`
4. Continue processing remaining items
5. Return success status with warnings

**Critical Requirement**:

- Script must always return success exit code unless fatal error
- Partial success is acceptable (e.g., 14/15 documents processed)
- Comprehensive error reporting allows user to assess impact

---

## Data Structures

### URL Registry Schema

**File**: `generated/data/url-registry.json`

**Complete Structure**:

```json
{
  "metadata": {
    "generated": "ISO-8601 timestamp",
    "version": "1.0",
    "sourceDirectory": "absolute path to markdown directory",
    "totalFiles": "number of markdown files processed",
    "totalURLs": "total unique URLs extracted",
    "generator": "compile-data.py",
    "pythonVersion": "3.x",
    "extractionPattern": "regex pattern used"
  },
  "urls": [
    {
      "url": "complete URL as string",
      "linkText": "markdown link display text",
      "sourceFile": "filename without extension",
      "lineNumber": "line number in source file",
      "protocol": "http|https|mailto",
      "domain": "extracted domain",
      "path": "URL path component (optional)",
      "normalizedURL": "lowercase, normalized version for matching"
    }
  ],
  "duplicates": [
    {
      "url": "URL that appears multiple times",
      "occurrences": "count of occurrences",
      "locations": [
        {
          "sourceFile": "filename",
          "lineNumber": "line number",
          "linkText": "link text at this location"
        }
      ]
    }
  ],
  "warnings": [
    "human-readable warning messages"
  ],
  "statistics": {
    "totalFiles": "count",
    "totalURLs": "count",
    "uniqueURLs": "count",
    "uniqueDomains": "count",
    "protocolBreakdown": {
      "https": "count",
      "http": "count",
      "mailto": "count"
    }
  }
}
```

### Processing Report Schema

**File**: `generated/reports/url-hyperlinks/fix-report.json`

**Complete Structure**:

```json
{
  "sessionInfo": {
    "version": "script version",
    "timestamp": "ISO-8601 timestamp",
    "duration": "milliseconds",
    "processingTimeSeconds": "formatted time"
  },
  "results": {
    "status": "SUCCESS|SUCCESS_WITH_WARNINGS|COMPLETED_WITH_ISSUES",
    "publicationReady": "boolean",
    "quality": "PUBLICATION_READY|REQUIRES_ATTENTION"
  },
  "statistics": {
    "documentsInBook": "total count",
    "documentsProcessed": "processed count",
    "documentsSkipped": "skipped count",
    "hyperlinksFound": "total found",
    "hyperlinksFixed": "successfully fixed",
    "hyperlinksFailed": "failed corrections",
    "destinationsCreated": "new destinations",
    "destinationsReused": "reused existing",
    "destinationsUpdated": "updated in place",
    "orphansRemoved": "cleaned up",
    "errors": "error count",
    "warnings": "warning count"
  },
  "efficiency": {
    "correctionRate": "percentage",
    "reuseRate": "percentage",
    "cleanupEfficiency": "orphans removed / total destinations"
  },
  "registryValidation": {
    "registryAvailable": "boolean",
    "expectedURLs": "count from registry",
    "foundURLs": "count in InDesign",
    "matchRate": "percentage",
    "missingURLs": [
      {
        "url": "URL from registry not found",
        "sourceFile": "markdown file",
        "lineNumber": "line number"
      }
    ],
    "extraURLs": [
      {
        "url": "URL in InDesign but not in registry",
        "document": "InDesign document",
        "linkText": "hyperlink text"
      }
    ]
  },
  "capturedLogs": {
    "errors": [
      {
        "timestamp": "time",
        "level": "ERROR",
        "message": "error message",
        "context": {
          "document": "document name",
          "hyperlink": "hyperlink name",
          "additionalDetails": "any"
        }
      }
    ],
    "warnings": [
      "same structure as errors"
    ],
    "fixes": [
      {
        "timestamp": "time",
        "action": "REUSED|UPDATED|CREATED",
        "document": "document name",
        "hyperlinkName": "hyperlink name",
        "intendedURL": "correct URL",
        "previousURL": "old URL (if updated)",
        "destinationName": "destination object name"
      }
    ]
  },
  "documentDetails": [
    {
      "documentName": "name without extension",
      "processed": "boolean",
      "hyperlinksFound": "count",
      "hyperlinksFixed": "count",
      "destinationsCreated": "count",
      "destinationsReused": "count",
      "orphansRemoved": "count",
      "issues": [
        "human-readable issue descriptions"
      ]
    }
  ]
}
```

---

## Processing Workflow

### Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────┐
│ MARKDOWN SOURCE                                             │
│ sections/*/content/*.md                                     │
│ Contains: [Made by Henry](https://evelas.co)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: MERGE                                               │
│ make merge-all-r                                            │
│ Output: generated/markdown/0-covermatter.md                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: DATA COMPILATION                                   │
│ make compile-data                                           │
│ Script: lib/compile-data.py                                 │
│ Actions:                                                    │
│   - Extract citations → citations.json                      │
│   - Extract cross-refs → (used by scan-ref later)           │
│   - Extract URL hyperlinks → url-registry.json ← NEW        │
│ Output: generated/data/url-registry.json                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: ICML CONVERSION                                     │
│ make compile-icml                                           │
│ Pandoc converts markdown to ICML                            │
│ Creates BROKEN URL destinations:                            │
│   <Hyperlink Name="https://evelas.co">                      │
│   <HyperlinkURLDestination URL="http://example.com">        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: ANCHOR REGISTRY                                    │
│ make scan-ref                                               │
│ Builds crossref-registry.json for internal links           │
│ (Separate from URL registry)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: LOAD INTO INDESIGN                                 │
│ make update-links                                           │
│ ICML files imported into InDesign documents                │
│ Broken URL destinations now exist in InDesign              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5.5: FIX URL HYPERLINKS ← NEW STEP                    │
│ make fix-url-hyperlinks                                     │
│ Script: lib/adobe/hyperlink-process.jsx                     │
│ Actions:                                                    │
│   1. Load url-registry.json                                 │
│   2. Scan all documents in book                            │
│   3. Fix hyperlink destinations:                            │
│      - Reuse existing correct destinations                  │
│      - Update orphaned destinations                         │
│      - Create new destinations as needed                    │
│   4. Remove orphaned destinations                           │
│   5. Generate fix-report.json                               │
│ Output: Corrected URL hyperlinks in all documents           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: CROSS-REFERENCE PROCESSING                          │
│ make crossref-process                                       │
│ Script: lib/adobe/crossref-process.jsx                      │
│ Handles ONLY internal paragraph cross-references            │
│ URL hyperlinks already fixed - NO INTERFERENCE              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7-8: FINALIZATION                                      │
│ make update-book → make update-toc                          │
│ Final document ready for publication                        │
└─────────────────────────────────────────────────────────────┘
```

### Timing and Performance

**Expected Processing Times** (per compilation):

| Step | Current Time | New Time | Change |
| ---- | ------------ | -------- | ------ |
| merge-all-r | 10-30s | 10-30s | 0s |
| compile-icml | 5-15s | 5-15s | 0s |
| compile-data | N/A | 2-5s | +2-5s (NEW URL extraction) |
| scan-ref | 2-5s | 2-5s | 0s |
| validate-crossrefs | 1-3s | 1-3s | 0s |
| update-links | 10-20s | 10-20s | 0s |
| **fix-url-hyperlinks** | **N/A** | **5-15s** | **+5-15s (NEW)** |
| crossref-process | 30-120s | 30-120s | 0s |
| update-book | 10-30s | 10-30s | 0s |
| update-toc | 5-15s | 5-15s | 0s |
| **TOTAL** | **73-238s** | **80-258s** | **+7-20s (+9%)** |

**Performance Characteristics**:

- URL extraction: Fast (regex processing)
- URL correction: Moderate (InDesign API calls)
- Orphan cleanup: Fast (simple deletion)
- Report generation: Fast (JSON serialization)

**Scalability**:

- Linear scaling with number of documents
- Linear scaling with number of URLs
- Expected: ~0.5-1s per document in average book (15 docs)

---

## Integration Requirements

### Makefile Changes

#### File Renaming

**Rename**: `lib/extract-citations-crossrefs.py` → `lib/compile-data.py`

**Rationale**: Align script name with Makefile target name for consistency

**Impact**: Single target already exists (`compile-data`), just update script reference

#### New Target: `fix-url-hyperlinks`

**Location in Makefile**: After `update-book` target, before `crossref-process` target

**Target Definition**:

```makefile
# Fix URL hyperlinks in InDesign book documents
fix-url-hyperlinks:
	@echo "🔗 Fixing URL hyperlinks in InDesign documents..."
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/runner.applescript" ]; then \
		echo "$(RED)❌ Error: AppleScript not found: $(SCRIPTS_ROOT)/adobe/runner.applescript$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/hyperlink-process.jsx" ]; then \
		echo "$(RED)❌ Error: JSX script not found: $(SCRIPTS_ROOT)/adobe/hyperlink-process.jsx$(RESET)"; \
		exit 1; \
	fi
	@osascript "$(SCRIPTS_ROOT)/adobe/runner.applescript" "hyperlink-process.jsx"
	@if [ $$? -eq 0 ]; then \
		echo "✅ URL hyperlinks corrected successfully in all InDesign book documents!"; \
	else \
		echo "$(RED)❌ Error: Failed to fix URL hyperlinks$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Check generated/reports/url-hyperlinks/fix-report.json for details$(RESET)"; \
		exit 1; \
	fi
```

**Error Handling**:

- Check for required files before execution
- Validate AppleScript runner exists
- Validate JSX script exists
- Provide helpful error messages
- Reference report location for debugging

#### Updated Target: `compile-data`

**Current Implementation**:

```makefile
compile-data:
	@echo "📊 Extracting citations and cross-references..."
	@python3 $(SCRIPTS_ROOT)/extract-citations-crossrefs.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data
```

**Updated Implementation**:

```makefile
compile-data:
	@echo "📊 Compiling data: citations, cross-references, and URL hyperlinks..."
	@python3 $(SCRIPTS_ROOT)/compile-data.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data
	@if [ $$? -eq 0 ]; then \
		echo "✅ Data compilation complete!"; \
		echo "   - Citations: generated/data/citations.*"; \
		echo "   - URL Registry: generated/data/url-registry.json"; \
	else \
		echo "$(RED)❌ Error: Data compilation failed$(RESET)"; \
		exit 1; \
	fi
```

**Changes**:

- Update script name reference
- Enhanced echo message to include URL extraction
- Add success message showing output files
- Add error handling

#### Updated Target: `compile-all-ru`

**Current Implementation** (relevant section):

```makefile
compile-all-ru:
	... (steps 1-5)
	@echo "🔗 Step 5: Updating InDesign book document links..."
	@$(MAKE) update-links
	@echo ""
	@echo "🔗 Step 6: Processing cross-references..."
	@$(MAKE) crossref-process
	... (steps 7-8)
```

**Updated Implementation**:

```makefile
compile-all-ru:
	... (steps 1-5 unchanged)
	@echo "🔗 Step 5: Updating InDesign book document links..."
	@$(MAKE) update-links
	@echo ""
	@echo "🔗 Step 5.5: Fixing URL hyperlinks..."
	@$(MAKE) fix-url-hyperlinks
	@echo ""
	@echo "🔗 Step 6: Processing cross-references..."
	@$(MAKE) crossref-process
	... (steps 7-8 unchanged)
```

**Changes**:

- Insert `fix-url-hyperlinks` between `update-links` and `crossref-process`
- Renumber as Step 5.5 for clarity
- Maintain consistent formatting and echoing

### Help Target Update

**Update**: Add `fix-url-hyperlinks` to help output

**Location**: In `help:` target, under "Main Commands" section

**Addition**:

```makefile
	@echo "  $(GREEN)make fix-url-hyperlinks$(RESET)    - Fix URL hyperlink destinations in InDesign documents"
```

**Context**: Add after `update-links`, before `crossref-process`

---

## Error Handling Strategy

### Error Classification Matrix

| Error Type | Severity | Action | Report | Exit Code |
| --------- | -------- | ------ | ------ | --------- |
| InDesign not running | FATAL | Abort | Console + Log | 1 |
| No book open | FATAL | Abort | Console + Log | 1 |
| Registry file missing | WARNING | Continue | JSON + Console | 0 |
| Registry parse error | WARNING | Continue | JSON + Console | 0 |
| Cannot open document | WARNING | Skip doc | JSON + Console | 0 |
| Cannot read hyperlink | WARNING | Skip link | JSON + Console | 0 |
| Destination creation fails | WARNING | Skip link | JSON + Console | 0 |
| Relink operation fails | WARNING | Skip link | JSON + Console | 0 |
| Orphan removal fails | WARNING | Skip orphan | JSON + Console | 0 |
| Report generation fails | ERROR | Continue | Console only | 0 |

### Error Response Patterns

#### Pattern 1: Fatal Error (Abort)

**Conditions**:

- Cannot access InDesign application
- Cannot access book document
- Cannot initialize core data structures

**Response**:

```javascript
if (app.documents.length === 0) {
    $.writeln("FATAL ERROR: No InDesign documents open");
    $.writeln("Please open the thesis book document and try again");
    return "FATAL_ERROR: No documents open";
}
```

**Exit Code**: 1 (failure)

**User Action Required**: Fix environment and re-run

---

#### Pattern 2: Document Error (Skip and Continue)

**Conditions**:

- Specific document cannot be opened
- Document is locked or corrupted
- Story checkout fails for document

**Response**:

```javascript
var openResult = BookManager.openDocument(bookContent, null);
if (!openResult.success) {
    log("WARN", "Could not open document", {
        document: documentName,
        error: openResult.error
    });
    sessionState.stats.warnings++;
    continue;  // Skip to next document
}
```

**Exit Code**: 0 (success with warnings)

**Reporting**: Include in JSON report's `documentDetails` with `processed: false`

---

#### Pattern 3: Hyperlink Error (Log and Continue)

**Conditions**:

- Invalid URL format in hyperlink name
- Destination creation fails
- Relink operation fails

**Response**:

```javascript
try {
    var newDest = doc.hyperlinkURLDestinations.add(intendedURL, {
        name: destName,
        hidden: false
    });
    relinkHyperlink(link, newDest);
    sessionState.stats.hyperlinksFixed++;
} catch (error) {
    log("WARN", "Could not fix hyperlink", {
        document: documentName,
        hyperlink: link.name,
        intendedURL: intendedURL,
        error: error.message
    });
    sessionState.stats.warnings++;
    // Continue to next hyperlink
}
```

**Exit Code**: 0 (success with warnings)

**Reporting**: Capture in `capturedLogs.warnings`

---

#### Pattern 4: Registry Error (Graceful Degradation)

**Conditions**:

- URL registry file not found
- Registry JSON parse error
- Registry structure invalid

**Response**:

```javascript
var registry = loadRegistry();
if (!registry) {
    log("WARN", "URL registry not found, using name-based correction", {
        registryPath: CONFIG.REGISTRY_PATH
    });
    sessionState.urlRegistry = null;
    // Continue with name-based correction (no registry validation)
}
```

**Exit Code**: 0 (success with warnings)

**Impact**: Reduces validation capabilities but core correction still works

---

### Comprehensive Error Messages

**Error Message Format**:

```
[Timestamp] [Level] Message | context=value context2=value2
```

**Example**:

```
[14:23:45] [WARN] Could not fix hyperlink | document=3-marco-resistencia hyperlink=https://evelas.co error=Destination creation failed
```

**User-Facing Output**:

```
🔗 Fixing URL hyperlinks in InDesign documents...
⚠️  Warning: 2 hyperlinks could not be corrected
✅ URL hyperlinks corrected successfully in all InDesign book documents!
💡 Tip: Check generated/reports/url-hyperlinks/fix-report.json for details
```

---

## Reporting Requirements

### Console Output Specification

#### Real-Time Progress Updates

**Format**: Progressive status messages with emoji indicators

**Example Console Output**:

```
=== URL HYPERLINK CORRECTION (v1.0.0) ===

[14:23:45] [INFO] Loading URL registry | path=generated/data/url-registry.json
[14:23:45] [INFO] Registry loaded | urls=47 duplicates=3

[14:23:46] [INFO] Initializing book | name=Thesis_Book.indb
[14:23:46] [INFO] Documents found | accessible=15 inaccessible=0

[14:23:46] [INFO] Starting global discovery
[14:23:47] [INFO] Scanning 0-covermatter.indd | destinations=0 hyperlinks=1
[14:23:48] [INFO] Scanning 1-introduccion.indd | destinations=3 hyperlinks=5
... (progress for each document)
[14:23:55] [INFO] Global discovery completed | documents=15 destinations=47 hyperlinks=52

[14:23:55] [INFO] Starting URL correction
[14:23:56] [INFO] Processing 0-covermatter.indd | fixing=1
[14:23:56] [INFO]   Hyperlink 'https://evelas.co' → REUSED existing destination
[14:23:57] [INFO] Processing 1-introduccion.indd | fixing=5
[14:23:57] [INFO]   Hyperlink 'https://example.com' → UPDATED orphaned destination
[14:23:58] [INFO]   Hyperlink 'https://newurl.com' → CREATED new destination
... (progress for each document)

[14:24:10] [INFO] Starting orphan cleanup
[14:24:11] [INFO] Removed 5 orphaned destinations

[14:24:12] [INFO] Final verification
[14:24:12] [INFO] Verification complete | mismatches=0

=== PROCESSING COMPLETE ===
✅ URL hyperlinks corrected successfully!

Summary:
  Documents Processed: 15/15
  Hyperlinks Fixed: 52/52
  Destinations Reused: 30
  Destinations Updated: 15
  Destinations Created: 7
  Orphans Removed: 5
  Processing Time: 26.5 seconds

Quality Metrics:
  Correction Rate: 100%
  Reuse Efficiency: 57.7%
  Publication Ready: YES

📊 Detailed report: generated/reports/url-hyperlinks/fix-report.json
```

#### Warning and Error Display

**Format**: Inline warnings with context

**Example**:

```
⚠️  [14:23:59] [WARN] URL not found in registry
    Document: 4-metodologia
    Hyperlink: https://manually-added-url.com
    Link Text: "Manual Reference"
    Note: This URL was not in source markdown (possibly added in InDesign)

⚠️  [14:24:05] [WARN] Could not fix hyperlink
    Document: 5-resultados
    Hyperlink: https://broken url with spaces
    Error: Invalid URL format
```

### JSON Report Specification

**File**: `generated/reports/url-hyperlinks/fix-report.json`

**Generation Requirements**:

1. **Timing**: Generated at end of processing, before script exit
2. **Atomicity**: Use temporary file + rename for atomic write
3. **Encoding**: UTF-8 with proper escape sequences
4. **Formatting**: Pretty-printed with 2-space indentation
5. **Size**: No size limit (comprehensive logging)

**Required Sections** (see Data Structures section for complete schema):

1. Session Info: timestamp, version, duration
2. Results: status, publication readiness
3. Statistics: all counters and metrics
4. Efficiency: calculated percentages
5. Registry Validation: comparison with markdown source
6. Captured Logs: all errors, warnings, fixes
7. Document Details: per-document breakdown

**File Handling**:

```javascript
function generateJSONReport() {
    try {
        var reportPath = CONFIG.REPORTS_DIR + "/fix-report.json";
        var tempPath = reportPath + ".tmp";

        // Build report object
        var report = buildReportObject();

        // Serialize to JSON
        var jsonString = JSON.stringify(report, null, 2);

        // Write to temp file
        var success = writeTextFile(tempPath, jsonString);
        if (!success) {
            throw new Error("Could not write temporary report file");
        }

        // Rename temp to final (atomic)
        var tempFile = new File(tempPath);
        var finalFile = new File(reportPath);
        if (finalFile.exists) finalFile.remove();
        tempFile.rename(finalFile.name);

        $.writeln("📊 Detailed report: " + reportPath);
        return true;

    } catch (error) {
        $.writeln("⚠️  Warning: Could not generate JSON report");
        $.writeln("    Error: " + error.message);
        return false;  // Non-fatal
    }
}
```

### Report Directory Structure

**Location**: `generated/reports/url-hyperlinks/`

**Files Created**:

```
generated/reports/url-hyperlinks/
├── fix-report.json           # Latest run report
├── fix-report-20260130.json  # Daily backup (optional)
└── fix-report-archive/       # Historical reports (optional)
    ├── fix-report-20260129.json
    └── fix-report-20260128.json
```

**Directory Creation**:

- Script must create directory if it doesn't exist
- Use recursive directory creation
- Handle permission errors gracefully

---

## Performance Requirements

### Processing Speed Targets

**Per-Document Processing**:

- Discovery phase: < 1 second per document
- Correction phase: < 1 second per document
- Cleanup phase: < 0.5 seconds per document
- **Total**: < 2.5 seconds per document average

**Full Book Processing** (15 documents):

- Minimum: 5 seconds (lightweight book, few URLs)
- Target: 10-15 seconds (typical thesis)
- Maximum: 30 seconds (complex book, many URLs)

**Overhead**:

- Registry loading: < 1 second
- Book initialization: < 2 seconds
- Report generation: < 2 seconds
- **Total overhead**: < 5 seconds

### Memory Requirements

**ExtendScript Memory Constraints**:

- Available heap: ~200-500 MB (varies by InDesign version)
- Target usage: < 50 MB for entire script
- Per-document peak: < 10 MB

**Memory Management**:

- Clear object references after use
- Avoid accumulating large arrays
- Stream processing where possible
- Explicit `null` assignments for cleanup

**Data Structure Sizing**:

- URL registry: ~10 KB per 100 URLs
- Destination map: ~1 KB per destination
- Session logs: ~100 bytes per log entry
- **Estimated peak**: ~5 MB for typical thesis

### Scalability Requirements

**Book Size Scaling**:

| Book Size | Documents | URLs | Expected Time |
| --------- | --------- | ---- | ------------- |
| Small | 5 | 10 | 8-12s |
| Medium | 15 | 50 | 12-20s |
| Large | 30 | 150 | 25-40s |
| Extra Large | 50 | 300 | 45-75s |

**Linear Complexity**:

- O(n) with number of documents
- O(m) with number of hyperlinks
- O(d) with number of destinations
- Overall: O(n * (m + d))

**Optimization Opportunities**:

1. Build destination lookup maps (O(1) access)
2. Batch InDesign API calls where possible
3. Skip documents with no URL hyperlinks
4. Cache document metadata

---

## Quality Assurance

### Testing Requirements

#### Unit Testing Scope

**Python Components** (`compile-data.py`):

1. **URL Extraction**:
   - Test regex pattern with various URL formats
   - Verify exclusion of anchor links
   - Test edge cases (special characters, long URLs)
   - Validate normalization logic

2. **JSON Generation**:
   - Verify schema compliance
   - Test duplicate detection
   - Validate metadata accuracy
   - Test error handling (unreadable files, invalid markdown)

3. **File Operations**:
   - Test directory creation
   - Test file writing with permissions
   - Test atomic writes
   - Test UTF-8 encoding

**Test Framework**: Python `unittest` or `pytest`

**Test Files Location**: `tests/unit/test_compile_data.py`

**Minimum Coverage**: 80% code coverage

---

#### Integration Testing Scope

**JSX Components** (`hyperlink-process.jsx`):

1. **Book Access**:
   - Test with book open vs closed
   - Test with accessible vs inaccessible documents
   - Test with locked stories (InCopy workflow)

2. **Hyperlink Discovery**:
   - Test URL hyperlink identification
   - Test filtering of internal cross-references
   - Test handling of malformed hyperlinks

3. **Correction Strategy**:
   - Test Tier 1 (reuse existing)
   - Test Tier 2 (update orphaned)
   - Test Tier 3 (create new)
   - Test destination name uniqueness

4. **Orphan Cleanup**:
   - Test identification of orphans
   - Test safe removal
   - Test reference counting

5. **Report Generation**:
   - Test JSON structure
   - Test file writing
   - Test error recovery

**Test Environment**:

- InDesign 2023+ with test book document
- Test ICML files with known URL patterns
- Mock registry files with controlled data

**Test Execution**: Manual testing with documented test cases

**Test Documentation**: `tests/integration/url-hyperlink-correction-tests.md`

---

#### End-to-End Testing

**Full Workflow Test**:

1. **Setup**:
   - Create test markdown files with known URLs
   - Run full `compile-all-ru` workflow
   - Verify each step completes successfully

2. **Validation**:
   - Check `url-registry.json` contains expected URLs
   - Open InDesign book, verify hyperlinks work
   - Click each hyperlink, verify destination is correct
   - Check report JSON for accuracy

3. **Edge Cases**:
   - Test with duplicate URLs
   - Test with malformed URLs in markdown
   - Test with manually added URLs in InDesign
   - Test with orphaned destinations from previous runs

4. **Performance**:
   - Measure total workflow time
   - Verify < 10% increase over baseline
   - Monitor memory usage in ExtendScript Toolkit

**Success Criteria**:

- All hyperlinks work correctly when clicked
- No orphaned destinations remain
- Report shows 100% correction rate
- Workflow completes within time budget

---

### Validation Criteria

#### Correctness Validation

**Hyperlink Validation**:

- Every URL hyperlink must have a destination
- Every destination URL must match hyperlink name
- No hyperlink should point to wrong URL

**Registry Validation**:

- URL count in InDesign should match registry count
- All registry URLs should have corresponding hyperlinks
- Extra InDesign URLs should be flagged in report

**Cleanup Validation**:

- No orphaned destinations should remain
- All destinations should have reference count > 0
- Removed orphans should be logged in report

#### Quality Metrics

**Correction Rate**:

```
Correction Rate = (Hyperlinks Fixed / Hyperlinks Found) * 100%
Target: ≥ 95%
```

**Reuse Efficiency**:

```
Reuse Efficiency = (Destinations Reused / Total Corrections) * 100%
Target: ≥ 50%
```

**Accuracy Rate** (when registry available):

```
Accuracy Rate = (Correct URLs / Total URLs) * 100%
Target: 100%
```

**Processing Efficiency**:

```
Processing Efficiency = Documents Processed / Total Documents
Target: 100% (or clear reasons for skips)
```

---

## Success Criteria

### Functional Success Criteria

1. **Automated Correction**:
   - ✅ All malformed URL destinations are automatically corrected
   - ✅ No manual InDesign editing required for URL hyperlinks
   - ✅ Script runs without user intervention

2. **Accuracy**:
   - ✅ Hyperlink destinations match intended URLs from markdown
   - ✅ URL validation against registry confirms correctness
   - ✅ No broken links in final PDF output

3. **Cleanup**:
   - ✅ Orphaned destinations are removed
   - ✅ No accumulation of placeholder destinations
   - ✅ Clean InDesign Hyperlinks panel

4. **Workflow Integration**:
   - ✅ Seamlessly integrated into `compile-all-ru`
   - ✅ No interference with cross-reference processing
   - ✅ Works with existing AppleScript runner

### Non-Functional Success Criteria

1. **Performance**:
   - ✅ Adds < 20 seconds to full compilation workflow
   - ✅ Processes 15 documents in < 15 seconds
   - ✅ Memory usage < 50 MB

2. **Reliability**:
   - ✅ Warn-and-continue error handling prevents workflow blockage
   - ✅ Partial success is acceptable (e.g., 14/15 docs)
   - ✅ Recovers gracefully from missing registry

3. **Usability**:
   - ✅ Clear console output shows progress
   - ✅ Comprehensive JSON report for debugging
   - ✅ Helpful error messages with actionable guidance

4. **Maintainability**:
   - ✅ Code follows existing patterns (crossref-process.jsx)
   - ✅ Well-documented functions and data structures
   - ✅ Modular design for easy updates

### User Experience Success Criteria

**Before Implementation**:

```
User Experience:
1. Run make compile-all-ru
2. Wait for completion
3. Open InDesign Hyperlinks panel
4. Manually fix 52 URL destinations (20 min)
5. Manually delete 19 orphaned destinations (5 min)
6. Total manual effort: 25 minutes
```

**After Implementation**:

```
User Experience:
1. Run make compile-all-ru
2. Wait for completion (+10 seconds)
3. URLs automatically corrected ✅
4. Orphans automatically cleaned ✅
5. Total manual effort: 0 minutes
```

**Time Savings**: ~25 minutes per compilation cycle

**Compilation Frequency**: ~2-3 times per week during active writing

**Monthly Time Savings**: ~200 minutes (3.3 hours)

---

## Appendices

### Appendix A: URL Pattern Examples

**Valid URL Patterns** (should be extracted):

```markdown
[Link Text](https://example.com)
[Link Text](http://example.com)
[Link Text](https://subdomain.example.com/path)
[Link Text](https://example.com:8080/path)
[Link Text](https://example.com?query=value)
[Link Text](https://example.com#fragment)
[Link Text](mailto:email@example.com)
[Link Text](https://example.com/path/to/resource.pdf)
```

**Invalid Patterns** (should be excluded):

```markdown
[Link Text](#internal-anchor)        # Internal reference
[Link Text](../relative/path)        # Relative path
[Link Text](file:///local/path)      # Local file
[Link Text](/absolute/path)          # Absolute path (no protocol)
[Link Text](javascript:void(0))      # JavaScript pseudo-protocol
[Link Text]()                        # Empty URL
```

### Appendix B: InDesign Object Model Reference

**Key Objects and Properties**:

```javascript
// Document
var doc = app.activeDocument;

// Hyperlink URL Destinations Collection
var destinations = doc.hyperlinkURLDestinations;

// Individual URL Destination
var destination = destinations[0];
destination.name          // String: destination name
destination.destinationURL // String: actual URL
destination.id            // Number: unique ID
destination.isValid       // Boolean: object validity
destination.hidden        // Boolean: visibility

// Hyperlinks Collection
var hyperlinks = doc.hyperlinks;

// Individual Hyperlink
var link = hyperlinks[0];
link.name                 // String: hyperlink name (often the URL)
link.source               // HyperlinkTextSource
link.destination          // HyperlinkURLDestination
link.visible              // Boolean: visibility
link.hidden               // Boolean: hidden state

// Hyperlink Text Source
var source = link.source;
source.sourceText         // Text: the linked text
source.sourceText.contents // String: actual text content

// Creating new destination
var newDest = doc.hyperlinkURLDestinations.add(
    "https://example.com",  // destinationURL
    {
        name: "example_com",  // optional name
        hidden: false         // optional hidden state
    }
);

// Relinking hyperlink
link.destination = newDest;
```

### Appendix C: File Structure Summary

**New/Modified Files**:

```
lib/
├── compile-data.py                    # RENAMED from extract-citations-crossrefs.py
│                                      # ENHANCED with URL extraction
└── adobe/
    └── hyperlink-process.jsx          # ENHANCED from investigation to correction

generated/
├── data/
│   └── url-registry.json              # NEW: URL hyperlink registry
└── reports/
    └── url-hyperlinks/                # NEW: report directory
        └── fix-report.json            # NEW: processing report

Makefile                               # MODIFIED: new target, updated references

docs/
└── URL_HYPERLINK_CORRECTION_SYSTEM_PRD.md  # THIS DOCUMENT
```

### Appendix D: Glossary

**Terms and Definitions**:

- **Hyperlink**: InDesign object linking text to a destination
- **HyperlinkURLDestination**: InDesign object representing a URL target
- **HyperlinkTextSource**: InDesign object representing the source text of a link
- **Orphaned Destination**: A destination with zero hyperlinks referencing it
- **URL Registry**: JSON file mapping URLs to their source markdown files
- **Correction**: The act of fixing a hyperlink's destination URL
- **Reuse**: Using an existing destination instead of creating a new one
- **Update**: Changing an orphaned destination's URL in-place
- **Anchor Link**: Internal reference like `#section-id` (NOT a URL)
- **Cross-Reference**: InDesign's system for internal paragraph references
- **Book**: InDesign Book document (.indb) containing multiple chapter documents
- **Story**: Text content in InDesign (can be locked in InCopy workflow)

---

## Document Revision History

| Version | Date | Author | Changes |
| ------- | ---- | ------ | ------- |
| 1.0 | 2026-01-30 | Theodore Team | Initial PRD creation |

---

## Approval and Sign-Off

**Document Status**: ✅ Ready for Implementation

**Reviewers**:

- [ ] Technical Lead
- [ ] Product Owner
- [ ] QA Lead

**Approved By**: ___________________ Date: ___________

---

*End of Product Requirements Document*
