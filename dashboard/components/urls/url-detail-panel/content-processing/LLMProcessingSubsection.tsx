/**
 * LLM Processing Subsection
 *
 * Displays LLM processing availability and status
 */

'use client';

import { ChevronDown, ChevronUp, Sparkles, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import {
  getLLMProcessingStatus,
  getLLMProcessingLabel,
  getLLMProcessingBadgeVariant,
  formatRelativeTime,
} from '@/lib/utils/content-processing-helpers';
import { StatusBadge } from '@/components/status-badge';

interface LLMProcessingSubsectionProps {
  url: UrlWithCapabilitiesAndStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

export function LLMProcessingSubsection({
  url,
  isExpanded,
  onToggle,
  onUpdate,
  isProcessing = false,
}: LLMProcessingSubsectionProps) {
  const status = getLLMProcessingStatus(
    { llmExtractionStatus: url.llmExtractionStatus },
    url.capability.canUseLLM
  );

  const handleProcessWithLLM = async () => {
    // TODO: Implement LLM processing action
    console.log('Process with LLM for URL:', url.id);
    onUpdate?.();
  };

  const handleViewLLMOutput = () => {
    // TODO: Open LLM output modal
    console.log('View LLM output for URL:', url.id);
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">LLM Processing</h4>
          <StatusBadge
            status={status}
            variant={getLLMProcessingBadgeVariant(status)}
            label={getLLMProcessingLabel(status)}
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
          {status === 'completed' ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <div className="text-xs font-semibold text-green-900 mb-1">
                  ✓ LLM Processing Completed
                </div>
                <div className="text-xs text-green-800">
                  Metadata extracted successfully using AI
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {url.llmExtractionProvider && (
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <div className="mt-1 font-medium font-mono text-xs">
                      {url.llmExtractionProvider}
                    </div>
                  </div>
                )}
                {url.llmExtractedAt && (
                  <div>
                    <span className="text-gray-600">Extracted At:</span>
                    <div className="mt-1 font-medium">
                      {formatRelativeTime(url.llmExtractedAt)}
                    </div>
                  </div>
                )}
                {url.llmExtractionAttempts !== null && url.llmExtractionAttempts !== undefined && (
                  <div>
                    <span className="text-gray-600">Attempts:</span>
                    <div className="mt-1 font-medium">{url.llmExtractionAttempts}</div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleViewLLMOutput}
                disabled={isProcessing}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                View LLM Output
              </Button>
            </>
          ) : status === 'failed' ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="text-xs font-semibold text-red-900 mb-1">LLM Processing Failed</div>
                {url.llmExtractionError && (
                  <div className="text-xs text-red-800 mt-1">{url.llmExtractionError}</div>
                )}
              </div>

              {url.llmExtractionAttempts !== null && url.llmExtractionAttempts !== undefined && (
                <div className="text-gray-600">
                  Attempts: {url.llmExtractionAttempts}
                </div>
              )}

              <Button
                onClick={handleProcessWithLLM}
                disabled={isProcessing}
                size="sm"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry LLM Processing
              </Button>
            </>
          ) : status === 'available' ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <div className="text-xs font-semibold text-blue-900 mb-1">
                  LLM Processing Available
                </div>
                <div className="text-xs text-blue-800">
                  Use AI to extract metadata from cached content
                </div>
              </div>

              <Button
                onClick={handleProcessWithLLM}
                disabled={isProcessing}
                size="sm"
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Process with LLM
              </Button>
            </>
          ) : (
            <div className="text-gray-600 py-2">
              LLM processing is not available. Content must be cached first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
