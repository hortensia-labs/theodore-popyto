/**
 * Batch URL Processing API Endpoint
 * 
 * NOTE: This API route is deprecated in favor of server actions.
 * Use lib/actions/batch-actions.ts instead.
 * 
 * This file is kept for backward compatibility but should not be used.
 */

import { NextRequest } from 'next/server';
// Old import - no longer exists
// import { processBatch, type BatchProcessOptions } from '@/lib/batch-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // This API route is deprecated
  return new Response(
    JSON.stringify({
      error: 'This API route is deprecated. Use server actions from lib/actions/batch-actions.ts instead.',
      deprecated: true,
      replacement: 'import { startBatchProcessing } from "@/lib/actions/batch-actions"',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

