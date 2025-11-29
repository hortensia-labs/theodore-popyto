# Semantic Scholar Citation Extraction - Architecture & Diagrams

**Visual representation of the extraction system architecture and data flows**

---

## System Architecture

### Current State (Without S2 Extraction)

```
┌──────────────────────────────────────────────────────┐
│  Dashboard: User adds Semantic Scholar URL           │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   URL Processing       │
        │   Orchestrator         │
        └────────────┬───────────┘
                     │
           ┌─────────┴──────────┐
           │                    │
           ▼                    ▼
    ┌────────────┐      ┌──────────────┐
    │  Zotero    │      │  LLM         │
    │ Translator │      │ Processing   │
    │ (tries)    │      │ (falls back)  │
    └─────┬──────┘      └──────────────┘
          │
    ┌─────▼──────────────────────────┐
    │ Result:                         │
    │ - Success: Item created        │
    │ - Failure: Manual creation     │
    │ - Incomplete: User fills gaps  │
    └────────────────────────────────┘
```

**Problem:** Zotero translator may fail or return incomplete metadata

---

### Proposed State (With S2 Extraction)

```
┌──────────────────────────────────────────────────────┐
│  Dashboard: User adds Semantic Scholar URL           │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   URL Processing       │
        │   Orchestrator         │
        └────────────┬───────────┘
                     │
     ┌───────────────▼────────────────┐
     │ Semantic Scholar URL?          │
     │ (NEW: Route optimally)         │
     └───────────────┬────────────────┘
                     │
            ┌────────▼─────────┐
            │  TIER 1:         │
            │  Zotero          │
            │  Translator      │
            └────┬────────┬────┘
            Success│      │ Failure
                   │      │
                   │      ▼
                   │   ┌─────────────────────┐
                   │   │ TIER 2:             │
                   │   │ Browser             │
                   │   │ Automation          │
                   │   │ (Puppeteer)         │
                   │   │ (NEW)               │
                   │   └─────┬─────┬─────────┘
                   │   Success│     │Failure
                   │         │     │
                   │         │     ▼
                   │         │  ┌──────────────┐
                   │         │  │ TIER 3:      │
                   │         │  │ API +        │
                   │         │  │ Reconstruct  │
                   │         │  │ (NEW)        │
                   │         │  └──┬──┬────────┘
                   │         │  Success│Failure
                   │         │    │    │
                   └─────────┼────┼────┼──┐
                             │    │    │  │
                       ┌─────▼────▼────▼──▼─────┐
                       │ Parse BibTeX (NEW)    │
                       └─────┬──────────────────┘
                             │
                       ┌─────▼──────────────┐
                       │ Create Zotero Item │
                       └─────┬──────────────┘
                             │
            ┌────────────────┬┴────────────────┐
            │                │                 │
      Success│        Incomplete│           Failure│
            │                │                 │
            ▼                ▼                 ▼
       ┌────────┐      ┌──────────┐    ┌─────────┐
       │Stored  │      │Await     │    │Manual   │
       │(done)  │      │metadata  │    │creation │
       └────────┘      └──────────┘    └─────────┘
```

**Improvement:** Multiple fallbacks + graceful degradation

---

## Data Flow: Browser Automation (Tier 2)

```
┌──────────────────────────┐
│  URL: semanticscholar.org/paper/ABC123
└────────────┬─────────────┘
             │
             ▼
     ┌───────────────┐
     │ Puppeteer     │
     │ - Launch      │
     │   browser     │
     └───────┬───────┘
             │
             ▼
     ┌───────────────────────────────┐
     │ Navigate to URL               │
     │ await page.goto(url, {        │
     │   waitUntil: 'networkidle2'   │
     │ })                            │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Wait for Cite Button          │
     │ [data-test-id="cite-link"]    │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Click Cite Button             │
     │ await citeButton.click()      │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Wait for Modal                │
     │ .formatted-citation--style-   │
     │  bibtex                       │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Extract BibTeX Text           │
     │ element.textContent?.trim()   │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ BibTeX String                 │
     │ @inproceedings{...}           │
     │   title={...}                 │
     │   author={...}                │
     │ }                             │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Close Browser                 │
     │ await browser.close()         │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Parse BibTeX                  │
     │ Extract fields:               │
     │ - title, author               │
     │ - year, url, etc.             │
     └───────────────┬───────────────┘
                     │
                     ▼
     ┌───────────────────────────────┐
     │ Create Zotero Item            │
     │ with parsed metadata          │
     └───────────────────────────────┘
```

---

## Data Flow: API Reconstruction (Tier 3)

```
┌──────────────────────────┐
│  URL: semanticscholar.org/paper/ABC123
└────────────┬─────────────┘
             │
             ▼
     ┌──────────────────┐
     │ Extract Paper ID │
     │ ABC123           │
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────────────┐
     │ Call S2 API              │
     │ GET /graph/v1/paper/ABC  │
     │ Fetch metadata:          │
     │ - title                  │
     │ - authors                │
     │ - year                   │
     │ - venue                  │
     │ - publicationTypes       │
     └────────┬─────────────────┘
              │
              ▼
     ┌──────────────────────────┐
     │ JSON Response            │
     │ {                        │
     │   paperId: "ABC123",     │
     │   title: "...",          │
     │   authors: [...],        │
     │   year: 1999,            │
     │   ...                    │
     │ }                        │
     └────────┬─────────────────┘
              │
              ▼
     ┌──────────────────────────┐
     │ Reconstruct BibTeX       │
     │ @{type}{key,             │
     │   title={...},           │
     │   author={...},          │
     │   year={...},            │
     │   ...                    │
     │ }                        │
     └────────┬─────────────────┘
              │
              ▼
     ┌──────────────────────────┐
     │ Parsed Item              │
     │ Ready for Zotero         │
     └──────────────────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Dashboard UI Layer                      │
│  (User adds Semantic Scholar URL)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            URL Processing Orchestrator                   │
│  (Routes URLs through processing stages)                │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ 1. Detect Semantic Scholar URL              │       │
│  │    isSemanticScholarUrl()                   │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ 2. Route to Processing Stages               │       │
│  │    (Tier 1 → 2 → 3 → 4)                     │       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
└────────────┬────────────────────┬──────────────────────┘
             │                    │
    ┌────────▼─────────┐  ┌──────▼──────────┐
    │ Tier 1: Zotero   │  │ Tier 2:         │
    │ Translator       │  │ Browser         │
    │                  │  │ Automation      │
    │ processUrl()     │  │ SemanticScholar │
    │                  │  │ Scraper         │
    └────┬────────┬────┘  └──────┬──────┬───┘
      Success│    │Fail        Success │ Fail
             │    │               │    │
             ├────┼───────────────┤    │
             │    │               │    │
             │    ▼               │    ▼
             │  ┌──────────────────┐  ┌──────────────┐
             │  │ Tier 3: API +    │  │ Tier 4:      │
             │  │ Reconstruction   │  │ Manual       │
             │  │                  │  │ Creation     │
             │  │ getSemanticScholar │ createItem() │
             │  │ Paper() +         │  │              │
             │  │ reconstructBibTeX │  │              │
             │  └──────┬───────┬────┘  └──────────────┘
             │   Success│      │Fail
             │       │   │      │
             │       ▼   ▼      │
             │    ┌────────┐    │
             └────│ Parse  │────┘
                  │BibTeX  │
                  └───┬────┘
                      │
                      ▼
             ┌────────────────────┐
             │ Create Zotero Item │
             │ createItem()       │
             └────────┬───────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
      Success│   Incomplete│    Failure│
         │            │            │
         ▼            ▼            ▼
      ┌─────┐  ┌──────────┐  ┌──────────┐
      │Store│  │Await     │  │Manual    │
      │ ed  │  │Metadata  │  │Creation  │
      └─────┘  └──────────┘  └──────────┘
```

---

## Class Diagram: Core Components

```
┌─────────────────────────────────────┐
│  URLProcessingOrchestrator          │
├─────────────────────────────────────┤
│ - processUrl(urlId)                 │
│ - attemptZoteroProcessing()         │
│ - attemptContentProcessing()        │
│ - attemptLLMProcessing()            │
│ + detectSemanticScholarUrl()  (NEW) │
└─────────────────────────────────────┘
            │
            ├──► Tier 1
            │    └─► processUrl() from zotero-client
            │
            ├──► Tier 2 (NEW)
            │    └─► SemanticScholarScraper
            │         │
            │         ├─ extractCitation(url)
            │         ├─ click cite button
            │         └─ extract from DOM
            │
            ├──► Tier 3 (NEW)
            │    ├─► SemanticScholarAPI
            │    │    └─ getPaperMetadata(paperId)
            │    │
            │    └─► BibTeXParser
            │         └─ parseBibTeX(text)
            │            └─ parseAuthors()
            │            └─ mapBibTeXType()
            │
            └──► Shared
                 └─► createItem() from zotero-client
```

---

## Sequence Diagram: Successful S2 Extraction

```
User          Dashboard    Orchestrator    Zotero    Scraper    API    BibTeX
 │               │              │            │         │        │      Parser
 │─ Add URL ────→│              │            │         │        │       │
 │               │─ Detect ────→│            │         │        │       │
 │               │  S2 URL      │            │         │        │       │
 │               │              │            │         │        │       │
 │               │              │─ Try ─────→│         │        │       │
 │               │              │  Zotero    │         │        │       │
 │               │              │            │─ fail ─→│        │       │
 │               │              │            │         │        │       │
 │               │              │← Auto ────│         │        │       │
 │               │              │  cascade  │         │        │       │
 │               │              │            │         │        │       │
 │               │              │─ Try ─────────────→│        │       │
 │               │              │  Extract   │         │        │       │
 │               │              │            │         │        │       │
 │               │              │            │         │─ Success────→│
 │               │              │            │         │        │       │
 │               │              │            │         │        │←─ BibTeX
 │               │              │            │         │        │   data
 │               │              │            │         │        │       │
 │               │              │← Citation ─┼────────│        │←─ Parse
 │               │              │  (BibTeX)  │         │        │   result
 │               │              │            │         │        │       │
 │               │              │─ Parse ───────────────────────────→│
 │               │              │  BibTeX    │         │        │       │
 │               │              │            │         │        │     ┌─│─ Item
 │               │              │            │         │        │     │
 │               │              │← Item ────────────────────────│←────│
 │               │              │  metadata  │         │        │     │
 │               │              │            │         │        │     │
 │               │              │─ Create ──→│         │        │     │
 │               │              │  Zotero    │         │        │     │
 │               │              │  Item      │         │        │     │
 │               │              │            │← ✅ ───│        │     │
 │               │              │← Success ──│        │        │     │
 │               │              │            │         │        │     │
 │               │← Citation ───│            │         │        │     │
 │               │  Created     │            │         │        │     │
 │               │              │            │         │        │     │
 │← Display ─────│              │            │         │        │     │
 │  Result       │              │            │         │        │     │
 │               │              │            │         │        │     │

Success Path: User doesn't need to do anything ✅
```

---

## State Machine: Processing States

```
                    ┌──────────────┐
                    │  not_started │
                    └──────┬───────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   processing_zotero    │
              │   (TIER 1: Zotero)     │
              └────┬──────────┬────────┘
                   │ Success  │ Failure
                   │          │
         ┌─────────▼─────┐    │
         │ stored        │    │
         │ (complete)    │    │
         └───────────────┘    │
                              │
                    ┌─────────▼──────────┐
                    │ processing_content │
                    │ (TIER 2: Browser)  │
                    └────┬───────┬───────┘
                         │       │ Failure
                         │ Success
              ┌──────────┴─┐     │
              │            │     │
              ▼            ▼     │
         ┌────────┐  ┌────────────┴──────────┐
         │awaiting│  │ processing_llm        │
         │        │  │ (TIER 3: API)         │
         │metadata│  └────┬──────┬───────────┘
         └────────┘       │      │ Failure
                          │ Success
                          │       │
               ┌──────────┴─┐     │
               │            │     │
               ▼            ▼     │
          ┌────────┐  ┌──────────┘
          │stored_ │  │
          │complete│  │
          └────────┘  │
                      │
                      ▼
                 ┌──────────┐
                 │exhausted │
                 │(fallback │
                 │ to       │
                 │ manual)  │
                 └──────────┘
```

---

## Error Handling Flow

```
┌──────────────────┐
│ Start Extraction │
└────────┬─────────┘
         │
         ▼
    ┌────────────────────────┐
    │ Try Tier N Processing  │
    └────┬───────────────────┘
         │
    ┌────┴────────────────┐
    │                     │
   YES                   NO
    │                     │
    ▼                     ▼
 ┌─────┐          ┌──────────────┐
 │Done │          │ Error!       │
 │✅   │          │ What type?   │
 └─────┘          └──┬───┬──┬────┘
                     │   │  │
         ┌───────────┘   │  └─────────┐
         │               │            │
         │               │            │
         ▼               ▼            ▼
    ┌────────┐     ┌──────────┐  ┌─────────┐
    │Timeout │     │Not Found │  │Bot      │
    │        │     │(404/etc) │  │Detection│
    │Retry   │     │          │  │         │
    │with    │     │Permanent │  │Exponential
    │backoff │     │error     │  │backoff  │
    │        │     │          │  │         │
    │Fail    │     │Fail tier │  │Fail     │
    │tier,   │     │          │  │tier,    │
    │try     │     │Try next  │  │try next │
    │next    │     │tier      │  │tier     │
    │tier    │     └──────────┘  └─────────┘
    └────────┘
         │
         └──────────────┬──────────────┐
                        │              │
                        ▼              ▼
                   ┌────────┐    ┌──────────┐
                   │More    │    │ All      │
                   │tiers?  │    │ tiers    │
                   │        │    │ failed   │
                   │YES     │    │          │
                   │        │    │ FALLBACK │
                   └────┬───┘    │ Manual   │
                        │        │ Creation │
                        ▼        └──────────┘
                   ┌────────┐
                   │Try     │
                   │next    │
                   │tier    │
                   └────────┘
```

---

## Performance Timeline

### Tier 2: Browser Automation (Typical)
```
Start ─────────────────────────────────────────────────────► End
  0ms
  │
  ├─ 500ms   Launch Puppeteer
  │
  ├─ 1000ms  Navigate to URL
  │
  ├─ 1500ms  Wait for page load
  │
  ├─ 2000ms  Click cite button
  │
  ├─ 2500ms  Wait for modal
  │
  ├─ 3000ms  Extract BibTeX
  │
  ├─ 3200ms  Close browser
  │
  └─ 3500ms  Parse BibTeX ◄─ Total: 3-5 seconds
```

### Tier 3: API Reconstruction (Typical)
```
Start ────────────────────────────► End
  0ms
  │
  ├─ 10ms   Extract paper ID
  │
  ├─ 50ms   Call S2 API
  │
  ├─ 80ms   Wait for response
  │
  ├─ 95ms   Reconstruct BibTeX
  │
  └─ 100ms  Parse result ◄─ Total: < 100ms
```

---

## Fallback Decision Tree

```
                        Start
                         │
                         ▼
          ┌──────────────────────────┐
          │ Semantic Scholar URL?    │
          └──┬──────────────────┬────┘
             │ YES              │ NO
             │                  │
             ▼                  ▼
          ┌──────┐      ┌────────────┐
          │Route │      │Normal path │
          │to S2 │      │(existing)  │
          │path  │      └────────────┘
          └──┬───┘
             │
             ▼
    ┌────────────────┐
    │TIER 1: Zotero  │
    │Translator      │
    └───┬────────┬───┘
    Success│      │Failure
        │         │
        ├─────────┼────────────┐
        │         │            │
        ▼         ▼            │
     ┌────┐  ┌─────────────────┤
     │DONE│  │TIER 2: Browser  │
     └────┘  │Automation       │
             └───┬────────┬────┘
         Success│        │Failure
             │          │
             ├──────────┼────────────┐
             │          │            │
             ▼          ▼            │
          ┌────┐   ┌──────────────────┤
          │DONE│   │TIER 3: API +     │
          └────┘   │Reconstruction    │
                   └───┬────────┬─────┘
               Success│         │Failure
                   │           │
                   ├───────────┼────────────┐
                   │           │            │
                   ▼           ▼            │
                ┌────┐    ┌──────────────────┤
                │DONE│    │TIER 4: Manual    │
                └────┘    │Creation          │
                          └──────────────────┘
```

---

## Integration Points in Existing Code

```
dashboard/
├── lib/
│   ├── orchestrator/
│   │   └── url-processing-orchestrator.ts
│   │       ├── New: Detect S2 URLs
│   │       ├── New: Call browser scraper (Tier 2)
│   │       ├── New: Call API service (Tier 3)
│   │       └── Existing: Zotero integration (Tier 1)
│   │
│   ├── actions/
│   │   ├── semantic-scholar-extraction.ts (NEW)
│   │   │   └── Extract citation and parse
│   │   │
│   │   └── zotero.ts (existing)
│   │       └── Zotero client integration
│   │
│   ├── services/
│   │   ├── semantic-scholar-scraper.ts (NEW)
│   │   │   └── Puppeteer automation
│   │   │
│   │   └── semantic-scholar-api.ts (NEW)
│   │       └── API calls + reconstruction
│   │
│   └── utils/
│       ├── bibtex-parser.ts (NEW)
│       │   └── Parse BibTeX to Zotero format
│       │
│       └── url-utils.ts (NEW)
│           └── S2 URL detection & parsing
│
└── tests/
    ├── unit/
    │   └── semantic-scholar.test.ts (NEW)
    │
    └── integration/
        └── semantic-scholar-extraction.test.ts (NEW)
```

---

## Summary: All 4 Approaches Compared Visually

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTRACTION APPROACH COMPARISON                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TIER 1: ZOTERO TRANSLATOR                                              │
│  ─────────────────────────────                                          │
│  [Browser] ──→ [S2 Translator] ──→ [Zotero Item]                        │
│   3-8s        95% Accuracy         Already Integrated                   │
│                                                                           │
│  ✅ Pros:  ─ Already implemented                                         │
│          ─ No new code needed                                            │
│          ─ 95% accuracy                                                 │
│                                                                           │
│  ❌ Cons:  ─ Sometimes incomplete                                        │
│          ─ Failure requires fallback                                    │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TIER 2: BROWSER AUTOMATION (PUPPETEER)                                 │
│  ──────────────────────────────────────                                 │
│  [Puppeteer] ──→ [Click Cite] ──→ [Extract BibTeX] ──→ [Parse]        │
│   2-5s        [Wait Modal]    100% Accuracy        [Zotero]             │
│                                                                           │
│  ✅ Pros:  ─ 100% accuracy (user sees it)                               │
│          ─ Fast enough for UI                                           │
│          ─ Reliable extraction                                          │
│                                                                           │
│  ❌ Cons:  ─ Resource intensive                                         │
│          ─ Need Puppeteer dependency                                    │
│          ─ Browser startup overhead                                     │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TIER 3: API + RECONSTRUCTION                                            │
│  ────────────────────────────                                           │
│  [S2 API] ──→ [Parse JSON] ──→ [Reconstruct BibTeX] ──→ [Parse]       │
│  <100ms      [Map Fields]   90% Accuracy           [Zotero]             │
│                                                                           │
│  ✅ Pros:  ─ Very fast                                                  │
│          ─ No browser needed                                            │
│          ─ Lightweight API call                                         │
│                                                                           │
│  ❌ Cons:  ─ May miss some metadata                                     │
│          ─ 90% accuracy only                                            │
│          ─ Need JSON→BibTeX mapping logic                               │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  TIER 4: MANUAL CREATION                                                │
│  ─────────────────────                                                 │
│  [User] ──→ [Fill Form] ──→ [Save] ──→ [Zotero Item]                  │
│  Variable   100% Accuracy   [UI]       User Choice                      │
│                                                                           │
│  ✅ Pros:  ─ Always works                                               │
│          ─ User control                                                 │
│          ─ 100% accuracy                                                │
│                                                                           │
│  ❌ Cons:  ─ Requires user effort                                       │
│          ─ Slower than automation                                       │
│          ─ Prone to errors                                              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**Architecture Status:** ✅ Ready for Implementation
**Complexity Level:** Medium
**Expected Development Time:** 4 weeks (4 phases)
**Document Version:** 1.0

