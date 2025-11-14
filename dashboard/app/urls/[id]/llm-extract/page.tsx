/**
 * LLM Metadata Extraction Page
 * 
 * Dedicated route for LLM-assisted metadata extraction
 * Shows URL content on left, editable metadata form on right
 */

import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { urls } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getCachedContent, hasCachedContent } from '@/lib/content-cache';
import { getZoteroItemTypes } from '@/lib/actions/zotero-types-action';
import { getLlmExtractionData, checkLlmAvailability } from '@/lib/actions/llm-extraction-action';
import { LlmExtractionClient } from './llm-extraction-client';

export default async function LlmExtractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const urlId = parseInt(id, 10);
  
  if (isNaN(urlId)) {
    notFound();
  }
  
  // Get URL record
  const urlRecord = await db.query.urls.findFirst({
    where: eq(urls.id, urlId),
  });
  
  if (!urlRecord) {
    notFound();
  }
  
  // Check if cached content exists
  const hasCached = await hasCachedContent(urlId);
  
  if (!hasCached) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/urls"
            className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to URLs
          </Link>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              No Cached Content Available
            </h2>
            <p className="text-yellow-800 mb-4">
              This URL needs to be processed first to cache its content before LLM extraction can be performed.
            </p>
            <Link
              href="/urls"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back and Process URL
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Get cached content metadata
  const cached = await getCachedContent(urlId);
  const contentType = cached?.metadata.contentType || 'unknown';
  
  // Get Zotero item types
  const itemTypesResult = await getZoteroItemTypes();
  const itemTypes = itemTypesResult.itemTypes || [];
  
  // Check LLM availability
  const llmAvailability = await checkLlmAvailability();
  
  // Get existing extracted metadata (if any)
  const existingMetadata = await getLlmExtractionData(urlId);
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/urls"
              className="inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to URLs
            </Link>
            <div className="border-l h-6" />
            <h1 className="text-xl font-semibold">LLM Metadata Extraction</h1>
          </div>
        </div>
        
        <div className="mt-2">
          <a
            href={urlRecord.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {urlRecord.url}
          </a>
        </div>
      </div>
      
      {/* Main Content - Client Component */}
      <LlmExtractionClient
        urlId={urlId}
        url={urlRecord.url}
        contentType={contentType}
        itemTypes={itemTypes}
        llmAvailability={llmAvailability}
        existingMetadata={existingMetadata}
      />
    </div>
  );
}

