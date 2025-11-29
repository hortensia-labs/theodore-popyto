/**
 * Processing History Modal
 * 
 * Full-screen modal for viewing complete processing history with:
 * - Complete timeline view
 * - Export functionality
 * - Filter by stage/success
 * - Statistics summary
 * - Detailed attempt information
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProcessingHistorySection } from '../url-detail-panel/ProcessingHistorySection';
import { summarizeProcessingHistory } from '@/lib/utils/processing-utils';
import { exportProcessingHistoryForUrls } from '@/lib/actions/export-history';
import { resetProcessingState } from '@/lib/actions/state-transitions';
import { Download, Filter, RotateCcw } from 'lucide-react';
import type { ProcessingAttempt } from '@/lib/types/url-processing';

interface ProcessingHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: number;
  url: string;
  history: ProcessingAttempt[];
  onUpdate?: () => void;
}

/**
 * Processing History Modal Component
 * 
 * Full view of processing history with export and filtering
 */
export function ProcessingHistoryModal({
  open,
  onOpenChange,
  urlId,
  url,
  history,
  onUpdate,
}: ProcessingHistoryModalProps) {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  /**
   * Filter history
   */
  const filteredHistory = history.filter(attempt => {
    if (filterStage !== 'all' && attempt.stage !== filterStage) {
      return false;
    }
    
    if (filterSuccess === 'success' && !attempt.success) {
      return false;
    }
    
    if (filterSuccess === 'failed' && attempt.success) {
      return false;
    }
    
    return true;
  });

  /**
   * Export history
   */
  const handleExport = async () => {
    try {
      const exportData = await exportProcessingHistoryForUrls([urlId]);
      
      // Create JSON blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `processing-history-${urlId}-${Date.now()}.json`;
      link.click();
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export history:', error);
      alert('Failed to export history');
    }
  };

  /**
   * Reset processing state
   */
  const handleReset = async () => {
    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const result = await resetProcessingState(urlId);

      if (result.success) {
        setResetSuccess(result.message || 'Processing state reset successfully');
        // Call onUpdate to refresh parent component
        onUpdate?.();
        // Close modal after short delay to show success message
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        setResetError(result.error || 'Failed to reset processing state');
      }
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsResetting(false);
    }
  };

  const summary = summarizeProcessingHistory(history);
  const stages = Array.from(new Set(history.map(h => h.stage).filter(Boolean)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 mr-6 py-4 border-b flex-none">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Processing History</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Complete timeline of all processing attempts for this URL
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {resetSuccess && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm">
              {resetSuccess}
            </div>
          )}
          {resetError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm">
              {resetError}
            </div>
          )}
        </DialogHeader>

        {/* Stats Summary */}
        <div className="flex-none px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600">Total Attempts</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalAttempts}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-green-600">{summary.successCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">{summary.failureCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Stages Tried</p>
              <p className="text-2xl font-bold text-blue-600">{summary.stagesAttempted.length}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-none px-6 py-3 border-b bg-white flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Stages</option>
            {stages.map(stage => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>

          <select
            value={filterSuccess}
            onChange={(e) => setFilterSuccess(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Results</option>
            <option value="success">Successful Only</option>
            <option value="failed">Failed Only</option>
          </select>

          {(filterStage !== 'all' || filterSuccess !== 'all') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFilterStage('all');
                setFilterSuccess('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredHistory.length > 0 ? (
            <ProcessingHistorySection history={filteredHistory} compact={false} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">
                No attempts match the current filters
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex-none px-6 py-3 border-t bg-gray-50 text-xs text-gray-600">
          <p>
            <strong>URL:</strong> {url}
          </p>
          {summary.commonErrors.length > 0 && (
            <p className="mt-1">
              <strong>Most Common Errors:</strong> {summary.commonErrors.join('; ')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

