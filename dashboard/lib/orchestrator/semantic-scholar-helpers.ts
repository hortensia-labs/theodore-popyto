/**
 * Semantic Scholar Processing Helpers
 *
 * Utilities for detecting and handling Semantic Scholar URLs
 * in the URL processing orchestrator workflow.
 */

/**
 * Check if a URL is from the Semantic Scholar domain
 */
export function isSemanticScholarUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const result = urlObj.hostname.includes('semanticscholar.org');
    console.log(`[isSemanticScholarUrl] URL: ${url}, hostname: ${urlObj.hostname}, result: ${result}`);
    return result;
  } catch (e) {
    console.log(`[isSemanticScholarUrl] Error parsing URL: ${url}`, e);
    return false;
  }
}

/**
 * Check if URL matches Semantic Scholar paper format
 * Must be: semanticscholar.org/paper/*
 */
export function isSemanticScholarPaperUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const isDomain = urlObj.hostname.includes('semanticscholar.org');
    console.log(`[isSemanticScholarPaperUrl] URL: ${url}, hostname: ${urlObj.hostname}, isDomain: ${isDomain}`);

    if (!isDomain) {
      console.log(`[isSemanticScholarPaperUrl] Not a semanticscholar.org domain, returning false`);
      return false;
    }

    return true;
  } catch (e) {
    console.log(`[isSemanticScholarPaperUrl] Error: ${e}`);
    return false;
  }
}

/**
 * Extract paper ID from Semantic Scholar URL
 * Supports formats:
 * - https://www.semanticscholar.org/paper/ID
 * - https://www.semanticscholar.org/paper/TITLE-ID
 * - https://www.semanticscholar.org/paper/TITLE/ID
 */
export function extractPaperIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.includes('semanticscholar.org')) {
      return null;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Find 'paper' segment
    const paperIndex = pathParts.indexOf('paper');
    if (paperIndex === -1) {
      return null;
    }

    // Paper ID is either:
    // 1. Next segment after 'paper' (format: /paper/ID)
    // 2. Last segment if multi-part path (format: /paper/TITLE-ID or /paper/TITLE/ID)

    if (paperIndex + 1 < pathParts.length) {
      const potentialId = pathParts[paperIndex + 1];

      // Extract ID from formats like "Exploring-creative-Carlson/ID" or just "ID"
      if (potentialId.includes('-')) {
        // Format: TITLE-ID (last hyphen-separated part is usually the ID)
        const parts = potentialId.split('-');
        const lastPart = parts[parts.length - 1];
        if (isValidPaperId(lastPart)) {
          return lastPart;
        }
      } else if (isValidPaperId(potentialId)) {
        // Direct ID
        return potentialId;
      }
    }

    // Try last segment in path
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (isValidPaperId(lastPart)) {
        return lastPart;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate paper ID format (40-character hex string)
 */
function isValidPaperId(id: string): boolean {
  return /^[a-f0-9]{40}$/i.test(id);
}
