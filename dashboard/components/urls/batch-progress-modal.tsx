'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { BatchProgressEvent, BatchStats } from '@/lib/batch-processor';

interface BatchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlIds: number[];
}

export function BatchProgressModal({
  isOpen,
  onClose,
  urlIds,
}: BatchProgressModalProps) {
  const [phase, setPhase] = useState<string>('content_fetching');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(urlIds.length);
  const [stats, setStats] = useState<BatchStats>({
    total: urlIds.length,
    contentFetched: 0,
    identifiersFound: 0,
    previewsFetched: 0,
    stored: 0,
    awaitingUser: 0,
    failed: 0,
    skipped: 0,
  });
  const [log, setLog] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && urlIds.length > 0) {
      startBatchProcessing();
    }
  }, [isOpen, urlIds]);
  
  async function startBatchProcessing() {
    try {
      const response = await fetch('/api/process-urls-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urlIds,
          options: {
            batchSize: 25,
            parallelFetches: 5,
            parallelPreviews: 3,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsComplete(true);
          addLog('Batch processing complete', 'success');
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const event: BatchProgressEvent = JSON.parse(line);
            handleProgressEvent(event);
          } catch (e) {
            console.warn('Failed to parse progress line:', line, e);
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      setIsComplete(true);
    }
  }
  
  function handleProgressEvent(event: BatchProgressEvent) {
    if (event.type === 'progress') {
      if (event.phase) setPhase(event.phase);
      if (event.progress !== undefined) setProgress(event.progress);
      if (event.total !== undefined) setTotal(event.total);
      if (event.stats) setStats(event.stats);
    } else if (event.type === 'url_processed') {
      addLog(
        `Processed ${event.url?.substring(0, 50)}... → ${event.state}`,
        event.state?.includes('failed') ? 'error' : 'info'
      );
      if (event.stats) setStats(event.stats);
    } else if (event.type === 'error') {
      setError(event.error || 'Unknown error');
      addLog(`Error: ${event.error}`, 'error');
    } else if (event.type === 'complete') {
      setIsComplete(true);
      if (event.stats) setStats(event.stats);
    }
  }
  
  function addLog(message: string, type: string = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev.slice(-50), { timestamp, message, type }]);
  }
  
  const formatPhaseName = (phase: string): string => {
    const names: Record<string, string> = {
      content_fetching: 'Fetching Content',
      extracting_identifiers: 'Extracting Identifiers',
      previewing_identifiers: 'Previewing Identifiers',
      complete: 'Complete',
    };
    return names[phase] || phase;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Processing {urlIds.length} URL{urlIds.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={!isComplete}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Phase Timeline */}
          <div className="flex items-center justify-between">
            {['content_fetching', 'extracting_identifiers', 'previewing_identifiers', 'complete'].map((p, i) => (
              <div key={p} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  phase === p ? 'bg-blue-500 text-white' :
                  i < ['content_fetching', 'extracting_identifiers', 'previewing_identifiers', 'complete'].indexOf(phase) 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {i < ['content_fetching', 'extracting_identifiers', 'previewing_identifiers', 'complete'].indexOf(phase) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{i + 1}</span>
                  )}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    i < ['content_fetching', 'extracting_identifiers', 'previewing_identifiers', 'complete'].indexOf(phase) - 1
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-gray-600">
            {formatPhaseName(phase)}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span>{progress} / {total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(progress / total) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Fetched"
              value={stats.contentFetched}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            />
            <StatCard
              label="Identifiers"
              value={stats.identifiersFound}
              icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
            />
            <StatCard
              label="Awaiting Review"
              value={stats.awaitingUser}
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              icon={<XCircle className="h-4 w-4 text-red-500" />}
            />
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {/* Activity Log */}
          <div className="border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium text-sm">Activity Log</h3>
            </div>
            <div className="h-48 overflow-y-auto p-4 space-y-1 bg-gray-900 text-gray-100 font-mono text-xs">
              {log.map((entry, i) => (
                <div key={i} className={`${
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{entry.timestamp}]</span>{' '}
                  {entry.message}
                </div>
              ))}
              {log.length === 0 && (
                <div className="text-gray-500">Waiting for updates...</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-2">
          <Button
            onClick={onClose}
            variant={isComplete ? 'default' : 'outline'}
            disabled={!isComplete}
          >
            {isComplete ? 'Close' : 'Processing...'}
          </Button>
        </div>
      </div>
    </div>
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
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

