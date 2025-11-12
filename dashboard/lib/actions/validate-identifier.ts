'use server';

interface IdentifierValidationResult {
  identifier: string | { DOI?: string; PMID?: string; ISBN?: string; ARXIV?: string; [key: string]: string | undefined };
  hasTranslators: boolean;
}

interface IdentifierDetectionResponse {
  identifier?: string; // Top-level identifier (string)
  results?: IdentifierValidationResult[];
}

/**
 * Extract identifier string from identifier value (can be string or object)
 */
function extractIdentifierString(identifier: string | { DOI?: string; PMID?: string; ISBN?: string; ARXIV?: string; [key: string]: string | undefined }): string | null {
  if (typeof identifier === 'string') {
    return identifier;
  }
  
  if (typeof identifier === 'object' && identifier !== null) {
    // Try common identifier keys
    if (identifier.DOI) return identifier.DOI;
    if (identifier.PMID) return identifier.PMID;
    if (identifier.ISBN) return identifier.ISBN;
    if (identifier.ARXIV) return identifier.ARXIV;
    
    // Try to get the first string value
    const values = Object.values(identifier).filter(v => typeof v === 'string');
    if (values.length > 0) {
      return values[0] as string;
    }
  }
  
  return null;
}

/**
 * Validate an identifier by calling the citation linker API
 */
export async function validateIdentifier(identifier: string): Promise<{
  success: boolean;
  data?: string; // The validated identifier to store
  error?: string;
}> {
  try {
    if (!identifier || identifier.trim() === '') {
      return {
        success: false,
        error: 'Identifier cannot be empty',
      };
    }

    const response = await fetch('http://localhost:23119/citationlinker/detectidentifier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `API request failed: ${response.statusText}`,
      };
    }

    const data: IdentifierDetectionResponse = await response.json();

    // First, try to use the top-level identifier if it exists and is a string
    if (data.identifier && typeof data.identifier === 'string') {
      return {
        success: true,
        data: data.identifier,
      };
    }

    if (!data.results || !Array.isArray(data.results)) {
      return {
        success: false,
        error: 'Invalid response format from API',
      };
    }

    // Find the first result with hasTranslators === true
    const validResult = data.results.find(result => result.hasTranslators === true);

    if (!validResult) {
      return {
        success: false,
        error: 'No valid identifier found. The identifier must have translators available.',
      };
    }

    // Extract identifier string from result
    const extractedIdentifier = extractIdentifierString(validResult.identifier);
    
    if (!extractedIdentifier) {
      return {
        success: false,
        error: 'Could not extract identifier from API response',
      };
    }

    return {
      success: true,
      data: extractedIdentifier,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error validating identifier',
    };
  }
}

