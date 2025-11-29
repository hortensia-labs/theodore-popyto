/**
 * Manual Create Page
 * 
 * Full-page interface for manually creating Zotero items.
 * Provides side-by-side view of content and metadata form.
 * 
 * Features:
 * - Content viewer (left) - Multiple viewing modes
 * - Metadata form (right) - Create Zotero item
 * - Pre-populated from extracted metadata if available
 * - Integrates with state machine (transitions to stored_custom)
 * - Complete workflow control
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ContentViewer } from '@/components/urls/url-modals/ContentViewer';
import { MetadataForm } from '@/components/urls/url-modals/MetadataForm';
import { createCustomZoteroItem, getMetadataForManualCreation } from '@/lib/actions/manual-creation';
import { getUrlWithCapabilitiesById } from '@/lib/actions/url-with-capabilities';
import type { ZoteroItem } from '@/lib/zotero-client';
import type { ContentViews } from '@/lib/actions/manual-creation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader } from 'lucide-react';
import Link from 'next/link';

export default function ManualCreatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const urlId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [urlData, setUrlData] = useState<any>(null);
  const [metadata, setMetadata] = useState<Partial<ZoteroItem>>({
    itemType: 'webpage',
    creators: [],
    accessDate: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validate URL ID
  if (isNaN(urlId)) {
    notFound();
  }

  /**
   * Load URL and pre-fill metadata
   */
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get URL data with capabilities
      const urlResult = await getUrlWithCapabilitiesById(urlId);
      
      if (!urlResult.success || !urlResult.data) {
        setError(urlResult.error || 'URL not found');
        return;
      }

      const url = urlResult.data;
      setUrlData(url);

      // Get metadata for pre-population
      const metadataResult = await getMetadataForManualCreation(urlId);
      
      if (metadataResult.success && metadataResult.data) {
        setMetadata(prev => ({
          ...prev,
          ...metadataResult.data,
          url: url.url, // Ensure URL is set
        }));
      } else {
        // No extracted metadata, just set URL
        setMetadata(prev => ({
          ...prev,
          url: url.url,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle content loaded
   */
  const handleContentLoaded = (content: ContentViews) => {
    console.log('Content loaded:', content.isPDF ? 'PDF' : 'HTML');
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (formMetadata: Partial<ZoteroItem>) => {
    setIsCreating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await createCustomZoteroItem(urlId, formMetadata);

      if (result.success) {
        setSuccessMessage(`Custom Zotero item created successfully! (${result.itemKey})`);
        
        // Redirect back to URLs page after short delay
        setTimeout(() => {
          router.push('/urls');
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    if (isCreating) {
      const confirmed = confirm('Creating item in progress. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    router.push('/urls');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700">Loading URL data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !urlData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading URL</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/urls">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to URLs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/urls">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to URLs
                </Button>
              </Link>
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Create Custom Zotero Item</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Review the content and manually create a Zotero item
                </p>
              </div>
            </div>
          </div>

          {/* URL Display */}
          {urlData && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Source URL</p>
              <a
                href={urlData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {urlData.url}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-[1600px] mx-auto px-6 mt-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm mb-4">
            {successMessage}
          </div>
        )}
      </div>

      {/* Main Content - Side by Side */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* Left: Content Viewer */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border rounded-lg h-full flex flex-col shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-gray-900">Content Preview</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Review the source content while creating the item
                </p>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                {urlData && (
                  <ContentViewer
                    url={urlData.url}
                    urlId={urlId}
                    isPDF={urlData.capability?.isPDF || false}
                    onContentLoaded={handleContentLoaded}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: Metadata Form */}
          <div className="w-[500px] shrink-0">
            <div className="bg-white border rounded-lg h-full flex flex-col shadow-sm">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold text-gray-900">Item Metadata</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Fill in the bibliographic information for this item
                </p>
              </div>
              <div className="flex-1 overflow-hidden px-4">
                <MetadataForm
                  initialMetadata={metadata}
                  onChange={setMetadata}
                  onSubmit={handleSubmit}
                  isSubmitting={isCreating}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-[1600px] mx-auto px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
          <p className="font-medium mb-1">ℹ️ Manual Creation Workflow</p>
          <ul className="text-xs text-blue-800 space-y-1 ml-4">
            <li>• Fill in at minimum: Title, Author(s), and Date</li>
            <li>• Select appropriate item type (webpage, article, etc.)</li>
            <li>• Review content on the left for reference</li>
            <li>• Created item will be marked as <code className="bg-blue-100 px-1 rounded">stored_custom</code></li>
            <li>• Item will appear in your Zotero library immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
