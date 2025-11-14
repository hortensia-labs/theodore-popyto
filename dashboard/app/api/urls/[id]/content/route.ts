/**
 * API Route: Serve Cached URL Content
 * 
 * Serves cached HTML or PDF content for preview in LLM extraction page
 * Implements security measures: sandboxing, CSP headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedContent } from '@/lib/content-cache';
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const urlId = parseInt(id, 10);
    
    if (isNaN(urlId)) {
      return new NextResponse('Invalid URL ID', { status: 400 });
    }
    
    // Check if URL exists
    const urlRecord = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!urlRecord) {
      return new NextResponse('URL not found', { status: 404 });
    }
    
    // Get cached content
    const cached = await getCachedContent(urlId);
    
    if (!cached) {
      return new NextResponse('No cached content available', { status: 404 });
    }
    
    // Determine content type
    const contentType = cached.metadata.contentType;
    
    // Security headers for HTML content
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };
    
    // For HTML, add strict CSP to sandbox content
    if (contentType.includes('html')) {
      headers['Content-Security-Policy'] = [
        "default-src 'none'",
        "img-src 'self' data: https:",
        "style-src 'unsafe-inline'",
        "font-src 'self' data:",
      ].join('; ');
      
      // Add sandbox header
      headers['X-Frame-Options'] = 'SAMEORIGIN';
    }
    
    return new NextResponse(cached.content.toString('utf8'), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving cached content:', error);
    return new NextResponse(
      'Internal server error',
      { status: 500 }
    );
  }
}

