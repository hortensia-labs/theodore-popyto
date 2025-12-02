/**
 * Metadata Approval Modal
 * 
 * Modal for reviewing and approving LLM-extracted metadata.
 * Features:
 * - Extracted metadata display
 * - Quality score indicator
 * - Confidence scores per field
 * - Edit capability
 * - Approve/Reject buttons
 * - Citation preview
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CitationPreview } from './CitationPreview';
import { MetadataEditor } from './MetadataEditor';
import { approveAndStoreMetadata, rejectMetadata } from '@/lib/actions/metadata-approval-action';
import { Loader, CheckCircle, XCircle, Sparkles, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ZoteroItem } from '@/lib/zotero-client';

interface MetadataApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  onSuccess: () => void;
  onReject: () => void;
}

/**
 * Metadata Approval Modal Component
 * 
 * Review and approve metadata extracted by LLM
 */
export function MetadataApprovalModal({
  open,
  onOpenChange,
  urlId,
  onSuccess,
  onReject,
}: MetadataApprovalModalProps) {
  const [metadata, setMetadata] = useState<Partial<ZoteroItem> | null>(null);
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Load extracted metadata
   */
  useEffect(() => {
    if (open) {
      loadExtractedMetadata();
    }
  }, [open, urlId]);

  /**
   * Fetch extracted metadata from database
   */
  const loadExtractedMetadata = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement getExtractedMetadata action
      // const result = await getExtractedMetadata(urlId);
      
      // Mock for now - replace with actual implementation
      const mockMetadata = {
        title: 'Extracted Title',
        creators: [{ creatorType: 'author', firstName: 'John', lastName: 'Doe' }],
        date: '2024',
        itemType: 'webpage',
      };
      
      setMetadata(mockMetadata);
      setQualityScore(85);
      setConfidenceScores({
        title: 0.95,
        creators: 0.88,
        date: 0.75,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle approve
   */
  const handleApprove = async () => {
    if (!metadata) return;

    setIsApproving(true);
    setError(null);

    try {
      const result = await approveAndStoreMetadata(urlId, true);

      if (result.success) {
        console.log('Metadata approved and stored');
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to approve metadata');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsApproving(false);
    }
  };

  /**
   * Handle reject
   */
  const handleReject = async () => {
    const confirmed = confirm(
      'Reject this metadata?\n\n' +
      'The URL will return to "exhausted" state and you can try manual creation instead.'
    );

    if (!confirmed) return;

    setIsRejecting(true);
    setError(null);

    try {
      const result = await rejectMetadata(urlId, 'User rejected LLM extraction');

      if (result.success) {
        console.log('Metadata rejected');
        onReject();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to reject metadata');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRejecting(false);
    }
  };

  /**
   * Get quality indicator color
   */
  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Get quality label
   */
  const getQualityLabel = (score: number): string => {
    if (score >= 80) return 'High Quality';
    if (score >= 60) return 'Medium Quality';
    return 'Low Quality';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-none">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Review LLM-Extracted Metadata
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            AI has extracted bibliographic metadata. Review and approve or make edits before storing.
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-sm text-gray-600">Loading extracted metadata...</p>
              </div>
            </div>
          ) : error && !metadata ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : metadata ? (
            <div className="h-full flex flex-col gap-6">
              {/* Quality Indicator */}
              <div className="flex-none bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      Extraction Quality
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Based on AI confidence and field completeness
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getQualityColor(qualityScore)}`}>
                      {qualityScore}%
                    </p>
                    <p className="text-xs text-gray-600">
                      {getQualityLabel(qualityScore)}
                    </p>
                  </div>
                </div>

                {/* Quality Score Bar */}
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      qualityScore >= 80
                        ? 'bg-green-500'
                        : qualityScore >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${qualityScore}%` }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex-none bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Citation Preview */}
              <div className="flex-none">
                <CitationPreview metadata={metadata} />
              </div>

              {/* Metadata Editor or Display */}
              <div className="flex-1 overflow-hidden">
                {isEditing ? (
                  <MetadataEditor
                    metadata={metadata as ZoteroItem}
                    onChange={(updated) => setMetadata(updated)}
                    onSave={(updated) => {
                      setMetadata(updated);
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                    isSaving={false}
                  />
                ) : (
                  <div className="space-y-4 overflow-y-auto h-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Extracted Fields</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Metadata
                      </Button>
                    </div>

                    {/* Display extracted fields with confidence */}
                    <div className="space-y-3">
                      {Object.entries(metadata).map(([key, value]) => {
                        if (!value || key === 'itemType') return null;
                        
                        const confidence = confidenceScores[key];
                        
                        return (
                          <div key={key} className="border rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              {confidence && (
                                <span className="text-xs text-gray-500">
                                  {(confidence * 100).toFixed(0)}% confident
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900">
                              {typeof value === 'string' ? value : JSON.stringify(value)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {metadata && !isEditing && (
          <div className="flex-none px-6 py-4 border-t flex gap-3">
            <Button
              onClick={handleReject}
              variant="outline"
              disabled={isApproving || isRejecting}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="flex-1"
            >
              {isApproving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Store
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

