/**
 * Edit Citation Modal
 * 
 * Modal for editing citation metadata of stored Zotero items with:
 * - Citation preview at top (APA formatted)
 * - Metadata editor below
 * - Save to Zotero
 * - Real-time validation
 * - Auto-transition when citation becomes complete
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CitationPreview } from './CitationPreview';
import { MetadataEditor } from './MetadataEditor';
import { updateCitation, getMissingCitationFields } from '@/lib/actions/citation-editing';
import { getZoteroItemMetadata } from '@/lib/actions/zotero';
import type { ZoteroItem, ZoteroItemResponse } from '@/lib/zotero-client';
import { Loader } from 'lucide-react';

interface EditCitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  itemKey: string;
  onSuccess: () => void;
}

/**
 * Edit Citation Modal Component
 * 
 * Allows editing of citation metadata for stored Zotero items
 */
export function EditCitationModal({
  open,
  onOpenChange,
  urlId,
  itemKey,
  onSuccess,
}: EditCitationModalProps) {
  const [metadata, setMetadata] = useState<ZoteroItem | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load item metadata and missing fields
   */
  useEffect(() => {
    if (open) {
      loadMetadata();
    }
  }, [open, urlId, itemKey]);

  /**
   * Fetch current metadata from Zotero
   */
  const loadMetadata = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch item metadata
      const metadataResult = await getZoteroItemMetadata(itemKey);
      
      if (!metadataResult.success || !metadataResult.data) {
        setError(metadataResult.error || 'Failed to load metadata');
        return;
      }

      // Convert ZoteroItemResponse to ZoteroItem (extract item data only)
      const responseData: ZoteroItemResponse = metadataResult.data;
      const itemData: ZoteroItem = {
        itemType: responseData.itemType,
        title: responseData.fields?.['1'] || responseData.title, // Field 1 is title
        creators: responseData.creators,
        url: responseData.fields?.['url'] || responseData.webURL,
        date: responseData.fields?.['6'] || responseData.fields?.['date'], // Field 6 is date
        accessDate: responseData.fields?.['accessDate'],
      };

      setMetadata(itemData);

      // Fetch missing fields
      const missingResult = await getMissingCitationFields(urlId);
      
      if (missingResult.success) {
        setMissingFields(missingResult.missingFields || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle metadata change
   */
  const handleMetadataChange = (updated: ZoteroItem) => {
    setMetadata(updated);
  };

  /**
   * Handle save
   */
  const handleSave = async (updatedMetadata: ZoteroItem) => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateCitation(urlId, itemKey, updatedMetadata);

      if (result.success) {
        console.log('Citation updated successfully');
        
        // Check if citation is now complete
        if (result.validationStatus === 'valid') {
          console.log('Citation is now complete!');
        }
        
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to update citation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    if (isSaving) {
      const confirmed = confirm('Save in progress. Are you sure you want to cancel?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-none">
          <DialogTitle>Edit Citation Metadata</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Edit metadata to complete or correct the citation
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-sm text-gray-600">Loading metadata...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-red-800">Error loading metadata</p>
                <p className="text-xs text-red-600">{error}</p>
                <button
                  onClick={loadMetadata}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : metadata ? (
            <div className="h-full flex flex-col gap-6">
              {/* Citation Preview */}
              <div className="flex-none">
                <CitationPreview
                  metadata={metadata}
                  missingFields={missingFields}
                />
              </div>

              {/* Metadata Editor */}
              <div className="flex-1 overflow-hidden">
                <MetadataEditor
                  metadata={metadata}
                  missingFields={missingFields}
                  onChange={handleMetadataChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  isSaving={isSaving}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Info */}
        <div className="flex-none px-6 py-3 border-t bg-gray-50 text-xs text-gray-600">
          <p>
            <strong>Item Key:</strong> <span className="font-mono">{itemKey}</span> · 
            Changes will be saved to your Zotero library
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

