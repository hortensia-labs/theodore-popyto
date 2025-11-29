/**
 * Status Summary Section
 * 
 * Comprehensive status overview for URL detail panel
 * Shows processing status, user intent, attempts, and next steps
 */

'use client';

import { ProcessingStatusBadge } from '../url-status/ProcessingStatusBadge';
import { IntentBadge, IntentSelector } from '../url-status/IntentBadge';
import {
  getPossibleNextStates,
  getStateLabel,
  getStateDescription,
  isFinalState,
  isProcessingState,
  requiresUserAction,
} from '@/lib/utils/state-machine-utils';
import { setUserIntent } from '@/lib/actions/state-transitions';
import type { ProcessingStatus, UserIntent } from '@/lib/types/url-processing';
import { useState } from 'react';

interface StatusSummarySectionProps {
  processingStatus: ProcessingStatus;
  userIntent: UserIntent;
  processingAttempts: number;
  urlId: number;
  onUpdate?: () => void;
}

/**
 * Status Summary Section Component
 */
export function StatusSummarySection({
  processingStatus,
  userIntent,
  processingAttempts,
  urlId,
  onUpdate,
}: StatusSummarySectionProps) {
  const [isChangingIntent, setIsChangingIntent] = useState(false);

  const handleIntentChange = async (newIntent: UserIntent) => {
    setIsChangingIntent(true);
    try {
      await setUserIntent(urlId, newIntent);
      onUpdate?.();
    } finally {
      setIsChangingIntent(false);
    }
  };

  const possibleNextStates = getPossibleNextStates(processingStatus);
  const stateLabel = getStateLabel(processingStatus);
  const stateDescription = getStateDescription(processingStatus);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Status Summary</h3>

      {/* Current Status */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Processing Status
          </label>
          <ProcessingStatusBadge status={processingStatus} showLabel size="md" />
          <p className="text-xs text-gray-600 mt-1">{stateDescription}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            User Intent
          </label>
          <IntentSelector
            currentIntent={userIntent}
            onChange={handleIntentChange}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Processing Attempts
          </label>
          <div className="text-sm font-medium text-gray-900">
            {processingAttempts} attempt{processingAttempts !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* State Info */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">State Type</span>
          <span className="text-xs text-gray-600">
            {isFinalState(processingStatus) && 'Final'}
            {isProcessingState(processingStatus) && 'Processing'}
            {requiresUserAction(processingStatus) && 'Needs Action'}
          </span>
        </div>
        
        {possibleNextStates.length > 0 && (
          <div>
            <span className="text-xs font-medium text-gray-700 block mb-1">
              Possible Next States:
            </span>
            <div className="flex flex-wrap gap-1">
              {possibleNextStates.map(state => (
                <span
                  key={state}
                  className="text-xs px-2 py-0.5 bg-white border rounded font-mono"
                >
                  {state}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

