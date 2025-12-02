'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StateGuards } from '@/lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';

interface URLTableRowRepairIndicatorProps {
  url: UrlForGuardCheck;
  showBadge?: boolean;
}

/**
 * URL Table Row Repair Indicator
 *
 * Shows a warning icon if URL has state consistency issues.
 * Displays tooltip with issue summary on hover.
 *
 * Compact indicator suitable for table rows.
 */
export function URLTableRowRepairIndicator({
  url,
  showBadge = true,
}: URLTableRowRepairIndicatorProps) {
  // Check for state integrity issues
  const issues = StateGuards.getStateIntegrityIssues(url);

  if (issues.length === 0) {
    return null;
  }

  const isCritical = issues.some(issue =>
    issue.includes('LINKED') || issue.includes('STORED')
  );

  const tooltipText = issues.length === 1
    ? `Issue: ${issues[0]}`
    : `${issues.length} issues found`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0">
            <AlertCircle
              className={`h-5 w-5 ${
                isCritical
                  ? 'text-red-600 animate-pulse'
                  : 'text-yellow-600'
              }`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">State Inconsistency</p>
            {issues.map((issue, idx) => (
              <p key={idx} className="text-xs">
                • {issue}
              </p>
            ))}
            <p className="text-xs italic mt-2">
              Click the repair button to fix
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
