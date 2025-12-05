import { NextRequest, NextResponse } from 'next/server';
import {
  findDuplicateGroups,
  type DuplicateDetectionResult,
  type NormalizationOptions,
} from '@/lib/actions/deduplicate-urls';

/**
 * API Route: GET /api/deduplicate-urls/detect
 *
 * Detects all duplicate URL groups in the database
 *
 * Query Parameters:
 *   - normalizePath: boolean (default: false) - Remove path from URL comparison
 *   - normalizeQuery: boolean (default: true) - Remove query string
 *   - normalizeFragment: boolean (default: true) - Remove fragment
 *   - normalizeTrailingSlash: boolean (default: true) - Remove trailing slash
 *   - normalizeCase: boolean (default: true) - Convert to lowercase
 *   - minGroupSize: number (default: 2) - Minimum URLs in a group to report
 *   - sections: string (comma-separated) - Filter to specific sections
 *
 * Response:
 *   200 OK: DuplicateDetectionResult with all detected groups
 *   400 Bad Request: Invalid parameters
 *   500 Internal Server Error: Database or processing error
 */
export async function GET(request: NextRequest) {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 API: GET /api/deduplicate-urls/detect                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Build normalization options from query params
    const normalizeOptions: NormalizationOptions = {
      removePath: searchParams.get('normalizePath') === 'true',
      removeQuery: searchParams.get('normalizeQuery') !== 'false', // Default true
      removeFragment: searchParams.get('normalizeFragment') !== 'false', // Default true
      removeTrailingSlash: searchParams.get('normalizeTrailingSlash') !== 'false', // Default true
      lowercase: searchParams.get('normalizeCase') !== 'false', // Default true
    };

    const minGroupSize = parseInt(searchParams.get('minGroupSize') || '2', 10);

    // Parse sections filter if provided
    let sectionsFilter: number[] | undefined;
    const sectionsParam = searchParams.get('sections');
    if (sectionsParam) {
      try {
        sectionsFilter = sectionsParam
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n));
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid sections parameter - expected comma-separated numbers',
          },
          { status: 400 }
        );
      }
    }

    console.log('📋 Query Parameters:');
    console.log('   Normalization Options:', normalizeOptions);
    console.log('   Min Group Size:', minGroupSize);
    console.log('   Sections Filter:', sectionsFilter || 'None');

    // Find duplicates
    const duplicateGroups = await findDuplicateGroups({
      normalizeOptions,
      minGroupSize,
      sections: sectionsFilter,
    });

    // Calculate statistics
    const totalDuplicateUrls = duplicateGroups.reduce((sum, g) => sum + g.urlCount, 0);
    const totalUniqueZoteroItems = new Set(
      duplicateGroups
        .flatMap(g => g.zoteroItems)
        .map(i => i.itemKey)
    ).size;

    const result: DuplicateDetectionResult = {
      duplicateGroups,
      totalGroups: duplicateGroups.length,
      totalDuplicateUrls,
      totalUniqueZoteroItems,
    };

    console.log('\n📊 Detection Results:');
    console.log(`   • Duplicate groups: ${result.totalGroups}`);
    console.log(`   • Total duplicate URLs: ${result.totalDuplicateUrls}`);
    console.log(`   • Unique Zotero items: ${result.totalUniqueZoteroItems}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log('\n💥 API ERROR: GET /api/deduplicate-urls/detect');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('❌ Error:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.log('📜 Stack:', error.stack);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
