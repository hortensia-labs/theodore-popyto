/**
 * Citation Preview Component
 * 
 * Displays formatted citation with:
 * - APA style formatting
 * - Missing fields highlighting
 * - Copy to clipboard
 * - Real-time updates
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { getCitationPreview } from '@/lib/actions/citation-editing';
import type { ZoteroItem } from '@/lib/zotero-client';

interface CitationPreviewProps {
  metadata: Partial<ZoteroItem>;
  missingFields?: string[];
  style?: 'apa' | 'mla' | 'chicago';
  onCopy?: () => void;
}

/**
 * Citation Preview Component
 * 
 * Shows formatted citation with real-time updates as metadata changes
 */
export function CitationPreview({
  metadata,
  missingFields = [],
  style = 'apa',
  onCopy,
}: CitationPreviewProps) {
  const [citation, setCitation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Update citation when metadata changes
   */
  useEffect(() => {
    updateCitation();
  }, [metadata]);

  /**
   * Fetch formatted citation
   */
  const updateCitation = async () => {
    if (!metadata.title) {
      setCitation('No title provided');
      return;
    }

    setIsLoading(true);
    try {
      const result = await getCitationPreview(metadata as ZoteroItem);
      
      if (result.success && result.citation) {
        setCitation(result.citation);
      } else {
        setCitation('Unable to generate citation preview');
      }
    } catch (error) {
      setCitation('Error generating citation');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy citation to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      onCopy?.();
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  };

  const hasMissingFields = missingFields.length > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-900">
          Citation Preview ({style.toUpperCase()})
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          disabled={isLoading || !citation || citation.includes('Error') || citation.includes('Unable')}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Missing Fields Warning */}
      {hasMissingFields && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Incomplete Citation
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Missing required fields: {missingFields.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Citation Display */}
      <div className={`p-4 rounded-lg border ${
        hasMissingFields
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        {isLoading ? (
          <div className="text-sm text-gray-500 italic">Generating preview...</div>
        ) : (
          <p className={`text-sm leading-relaxed ${
            hasMissingFields ? 'text-yellow-900' : 'text-blue-900'
          }`}>
            {citation}
          </p>
        )}
      </div>

      {/* Style Info */}
      <p className="text-xs text-gray-500">
        Citation is formatted in APA style. Ensure all critical fields (title, creators, date) are provided 
        for a complete citation.
      </p>
    </div>
  );
}

