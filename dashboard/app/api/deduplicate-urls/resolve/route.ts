import { NextRequest, NextResponse } from 'next/server';
import {
  executeDeduplicate,
  findDuplicateGroups,
  type ResolutionDecision,
} from '@/lib/actions/deduplicate-urls';

/**
 * Request body for POST /api/deduplicate-urls/resolve
 */
interface ResolveRequest {
  resolutions: ResolutionDecision[];
}

/**
 * API Route: POST /api/deduplicate-urls/resolve
 *
 * Executes the deduplication process based on user's resolution decisions
 *
 * ATOMIC OPERATION: Either all resolutions succeed or entire operation fails.
 *
 * Request Body:
 *   {
 *     resolutions: [
 *       {
 *         groupId: string
 *         primaryUrlId: number
 *         primaryZoteroItemKey: string | null
 *         secondaryUrlIds: number[]
 *         itemsToDelete: string[]
 *         mergeMetadata: boolean
 *       }
 *     ]
 *   }
 *
 * Response:
 *   200 OK: DeduplicationResult with details about what was deleted
 *   400 Bad Request: Invalid request or validation failed
 *   500 Internal Server Error: Processing error (all changes rolled back)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ⚙️  API: POST /api/deduplicate-urls/resolve                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Parse request body
    let body: ResolveRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request has resolutions array
    if (!body.resolutions || !Array.isArray(body.resolutions)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request must include resolutions array',
        },
        { status: 400 }
      );
    }

    if (body.resolutions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one resolution must be provided',
        },
        { status: 400 }
      );
    }

    console.log(`📋 Received ${body.resolutions.length} resolution(s)\n`);

    // Step 1: Re-fetch duplicate groups to have current data for validation
    console.log('🔍 Step 1: Re-fetching duplicate groups for validation...');
    let allGroups;
    try {
      allGroups = await findDuplicateGroups();
    } catch (error) {
      console.log('❌ Failed to fetch duplicate groups');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load duplicate groups for validation',
        },
        { status: 500 }
      );
    }

    console.log(`✅ Loaded ${allGroups.length} duplicate group(s) for validation\n`);

    // Step 2: Validate that all resolution group IDs exist
    console.log('🔐 Step 2: Validating resolution references...');
    const groupIds = new Set(allGroups.map(g => g.groupId));

    for (const resolution of body.resolutions) {
      if (!groupIds.has(resolution.groupId)) {
        return NextResponse.json(
          {
            success: false,
            error: `Group ${resolution.groupId} not found in current duplicate groups`,
          },
          { status: 400 }
        );
      }

      // Validate primary URL ID exists
      const group = allGroups.find(g => g.groupId === resolution.groupId);
      if (!group) {
        return NextResponse.json(
          {
            success: false,
            error: `Group ${resolution.groupId} not found`,
          },
          { status: 400 }
        );
      }

      const primaryUrlExists = group.urls.some(u => u.id === resolution.primaryUrlId);
      if (!primaryUrlExists) {
        return NextResponse.json(
          {
            success: false,
            error: `Primary URL ID ${resolution.primaryUrlId} not found in group ${resolution.groupId}`,
          },
          { status: 400 }
        );
      }

      // Validate all secondary URLs exist
      for (const secondaryId of resolution.secondaryUrlIds) {
        const secondaryExists = group.urls.some(u => u.id === secondaryId);
        if (!secondaryExists) {
          return NextResponse.json(
            {
              success: false,
              error: `Secondary URL ID ${secondaryId} not found in group ${resolution.groupId}`,
            },
            { status: 400 }
          );
        }
      }

      // Validate primary Zotero item if specified
      if (resolution.primaryZoteroItemKey) {
        const itemExists = group.zoteroItems.some(i => i.itemKey === resolution.primaryZoteroItemKey);
        if (!itemExists) {
          return NextResponse.json(
            {
              success: false,
              error: `Primary Zotero item ${resolution.primaryZoteroItemKey} not found in group ${resolution.groupId}`,
            },
            { status: 400 }
          );
        }
      }

      // Validate items to delete exist
      for (const itemKey of resolution.itemsToDelete) {
        const itemExists = group.zoteroItems.some(i => i.itemKey === itemKey);
        if (!itemExists) {
          return NextResponse.json(
            {
              success: false,
              error: `Item to delete ${itemKey} not found in group ${resolution.groupId}`,
            },
            { status: 400 }
          );
        }

        // Can't delete item if it's the primary item
        if (itemKey === resolution.primaryZoteroItemKey) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot delete primary Zotero item ${itemKey}`,
            },
            { status: 400 }
          );
        }
      }
    }

    console.log('✅ All resolutions validated successfully\n');

    // Step 3: Execute the deduplication (atomic transaction)
    console.log('⚙️  Step 3: Executing deduplication transaction...');
    let result;
    try {
      result = await executeDeduplicate(body.resolutions, allGroups);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`\n💥 EXECUTION FAILED: ${errorMsg}\n`);

      return NextResponse.json(
        {
          success: false,
          error: `Deduplication failed: ${errorMsg}`,
        },
        { status: 500 }
      );
    }

    console.log(`\n✅ DEDUPLICATION SUCCESSFUL\n`);

    return NextResponse.json(
      {
        success: result.success,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log('\n💥 API ERROR: POST /api/deduplicate-urls/resolve');
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
