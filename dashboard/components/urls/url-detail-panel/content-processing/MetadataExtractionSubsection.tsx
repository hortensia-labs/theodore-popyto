/**
 * Metadata Extraction Subsection
 *
 * Displays extracted bibliographic metadata with quality scoring
 */

'use client';

import { ChevronDown, ChevronUp, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import {
  getMetadataExtractionStatus,
  getMetadataExtractionLabel,
  getMetadataExtractionBadgeVariant,
  computeMetadataQualityColor,
} from '@/lib/utils/content-processing-helpers';
import { StatusBadge } from '@/components/status-badge';
import { QualityScoreBar } from './components/QualityScoreBar';
import { FieldChecklist } from './components/FieldChecklist';

interface MetadataExtractionSubsectionProps {
  url: UrlWithCapabilitiesAndStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

export function MetadataExtractionSubsection({
  url,
  isExpanded,
  onToggle,
  onUpdate,
  isProcessing = false,
}: MetadataExtractionSubsectionProps) {
  const status = getMetadataExtractionStatus(
    { hasExtractedMetadata: url.extractedMetadata?.length > 0 },
    url.extractedMetadata
  );

  const metadata = url.extractedMetadata;
  const qualityScore = metadata?.qualityScore ?? null;

  const handleReviewMetadata = () => {
    // TODO: Open metadata review modal
    console.log('Review metadata for URL:', url.id);
  };

  const extractedFields = metadata
    ? [
        { name: 'Title', present: !!metadata.title },
        { name: 'Authors', present: !!metadata.creators && metadata.creators.length > 0 },
        { name: 'Date', present: !!metadata.date },
        { name: 'Publication', present: !!metadata.publicationTitle },
        { name: 'Abstract', present: !!metadata.abstractNote },
      ]
    : [];

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Metadata Extraction</h4>
          <StatusBadge
            status={status}
            variant={getMetadataExtractionBadgeVariant(status)}
            label={getMetadataExtractionLabel(status)}
            size="sm"
          />
        </div>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-3 text-sm">
          {metadata ? (
            <>
              <QualityScoreBar score={qualityScore} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-600">Extraction Method:</span>
                  <div className="mt-1 font-medium capitalize">
                    {metadata.extractionMethod?.replace(/_/g, ' ') || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Validation Status:</span>
                  <div className="mt-1 font-medium capitalize">
                    {metadata.validationStatus || '-'}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-600 font-medium mb-2 block">Fields Extracted:</span>
                <FieldChecklist fields={extractedFields} />
              </div>

              {metadata.missingFields && metadata.missingFields.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <div className="text-xs font-semibold text-amber-900 mb-1">
                    Missing Fields
                  </div>
                  <div className="text-xs text-amber-800">
                    {metadata.missingFields.join(', ')}
                  </div>
                </div>
              )}

              {url.processingStatus === 'awaiting_metadata' && (
                <Button
                  onClick={handleReviewMetadata}
                  disabled={isProcessing}
                  size="sm"
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review Metadata
                </Button>
              )}
            </>
          ) : (
            <div className="text-gray-600 py-2">
              No metadata has been extracted yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
