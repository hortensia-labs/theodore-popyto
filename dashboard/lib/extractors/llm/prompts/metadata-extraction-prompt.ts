/**
 * Metadata Extraction Prompt Templates
 *
 * Constructs prompts for LLM metadata extraction
 */

import type { LlmExtractionRequest } from '../providers/types';
import { formatExamplesForPrompt, METADATA_EXTRACTION_EXAMPLES } from './examples';

/**
 * Build metadata extraction prompt
 */
export function buildMetadataExtractionPrompt(request: LlmExtractionRequest): string {
  // Filter content type to only pdf or html for examples (docx not supported in examples)
  const exampleContentType = request.contentType === 'pdf' || request.contentType === 'html'
    ? request.contentType
    : undefined;
  const examples = formatExamplesForPrompt(METADATA_EXTRACTION_EXAMPLES, exampleContentType);

  const contextInfo = [
    `- Content Type: ${request.contentType}`,
    request.url ? `- Source URL: ${request.url}` : null,
    request.metadata?.domain ? `- Domain: ${request.metadata.domain}` : null,
    request.metadata?.title ? `- Possible Title: ${request.metadata.title}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a bibliographic metadata extraction specialist. Your task is to analyze document text and extract basic citation metadata.

CONTEXT:
${contextInfo}

TASK:
Extract the following metadata in JSON format:
{
  "itemType": "string",      // One of: journalArticle, conferencePaper, book, bookSection, blogPost, webpage, videoRecording, podcast, thesis, report, preprint, magazineArticle, newspaperArticle
  "title": "string",         // Document title
  "creators": [              // Authors, editors, or contributors
    {
      "creatorType": "author",
      "firstName": "string",
      "lastName": "string"
    }
  ],
  "date": "string",          // ISO format YYYY-MM-DD or YYYY
  "confidence": {            // Your confidence for each field (0.0-1.0)
    "itemType": 0.9,
    "title": 0.95,
    "creators": 0.8,
    "date": 0.7
  },
  "extractionNotes": "string"  // Any uncertainties or issues
}

RULES:
1. Parse author names into firstName/lastName when possible
   - "John Smith" → firstName: "John", lastName: "Smith"
   - "Smith, John" → firstName: "John", lastName: "Smith"
   - For organizational authors, use single "name" field instead
2. Normalize dates to ISO format (YYYY-MM-DD) or year only (YYYY)
3. Detect item type based on content indicators:
   - "journal", "vol.", "issue" → journalArticle
   - "proceedings", "conference" → conferencePaper
   - "blog", informal tone → blogPost
   - No clear indicators → webpage
4. Only include fields you can determine with reasonable confidence
5. Use null for fields you cannot determine
6. Be conservative - it's better to omit than to guess
7. Provide confidence scores (0.0-1.0) for each extracted field
8. Include extractionNotes to explain uncertainties

EXAMPLES:
${examples}

DOCUMENT TEXT:
${request.text}

Extract the metadata now. Respond with ONLY the JSON object, no additional text:`;
}

/**
 * Build a simplified prompt for very short content
 */
export function buildSimplifiedPrompt(request: LlmExtractionRequest): string {
  return `Extract bibliographic metadata from this ${request.contentType} content.

Content:
${request.text}

Return JSON with: itemType, title, creators (array with firstName/lastName), date (YYYY or YYYY-MM-DD), confidence scores (0-1), and extractionNotes.

Respond with ONLY valid JSON:`;
}
