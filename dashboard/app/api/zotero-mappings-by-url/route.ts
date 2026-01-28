/**
 * API Route: Get Zotero Item Mapping by URL
 * 
 * Returns the key and citation for a specific URL
 * Format: { "key": "[zotero-item-key]", "citation": "[formatted-citation]" }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { and, eq, isNotNull, notInArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const ZOTERO_API_BASE_URL = process.env.ZOTERO_API_URL || 'http://localhost:23119';
const ZOTERO_REQUEST_TIMEOUT = parseInt(process.env.ZOTERO_REQUEST_TIMEOUT || '60000');

interface ZoteroAllItemsResponse {
  [key: string]: {
    key: string;
    citation?: string;
    citationFormat?: string;
    [key: string]: unknown;
  } | boolean | string;
}

/**
 * Fetch all items from Zotero with citations
 */
async function fetchAllZoteroItems(): Promise<Map<string, string>> {
  const url = `${ZOTERO_API_BASE_URL}/citationlinker/all-items`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ZOTERO_REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Zotero API returned ${response.status}: ${response.statusText}`);
    }

    const data: ZoteroAllItemsResponse = await response.json();

    if (data.success !== true) {
      throw new Error(data.message as string || 'Failed to fetch items from Zotero');
    }

    // Create a map of item keys to citations
    const citationMap = new Map<string, string>();
    
    for (const item of Object.entries(data)) {
      const [key, value] = item;
      if (typeof value === 'object' && 'key' in value && 'citation' in value) {
        citationMap.set(value.key, value.citation as string);
      }
    }

    return citationMap;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - Zotero took too long to respond');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while fetching Zotero items');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Query for the specific URL that:
    // 1. Is not ignored or archived (userIntent not in ['ignore', 'archive'])
    // 2. Has a linked Zotero item key
    const urlRecord = await db
      .select({
        url: urls.url,
        zoteroItemKey: urls.zoteroItemKey,
      })
      .from(urls)
      .where(
        and(
          eq(urls.url, url),
          isNotNull(urls.zoteroItemKey),
          notInArray(urls.userIntent, ['ignore', 'archive'])
        )
      )
      .limit(1);

    if (!urlRecord.length || !urlRecord[0].zoteroItemKey) {
      return NextResponse.json(
        { error: 'URL not found or has no linked Zotero item' },
        { status: 404 }
      );
    }

    const record = urlRecord[0];

    // Fetch all Zotero items with citations
    let citationMap: Map<string, string>;
    try {
      citationMap = await fetchAllZoteroItems();
    } catch (error) {
      console.error('Error fetching Zotero items:', error);
      // If Zotero is unavailable, return mapping without citation
      // This allows the endpoint to still function for basic key lookups
      citationMap = new Map();
    }

    // Get the citation for this specific item
    // TypeScript doesn't infer that zoteroItemKey is non-null from the where clause,
    // but we've already verified it exists above
    const zoteroItemKey = record.zoteroItemKey!;
    const citation = citationMap.get(zoteroItemKey);

    const result: { key: string; citation?: string } = {
      key: zoteroItemKey,
      ...(citation && { citation }),
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching Zotero mapping by URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}