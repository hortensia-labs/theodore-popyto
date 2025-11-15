/**
 * Processing History Section
 * 
 * Displays processing history timeline in the URL detail panel
 * Shows all processing attempts with success/failure indicators
 */

'use client';

import { formatDuration } from '@/lib/utils/processing-utils';
import type { ProcessingAttempt } from '@/lib/types/url-processing';
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  Hash,
  Globe,
  Database,
  Sparkles,
  Hand,
} from 'lucide-react';

interface ProcessingHistorySectionProps {
  history: ProcessingAttempt[];
  compact?: boolean;
}

/**
 * Processing History Timeline Component
 */
export function ProcessingHistorySection({
  history,
  compact = false,
}: ProcessingHistorySectionProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-500">No processing attempts yet</p>
      </div>
    );
  }

  const getStageIcon = (stage?: string) => {
    switch (stage) {
      case 'zotero_identifier':
        return Hash;
      case 'zotero_url':
        return Globe;
      case 'content_extraction':
        return Database;
      case 'llm':
        return Sparkles;
      case 'manual':
        return Hand;
      default:
        return Clock;
    }
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'zotero_identifier':
        return 'Zotero (Identifier)';
      case 'zotero_url':
        return 'Zotero (URL)';
      case 'content_extraction':
        return 'Content Extraction';
      case 'llm':
        return 'LLM Extraction';
      case 'manual':
        return 'Manual Creation';
      default:
        return 'Processing';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Processing History</h3>
      
      <div className="space-y-3">
        {history.map((attempt, index) => {
          const Icon = getStageIcon(attempt.stage);
          const isSuccess = attempt.success === true || attempt.success === 1;
          const isTransition = !!attempt.transition;
          
          return (
            <div
              key={index}
              className={`flex gap-3 p-3 rounded-lg border ${
                isSuccess
                  ? 'bg-green-50 border-green-200'
                  : isTransition
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 p-2 rounded-full ${
                isSuccess
                  ? 'bg-green-100'
                  : isTransition
                  ? 'bg-blue-100'
                  : 'bg-red-100'
              }`}>
                {isTransition ? (
                  <ArrowRight className={`h-4 w-4 ${
                    'text-blue-600'
                  }`} />
                ) : isSuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {isTransition ? (
                      <div className="text-sm font-medium text-gray-900">
                        State Transition
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {getStageLabel(attempt.stage)}
                        {attempt.method && (
                          <span className="text-gray-600 font-normal"> · {attempt.method}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(attempt.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {/* Transition Details */}
                {isTransition && attempt.transition && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border">
                      {attempt.transition.from}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-mono bg-white px-2 py-0.5 rounded border">
                      {attempt.transition.to}
                    </span>
                  </div>
                )}

                {/* Success Details */}
                {isSuccess && !isTransition && (
                  <div className="mt-1 space-y-1">
                    {attempt.itemKey && (
                      <div className="text-xs text-gray-600">
                        Item: <span className="font-mono">{attempt.itemKey}</span>
                      </div>
                    )}
                    {attempt.duration && (
                      <div className="text-xs text-gray-600">
                        Duration: {formatDuration(attempt.duration)}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Details */}
                {!isSuccess && !isTransition && attempt.error && (
                  <div className="mt-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                    {attempt.error}
                  </div>
                )}

                {/* Metadata */}
                {attempt.metadata && !compact && (
                  <div className="mt-2 text-xs text-gray-500">
                    {Object.entries(attempt.metadata).map(([key, value]) => (
                      <div key={key}>
                        {key}: {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t text-xs text-gray-600 grid grid-cols-3 gap-2">
        <div>
          <span className="font-medium">Total:</span> {history.length}
        </div>
        <div>
          <span className="font-medium">Success:</span>{' '}
          {history.filter(h => h.success === true || h.success === 1).length}
        </div>
        <div>
          <span className="font-medium">Failed:</span>{' '}
          {history.filter(h => h.success === false || h.success === 0).length}
        </div>
      </div>
    </div>
  );
}

