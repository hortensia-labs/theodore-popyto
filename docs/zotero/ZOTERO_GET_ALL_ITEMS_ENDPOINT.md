# Get All Items Endpoint

## Overview

The Get All Items endpoint retrieves all items from the Zotero library with configurable projections. This endpoint is designed for efficiently fetching multiple items with either essential fields or comprehensive data, making it ideal for applications that need to list, index, or export library contents.

## Endpoint Details

- **Path**: `/citationlinker/all-items`
- **Method**: `GET`
- **Query Parameters**: `projection` (optional), `style` (optional)
- **Supported Projections**: `default`, `full`
- **Supported Citation Styles**: `apa`, `mla`, `chicago-note-bibliography`, `harvard1`, `ieee`, `nature`, `science`, `vancouver`, and more

## Request Format

### URL Pattern

```request
GET http://localhost:23119/citationlinker/all-items?projection=default
GET http://localhost:23119/citationlinker/all-items?projection=full&style=apa
GET http://localhost:23119/citationlinker/all-items?style=apa
GET http://localhost:23119/citationlinker/all-items
```

### Query Parameters

| Parameter  | Type   | Required | Default   | Description                                                     |
|------------|--------|----------|-----------|------------------------------------------------------------------|
| projection | string | No       | "default" | Determines the fields returned: "default" or "full"             |
| style      | string | No       | null      | Citation style to use (e.g., "apa", "mla", "chicago-note-bibliography"). Uses CSL styles installed in Zotero. |

### Projection Modes

#### Default Projection

Returns essential bibliographic fields optimized for citation lists and quick references:

- `key`: Item unique identifier
- `title`: Item title
- `authors`: Array of author names
- `date`: Publication or creation date
- `itemType`: Type of item (e.g., journalArticle, book, webpage)
- `publication`: Publication title (journal, magazine, etc.) if applicable
- `url`: Item URL if available
- `citation`: Formatted citation string
- `citationFormat`: Format of the citation (e.g., "csl", "inline-fallback")

#### Full Projection

Returns complete item data identical to the Get Item endpoint, including:

- All fields from default projection
- All metadata fields (version, libraryID, dateAdded, dateModified)
- Complete fields object with all item-specific fields
- Full creators array with creator types
- Tags, collections, relations
- Attachments and notes
- API URLs and web URLs

### Citation Styles

The endpoint supports all CSL (Citation Style Language) styles installed in your Zotero library. Common styles include:

| Style Name                  | Description                    | Example Output                           |
|-----------------------------|--------------------------------|------------------------------------------|
| `apa`                       | APA 7th edition                | Smith, J. (2024). Article title. *Journal*, *15*(3), 201-230. |
| `mla`                       | MLA 9th edition                | Smith, John. "Article Title." *Journal* 15.3 (2024): 201-230. |
| `chicago-note-bibliography` | Chicago Manual of Style        | John Smith, "Article Title," *Journal* 15, no. 3 (2024): 201-230. |
| `harvard1`                  | Harvard                        | Smith, J. 2024, 'Article title', *Journal*, vol. 15, no. 3, pp. 201-230. |
| `ieee`                      | IEEE                           | J. Smith, "Article title," *Journal*, vol. 15, no. 3, pp. 201-230, 2024. |
| `nature`                    | Nature                         | Smith, J. Article title. *Journal* **15**, 201–230 (2024). |
| `science`                   | Science                        | J. Smith, *Journal* **15**, 201 (2024). |
| `vancouver`                 | Vancouver                      | Smith J. Article title. Journal. 2024;15(3):201-30. |

**Note**: The style parameter should match the style identifier in Zotero's style repository (usually lowercase with hyphens). If an invalid or unavailable style is specified, the endpoint falls back to an enhanced author-year format.

## Response Format

### Success Response (200 OK) - Default Projection

```json
{
  "status": "success",
  "data": [
    {
      "key": "ABC123XYZ",
      "title": "Machine Learning in Healthcare",
      "authors": [
        "John Doe",
        "Jane Smith"
      ],
      "date": "2024-01-15",
      "itemType": "journalArticle",
      "publication": "Journal of Medical AI",
      "url": "https://example.com/article1",
      "citation": "Doe, J., & Smith, J. (2024). Machine Learning in Healthcare. Journal of Medical AI, 15(3), 201-230.",
      "citationFormat": "csl"
    },
    {
      "key": "DEF456UVW",
      "title": "Neural Networks: A Comprehensive Guide",
      "authors": [
        "Alice Johnson",
        "Bob Williams",
        "Carol Davis"
      ],
      "date": "2023-11-20",
      "itemType": "book",
      "url": "https://example.com/book1",
      "citation": "(Johnson et al., 2023)",
      "citationFormat": "inline-fallback"
    },
    {
      "key": "GHI789RST",
      "title": "Introduction to Deep Learning",
      "authors": [
        "Michael Brown"
      ],
      "date": "2023-05-10",
      "itemType": "webpage",
      "url": "https://example.com/tutorial",
      "citation": "(Brown, 2023)",
      "citationFormat": "inline-fallback"
    }
  ],
  "metadata": {
    "message": "Items retrieved successfully",
    "count": 3,
    "projection": "default",
    "citationStyle": "apa",
    "totalItemsInLibrary": 5,
    "regularItems": 3
  }
}
```

### Success Response (200 OK) - Full Projection

```json
{
  "status": "success",
  "data": [
    {
      "key": "ABC123XYZ",
      "version": 123,
      "itemType": "journalArticle",
      "libraryID": 1,
      "dateAdded": "2024-01-15T10:30:00Z",
      "dateModified": "2024-01-16T14:45:00Z",
      "title": "Machine Learning in Healthcare",
      "date": "2024-01-15",
      "fields": {
        "title": "Machine Learning in Healthcare",
        "abstractNote": "This paper explores the application of machine learning...",
        "publicationTitle": "Journal of Medical AI",
        "volume": "15",
        "issue": "3",
        "pages": "201-230",
        "date": "2024-01-15",
        "DOI": "10.1234/jmai.2024.001",
        "url": "https://example.com/article1",
        "accessDate": "2024-01-20",
        "language": "en"
      },
      "creators": [
        {
          "creatorType": "author",
          "firstName": "John",
          "lastName": "Doe",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Jane",
          "lastName": "Smith",
          "name": ""
        }
      ],
      "tags": [
        {
          "tag": "machine learning",
          "type": 0
        },
        {
          "tag": "healthcare",
          "type": 0
        }
      ],
      "collections": [
        "COLLECTION1"
      ],
      "relations": {},
      "attachments": [
        {
          "key": "ATTACH123",
          "title": "Full Text PDF",
          "contentType": "application/pdf",
          "path": "/path/to/file.pdf",
          "linkMode": "imported_file"
        }
      ],
      "notes": [
        {
          "key": "NOTE123",
          "note": "<p>Important findings about AI in medical diagnostics</p>",
          "dateAdded": "2024-01-15T11:00:00Z",
          "dateModified": "2024-01-15T11:05:00Z"
        }
      ],
      "citation": "(Doe & Smith, 2024)",
      "citationFormat": "inline-fallback",
      "citationStyle": "enhanced-fallback",
      "apiURL": "https://api.zotero.org/users/123456/items/ABC123XYZ",
      "webURL": "https://www.zotero.org/users/123456/items/ABC123XYZ"
    }
  ],
  "metadata": {
    "message": "Items retrieved successfully",
    "count": 1,
    "projection": "full",
    "totalItemsInLibrary": 5,
    "regularItems": 1
  }
}
```

### Success Response - Empty Library

```json
{
  "status": "success",
  "data": [],
  "metadata": {
    "message": "No items found in library",
    "count": 0,
    "projection": "default"
  }
}
```

## Response Fields

### Metadata Object

| Field                | Type   | Description                                                    |
|----------------------|--------|----------------------------------------------------------------|
| message              | string | Human-readable status message                                  |
| count                | number | Number of items returned in the response                       |
| projection           | string | The projection mode used ("default" or "full")                 |
| citationStyle        | string | The citation style used (e.g., "apa", "default")               |
| totalItemsInLibrary  | number | Total number of all items (including attachments and notes)    |
| regularItems         | number | Number of regular bibliographic items (excludes attachments)   |

### Default Projection Fields

| Field          | Type     | Description                                                     |
|----------------|----------|-----------------------------------------------------------------|
| key            | string   | Unique item key                                                 |
| title          | string   | Item title                                                      |
| authors        | string[] | Array of author names (formatted: "FirstName LastName")         |
| date           | string   | Publication or creation date                                    |
| itemType       | string   | Type of item (journalArticle, book, webpage, etc.)              |
| publication    | string   | Publication title (optional, if applicable to item type)        |
| url            | string   | Item URL (optional, if available)                               |
| citation       | string   | Formatted citation string (optional, if generated successfully) |
| citationFormat | string   | Format of the citation (optional)                               |

### Full Projection Fields

See the [Get Item Endpoint documentation](API_GET_ITEM_ENDPOINT.md#response-fields) for complete field descriptions. Full projection returns identical data structure as the Get Item endpoint for each item in the array.

## Error Responses

### 400 Bad Request - Invalid Projection

```json
{
  "status": "error",
  "message": "projection query parameter must be either \"default\" or \"full\""
}
```

**Causes:**

- Projection parameter is not "default" or "full"
- Invalid projection value provided

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Internal server error: [error details]"
}
```

**Causes:**

- Zotero library access failure
- Database corruption
- Unexpected runtime error

## Usage Examples

### Example 1: Get All Items with Default Projection (No Style)

**Request:**

```bash
curl -X GET "http://localhost:23119/citationlinker/all-items"
```

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "key": "ABC123",
      "title": "Example Article",
      "authors": ["John Doe", "Jane Smith"],
      "date": "2024-01-15",
      "itemType": "journalArticle",
      "publication": "Nature",
      "citation": "(Doe & Smith, 2024)",
      "citationFormat": "inline-fallback"
    }
  ],
  "metadata": {
    "count": 1,
    "projection": "default",
    "citationStyle": "default"
  }
}
```

### Example 2: Get All Items with APA Style

**Request:**

```bash
curl -X GET "http://localhost:23119/citationlinker/all-items?style=apa"
```

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "key": "ABC123",
      "title": "Example Article",
      "authors": ["John Doe", "Jane Smith"],
      "date": "2024-01-15",
      "itemType": "journalArticle",
      "publication": "Nature",
      "citation": "Doe, J., & Smith, J. (2024). Example Article. Nature, 15(3), 201-230.",
      "citationFormat": "csl"
    }
  ],
  "metadata": {
    "count": 1,
    "projection": "default",
    "citationStyle": "apa"
  }
}
```

### Example 3: Get All Items with Full Projection and MLA Style

**Request:**

```bash
curl -X GET "http://localhost:23119/citationlinker/all-items?projection=full&style=mla"
```

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "key": "ABC123",
      "version": 100,
      "itemType": "journalArticle",
      "libraryID": 1,
      "title": "Example Article",
      "fields": {
        "title": "Example Article",
        "DOI": "10.1234/example"
      },
      "creators": [...],
      "tags": [...],
      "attachments": [...],
      "citation": "Doe, John, and Jane Smith. \"Example Article.\" Nature 15.3 (2024): 201-230.",
      "citationFormat": "csl",
      "citationStyle": "mla",
      "apiURL": "https://api.zotero.org/users/123456/items/ABC123"
    }
  ],
  "metadata": {
    "count": 1,
    "projection": "full",
    "citationStyle": "mla",
    "totalItemsInLibrary": 3,
    "regularItems": 1
  }
}
```

### Example 4: JavaScript/TypeScript Usage

```typescript
interface DefaultProjectionItem {
  key: string
  title: string
  authors: string[]
  date: string
  itemType: string
  publication?: string
  url?: string
  citation?: string
  citationFormat?: string
}

interface GetAllItemsResponse {
  status: 'success' | 'error'
  data: DefaultProjectionItem[]
  metadata: {
    message: string
    count: number
    projection: string
    citationStyle: string
    totalItemsInLibrary?: number
    regularItems?: number
  }
}

async function getAllItems(
  projection: 'default' | 'full' = 'default',
  style?: string
): Promise<GetAllItemsResponse> {
  const params = new URLSearchParams({ projection })
  if (style) {
    params.append('style', style)
  }
  
  const response = await fetch(
    `http://localhost:23119/citationlinker/all-items?${params}`
  )
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return await response.json()
}

// Usage - Default format
try {
  const result = await getAllItems('default')
  console.log(`Retrieved ${result.metadata.count} items`)
  
  result.data.forEach(item => {
    console.log(`${item.title} by ${item.authors.join(', ')}`)
  })
} catch (error) {
  console.error('Failed to retrieve items:', error)
}

// Usage - With APA style
try {
  const result = await getAllItems('default', 'apa')
  console.log(`Retrieved ${result.metadata.count} items with APA citations`)
  
  result.data.forEach(item => {
    console.log(`Citation: ${item.citation}`)
  })
} catch (error) {
  console.error('Failed to retrieve items:', error)
}
```

### Example 5: Python Usage

```python
import requests
from typing import List, Dict, Optional

def get_all_items(
    projection: str = 'default',
    style: Optional[str] = None
) -> Dict:
    """
    Retrieve all items from Zotero library.
    
    Args:
        projection: Either 'default' or 'full'
        style: Citation style (e.g., 'apa', 'mla', 'chicago-note-bibliography')
    
    Returns:
        Response dictionary with items and metadata
    """
    url = "http://localhost:23119/citationlinker/all-items"
    params = {'projection': projection}
    
    if style:
        params['style'] = style
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    
    return response.json()

# Usage - Default format
try:
    result = get_all_items('default')
    print(f"Retrieved {result['metadata']['count']} items")
    
    for item in result['data']:
        authors_str = ', '.join(item['authors'])
        print(f"{item['title']} by {authors_str}")
        print(f"  Type: {item['itemType']}, Date: {item['date']}")
        if 'citation' in item:
            print(f"  Citation: {item['citation']}")
        print()
        
except requests.exceptions.RequestException as e:
    print(f"Error retrieving items: {e}")

# Usage - With APA 7 style
try:
    result = get_all_items('default', 'apa')
    print(f"\nRetrieved {result['metadata']['count']} items with APA citations")
    print(f"Citation style: {result['metadata']['citationStyle']}")
    
    for item in result['data']:
        print(f"\n{item['citation']}")
        
except requests.exceptions.RequestException as e:
    print(f"Error retrieving items: {e}")
```

## Use Cases

### 1. Library Export and Backup

Export all library items with full metadata for backup or migration:

```bash
curl -X GET "http://localhost:23119/citationlinker/all-items?projection=full" > library_backup.json
```

### 2. Citation List Generation

Generate a formatted bibliography for all items:

```javascript
async function generateBibliography() {
  const response = await fetch('http://localhost:23119/citationlinker/all-items?projection=default')
  const { data } = await response.json()
  
  const bibliography = data
    .map(item => `${item.citation} - ${item.title}`)
    .join('\n')
  
  return bibliography
}
```

### 3. Library Statistics and Analysis

Analyze library composition by item types:

```python
def analyze_library():
    result = get_all_items('default')
    items = result['data']
    
    # Count by item type
    type_counts = {}
    for item in items:
        item_type = item['itemType']
        type_counts[item_type] = type_counts.get(item_type, 0) + 1
    
    print("Library Composition:")
    for item_type, count in sorted(type_counts.items()):
        print(f"  {item_type}: {count}")
    
    # Authors with most publications
    author_counts = {}
    for item in items:
        for author in item['authors']:
            author_counts[author] = author_counts.get(author, 0) + 1
    
    print("\nTop Authors:")
    top_authors = sorted(author_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    for author, count in top_authors:
        print(f"  {author}: {count} publications")
```

### 4. Search and Filter

Build custom search functionality:

```typescript
async function searchLibrary(query: string): Promise<DefaultProjectionItem[]> {
  const response = await getAllItems('default')
  const items = response.data
  
  const queryLower = query.toLowerCase()
  
  return items.filter(item => {
    return (
      item.title.toLowerCase().includes(queryLower) ||
      item.authors.some(author => author.toLowerCase().includes(queryLower)) ||
      item.publication?.toLowerCase().includes(queryLower)
    )
  })
}

// Usage
const results = await searchLibrary('machine learning')
console.log(`Found ${results.length} matching items`)
```

### 5. Generate APA Bibliography

Export all items with properly formatted APA 7 citations:

```javascript
async function generateAPABibliography() {
  const response = await fetch('http://localhost:23119/citationlinker/all-items?style=apa')
  const { data: items } = await response.json()
  
  // Sort by author last name and year
  const sorted = items.sort((a, b) => {
    const aAuthor = a.authors[0] || 'ZZZ'
    const bAuthor = b.authors[0] || 'ZZZ'
    return aAuthor.localeCompare(bAuthor)
  })
  
  // Generate formatted bibliography
  const bibliography = sorted
    .map(item => item.citation)
    .join('\n\n')
  
  return bibliography
}

// Usage
const apaBib = await generateAPABibliography()
console.log('APA 7 Bibliography:')
console.log(apaBib)
```

### 6. Integration with External Systems

Sync library with external database or service:

```javascript
async function syncToExternalDatabase() {
  const response = await fetch('http://localhost:23119/citationlinker/all-items?projection=full&style=apa')
  const { data: items } = await response.json()
  
  for (const item of items) {
    await externalDB.upsert({
      id: item.key,
      title: item.title,
      authors: item.creators.map(c => `${c.firstName} ${c.lastName}`),
      metadata: item,
      lastModified: item.dateModified
    })
  }
  
  console.log(`Synced ${items.length} items to external database`)
}
```

## Performance Considerations

### Large Libraries

For libraries with thousands of items, consider the following:

1. **Default Projection**: Use default projection when you don't need full metadata. It's significantly faster and uses less memory.

2. **Pagination**: For very large libraries (>1000 items), consider implementing client-side pagination:

```javascript
async function getItemsPaginated(pageSize = 100) {
  const response = await getAllItems('default')
  const items = response.data
  
  const pages = []
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize))
  }
  
  return pages
}
```

1. **Caching**: Cache the response if you need to access the data multiple times:

```typescript
let itemsCache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getCachedItems(projection: 'default' | 'full' = 'default') {
  const now = Date.now()
  
  if (itemsCache && (now - itemsCache.timestamp) < CACHE_TTL) {
    return itemsCache.data
  }
  
  const response = await getAllItems(projection)
  itemsCache = {
    data: response.data,
    timestamp: now
  }
  
  return response.data
}
```

### Response Times

Expected response times (approximate):

| Library Size | Default Projection | Full Projection |
|--------------|-------------------|-----------------|
| 100 items    | <100ms            | 200-500ms       |
| 1,000 items  | 200-500ms         | 2-5 seconds     |
| 5,000 items  | 1-2 seconds       | 10-20 seconds   |
| 10,000 items | 2-5 seconds       | 20-40 seconds   |

**Note:** Times vary based on:

- Item complexity (number of creators, attachments, notes)
- System performance
- Citation generation overhead
- Network conditions

## Best Practices

1. **Choose the Right Projection**: Use `default` for lists and citations, `full` only when you need complete metadata.

2. **Handle Empty Libraries**: Always check if the data array is empty before processing.

3. **Error Handling**: Implement robust error handling for network failures and invalid responses.

4. **Filter on Client**: When possible, retrieve all items once and filter client-side rather than making multiple requests.

5. **Regular Items Only**: The endpoint automatically filters out attachments and notes, returning only regular bibliographic items.

6. **Monitor Performance**: For large libraries, monitor response times and implement appropriate loading indicators.

## Technical Notes

### Item Filtering

The endpoint automatically filters items to return only regular bibliographic items using `item.isRegularItem()`. This excludes:

- File attachments (PDFs, images, web snapshots)
- Standalone notes
- Annotation items

### Citation Generation

Citations are generated using the plugin's citation generator service with intelligent fallback mechanisms:

1. **CSL Processing (Primary)**: When a `style` parameter is provided, the endpoint attempts to use Zotero's built-in CSL (Citation Style Language) processor with the specified style
2. **Enhanced Fallback (Secondary)**: If CSL processing fails or no style is specified, generates author-year format citations similar to APA
3. **Basic Fallback (Last Resort)**: If all else fails, uses title-based citations

Citation quality hierarchy:

- **Best**: CSL-generated citations with specific style (format: "csl")
- **Good**: Enhanced fallback with author-year format (format: "inline-fallback")
- **Acceptable**: Basic title-based citations (format: "inline-fallback")

To ensure proper CSL citations, make sure the specified style is installed in your Zotero application.

### Author Extraction

For default projection, only creators with `creatorType: 'author'` are included in the authors array. Full projection includes all creator types (authors, editors, contributors, etc.).

### URL and Publication Fields

- `publication` field maps to `publicationTitle` in Zotero
- `url` field is optional and only present if the item has a URL
- Not all item types have publication or URL fields

## Related Endpoints

- [Get Item Endpoint](API_GET_ITEM_ENDPOINT.md) - Retrieve a single item by key
- [Edit Item Endpoint](API_EDIT_ITEM_ENDPOINT.md) - Modify an existing item
- [Delete Item Endpoint](API_DELETE_ITEM_ENDPOINT.md) - Remove an item from the library

## Troubleshooting

### Issue: Response is Empty Despite Having Items

**Cause:** Library may only contain attachments or notes, not regular items.

**Solution:** Check the metadata fields `totalItemsInLibrary` vs `regularItems` to understand library composition.

### Issue: Citation Fields are Missing or Incorrect Style

**Cause:** Citation generation can fail for items with incomplete metadata, or the specified style may not be installed.

**Solution:**

1. Check that the citation style is installed in Zotero (Preferences > Cite > Styles)
2. Verify the style name matches Zotero's style repository naming (e.g., `apa` not `APA`)
3. Check individual items in full projection to verify they have necessary fields (title, creators, date)
4. Try without the `style` parameter to use the fallback citation method

### Issue: Slow Response Times

**Cause:** Large library or full projection with many attachments/notes.

**Solution:**

1. Use default projection if full data isn't needed
2. Implement caching on the client side
3. Consider fetching items in batches using client-side pagination

### Issue: Invalid Projection Error

**Cause:** Typo or invalid value in projection parameter.

**Solution:** Ensure projection is exactly `"default"` or `"full"` (case-sensitive).

### Issue: CSL Citations Not Being Generated

**Cause:** Style may not be available, or Zotero's Cite API is not accessible.

**Solution:**

1. Verify the style is installed: Open Zotero > Preferences > Cite > Styles
2. Check the Zotero debug log for CSL-related errors
3. Try a common style like `apa` or `mla` first
4. The endpoint will automatically fall back to enhanced citations if CSL fails

## Changelog

### Version 1.5.5+3

- Initial implementation of Get All Items endpoint
- Support for default and full projections
- **Support for CSL citation styles** (e.g., APA 7, MLA, Chicago, IEEE, Nature, etc.)
- Citation style selection via `style` query parameter
- Automatic filtering of regular items only
- Intelligent citation generation with CSL primary and enhanced fallback
- Comprehensive metadata in response including citation style information
