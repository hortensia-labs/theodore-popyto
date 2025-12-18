import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { urls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { StateGuards } from '@/lib/state-machine/state-guards';
import { URLProcessingStateMachine } from '@/lib/state-machine/url-processing-state-machine';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

/**
 * POST /api/state-integrity/repair/[urlId]
 *
 * Execute repair on a URL with state consistency issues.
 *
 * Request body (optional):
 * - method: 'auto' | 'manual' (default: 'auto')
 *
 * Returns:
 * - success: Whether repair succeeded
 * - urlId: The URL that was repaired
 * - newStatus: The new processingStatus
 * - repairDetails: Details about what was changed
 * - error: Error message if repair failed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ urlId: string }> }
) {
  try {
    const { urlId: urlIdStr } = await params;
    const urlId = parseInt(urlIdStr, 10);

    if (isNaN(urlId)) {
      return NextResponse.json(
        { error: 'Invalid URL ID', success: false },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const method = body.method || 'auto';

    // Fetch the URL from database
    const urlRecord = await db
      .select()
      .from(urls)
      .where(eq(urls.id, urlId))
      .limit(1);

    if (urlRecord.length === 0) {
      return NextResponse.json(
        { error: 'URL not found', success: false },
        { status: 404 }
      );
    }

    const url = urlRecord[0];

    // Prepare UrlForGuardCheck object
    const guardCheckUrl: UrlForGuardCheck = {
      id: url.id,
      url: url.url,
      processingStatus: url.processingStatus as any,
      zoteroItemKey: url.zoteroItemKey,
      userIntent: url.userIntent as any,
    };

    // Get repair suggestion
    const repairSuggestion = StateGuards.suggestRepairAction(guardCheckUrl);

    if (!repairSuggestion) {
      return NextResponse.json(
        {
          error: 'No repair suggestion available for this URL',
          success: false,
        },
        { status: 400 }
      );
    }

    // Execute repair based on suggestion type
    let newStatus: string;
    let repairDetails: any = {
      type: repairSuggestion.type,
      reason: repairSuggestion.reason,
    };

    try {
      switch (repairSuggestion.type) {
        case 'transition_to_stored_custom': {
          // URL has item but wrong status - move to stored_custom
          const transition = await URLProcessingStateMachine.transition(
            urlId,
            url.processingStatus as any,
            'stored_custom'
          );

          if (!transition.success) {
            throw new Error(`Cannot transition to stored_custom: ${transition.error}`);
          }

          await db
            .update(urls)
            .set({
              processingStatus: 'stored_custom',
              zoteroProcessingStatus: 'stored_custom',
            })
            .where(eq(urls.id, urlId));

          newStatus = 'stored_custom';
          repairDetails.changes = [
            {
              field: 'processingStatus',
              oldValue: url.processingStatus,
              newValue: 'stored_custom',
            },
            {
              field: 'zoteroProcessingStatus',
              oldValue: url.zoteroProcessingStatus,
              newValue: 'stored_custom',
            },
          ];
          break;
        }

        case 'transition_to_not_started': {
          // URL has no item but is marked as stored - reset
          const transition = await URLProcessingStateMachine.transition(
            urlId,
            url.processingStatus as any,
            'not_started'
          );

          if (!transition.success) {
            throw new Error(`Cannot transition to not_started: ${transition.error}`);
          }

          await db
            .update(urls)
            .set({
              processingStatus: 'not_started',
              zoteroProcessingStatus: null,
              zoteroItemKey: null,
            })
            .where(eq(urls.id, urlId));

          newStatus = 'not_started';
          repairDetails.changes = [
            {
              field: 'processingStatus',
              oldValue: url.processingStatus,
              newValue: 'not_started',
            },
            {
              field: 'zoteroProcessingStatus',
              oldValue: url.zoteroProcessingStatus,
              newValue: null,
            },
            {
              field: 'zoteroItemKey',
              oldValue: url.zoteroItemKey,
              newValue: null,
            },
          ];
          break;
        }

        case 'unlink_item': {
          // URL is archived/ignored but has item - unlink the item
          await db
            .update(urls)
            .set({
              zoteroItemKey: null,
              zoteroProcessingStatus: null,
            })
            .where(eq(urls.id, urlId));

          newStatus = url.processingStatus;
          repairDetails.changes = [
            {
              field: 'zoteroItemKey',
              oldValue: url.zoteroItemKey,
              newValue: null,
            },
            {
              field: 'zoteroProcessingStatus',
              oldValue: url.zoteroProcessingStatus,
              newValue: null,
            },
          ];
          break;
        }

        default:
          throw new Error(`Unknown repair type: ${repairSuggestion.type}`);
      }

      console.log(`✅ State repaired for URL #${urlId}: ${newStatus}`);

      return NextResponse.json({
        success: true,
        urlId,
        newStatus,
        repairDetails,
      });
    } catch (repairError) {
      const errorMessage =
        repairError instanceof Error ? repairError.message : 'Unknown error during repair';

      console.error(`❌ Repair failed for URL #${urlId}:`, errorMessage);

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          urlId,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in repair endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
