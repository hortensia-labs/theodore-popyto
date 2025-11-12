'use client';

import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ProcessingLogEntry {
  urlId: number;
  url: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  itemKey?: string;
  error?: string;
  isExisting?: boolean;
}

interface ProcessingProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: ProcessingLogEntry[];
  isProcessing: boolean;
  onCancel?: () => void;
  onClose?: () => void;
}

export function ProcessingProgressModal({
  open,
  onOpenChange,
  logs,
  isProcessing,
  onCancel,
  onClose,
}: ProcessingProgressModalProps) {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (shouldAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, shouldAutoScroll]);
  
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    
    setShouldAutoScroll(isAtBottom);
  };
  
  const totalCount = logs.length;
  const completedCount = logs.filter(l => l.status === 'success' || l.status === 'failed').length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const processingCount = logs.filter(l => l.status === 'processing').length;
  
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  const handleClose = () => {
    if (isProcessing) {
      const confirmed = confirm('Processing is still in progress. Are you sure you want to close?');
      if (!confirmed) return;
      
      if (onCancel) {
        onCancel();
      }
    } else {
      if (onClose) {
        onClose();
      }
    }
    
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Processing URLs with Zotero</DialogTitle>
          <DialogDescription>
            {isProcessing
              ? 'Processing URLs and storing bibliographic data in Zotero...'
              : 'Processing complete'}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Summary */}
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
              <div className="text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-gray-600">Success</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
              <div className="text-gray-600">Processing</div>
            </div>
          </div>
        </div>
        
        {/* Log Container */}
        <div
          ref={logContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-4 space-y-2 min-h-[300px] max-h-[400px]"
        >
          {logs.map((log, index) => (
            <LogEntry key={`${log.urlId}-${index}`} log={log} />
          ))}
          
          {logs.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No logs yet
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-2">
          {isProcessing ? (
            <Button onClick={onCancel} variant="outline">
              Cancel Processing
            </Button>
          ) : (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogEntry({ log }: { log: ProcessingLogEntry }) {
  const getIcon = () => {
    switch (log.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />;
      case 'pending':
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full flex-shrink-0" />;
    }
  };
  
  const getStatusText = () => {
    switch (log.status) {
      case 'success':
        return log.isExisting
          ? 'Item already exists in Zotero'
          : `Stored in Zotero (${log.itemKey})`;
      case 'failed':
        return log.error || 'Failed';
      case 'processing':
        return 'Processing...';
      case 'pending':
        return 'Waiting...';
    }
  };
  
  const getBgColor = () => {
    switch (log.status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-white border-gray-200';
    }
  };
  
  return (
    <div className={`flex items-start gap-3 p-3 border rounded-lg ${getBgColor()}`}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate" title={log.url}>
          {log.url}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {getStatusText()}
        </div>
      </div>
    </div>
  );
}

