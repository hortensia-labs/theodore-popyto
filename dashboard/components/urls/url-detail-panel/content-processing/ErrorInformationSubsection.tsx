/**
 * Error Information Subsection
 *
 * Displays error details and recovery options
 */

'use client';

import { ChevronDown, ChevronUp, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import {
  formatErrorMessage,
  getErrorCategoryLabel,
  isErrorRetryable,
} from '@/lib/utils/content-processing-helpers';

interface ErrorInformationSubsectionProps {
  url: UrlWithCapabilitiesAndStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

export function ErrorInformationSubsection({
  url,
  isExpanded,
  onToggle,
  onUpdate,
  isProcessing = false,
}: ErrorInformationSubsectionProps) {
  const hasFetchError = !!url.lastFetchError;
  const hasLLMError = !!url.llmExtractionError && url.llmExtractionStatus === 'failed';

  const handleRetryFetch = async () => {
    // TODO: Implement retry fetch action
    console.log('Retry fetch for URL:', url.id);
    onUpdate?.();
  };

  const handleClearError = async () => {
    // TODO: Implement clear error action
    console.log('Clear error for URL:', url.id);
    onUpdate?.();
  };

  if (!hasFetchError && !hasLLMError) {
    return null;
  }

  return (
    <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h4 className="font-medium text-sm text-amber-900">Error Information</h4>
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
          {/* Fetch Error */}
          {hasFetchError && (
            <div className="bg-white border border-amber-300 rounded-lg p-3">
              <div className="font-medium text-amber-900 mb-2">Content Fetch Error</div>
              <div className="text-amber-800 mb-2">{formatErrorMessage(url.lastFetchError)}</div>

              <div className="text-xs text-amber-700">
                Raw error: {url.lastFetchError}
              </div>

              {url.contentFetchAttempts && url.contentFetchAttempts > 1 && (
                <div className="text-xs text-amber-700 mt-2">
                  Failed after {url.contentFetchAttempts} attempt{url.contentFetchAttempts > 1 ? 's' : ''}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {isErrorRetryable('network') && (
                  <Button
                    onClick={handleRetryFetch}
                    disabled={isProcessing}
                    size="sm"
                    variant="default"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Fetch
                  </Button>
                )}
                <Button
                  onClick={handleClearError}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Error
                </Button>
              </div>
            </div>
          )}

          {/* LLM Error */}
          {hasLLMError && (
            <div className="bg-white border border-red-300 rounded-lg p-3">
              <div className="font-medium text-red-900 mb-2">LLM Processing Error</div>
              <div className="text-red-800 mb-2">
                {formatErrorMessage(url.llmExtractionError, 'unknown')}
              </div>

              {url.llmExtractionAttempts && url.llmExtractionAttempts > 1 && (
                <div className="text-xs text-red-700 mt-2">
                  Failed after {url.llmExtractionAttempts} attempt{url.llmExtractionAttempts > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Helpful Tips */}
          <details className="text-xs">
            <summary className="cursor-pointer text-amber-800 hover:text-amber-900 font-medium">
              Troubleshooting Tips
            </summary>
            <div className="mt-2 space-y-1 pl-4 text-amber-700">
              <p>• Network errors are usually temporary - try again in a few moments</p>
              <p>• Check if the URL is accessible in your browser</p>
              <p>• Some sites block automated requests - manual creation may be needed</p>
              <p>• If errors persist, the URL may be permanently inaccessible</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
