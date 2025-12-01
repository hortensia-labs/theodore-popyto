'use client';

import { useState } from 'react';
import { processUrlsWithProgress, type ProgressUpdate } from '@/lib/process-urls';
import { Button } from '@/components/ui/button';
import { syncAllSections } from '@/lib/actions/import';

interface ProcessUrlsModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ProcessUrlsModal({ onClose, onComplete }: ProcessUrlsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number } | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ completed: number; failed: number; total: number; percentage: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, new Date().toLocaleTimeString() + ': ' + message]);
  };

  const handleStart = async () => {
    setIsProcessing(true);
    setError(null);
    setLog([]);
    setCurrentSection(null);
    setExtractionProgress(null);
    setAnalysisProgress(null);

    try {
      await processUrlsWithProgress(
        (update: ProgressUpdate) => {
          switch (update.type) {
            case 'start':
              addLog(`Starting processing for ${update.total_sections} sections`);
              break;
            
            case 'section_start':
              setCurrentSection(update.section || null);
              addLog(`Processing section: ${update.section}`);
              break;
            
            case 'extraction_start':
              addLog(`Extracting URLs from ${update.total_files} files`);
              break;
            
            case 'extraction_progress':
              setExtractionProgress({
                current: update.files_processed as number,
                total: update.total_files as number,
              });
              break;
            
            case 'extraction_complete':
              addLog(`Extracted ${update.unique_urls} unique URLs from ${update.files_processed} files`);
              setExtractionProgress(null);
              break;
            
            case 'analysis_start':
              addLog(`Analyzing ${update.total_urls} URLs`);
              break;
            
            case 'analysis_progress':
              setAnalysisProgress({
                completed: update.completed as number,
                failed: update.failed as number,
                total: update.total as number,
                percentage: update.percentage as number,
              });
              break;
            
            case 'analysis_complete':
              addLog(`Analysis complete: ${update.successful} successful, ${update.failed} failed`);
              setAnalysisProgress(null);
              break;
            
            case 'section_complete':
              addLog(`✓ Section ${update.section} completed`);
              setCurrentSection(null);
              break;
            
            case 'section_skip':
              addLog(`⊘ Section ${update.section} skipped: ${update.reason}`);
              break;
            
            case 'section_error':
              addLog(`✗ Error in section ${update.section}: ${update.error}`);
              break;
            
            case 'complete':
              addLog(`✓ Processing complete! ${update.sections_processed} sections processed`);
              setIsProcessing(false);
              // Now sync all sections to database
              handleSyncAll();
              break;
            
            case 'error':
              setError(update.message || update.error || 'Unknown error');
              addLog(`✗ Error: ${update.message || update.error}`);
              setIsProcessing(false);
              break;
          }
        },
        (err) => {
          setError(err.message);
          addLog(`✗ Fatal error: ${err.message}`);
          setIsProcessing(false);
        },
        () => {
          if (!error) {
            addLog('Processing stream completed');
          }
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsProcessing(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    addLog('Syncing all sections to database...');

    try {
      const result = await syncAllSections();

      if (result.success) {
        addLog(`✓ Database sync complete!`);
        addLog(`  - ${result.data?.totalSynced || 0} sections synced`);
        addLog(`  - ${result.data?.totalUrlsImported || 0} URLs imported`);
        addLog(`  - ${result.data?.totalUrlsUpdated || 0} URLs updated`);

        // Log invalid entries if any
        if (result.data?.totalUrlsInvalid && result.data.totalUrlsInvalid > 0) {
          addLog(`  ⚠ ${result.data.totalUrlsInvalid} invalid entries skipped (missing analysis data)`);
        }

        // Log detailed section results
        if (result.data?.sectionResults && result.data.sectionResults.length > 0) {
          addLog('Section breakdown:');
          for (const section of result.data.sectionResults) {
            const details = [
              `${section.urlsImported} imported`,
              `${section.urlsUpdated} updated`,
            ];
            if (section.urlsInvalid > 0) {
              details.push(`${section.urlsInvalid} invalid`);
            }
            addLog(`  • ${section.section}: ${details.join(', ')}`);
          }
        }

        // Log any sync errors
        if (result.errors && result.errors.length > 0) {
          addLog('⚠ Some sections had errors:');
          for (const err of result.errors) {
            addLog(`  • ${err}`);
          }
        }

        // Close modal after successful sync
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        const errorMsg = result.errors?.[0] || 'Failed to sync sections';
        setError(errorMsg);
        addLog(`✗ Sync error: ${errorMsg}`);

        // Log all errors if available
        if (result.errors && result.errors.length > 1) {
          addLog('Additional errors:');
          for (const err of result.errors.slice(1)) {
            addLog(`  • ${err}`);
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';
      setError(errorMsg);
      addLog(`✗ Sync error: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Process URLs from Sources</h2>
              <p className="text-sm text-gray-600">
                Extract URLs from source files and analyze them via citation linker API
              </p>
            </div>
            {!isProcessing && !isSyncing && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Current Section */}
          {currentSection && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="font-medium text-blue-900">Processing: {currentSection}</span>
              </div>
            </div>
          )}

          {/* Extraction Progress */}
          {extractionProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting URLs...</span>
                <span>{extractionProgress.current} / {extractionProgress.total} files</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Analysis Progress */}
          {analysisProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyzing URLs...</span>
                <span>{analysisProgress.completed + analysisProgress.failed} / {analysisProgress.total} ({analysisProgress.percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${analysisProgress.percentage}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>✓ {analysisProgress.completed} successful</span>
                {analysisProgress.failed > 0 && (
                  <span className="text-red-600">✗ {analysisProgress.failed} failed</span>
                )}
              </div>
            </div>
          )}

          {/* Sync Progress */}
          {isSyncing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="font-medium text-yellow-900">Syncing sections to database...</span>
              </div>
            </div>
          )}

          {/* Log */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Activity Log</h3>
            <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto font-mono text-xs">
              {log.length === 0 ? (
                <p className="text-gray-400">No activity yet...</p>
              ) : (
                log.map((entry, index) => (
                  <div key={index} className="text-gray-700 py-1">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-2">
          {!isProcessing && !isSyncing && (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleStart}>
                Start Processing
              </Button>
            </>
          )}
          {(isProcessing || isSyncing) && (
            <div className="text-sm text-gray-600">
              {isProcessing ? 'Processing...' : 'Syncing to database...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

