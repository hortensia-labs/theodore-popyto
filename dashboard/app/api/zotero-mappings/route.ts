/**
 * API Route: Get Zotero Item Mappings
 * 
 * Returns a JSON mapping of non-ignored URLs to their linked Zotero item keys
 * Format: { "[url]": { "key": "[zotero-item-key]" }, ... }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { and, isNotNull, notInArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Query for all URLs that:
    // 1. Are not ignored or archived (userIntent not in ['ignore', 'archive'])
    // 2. Have a linked Zotero item key
    const urlRecords = await db
      .select({
        url: urls.url,
        zoteroItemKey: urls.zoteroItemKey,
      })
      .from(urls)
      .where(
        and(
          isNotNull(urls.zoteroItemKey),
          notInArray(urls.userIntent, ['ignore', 'archive'])
        )
      );

    // Transform the results into the requested format
    const mappings: Record<string, { key: string }> = {};
    
    for (const record of urlRecords) {
      if (record.zoteroItemKey) {
        mappings[record.url] = {
          key: record.zoteroItemKey,
        };
      }
    }

    return NextResponse.json(mappings, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching Zotero mappings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
