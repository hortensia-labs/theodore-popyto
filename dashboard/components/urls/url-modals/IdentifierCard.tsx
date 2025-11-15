/**
 * Identifier Card Component
 * 
 * Card displaying an identifier with:
 * - Type and value
 * - Confidence level indicator
 * - Extraction source
 * - Preview data (if fetched)
 * - Preview and select buttons
 */

'use client';

import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { UrlIdentifier } from '@/drizzle/schema';

interface IdentifierCardProps {
  identifier: UrlIdentifier;
  onSelect: () => void;
  onPreview: () => void;
  isSelected?: boolean;
  isPreviewing?: boolean;
}

/**
 * Identifier Card Component
 * 
 * Displays a single identifier with actions
 */
export function IdentifierCard({
  identifier,
  onSelect,
  onPreview,
  isSelected,
  isPreviewing,
}: IdentifierCardProps) {
  // Confidence color
  const confidenceConfig = {
    high: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle,
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: AlertTriangle,
    },
    low: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-600',
      icon: Info,
    },
  };

  const confidence = identifier.confidence as 'high' | 'medium' | 'low';
  const config = confidenceConfig[confidence] || confidenceConfig.low;
  const ConfidenceIcon = config.icon;

  // Parse preview data if available
  const hasPreview = identifier.previewFetched && identifier.previewData;
  const previewTitle = hasPreview ? (identifier.previewData as any)?.title : null;
  const qualityScore = identifier.previewQualityScore;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* Type Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {identifier.identifierType}
            </span>
            
            {/* Confidence Badge */}
            <div className={`flex items-center gap-1 px-2 py-0.5 ${config.bg} ${config.text} text-xs font-medium rounded border ${config.border}`}>
              <ConfidenceIcon className="h-3 w-3" />
              <span>{confidence}</span>
            </div>

            {/* Selected Badge */}
            {isSelected && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                Selected
              </span>
            )}
          </div>

          {/* Identifier Value */}
          <p className="text-sm font-mono font-medium text-gray-900 break-all">
            {identifier.identifierValue}
          </p>
        </div>
      </div>

      {/* Extraction Info */}
      <div className="text-xs text-gray-600 space-y-1 mb-3">
        <div>
          <span className="font-medium">Source:</span>{' '}
          {identifier.extractionSource || 'Unknown'}
        </div>
        <div>
          <span className="font-medium">Method:</span>{' '}
          {identifier.extractionMethod}
        </div>
      </div>

      {/* Preview Data */}
      {hasPreview && (
        <div className="bg-white border rounded-md p-3 mb-3">
          <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
          {previewTitle && (
            <p className="text-sm text-gray-900">{previewTitle}</p>
          )}
          {qualityScore && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
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
              <span className="text-xs text-gray-600">{qualityScore}%</span>
            </div>
          )}
        </div>
      )}

      {/* Preview Error */}
      {identifier.previewFetched && identifier.previewError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-3">
          <p className="text-xs text-red-700">
            Preview failed: {identifier.previewError}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={hasPreview ? 'default' : 'outline'}
          onClick={onSelect}
          className="flex-1"
          disabled={isSelected}
        >
          {isSelected ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Selected
            </>
          ) : (
            'Select & Process'
          )}
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={onPreview}
          disabled={isPreviewing}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

