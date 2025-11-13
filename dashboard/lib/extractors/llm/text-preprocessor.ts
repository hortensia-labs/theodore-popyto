/**
 * Text Preprocessor
 *
 * Intelligent text truncation and windowing for LLM input
 */

/**
 * Main preprocessing function
 */
export function preprocessTextForLlm(
  text: string,
  contentType: 'html' | 'pdf' | 'docx',
  maxChars: number = 8000
): string {
  let processed = text;

  // Apply content-type specific processing
  if (contentType === 'html') {
    processed = extractHtmlKeyContent(text);
  } else if (contentType === 'pdf') {
    processed = extractPdfKeyContent(text);
  }

  // Normalize whitespace
  processed = normalizeText(processed);

  // Truncate to max length (at sentence boundary if possible)
  if (processed.length > maxChars) {
    processed = smartTruncate(processed, maxChars);
  }

  return processed;
}

/**
 * Extract key sections from HTML (remove boilerplate)
 */
function extractHtmlKeyContent(html: string): string {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Try to extract main content area
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of contentPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1].length > 500) {
      // Found substantial content
      cleaned = match[1];
      break;
    }
  }

  // Remove navigation, footer, and sidebar elements
  cleaned = cleaned
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

  // Keep meta tags section (raw HTML) - this is valuable for metadata
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const metaTags = headMatch ? extractMetaTags(headMatch[1]) : '';

  // Combine meta tags with cleaned content
  return metaTags + '\n\n' + cleaned;
}

/**
 * Extract meta tags from HTML head
 */
function extractMetaTags(headContent: string): string {
  const metaTagRegex = /<meta[^>]+>/gi;
  const matches = headContent.match(metaTagRegex);
  return matches ? matches.join('\n') : '';
}

/**
 * Extract key sections from PDF text
 */
function extractPdfKeyContent(pdfText: string): string {
  // If text is JSON (from cached PDF pages), parse it
  try {
    const parsed = JSON.parse(pdfText);
    if (parsed.pages && Array.isArray(parsed.pages)) {
      // Extract text from first 3 pages (metadata is usually there)
      const pageTexts = parsed.pages
        .slice(0, 3)
        .map((page: { pageNumber: number; text: string }) => page.text)
        .join('\n\n--- Page Break ---\n\n');
      return pageTexts;
    }
  } catch {
    // Not JSON, treat as raw text
  }

  // For raw text, take first portion (first few pages)
  // Estimate: ~500 chars per page on average
  const estimatedPages = 3;
  const estimatedChars = estimatedPages * 500;

  return pdfText.substring(0, estimatedChars);
}

/**
 * Clean and normalize text
 */
function normalizeText(text: string): string {
  return (
    text
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  );
}

/**
 * Smart truncation at sentence boundary
 */
function smartTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxChars);

  // Look for last sentence ending (. ! ?)
  const sentenceEndRegex = /[.!?]\s+/g;
  let lastSentenceEnd = 0;
  let match;

  while ((match = sentenceEndRegex.exec(truncated)) !== null) {
    lastSentenceEnd = match.index + match[0].length;
  }

  // If we found a sentence boundary and it's not too early
  if (lastSentenceEnd > maxChars * 0.8) {
    return truncated.substring(0, lastSentenceEnd);
  }

  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.9) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Last resort: hard truncate
  return truncated + '...';
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 chars)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if text is likely to fit within token limits
 */
export function willFitInTokenLimit(text: string, maxTokens: number): boolean {
  const estimated = estimateTokenCount(text);
  return estimated <= maxTokens;
}
