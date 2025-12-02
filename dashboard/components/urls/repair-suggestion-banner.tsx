'use client';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';
import { StateGuards } from '@/lib/state-machine/state-guards';

interface RepairSuggestionBannerProps {
  url: UrlForGuardCheck;
  onRepair?: (urlId: number) => Promise<void>;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Repair Suggestion Banner Component
 *
 * Displays state integrity issues and repair suggestions for a URL.
 * Shows when URL has consistency problems that need fixing.
 *
 * Features:
 * - Clear visual indication of issues
 * - Issue description and type
 * - Repair suggestion with reasoning
 * - One-click repair button
 * - Loading and success states
 * - Severity levels (warning, error)
 */
export function RepairSuggestionBanner({
  url,
  onRepair,
  compact = false,
  showDetails = true,
}: RepairSuggestionBannerProps) {
  // Check for state integrity issues
  const issues = StateGuards.getStateIntegrityIssues(url);
  const repairSuggestion = StateGuards.suggestRepairAction(url);

  // No issues = no banner
  if (issues.length === 0) {
    return null;
  }

  // Determine severity based on issues
  const isCritical = issues.some(issue =>
    issue.includes('LINKED') || issue.includes('STORED')
  );
  const severity = isCritical ? 'error' : 'warning';

  return (
    <RepairBannerContent
      urlId={url.id}
      issues={issues}
      repairSuggestion={repairSuggestion}
      severity={severity}
      onRepair={onRepair}
      compact={compact}
      showDetails={showDetails}
    />
  );
}

/**
 * Internal component for rendering the banner content
 */
function RepairBannerContent({
  urlId,
  issues,
  repairSuggestion,
  severity,
  onRepair,
  compact,
  showDetails,
}: {
  urlId: number;
  issues: string[];
  repairSuggestion: any;
  severity: 'error' | 'warning';
  onRepair?: (urlId: number) => Promise<void>;
  compact: boolean;
  showDetails: boolean;
}) {
  const [isRepairing, setIsRepairing] = React.useState(false);
  const [repairResult, setRepairResult] = React.useState<'success' | 'error' | null>(null);
  const [repairError, setRepairError] = React.useState<string | null>(null);

  const handleRepair = async () => {
    if (!onRepair) return;

    setIsRepairing(true);
    setRepairError(null);

    try {
      await onRepair(urlId);
      setRepairResult('success');
      // Reset success state after 3 seconds
      setTimeout(() => setRepairResult(null), 3000);
    } catch (error) {
      setRepairResult('error');
      setRepairError(error instanceof Error ? error.message : 'Repair failed');
    } finally {
      setIsRepairing(false);
    }
  };

  // Show success message if repair completed
  if (repairResult === 'success') {
    return (
      <div className={cn(
        'flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3',
        compact && 'py-2 px-3'
      )}>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1">
          <p className={cn(
            'text-sm font-medium text-green-900',
            compact && 'text-xs'
          )}>
            ✓ State repaired successfully
          </p>
          {showDetails && (
            <p className="text-xs text-green-700 mt-1">
              URL state is now consistent. You can proceed with normal operations.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error message if repair failed
  if (repairResult === 'error') {
    return (
      <div className={cn(
        'flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3',
        compact && 'py-2 px-3'
      )}>
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className={cn(
            'text-sm font-medium text-red-900',
            compact && 'text-xs'
          )}>
            ✗ Repair failed
          </p>
          {showDetails && repairError && (
            <p className="text-xs text-red-700 mt-1">
              {repairError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show issue banner with repair suggestion
  const bgColor = severity === 'error'
    ? 'border-red-200 bg-red-50'
    : 'border-yellow-200 bg-yellow-50';

  const iconColor = severity === 'error'
    ? 'text-red-600'
    : 'text-yellow-600';

  const textColor = severity === 'error'
    ? 'text-red-900'
    : 'text-yellow-900';

  const secondaryTextColor = severity === 'error'
    ? 'text-red-700'
    : 'text-yellow-700';

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-md border px-4 py-3',
      bgColor,
      compact && 'py-2 px-3 gap-2'
    )}>
      <AlertCircle className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />

      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-mono text-[11px]',
          textColor,
          compact && 'text-xs'
        )}>
          State Inconsistency Detected
        </p>

        {showDetails && (
          <>
            {/* Issue Details */}
            <div className="mt-2 space-y-1">
              {issues.length === 1 && (
                <p className={cn(
                  'text-xs',
                  secondaryTextColor
                )}>
                  <strong>Issue:</strong> {issues[0]}
                </p>
              )}
              {issues.length > 1 && (
                <div className={cn('text-xs', secondaryTextColor)}>
                  <strong>Issues:</strong>
                  <ul className="ml-4 mt-1 space-y-1 list-disc">
                    {issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Repair Suggestion */}
            {repairSuggestion && (
              <div className="mt-2">
                <p className={cn(
                  'text-xs font-medium',
                  secondaryTextColor
                )}>
                  <strong>Suggested Repair:</strong> {repairSuggestion.description}
                </p>
                {repairSuggestion.reasoning && (
                  <p className={cn(
                    'text-xs mt-1',
                    secondaryTextColor
                  )}>
                    <em>{repairSuggestion.reasoning}</em>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Repair Button */}
      {onRepair && (
        <Button
          size="sm"
          variant={severity === 'error' ? 'destructive' : 'outline'}
          onClick={handleRepair}
          disabled={isRepairing}
          className={cn("shrink-0", severity === 'error' && "text-white")}
        >
          {isRepairing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isRepairing ? 'Repairing...' : 'Repair'}
        </Button>
      )}
    </div>
  );
}

// Re-export React since we use React.useState
import React from 'react';
