/**
 * Manual Create Modal
 * 
 * Main modal for manually creating Zotero items.
 * Provides side-by-side view of content and metadata form.
 * 
 * Features:
 * - Content viewer (left) - Shows URL content in multiple modes
 * - Metadata form (right) - Create Zotero item
 * - Pre-populated from extracted metadata if available
 * - Works for both HTML and PDF content
 * 
 * Based on PRD Section 8.2: Manual Creation Modal
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentViewer } from './ContentViewer';
import { MetadataForm } from './MetadataForm';
import { createCustomZoteroItem, getMetadataForManualCreation } from '@/lib/actions/manual-creation';
import type { ZoteroItem } from '@/lib/zotero-client';
import type { ContentViews } from '@/lib/actions/manual-creation';

interface ManualCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  url: string;
  isPDF: boolean;
  onSuccess: () => void;
}

/**
 * Manual Create Modal Component
 * 
 * Allows users to manually create Zotero items when automation fails
 * or when they want complete control over the item
 */
export function ManualCreateModal({
  open,
  onOpenChange,
  urlId,
  url,
  isPDF,
  onSuccess,
}: ManualCreateModalProps) {
  const [metadata, setMetadata] = useState<Partial<ZoteroItem>>({
    url,
    itemType: 'webpage',
    accessDate: new Date().toISOString(),
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load any existing metadata to pre-populate form
   */
  useEffect(() => {
    if (open) {
      loadExtractedMetadata();
    }
  }, [open, urlId]);

  /**
   * Load extracted metadata if available
   */
  const loadExtractedMetadata = async () => {
    const result = await getMetadataForManualCreation(urlId);
    
    if (result.success && result.data) {
      setMetadata(prev => ({
        ...prev,
        ...result.data,
        url, // Always use the URL from props
      }));
    }
  };

  /**
   * Handle content loaded
   */
  const handleContentLoaded = (content: ContentViews) => {
    // Could extract additional metadata from content if needed
    console.log('Content loaded:', content.isPDF ? 'PDF' : 'HTML');
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (formMetadata: Partial<ZoteroItem>) => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createCustomZoteroItem(urlId, formMetadata);

      if (result.success) {
        console.log(`Custom Zotero item created: ${result.itemKey}`);
        onSuccess();
        onOpenChange(false);
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
   * Handle modal close
   */
  const handleClose = () => {
    if (isCreating) {
      const confirmed = confirm('Creating item in progress. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create Custom Zotero Item</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Review the content and create a Zotero item manually
          </p>
        </DialogHeader>

        {/* Main Content - Side by Side */}
        <div className="flex gap-6 p-6 h-[calc(90vh-80px)] overflow-hidden">
          {/* Left: Content Viewer */}
          <div className="flex-1 min-w-0">
            <ContentViewer
              url={url}
              urlId={urlId}
              isPDF={isPDF}
              onContentLoaded={handleContentLoaded}
            />
          </div>

          {/* Right: Metadata Form */}
          <div className="w-[450px] flex flex-col">
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="flex-1 overflow-hidden">
              <MetadataForm
                initialMetadata={metadata}
                onChange={setMetadata}
                onSubmit={handleSubmit}
                isSubmitting={isCreating}
              />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-600">
          <p>
            <strong>Note:</strong> This creates a new Zotero item directly. The item will be marked as &quot;custom&quot; 
            and won&apos;t be overwritten by automated processing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

