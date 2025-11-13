/**
 * Batch URL Processing API Endpoint
 * 
 * Streams progress updates for batch URL processing
 */

import { NextRequest } from 'next/server';
import { processBatch, type BatchProcessOptions } from '@/lib/batch-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urlIds, options } = body as {
      urlIds: number[];
      options?: BatchProcessOptions;
    };
    
    if (!urlIds || !Array.isArray(urlIds) || urlIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'urlIds array is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Create a TransformStream for streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start processing in background
    (async () => {
      try {
        for await (const progress of processBatch(urlIds, options)) {
          const data = JSON.stringify(progress) + '\n';
          await writer.write(encoder.encode(data));
        }
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        }) + '\n';
        await writer.write(encoder.encode(errorData));
      } finally {
        await writer.close();
      }
    })();
    
    // Return streaming response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Batch processing API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

