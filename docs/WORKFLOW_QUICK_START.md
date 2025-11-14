# Automated URL Processing Workflow - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites

1. ✅ Zotero desktop app installed and running
2. ✅ Citation Linker plugin installed in Zotero
3. ✅ Node.js 18+ installed
4. ✅ pnpm package manager

### Setup Steps

#### 1. Install Dependencies

```bash
cd dashboard
pnpm install
```

#### 2. Configure Environment (Optional)

The system works with defaults, but you can customize:

```bash
# Optional: Create .env file
ZOTERO_API_URL=http://localhost:23119
ZOTERO_USER_ID=your_zotero_user_id
```

#### 3. Database is Ready

The migrations have already been applied! ✅

#### 4. Start the Dashboard

```bash
pnpm dev
```

Navigate to: `http://localhost:3000/urls`

---

## 📖 Quick Usage Guide

### Process a Single URL

1. **Open URL detail panel** (click any URL in the table)

2. **Click "Process URL Content (Phase 1)"**

3. **Wait 2-10 seconds** for processing

4. **Review results:**

   **If identifiers found:**
   - Preview cards will appear
   - Compare quality scores (0-100)
   - Check field completeness bars
   - Click "Select This" on your preferred identifier
   - ✅ Item created in Zotero!

   **If no identifiers found:**
   - Metadata review card will appear
   - Check validation status
   - Review extracted fields
   - Click "Create Zotero Item" to approve
   - ✅ Item created in Zotero!

---

## 🎯 What Happens Automatically

### The workflow automatically:

1. ✅ **Fetches** the URL content (respects rate limits)
2. ✅ **Caches** the content (for 30 days)
3. ✅ **Extracts** identifiers (DOI, PMID, ArXiv, ISBN)
4. ✅ **Extracts** metadata (title, authors, date, etc.)
5. ✅ **Previews** all identifiers via Zotero
6. ✅ **Scores** quality of metadata (0-100)
7. ✅ **Ranks** options by quality
8. ✅ **Presents** best options to you

### You only need to:

- 👆 **Click** to select best identifier OR approve metadata
- ✅ **Done!** Item is in Zotero

---

## 📊 Understanding the Results

### Identifier Previews

Each preview card shows:

- **Badge**: Identifier type (DOI, PMID, etc.) and value
- **Quality Score**: 0-100 with star rating
  - 90-100: ⭐⭐⭐⭐⭐ Excellent
  - 70-89: ⭐⭐⭐⭐ Very Good
  - 50-69: ⭐⭐⭐ Good
  - 30-49: ⭐⭐ Acceptable
  - < 30: ⭐ Poor
- **Confidence**: High/Medium/Low (extraction confidence)
- **Field Completeness**: Progress bars for essential/important/extra fields
- **Metadata Preview**: Title, authors, publication, date
- **Full Details**: Collapsible section with all 50+ fields

### Extracted Metadata

The review card shows:

- **Validation Status**: Valid ✓ / Incomplete ⚠ / Invalid ✗
- **Quality Score**: 0-100
- **All Fields**: Title, authors, date, type, abstract, etc.
- **Sources**: Where each field was extracted from
- **Missing Fields**: What's not found (if any)
- **Warnings**: Data quality issues

---

## ⚡ Pro Tips

### 1. Always Use Identifiers When Available

DOI > PMID > ArXiv > ISBN > Metadata

Identifier-based items have the most complete metadata.

### 2. Check Quality Scores

- **80+**: Excellent, use confidently
- **60-79**: Good, review quickly
- **40-59**: Acceptable, review carefully
- **< 40**: Check for errors

### 3. Attach Snapshots

When approving metadata, keep "Attach HTML snapshot" checked to preserve the original page.

### 4. Review Missing Fields

Incomplete metadata is OK! Zotero can function with just title, author, and date.

### 5. Use Batch Processing

For multiple URLs:
- Select URLs in table
- Click "Batch Process Selected"
- Monitor progress modal
- Review results afterward

---

## 🔧 Troubleshooting

### "Cannot connect to Zotero"

**Solution:** Start Zotero desktop app

```bash
# Check if Zotero is running
curl http://localhost:23119/connector/ping
```

### "No identifiers found"

**This is normal!** Many sources (blogs, reports) don't have DOIs.

**Next step:** Review the extracted metadata instead.

### "Request timed out"

**Solution:** The workflow will auto-retry. If it keeps failing, the server might be slow.

### "Preview failed"

**Reason:** Identifier might be invalid or not in Zotero's databases.

**Solution:** Try other identifiers or use the metadata path.

### "Metadata quality too low"

**Reason:** Not enough fields could be extracted.

**Solution:** Use the LLM extraction workflow (future feature).

---

## 📈 Monitoring Progress

### Check Processing Stats

In the URL table, you'll see counts for:

- ✅ **Stored**: Successfully in Zotero
- ⏳ **Identifiers Found**: Waiting for your selection
- ⏳ **No Identifiers**: Waiting for metadata review
- ❌ **Failed**: Needs attention
- ⏸️ **Pending**: Not yet processed

### View Individual URL Status

Open any URL to see:

- Processing state
- Identifier count
- Cache status
- Error messages (if any)
- Extraction sources

---

## 🎓 Example Scenarios

### Scenario 1: Academic Paper with DOI

```
URL: https://example-journal.com/articles/research-paper
  ↓
[Processing: 3 seconds]
  ↓
Result: 1 identifier found (DOI)
  ↓
Preview shows: Complete metadata, quality score 95
  ↓
Action: Click "Select This"
  ↓
✅ Item in Zotero with full citation
```

### Scenario 2: PDF Preprint

```
URL: https://example.com/paper.pdf
  ↓
[Processing: 8 seconds]
  ↓
Result: 2 identifiers found (DOI + ArXiv)
  ↓
Compare previews:
  - DOI: Score 92, published version
  - ArXiv: Score 88, preprint version
  ↓
Action: Select DOI (higher quality)
  ↓
✅ Item in Zotero with published metadata
```

### Scenario 3: Blog Post (No Identifiers)

```
URL: https://example-blog.com/post/interesting-article
  ↓
[Processing: 2 seconds]
  ↓
Result: No identifiers, metadata extracted
  ↓
Review shows:
  - Title: "Interesting Article About Research"
  - Author: John Blogger
  - Date: 2024-01-15
  - Type: Blog Post
  - Quality: 65/100
  ↓
Action: Click "Create Zotero Item"
  ↓
✅ Item in Zotero as blog post
```

### Scenario 4: Batch of 50 URLs

```
Select 50 URLs in table
  ↓
Click "Batch Process Selected"
  ↓
[Progress Modal Opens]
  ↓
Phase 1: Fetching (2 minutes)
Phase 2: Extracting (10 seconds)
Phase 3: Previewing (3 minutes)
  ↓
Results:
  - 30 with identifiers → Review previews
  - 15 with metadata → Review metadata
  - 5 failed → Check errors
  ↓
Process each group as needed
  ↓
✅ 45/50 items in Zotero!
```

---

## 🌟 Advanced Features

### Custom Rate Limits

For sites you access frequently:

```typescript
// In lib/rate-limiter.ts
globalRateLimiter.setDomainLimit('my-university.edu', 5); // 5 req/s
```

### Cache Management

```typescript
// Check cache stats
import { getCacheStats } from '@/lib/content-cache';
const stats = await getCacheStats();

// Clean expired cache
import { cleanExpiredCache } from '@/lib/content-cache';
const result = await cleanExpiredCache();
```

### Retry Failed URLs

```typescript
// Retry all failed URLs
import { retryFailed } from '@/lib/batch-processor';

for await (const progress of retryFailed()) {
  console.log(progress);
}
```

---

## 📞 Support

### Documentation

- **User Guide**: `docs/AUTOMATED_URL_PROCESSING_WORKFLOW.md`
- **API Reference**: `docs/WORKFLOW_API_REFERENCE.md`
- **Implementation Details**: `docs/WORKFLOW_IMPLEMENTATION_SUMMARY.md`

### Common Issues

See the Troubleshooting section in the main documentation.

---

## ✨ What Makes This Workflow Special

1. **Intelligent**: Multi-strategy extraction with quality scoring
2. **Efficient**: Caches everything, retries smartly
3. **User-Friendly**: Clear interfaces, one-click actions
4. **Robust**: Handles errors gracefully, recovers automatically
5. **Fast**: Parallel processing, optimized batching
6. **Complete**: Handles PDFs and HTML, identifiers and metadata
7. **Extensible**: Ready for LLM workflow integration

---

**Ready to process URLs?** Start the dev server and open the dashboard! 🎉

