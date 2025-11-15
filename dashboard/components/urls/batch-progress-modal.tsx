'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { X, CheckCircle2, XCircle, Clock, AlertTriangle, Pause, Play, StopCircle, Database, Hash, Globe, Sparkles } from 'lucide-react';
import type { BatchProcessingSession, ProcessingResult } from '@/lib/types/url-processing';

interface BatchProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlIds: number[];
  onProcessingStart: () => Promise<BatchProcessingSession | null>;
  session: BatchProcessingSession | null;
  progress: {
    current: number;
    total: number;
    percentage: number;
    succeeded: number;
    failed: number;
  } | null;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isProcessing: boolean;
}

export function BatchProgressModal({
  open,
  onOpenChange,
  urlIds,
  onProcessingStart,
  session,
  progress,
  onPause,
  onResume,
  onCancel,
  isProcessing,
}: BatchProgressModalProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [log, setLog] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>>([]);
  
  // Helper function to add log entries
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev.slice(-100), { timestamp, message, type }]);
  }, []);
  
  // Start processing when modal opens
  useEffect(() => {
    if (open && !hasStarted && urlIds.length > 0) {
      // eslint-disable-next-line react-compiler/react-compiler
      setHasStarted(true);
      addLog(`Starting batch processing for ${urlIds.length} URLs`, 'info');
      onProcessingStart();
    }
  }, [open, hasStarted, urlIds, onProcessingStart, addLog]);
  
  // Add logs when progress updates
  useEffect(() => {
    if (!progress) return;
    
    // Log milestone progress (throttled to every 10th item)
    if (progress.current > 0 && progress.current % 10 === 0) {
      // eslint-disable-next-line react-compiler/react-compiler
      addLog(
        `Progress: ${progress.current}/${progress.total} (${progress.percentage.toFixed(1)}%)`,
        'info'
      );
    }
  }, [progress, addLog]);
  
  // Add logs when session updates
  useEffect(() => {
    if (!session) return;
    
    // Log when session completes
    // eslint-disable-next-line react-compiler/react-compiler
    if (session.status === 'completed') {
      addLog(
        `Batch processing complete! ${session.completed.length} succeeded, ${session.failed.length} failed`,
        'success'
      );
    } else if (session.status === 'cancelled') {
      addLog('Batch processing cancelled by user', 'warning');
    } else if (session.status === 'paused') {
      addLog('Batch processing paused', 'warning');
    }
  }, [session, addLog]);
  
  // Add logs for individual results
  useEffect(() => {
    if (!session?.results) return;
    
    const lastResult = session.results[session.results.length - 1];
    if (lastResult) {
      const message = lastResult.success
        ? `✓ URL ${lastResult.urlId}: ${lastResult.status || 'stored'} ${lastResult.itemKey ? `(${lastResult.itemKey})` : ''}`
        : `✗ URL ${lastResult.urlId}: ${lastResult.error || 'Failed'}`;
      
      // eslint-disable-next-line react-compiler/react-compiler
      addLog(message, lastResult.success ? 'success' : 'error');
    }
  }, [session?.results, addLog]);
  
  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-compiler/react-compiler
      setHasStarted(false);
      setLog([]);
    }
  }, [open]);
  
  const isComplete = session?.status === 'completed' || session?.status === 'cancelled';
  const isPaused = session?.status === 'paused';
  
  // Calculate stats from results
  const stats = session?.results ? {
    stored: session.results.filter(r => r.status === 'stored' || r.status === 'stored_incomplete').length,
    awaitingUser: session.results.filter(r => r.status === 'awaiting_selection' || r.status === 'awaiting_metadata').length,
    exhausted: session.results.filter(r => r.status === 'exhausted').length,
    failed: session.failed.length,
    total: urlIds.length,
  } : {
    stored: 0,
    awaitingUser: 0,
    exhausted: 0,
    failed: 0,
    total: urlIds.length,
  };
  
  return (
    <Dialog open={open} onOpenChange={isComplete ? onOpenChange : undefined}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-none">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Batch Processing</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Processing {urlIds.length} URL{urlIds.length !== 1 ? 's' : ''} with automatic cascade workflow
              </p>
            </div>
            {isComplete && (
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </DialogHeader>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner */}
          <div className={`px-4 py-3 rounded-lg border ${
            isComplete
              ? session?.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
              : isPaused
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {isComplete ? (
                session?.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )
              ) : isPaused ? (
                <Pause className="h-5 w-5 text-yellow-600" />
              ) : (
                <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
              )}
              <span className={`font-medium ${
                isComplete
                  ? session?.status === 'completed'
                    ? 'text-green-900'
                    : 'text-yellow-900'
                  : isPaused
                  ? 'text-yellow-900'
                  : 'text-blue-900'
              }`}>
                {isComplete
                  ? session?.status === 'completed'
                    ? 'Batch Processing Complete'
                    : 'Batch Processing Cancelled'
                  : isPaused
                  ? 'Batch Processing Paused'
                  : 'Processing URLs...'
                }
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-gray-600">
                  {progress.current} / {progress.total} ({progress.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Stored in Zotero"
              value={stats.stored}
              icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            />
            <StatCard
              label="Awaiting User"
              value={stats.awaitingUser}
              icon={<Clock className="h-5 w-5 text-yellow-500" />}
            />
            <StatCard
              label="Exhausted"
              value={stats.exhausted}
              icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              icon={<XCircle className="h-5 w-5 text-red-500" />}
            />
          </div>
          
          {/* Activity Log */}
          <div className="border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
              <h3 className="font-medium text-sm">Activity Log</h3>
              <span className="text-xs text-gray-500">{log.length} entries</span>
            </div>
            <div className="h-64 overflow-y-auto p-4 space-y-1 bg-gray-900 text-gray-100 font-mono text-xs">
              {log.map((entry, i) => (
                <div key={i} className={`${
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'success' ? 'text-green-400' :
                  entry.type === 'warning' ? 'text-yellow-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{entry.timestamp}]</span>{' '}
                  {entry.message}
                </div>
              ))}
              {log.length === 0 && (
                <div className="text-gray-500">Starting batch processing...</div>
              )}
            </div>
          </div>
          
          {/* Results Summary */}
          {session?.results && session.results.length > 0 && (
            <div className="border rounded-lg">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="font-medium text-sm">Results Summary</h3>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {session.results.map((result, index) => (
                  <div
                    key={index}
                    className={`px-4 py-2 flex items-center justify-between text-sm ${
                      result.success ? 'hover:bg-green-50' : 'hover:bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-mono text-xs text-gray-500">
                        #{result.urlId}
                      </span>
                      <span className="truncate text-gray-700">
                        {result.status || (result.success ? 'Success' : 'Failed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.itemKey && (
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {result.itemKey}
                        </span>
                      )}
                      {result.method && (
                        <span className="text-xs text-gray-500">
                          {result.method}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex items-center justify-between flex-none">
          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isComplete && (
              <>
                {isPaused ? (
                  <Button
                    onClick={onResume}
                    size="sm"
                    variant="outline"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={onPause}
                    size="sm"
                    variant="outline"
                    disabled={isComplete}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={onCancel}
                  size="sm"
                  variant="destructive"
                  disabled={isComplete}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            variant={isComplete ? 'default' : 'outline'}
            disabled={!isComplete}
          >
            {isComplete ? 'Close' : 'Processing...'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 uppercase">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
