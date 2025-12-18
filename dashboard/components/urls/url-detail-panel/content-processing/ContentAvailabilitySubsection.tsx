/**
 * Content Availability Subsection
 *
 * Displays content fetch status, cache metadata, and accessibility information
 */

'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import {
  getContentAvailabilityStatus,
  getContentAvailabilityLabel,
  getContentAvailabilityBadgeVariant,
  formatContentSize,
  formatRelativeTime,
  getContentTypeLabel,
} from '@/lib/utils/content-processing-helpers';
import { StatusBadge } from '@/components/status-badge';
import { ContentInfoGrid } from './components/ContentInfoGrid';
import { RedirectChainDisplay } from './components/RedirectChainDisplay';
import { processSingleUrl } from '@/lib/actions/process-url-action';
import { StateGuards } from '@/lib/state-machine/state-guards';

interface ContentAvailabilitySubsectionProps {
  url: UrlWithCapabilitiesAndStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

export function ContentAvailabilitySubsection({
  url,
  isExpanded,
  onToggle,
  onUpdate,
  isProcessing = false,
}: ContentAvailabilitySubsectionProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const status = getContentAvailabilityStatus(
    {
      isAccessible: url.isAccessible,
      contentFetchAttempts: url.contentFetchAttempts,
      lastFetchError: url.lastFetchError,
    },
    url.contentCache
  );

  const canFetch = StateGuards.canProcessContent({
    id: url.id,
    url: url.url,
    processingStatus: url.processingStatus,
    userIntent: url.userIntent,
    zoteroItemKey: url.zoteroItemKey,
    createdByTheodore: url.createdByTheodore,
    userModifiedInZotero: url.userModifiedInZotero,
    linkedUrlCount: url.linkedUrlCount,
    processingAttempts: url.processingAttempts,
    capability: url.capability,
  });

  const handleFetchContent = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await processSingleUrl(url.id);

        if (result.success) {
          setSuccess(`Content fetched successfully!`);
          onUpdate?.();
        } else {
          setError(result.error || 'Failed to fetch content');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    });
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Content Availability</h4>
          <StatusBadge
            status={status}
            variant={getContentAvailabilityBadgeVariant(status)}
            label={getContentAvailabilityLabel(status)}
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
          {url.contentCache ? (
            <>
              <ContentInfoGrid
                items={[
                  {
                    label: 'Content Type',
                    value: getContentTypeLabel(url.contentCache.contentType),
                  },
                  {
                    label: 'Content Size',
                    value: formatContentSize(url.contentCache.contentSize),
                  },
                  {
                    label: 'Fetched At',
                    value: formatRelativeTime(url.contentCache.fetchedAt),
                  },
                  {
                    label: 'Fetch Attempts',
                    value: String(url.contentFetchAttempts || 0),
                  },
                  {
                    label: 'Is Accessible',
                    value: url.isAccessible ? 'Yes' : 'No',
                  },
                  {
                    label: 'Language',
                    value: url.contentCache.contentLanguage || '-',
                  },
                ]}
              />

              {/* Redirect Chain */}
              {url.contentCache.redirectChain && url.contentCache.redirectChain.length > 0 && (
                <RedirectChainDisplay redirectChain={url.contentCache.redirectChain} />
              )}

              {/* Advanced Details (Collapsible) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                  Advanced Details
                </summary>
                <div className="mt-2 space-y-1 pl-4">
                  <div>
                    <span className="text-gray-600">Content Hash:</span>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                      {url.contentCache.contentHash}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status Code:</span>
                    <span className="ml-2 font-medium">{url.contentCache.statusCode}</span>
                  </div>
                  {url.contentCache.rawContentPath && (
                    <div>
                      <span className="text-gray-600">Cache Path:</span>
                      <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                        {url.contentCache.rawContentPath}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : (
            <div className="text-gray-600 text-sm py-2">
              {status === 'not_attempted' ? (
                <p>Content has not been fetched yet.</p>
              ) : status === 'accessible' ? (
                <p>URL is accessible but content not cached.</p>
              ) : status === 'inaccessible' ? (
                <p>URL is not accessible. Check the error information below.</p>
              ) : (
                <p>Content fetch failed. See error details below.</p>
              )}
            </div>
          )}

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          {!url.contentCache && status !== 'error' && (
            <Button
              onClick={handleFetchContent}
              disabled={isProcessing || isPending || !canFetch}
              size="sm"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
              Fetch Content
            </Button>
          )}

          {url.contentCache && (
            <Button
              onClick={handleFetchContent}
              disabled={isProcessing || isPending || !canFetch}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
              Re-fetch Content
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
