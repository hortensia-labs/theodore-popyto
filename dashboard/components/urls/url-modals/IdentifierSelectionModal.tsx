/**
 * Identifier Selection Modal
 * 
 * Modal for selecting an identifier to process when multiple are found.
 * Features:
 * - List of all identifiers
 * - Sorted by confidence/priority
 * - Preview functionality
 * - Select and process
 * - Quality indicators
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IdentifierCard } from './IdentifierCard';
import { getIdentifiersWithPreviews } from '@/lib/actions/identifier-selection-action';
import { processCustomIdentifier } from '@/lib/actions/process-custom-identifier';
import { Loader, AlertCircle } from 'lucide-react';
import type { UrlIdentifier } from '@/drizzle/schema';

interface IdentifierSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  onSuccess: () => void;
}

/**
 * Identifier Selection Modal Component
 * 
 * Allows user to select from multiple identifiers found in content
 */
export function IdentifierSelectionModal({
  open,
  onOpenChange,
  urlId,
  onSuccess,
}: IdentifierSelectionModalProps) {
  const [identifiers, setIdentifiers] = useState<UrlIdentifier[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch identifiers for the URL
   */
  const loadIdentifiers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const identifiers = await getIdentifiersWithPreviews(urlId);
      
      if (identifiers.length === 0) {
        setError('No identifiers found for this URL');
      } else {
        // Sort by confidence and quality score
        const sorted = identifiers.sort((a, b) => {
          // First by confidence
          const confidenceOrder = { high: 0, medium: 1, low: 2 };
          const confDiff = confidenceOrder[a.confidence as keyof typeof confidenceOrder] - 
                          confidenceOrder[b.confidence as keyof typeof confidenceOrder];
          
          if (confDiff !== 0) return confDiff;
          
          // Then by quality score
          return (b.previewQualityScore || 0) - (a.previewQualityScore || 0);
        });
        
        setIdentifiers(sorted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [urlId]);

  /**
   * Load identifiers when modal opens
   */
  useEffect(() => {
    if (open) {
      loadIdentifiers();
    }
  }, [open, loadIdentifiers]);

  /**
   * Handle identifier processing
   */
  const handleProcess = async (identifier: UrlIdentifier) => {
    setSelectedId(identifier.id);
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processCustomIdentifier(
        urlId,
        identifier.identifierValue,
        false // Don't replace existing items from identifier selection
      );

      if (result.success) {
        console.log(`Identifier processed successfully: ${result.itemKey}`);
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error || 'Processing failed');
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSelectedId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle preview
   */
  const handlePreview = (identifier: UrlIdentifier) => {
    setIsPreviewing(identifier.id);
    // TODO: Implement preview modal or inline preview
    setTimeout(() => setIsPreviewing(null), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-none">
          <DialogTitle>Select Identifier to Process</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Multiple identifiers were found. Select the most appropriate one to process with Zotero.
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-sm text-gray-600">Loading identifiers...</p>
              </div>
            </div>
          ) : error && identifiers.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error loading identifiers</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
                <button
                  onClick={loadIdentifiers}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Identifier List */}
              <div className="space-y-3">
                {identifiers.map(identifier => (
                  <IdentifierCard
                    key={identifier.id}
                    identifier={identifier}
                    onProcess={() => handleProcess(identifier)}
                    onPreview={() => handlePreview(identifier)}
                    isProcessing={selectedId === identifier.id && isProcessing}
                    isPreviewing={isPreviewing === identifier.id}
                  />
                ))}
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  How to choose:
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>High confidence</strong> identifiers are more likely to work</li>
                  <li>Check the <strong>preview</strong> to see if metadata matches the content</li>
                  <li>DOI identifiers typically provide the best metadata quality</li>
                  <li>If unsure, try the highest confidence identifier first</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none px-6 py-3 border-t bg-gray-50 text-xs text-gray-600">
          <p>
            {isProcessing ? (
              <span className="text-blue-600 font-medium">Processing selected identifier...</span>
            ) : (
              <>
                <strong>Note:</strong> Selecting an identifier will process it with Zotero and create an item in your library.
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

