'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { previewIdentifier, type PreviewIdentifierData } from '@/lib/actions/preview-identifier';
import { getZoteroItemMetadata } from '@/lib/actions/zotero';
import { type ZoteroItemResponse } from '@/lib/zotero-client';

interface ReplaceZoteroItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier: string;
  currentItemKey: string;
  onConfirm: () => void;
  isProcessing?: boolean;
}

/**
 * Modal to confirm replacement of existing Zotero item with a new one from custom identifier
 */
export function ReplaceZoteroItemModal({
  open,
  onOpenChange,
  identifier,
  currentItemKey,
  onConfirm,
  isProcessing = false,
}: ReplaceZoteroItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newItemPreview, setNewItemPreview] = useState<PreviewIdentifierData | null>(null);
  const [currentItem, setCurrentItem] = useState<ZoteroItemResponse | null>(null);

  useEffect(() => {
    if (open && identifier && currentItemKey) {
      setLoading(true);
      setError(null);
      setNewItemPreview(null);
      setCurrentItem(null);

      Promise.all([
        previewIdentifier(identifier),
        getZoteroItemMetadata(currentItemKey),
      ])
        .then(([previewResult, currentItemResult]) => {
          if (previewResult.success && previewResult.data) {
            setNewItemPreview(previewResult.data);
          } else {
            setError(previewResult.error || 'Failed to load preview of new item');
          }

          if (currentItemResult.success && currentItemResult.data) {
            setCurrentItem(currentItemResult.data);
          } else {
            setError(prevError => 
              prevError 
                ? `${prevError}; Failed to load current item` 
                : 'Failed to load current Zotero item'
            );
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Unknown error loading data');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, identifier, currentItemKey]);

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
    }
  };

  // Helper to get title from current item
  const getCurrentTitle = () => {
    if (!currentItem?.fields) return 'Unknown';
    // Field 1 is typically the title
    return currentItem.fields['1'] || 'Unknown';
  };

  // Helper to get creators from current item
  const getCurrentAuthors = () => {
    if (!currentItem?.creators || currentItem.creators.length === 0) return 'Unknown authors';
    
    return currentItem.creators
      .map(c => {
        if (c.firstName && c.lastName) {
          return `${c.lastName}, ${c.firstName}`;
        }
        if (c.name) {
          return c.name;
        }
        return c.lastName || c.firstName || '';
      })
      .filter(Boolean)
      .join('; ') || 'Unknown authors';
  };

  // Helper to get date from current item
  const getCurrentDate = () => {
    if (!currentItem?.fields) return 'Unknown';
    // Field 6 is typically the date
    return currentItem.fields['6'] || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replace Zotero Item?</DialogTitle>
          <DialogDescription>
            This URL is already linked to a Zotero item. Review the comparison below to decide
            whether to replace it with the new item from the custom identifier.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <span className="text-sm font-medium text-gray-700">Loading comparison...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {!loading && !error && newItemPreview && currentItem && (
            <div className="grid grid-cols-2 gap-4">
              {/* Current Item */}
              <div className="space-y-3 border-r pr-4">
                <div className="bg-gray-50 px-3 py-2 rounded-md">
                  <h3 className="font-semibold text-sm text-gray-700 uppercase">Current Item</h3>
                  <p className="text-xs text-gray-500 mt-1">Item Key: {currentItemKey}</p>
                </div>

                {currentItem.citation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-700 uppercase mb-1">
                      Citation
                    </div>
                    <div className="text-sm font-medium text-blue-900">
                      {currentItem.citation}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Title</div>
                  <div className="text-sm text-gray-900">{getCurrentTitle()}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Authors</div>
                  <div className="text-sm text-gray-900">{getCurrentAuthors()}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Date</div>
                  <div className="text-sm text-gray-900">{getCurrentDate()}</div>
                </div>

                {currentItem.itemType && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Type</div>
                    <div className="text-sm text-gray-900">
                      {currentItem.itemType
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/^./, s => s.toUpperCase())}
                    </div>
                  </div>
                )}
              </div>

              {/* New Item Preview */}
              <div className="space-y-3 pl-4">
                <div className="bg-green-50 px-3 py-2 rounded-md">
                  <h3 className="font-semibold text-sm text-green-700 uppercase">New Item</h3>
                  <p className="text-xs text-green-600 mt-1">From identifier: {identifier}</p>
                </div>

                {newItemPreview.generatedCitation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-700 uppercase mb-1">
                      Citation
                    </div>
                    <div className="text-sm font-medium text-green-900">
                      {newItemPreview.generatedCitation}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Title</div>
                  <div className="text-sm text-gray-900">{newItemPreview.title}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Authors</div>
                  <div className="text-sm text-gray-900">{newItemPreview.authors}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Date</div>
                  <div className="text-sm text-gray-900">{newItemPreview.date}</div>
                </div>

                {newItemPreview.itemType && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Type</div>
                    <div className="text-sm text-gray-900">
                      {newItemPreview.itemType
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/^./, s => s.toUpperCase())}
                    </div>
                  </div>
                )}

                {newItemPreview.DOI && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">DOI</div>
                    <div className="text-sm font-mono text-gray-900">{newItemPreview.DOI}</div>
                  </div>
                )}

                {newItemPreview.publicationTitle && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Publication
                    </div>
                    <div className="text-sm text-gray-900">{newItemPreview.publicationTitle}</div>
                  </div>
                )}

                {newItemPreview.abstractNote && (
                  <div>
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                      Abstract
                    </div>
                    <div className="text-xs text-gray-700 line-clamp-3">
                      {newItemPreview.abstractNote}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && newItemPreview && currentItem && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
              <p className="text-sm text-amber-900">
                <strong>Warning:</strong> Replacing the current item will unlink it from this URL
                and link the new item instead. The old item will remain in your Zotero library but
                will no longer be associated with this URL.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing || loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || loading || !!error || !newItemPreview}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Replace Item'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

