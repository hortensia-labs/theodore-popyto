'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Code,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';
import { StateGuards } from '@/lib/state-machine/state-guards';

interface RepairStateDialogProps {
  url: UrlForGuardCheck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRepair?: (urlId: number) => Promise<void>;
}

type DialogStep = 'explain' | 'confirm' | 'repairing' | 'success' | 'error';

/**
 * Repair State Dialog Component
 *
 * Step-by-step dialog for repairing state consistency issues.
 *
 * Flow:
 * 1. Explain - Show what's wrong
 * 2. Confirm - Show what will change
 * 3. Repairing - Execute repair
 * 4. Success - Show results
 */
export function RepairStateDialog({
  url,
  open,
  onOpenChange,
  onRepair,
}: RepairStateDialogProps) {
  const [step, setStep] = useState<DialogStep>('explain');
  const [error, setError] = useState<string | null>(null);

  // Get issue information
  const issues = StateGuards.getStateIntegrityIssues(url);
  const repairSuggestion = StateGuards.suggestRepairAction(url);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setStep('explain');
      setError(null);
    }
  }, [open]);

  const handleRepair = async () => {
    if (!onRepair) return;

    setStep('repairing');
    setError(null);

    try {
      await onRepair(url.id);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repair failed');
      setStep('error');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleNextStep = () => {
    if (step === 'explain') {
      setStep('confirm');
    } else if (step === 'confirm') {
      handleRepair();
    }
  };

  // Render based on current step
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {step === 'explain' && (
          <ExplainStep
            url={url}
            issues={issues}
            repairSuggestion={repairSuggestion}
          />
        )}
        {step === 'confirm' && (
          <ConfirmStep
            url={url}
            issues={issues}
            repairSuggestion={repairSuggestion}
          />
        )}
        {step === 'repairing' && (
          <RepairingStep />
        )}
        {step === 'success' && (
          <SuccessStep url={url} />
        )}
        {step === 'error' && (
          <ErrorStep error={error} />
        )}

        {/* Footer with navigation */}
        <DialogFooter className="mt-6">
          {(step === 'explain' || step === 'confirm') && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={step === 'repairing'}
              >
                {step === 'explain' ? 'Next' : 'Repair Now'}
              </Button>
            </>
          )}

          {step === 'repairing' && (
            <>
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Repairing...
              </Button>
            </>
          )}

          {(step === 'success' || step === 'error') && (
            <>
              <Button onClick={handleClose} className="w-full">
                {step === 'success' ? 'Done' : 'Close'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Step 1: Explain the issue
 */
function ExplainStep({
  url,
  issues,
  repairSuggestion,
}: {
  url: UrlForGuardCheck;
  issues: string[];
  repairSuggestion: any;
}) {
  const getIssueExplanation = (issue: string): string => {
    const explanations: Record<string, string> = {
      'LINKED_BUT_NOT_STORED': 'URL has a Zotero item linked but is not marked as stored. This prevents certain operations and creates inconsistency.',
      'STORED_BUT_NO_ITEM': 'URL is marked as stored but has no item linked. This should be reset to not_started.',
      'DUAL_STATE_MISMATCH': 'The processingStatus and zoteroProcessingStatus fields are out of sync. They should always match.',
      'ITEM_EXISTS_WRONG_STATE': 'URL has an item but is in a state that doesn\'t allow items (like ignored or archived).',
    };
    return explanations[issue] || `URL has state inconsistency: ${issue}`;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          State Inconsistency Found
        </DialogTitle>
        <DialogDescription>
          Your URL has consistency issues that need to be fixed before continuing.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Current State */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Current State
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
            <div>
              <span className="font-medium">URL:</span> {url.url}
            </div>
            <div>
              <span className="font-medium">Status:</span> {url.processingStatus}
            </div>
            {url.zoteroItemKey && (
              <div>
                <span className="font-medium">Item Key:</span> {url.zoteroItemKey}
              </div>
            )}
            <div>
              <span className="font-medium">User Intent:</span> {url.userIntent}
            </div>
          </div>
        </div>

        {/* Issues */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Issues Found ({issues.length})
          </h3>
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">
                  {issue}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {getIssueExplanation(issue)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Repair Suggestion */}
        {repairSuggestion && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="text-sm font-semibold text-green-900 mb-2">
              ✓ Recommended Repair
            </h3>
            <p className="text-sm text-green-800 mb-2">
              {repairSuggestion.description}
            </p>
            {repairSuggestion.reasoning && (
              <p className="text-xs text-green-700 italic">
                {repairSuggestion.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Learn More */}
        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <BookOpen className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-1">Learn more about state consistency</p>
            <p>The State Integrity system ensures that URL metadata stays synchronized across all systems. This prevents data loss and operation failures.</p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Step 2: Confirm the repair
 */
function ConfirmStep({
  url,
  issues,
  repairSuggestion,
}: {
  url: UrlForGuardCheck;
  issues: string[];
  repairSuggestion: any;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          Confirm Repair
        </DialogTitle>
        <DialogDescription>
          Review the changes that will be made.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Before State */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-900">
              Before
            </span>
            Current State (Broken)
          </h3>
          <div className="space-y-1 text-xs text-red-800 font-mono">
            <div><span className="font-semibold">processingStatus:</span> "{url.processingStatus}"</div>
            {url.zoteroItemKey && (
              <div><span className="font-semibold">zoteroItemKey:</span> "{url.zoteroItemKey}"</div>
            )}
            <div className="text-red-700 mt-2 italic">
              ⚠ These values are inconsistent!
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="h-5 w-5 text-gray-400 rotate-90" />
        </div>

        {/* After State */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-900">
              After
            </span>
            Repaired State (Healthy)
          </h3>
          <div className="space-y-1 text-xs text-green-800 font-mono">
            {repairSuggestion?.changes?.map((change: any, idx: number) => (
              <div key={idx}>
                <span className="font-semibold">{change.field}:</span> {change.oldValue ? `"${change.oldValue}"` : '(empty)'} → {change.newValue ? `"${change.newValue}"` : '(empty)'}
              </div>
            ))}
            <div className="text-green-700 mt-2">
              ✓ State will be consistent
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start gap-2">
            <Code className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700">
              <p className="font-medium mb-1">Technical Details</p>
              <p>This repair will update the database records and transition the URL to a valid state. The operation is atomic and will either succeed completely or fail with no changes.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Step 3: Repairing
 */
function RepairingStep() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Repairing...</DialogTitle>
        <DialogDescription>
          Please wait while we fix the state consistency issue.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium text-gray-900 mb-2">
          Applying repair...
        </p>
        <p className="text-xs text-gray-600">
          This should only take a few seconds.
        </p>
      </div>
    </>
  );
}

/**
 * Step 4: Success
 */
function SuccessStep({ url }: { url: UrlForGuardCheck }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          State Repaired Successfully
        </DialogTitle>
        <DialogDescription>
          Your URL is now in a consistent state.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-2">
            ✓ Repair Complete
          </h3>
          <p className="text-sm text-green-800 mb-3">
            The URL's state has been successfully repaired and is now consistent.
          </p>
          <p className="text-xs text-green-700">
            <strong>URL:</strong> {url.url}
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            What's Next?
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>You can now link this URL to Zotero items</li>
            <li>You can process it through the normal workflow</li>
            <li>The URL will no longer block other operations</li>
          </ul>
        </div>
      </div>
    </>
  );
}

/**
 * Step 5: Error
 */
function ErrorStep({ error }: { error: string | null }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Repair Failed
        </DialogTitle>
        <DialogDescription>
          The automatic repair could not be completed.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-900 mb-2">
            ✗ Error
          </h3>
          <p className="text-sm text-red-800 font-mono">
            {error || 'An unexpected error occurred during repair.'}
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            What to do?
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Check the error message above for details</li>
            <li>Try repairing again in a moment</li>
            <li>If the issue persists, contact support</li>
          </ul>
        </div>
      </div>
    </>
  );
}
