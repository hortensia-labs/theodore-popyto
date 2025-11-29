/**
 * Smart Suggestions Component
 * 
 * Main component for displaying suggestions with:
 * - Automatic suggestion generation
 * - Action handling
 * - Dismissal
 * - Priority-based display
 * - Integration with URL table and detail panel
 */

'use client';

import { useState, useCallback } from 'react';
import { SuggestionCard } from './SuggestionCard';
import { generateSuggestions } from '@/lib/suggestions/url-suggestions';
import { processUrlWithZotero } from '@/lib/actions/zotero';
import { ignoreUrl, unignoreUrl } from '@/lib/actions/state-transitions';
import { Lightbulb } from 'lucide-react';

interface SmartSuggestionsProps {
  url: any; // UrlWithCapabilitiesAndStatus or compatible
  onOpenModal?: (modal: string, params: Record<string, unknown>) => void;
  onUpdate?: () => void;
  compact?: boolean;
  maxSuggestions?: number;
}

/**
 * Smart Suggestions Component
 * 
 * Displays context-aware suggestions for a URL
 */
export function SmartSuggestions({
  url,
  onOpenModal,
  onUpdate,
  compact = false,
  maxSuggestions = 5,
}: SmartSuggestionsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);

  // Generate suggestions
  const allSuggestions = generateSuggestions({
    id: url.id,
    url: url.url,
    processingStatus: url.processingStatus || 'not_started',
    userIntent: url.userIntent || 'auto',
    processingAttempts: url.processingAttempts || 0,
    processingHistory: url.processingHistory || [],
    capability: url.capability || {
      hasIdentifiers: false,
      hasWebTranslators: false,
      hasContent: false,
      isAccessible: true,
      canUseLLM: false,
      isPDF: false,
      manualCreateAvailable: true,
    },
    citationValidationStatus: url.citationValidationStatus,
    citationValidationDetails: url.citationValidationDetails,
    zoteroItemKey: url.zoteroItemKey,
  });

  // Filter out dismissed suggestions
  const suggestions = allSuggestions
    .filter((_, index) => !dismissedIds.has(index))
    .slice(0, maxSuggestions);

  /**
   * Handle suggestion action
   */
  const handleAction = useCallback(async (handler: string, params?: Record<string, unknown>) => {
    setIsExecuting(true);

    try {
      switch (handler) {
        case 'process':
          await processUrlWithZotero(url.id);
          onUpdate?.();
          break;

        case 'editCitation':
          onOpenModal?.('editCitation', params || {});
          break;

        case 'selectIdentifier':
          onOpenModal?.('selectIdentifier', params || {});
          break;

        case 'approveMetadata':
          onOpenModal?.('approveMetadata', params || {});
          break;

        case 'manualCreate':
          onOpenModal?.('manualCreate', params || {});
          break;

        case 'viewHistory':
          onOpenModal?.('processingHistory', params || {});
          break;

        case 'unignore':
          await unignoreUrl(url.id);
          onUpdate?.();
          break;

        case 'unlink':
          // TODO: Implement unlink
          console.log('Unlink action triggered');
          break;

        default:
          console.warn(`Unknown suggestion handler: ${handler}`);
      }
    } catch (error) {
      console.error('Error executing suggestion action:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [url.id, onOpenModal, onUpdate]);

  /**
   * Handle dismiss
   */
  const handleDismiss = useCallback((index: number) => {
    setDismissedIds(prev => new Set(prev).add(index));
  }, []);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Suggestions
          </h3>
          {suggestions.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {suggestions.length}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard
            key={index}
            suggestion={suggestion}
            onAction={handleAction}
            onDismiss={() => handleDismiss(index)}
            compact={compact}
          />
        ))}
      </div>

      {/* Show count if some dismissed */}
      {dismissedIds.size > 0 && (
        <button
          onClick={() => setDismissedIds(new Set())}
          className="text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Show {dismissedIds.size} dismissed suggestion{dismissedIds.size !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

/**
 * Suggestion Count Badge
 * For displaying suggestion count in table
 */
export function SuggestionCountBadge({
  count,
  priority,
}: {
  count: number;
  priority?: 'high' | 'medium' | 'low';
}) {
  if (count === 0) return null;

  const colors = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  const color = priority ? colors[priority] : 'bg-blue-100 text-blue-700 border-blue-300';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${color}`}>
      <Lightbulb className="h-3 w-3" />
      {count}
    </span>
  );
}

