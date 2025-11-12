'use server';

interface Creator {
  creatorType?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface PreviewItem {
  itemKey: string;
  itemType: string;
  libraryID: number;
  title: string;
  abstractNote: string;
  date: string;
  url: string;
  accessDate: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  language?: string;
  creators: Creator[];
  tags: Array<{ tag: string; type: number }>;
  generatedCitation: string | null;
  [key: string]: unknown;
}

interface PreviewIdentifierResponse {
  success: boolean;
  mode?: string;
  message?: string;
  timestamp?: string;
  translator?: string;
  itemCount?: number;
  identifier?: {
    type: string | null;
    value: string | null;
  };
  items?: PreviewItem[];
  error?: {
    message: string;
    code?: number;
    timestamp?: string;
    type?: string;
  };
}

export interface PreviewIdentifierData {
  title: string;
  date: string;
  authors: string;
  abstractNote: string | null;
  generatedCitation: string | null;
  itemType: string;
  url: string | null;
  DOI?: string;
  publicationTitle?: string;
}

/**
 * Preview an identifier by calling the citation linker API
 */
export async function previewIdentifier(identifier: string): Promise<{
  success: boolean;
  data?: PreviewIdentifierData;
  error?: string;
}> {
  try {
    if (!identifier || identifier.trim() === '') {
      return {
        success: false,
        error: 'Identifier cannot be empty',
      };
    }

    const response = await fetch('http://localhost:23119/citationlinker/previewidentifier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    const data: PreviewIdentifierResponse = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error?.message || 'Preview failed',
      };
    }

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: 'No items found in preview',
      };
    }

    const item = data.items[0];

    // Format authors from creators array
    // Prioritize creators with creatorType === 'author', but include all if none found
    let authorCreators = item.creators || [];
    
    // Filter to authors if creatorType is available
    const authorsWithType = authorCreators.filter((c) => c.creatorType === 'author');
    if (authorsWithType.length > 0) {
      authorCreators = authorsWithType;
    }
    // Otherwise, use all creators (assuming they're authors if creatorType is missing)
    
    const authors = authorCreators
      .map((c) => {
        if (c.firstName && c.lastName) {
          return `${c.lastName}, ${c.firstName}`;
        }
        if (c.lastName) {
          return c.lastName;
        }
        if (c.firstName) {
          return c.firstName;
        }
        return c.name || 'Unknown';
      })
      .filter((name) => name !== 'Unknown') // Remove unknown entries
      .join('; ') || 'Unknown authors';

    const previewData: PreviewIdentifierData = {
      title: item.title || 'No title available',
      date: item.date || 'Unknown date',
      authors: authors || 'Unknown authors',
      abstractNote: item.abstractNote || null,
      generatedCitation: item.generatedCitation || null,
      itemType: item.itemType || 'unknown',
      url: item.url || null,
      DOI: item.DOI || undefined,
      publicationTitle: item.publicationTitle || undefined,
    };

    return {
      success: true,
      data: previewData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error previewing identifier',
    };
  }
}

