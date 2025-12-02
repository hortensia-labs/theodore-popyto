'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkRepairIssue {
  urlId: number;
  url: string;
  processingStatus: string;
  issues: string[];
  severity: 'error' | 'warning';
  repairSuggestion: any;
}

interface BulkRepairResult {
  urlId: number;
  url: string;
  success: boolean;
  newStatus?: string;
  error?: string;
}

type BulkRepairStep = 'filter' | 'preview' | 'confirm' | 'repairing' | 'results';

/**
 * Bulk Repair Panel Component
 *
 * Admin interface for repairing multiple URLs with state consistency issues.
 *
 * Features:
 * - Filter issues by type and severity
 * - Preview affected URLs
 * - Execute bulk repair with progress tracking
 * - Display detailed results
 * - Export repair report
 */
export function BulkRepairPanel() {
  const [step, setStep] = useState<BulkRepairStep>('filter');
  const [isLoading, setIsLoading] = useState(false);
  const [issues, setIssues] = useState<BulkRepairIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<BulkRepairIssue[]>([]);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [results, setResults] = useState<BulkRepairResult[]>([]);
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairError, setRepairError] = useState<string | null>(null);

  // Fetch issues on mount
  useEffect(() => {
    fetchIssues();
  }, []);

  // Update filtered issues when filters change
  useEffect(() => {
    let filtered = issues;

    if (selectedIssueType) {
      filtered = filtered.filter(issue =>
        issue.issues.includes(selectedIssueType)
      );
    }

    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(issue => issue.severity === selectedSeverity);
    }

    setFilteredIssues(filtered);
  }, [issues, selectedIssueType, selectedSeverity]);

  const fetchIssues = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/state-integrity/issues?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch issues');

      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      setRepairError(
        error instanceof Error ? error.message : 'Failed to fetch issues'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = () => {
    if (filteredIssues.length === 0) {
      setRepairError('No issues found matching the selected filters');
      return;
    }
    setRepairError(null);
    setStep('preview');
  };

  const handleConfirm = () => {
    setRepairError(null);
    setStep('confirm');
  };

  const handleRepair = async () => {
    setStep('repairing');
    setRepairError(null);
    setResults([]);
    setRepairProgress(0);

    try {
      const urlIds = filteredIssues.map(issue => issue.urlId);
      let successCount = 0;
      let failureCount = 0;
      const repairResults: BulkRepairResult[] = [];

      // Repair each URL sequentially
      for (let i = 0; i < urlIds.length; i++) {
        const urlId = urlIds[i];
        const issue = filteredIssues.find(iss => iss.urlId === urlId);

        try {
          const response = await fetch(`/api/state-integrity/repair/${urlId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'auto' }),
          });

          if (response.ok) {
            const data = await response.json();
            repairResults.push({
              urlId,
              url: issue?.url || `URL #${urlId}`,
              success: true,
              newStatus: data.newStatus,
            });
            successCount++;
          } else {
            const errorData = await response.json();
            repairResults.push({
              urlId,
              url: issue?.url || `URL #${urlId}`,
              success: false,
              error: errorData.error || 'Unknown error',
            });
            failureCount++;
          }
        } catch (error) {
          repairResults.push({
            urlId,
            url: issue?.url || `URL #${urlId}`,
            success: false,
            error: error instanceof Error ? error.message : 'Request failed',
          });
          failureCount++;
        }

        // Update progress
        setRepairProgress(Math.round(((i + 1) / urlIds.length) * 100));
        setResults(repairResults);
      }

      // Move to results step after a short delay
      setTimeout(() => {
        setStep('results');
      }, 500);
    } catch (error) {
      setRepairError(
        error instanceof Error ? error.message : 'Repair failed'
      );
      setStep('results');
    }
  };

  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      totalAttempted: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    const csv = [
      ['URL ID', 'URL', 'Status', 'New Status', 'Error'].join(','),
      ...results.map(r =>
        [
          r.urlId,
          `"${r.url}"`,
          r.success ? 'SUCCESS' : 'FAILED',
          r.newStatus || '',
          r.error || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-report-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getUniqueIssueTypes = () => {
    const types = new Set<string>();
    issues.forEach(issue => {
      issue.issues.forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  };

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Repair Tool</h2>
        <p className="text-sm text-gray-600 mt-1">
          Find and repair multiple URLs with state consistency issues.
        </p>
      </div>

      {/* Error Display */}
      {repairError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-800 mt-1">{repairError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step: Filter */}
      {step === 'filter' && (
        <FilterStep
          isLoading={isLoading}
          issues={issues}
          filteredIssues={filteredIssues}
          selectedIssueType={selectedIssueType}
          setSelectedIssueType={setSelectedIssueType}
          selectedSeverity={selectedSeverity}
          setSelectedSeverity={setSelectedSeverity}
          onPreview={handlePreview}
          onRefresh={fetchIssues}
          uniqueIssueTypes={getUniqueIssueTypes()}
        />
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <PreviewStep
          filteredIssues={filteredIssues}
          onBack={() => setStep('filter')}
          onConfirm={handleConfirm}
        />
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <ConfirmStep
          count={filteredIssues.length}
          onBack={() => setStep('preview')}
          onRepair={handleRepair}
        />
      )}

      {/* Step: Repairing */}
      {step === 'repairing' && (
        <RepairingStep progress={repairProgress} total={filteredIssues.length} />
      )}

      {/* Step: Results */}
      {step === 'results' && (
        <ResultsStep
          results={results}
          successCount={successCount}
          failureCount={failureCount}
          onExport={handleExportReport}
          onNewRepair={() => {
            setStep('filter');
            fetchIssues();
          }}
        />
      )}
    </div>
  );
}

/**
 * Step 1: Filter Issues
 */
function FilterStep({
  isLoading,
  issues,
  filteredIssues,
  selectedIssueType,
  setSelectedIssueType,
  selectedSeverity,
  setSelectedSeverity,
  onPreview,
  onRefresh,
  uniqueIssueTypes,
}: {
  isLoading: boolean;
  issues: BulkRepairIssue[];
  filteredIssues: BulkRepairIssue[];
  selectedIssueType: string | null;
  setSelectedIssueType: (type: string | null) => void;
  selectedSeverity: 'all' | 'error' | 'warning';
  setSelectedSeverity: (severity: 'all' | 'error' | 'warning') => void;
  onPreview: () => void;
  onRefresh: () => void;
  uniqueIssueTypes: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Issue Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <Select
              value={selectedIssueType || 'all'}
              onValueChange={(v) => setSelectedIssueType(v === 'all' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All issue types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All issue types</SelectItem>
                {uniqueIssueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <Select value={selectedSeverity} onValueChange={(v: any) => setSelectedSeverity(v)}>
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="error">Critical (Error)</SelectItem>
                <SelectItem value="warning">Non-Critical (Warning)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Results
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 font-medium">
              {filteredIssues.length} of {issues.length} URLs
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Total Issues Found</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{issues.length}</p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-900">Warnings</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {issues.filter(i => i.severity === 'warning').length}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Critical Errors</p>
          <p className="text-3xl font-bold text-red-600 mt-1">
            {issues.filter(i => i.severity === 'error').length}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onPreview}
          disabled={isLoading || filteredIssues.length === 0}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview {filteredIssues.length} URLs
        </Button>

        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}

/**
 * Step 2: Preview URLs
 */
function PreviewStep({
  filteredIssues,
  onBack,
  onConfirm,
}: {
  filteredIssues: BulkRepairIssue[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Preview Affected URLs ({filteredIssues.length})
        </h3>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">URL</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredIssues.map(issue => (
              <tr key={issue.urlId} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-600 truncate">
                  {issue.url}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {issue.issues.map((iss, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'px-2 py-1 text-xs rounded font-medium',
                          issue.severity === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        )}
                      >
                        {iss}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          Proceed to Repair
        </Button>
      </div>
    </div>
  );
}

/**
 * Step 3: Confirm Repair
 */
function ConfirmStep({
  count,
  onBack,
  onRepair,
}: {
  count: number;
  onBack: () => void;
  onRepair: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Ready to Repair {count} URLs
        </h3>
        <p className="text-sm text-yellow-800 mb-4">
          This operation will:
        </p>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside ml-2 mb-4">
          <li>Apply appropriate repairs to each URL</li>
          <li>Update the database with corrected state</li>
          <li>Log all repair operations</li>
          <li>Cannot be undone (but is safe and reversible)</li>
        </ul>
        <p className="text-xs text-yellow-700 italic">
          Progress will be shown as repairs are applied.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
        <Button onClick={onRepair} className="flex-1 bg-green-600 hover:bg-green-700">
          <Play className="h-4 w-4 mr-2" />
          Start Repair
        </Button>
      </div>
    </div>
  );
}

/**
 * Step 4: Repairing Progress
 */
function RepairingStep({ progress, total }: { progress: number; total: number }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-blue-900 mb-2">
          Repairing URLs...
        </p>
        <p className="text-sm text-blue-800 mb-4">
          {progress}% complete ({Math.ceil((progress / 100) * total)} of {total})
        </p>

        <div className="bg-blue-200 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 5: Results
 */
function ResultsStep({
  results,
  successCount,
  failureCount,
  onExport,
  onNewRepair,
}: {
  results: BulkRepairResult[];
  successCount: number;
  failureCount: number;
  onExport: () => void;
  onNewRepair: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Total Processed</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{results.length}</p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">Successful</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{successCount}</p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Failed</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{failureCount}</p>
        </div>
      </div>

      {/* Details */}
      {results.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">URL</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map(result => (
                <tr key={result.urlId} className={result.success ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="px-4 py-2 text-xs text-gray-600 truncate max-w-xs">
                    {result.url}
                  </td>
                  <td className="px-4 py-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {result.success ? (
                      <span className="text-green-800">
                        → {result.newStatus}
                      </span>
                    ) : (
                      <span className="text-red-800">{result.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onExport} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>

        <Button onClick={onNewRepair} className="flex-1">
          Repair More
        </Button>
      </div>
    </div>
  );
}
