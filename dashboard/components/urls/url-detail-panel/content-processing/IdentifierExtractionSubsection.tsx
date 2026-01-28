/**
 * Identifier Extraction Subsection
 *
 * Displays extracted identifiers (DOIs, PMIDs, arXiv IDs, ISBNs)
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import {
  getIdentifierExtractionStatus,
  getIdentifierExtractionLabel,
  getIdentifierExtractionBadgeVariant,
} from '@/lib/utils/content-processing-helpers';
import { StatusBadge } from '@/components/status-badge';
import { IdentifierList } from './components/IdentifierList';

interface IdentifierExtractionSubsectionProps {
  url: UrlWithCapabilitiesAndStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

export function IdentifierExtractionSubsection({
  url,
  isExpanded,
  onToggle,
  onUpdate,
  isProcessing = false,
}: IdentifierExtractionSubsectionProps) {
  const [showAllIdentifiers, setShowAllIdentifiers] = useState(false);

  const status = getIdentifierExtractionStatus(
    { identifierCount: url.identifiers?.length || 0 },
    url.contentCache
  );

  const identifiers = url.identifiers || [];
  const displayIdentifiers = showAllIdentifiers ? identifiers : identifiers.slice(0, 3);
  const hasMoreIdentifiers = identifiers.length > 3;

  const handleReExtract = async () => {
    // TODO: Implement re-extraction action
    console.log('Re-extract identifiers for URL:', url.id);
    onUpdate?.();
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Identifier Extraction</h4>
          <StatusBadge
            status={status}
            variant={getIdentifierExtractionBadgeVariant(status)}
            label={getIdentifierExtractionLabel(status)}
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
          {status === 'found' && identifiers.length > 0 ? (
            <>
              <div className="text-gray-700">
                <span className="font-medium">{identifiers.length}</span> identifier
                {identifiers.length > 1 ? 's' : ''} found
              </div>

              <IdentifierList identifiers={displayIdentifiers} />

              {hasMoreIdentifiers && !showAllIdentifiers && (
                <Button
                  onClick={() => setShowAllIdentifiers(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show All {identifiers.length} Identifiers
                </Button>
              )}

              {showAllIdentifiers && hasMoreIdentifiers && (
                <Button
                  onClick={() => setShowAllIdentifiers(false)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Show Less
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleReExtract}
                  disabled={isProcessing || !url.contentCache}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-extract
                </Button>
              </div>
            </>
          ) : status === 'not_found' ? (
            <>
              <div className="text-gray-600 py-2">
                No identifiers found in the content.
              </div>
              <Button
                onClick={handleReExtract}
                disabled={isProcessing}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Re-extracting
              </Button>
            </>
          ) : (
            <div className="text-gray-600 py-2">
              Content must be fetched before extracting identifiers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
