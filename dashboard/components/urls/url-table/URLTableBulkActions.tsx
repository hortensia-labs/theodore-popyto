/**
 * URL Table Bulk Actions Component
 * 
 * Displays when URLs are selected, providing bulk operations:
 * - Bulk process with Zotero
 * - Bulk ignore
 * - Bulk archive
 * - Bulk delete
 * - Bulk reset processing state
 * 
 * Features confirmation dialogs for destructive operations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Database,
  EyeOff,
  Archive,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import { bulkIgnoreUrls, bulkArchiveUrls } from '@/lib/actions/state-transitions';
import { deleteUrls } from '@/lib/actions/urls';

interface URLTableBulkActionsProps {
  selectedCount: number;
  selectedIds: number[];
  onProcessBatch: (urlIds: number[]) => Promise<void>;
  onActionComplete: () => void;
  isProcessing?: boolean;
}

/**
 * Bulk Actions Bar Component
 * 
 * Appears when URLs are selected, provides batch operations
 */
export function URLTableBulkActions({
  selectedCount,
  selectedIds,
  onProcessBatch,
  onActionComplete,
  isProcessing,
}: URLTableBulkActionsProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  /**
   * Handle bulk processing
   */
  const handleBulkProcess = async () => {
    const confirmed = confirm(
      `Process ${selectedCount} URL(s) with Zotero?\n\n` +
      `This will:\n` +
      `- Try Zotero processing (identifier or URL translator)\n` +
      `- Auto-cascade to content extraction if Zotero fails\n` +
      `- Auto-cascade to LLM extraction if content extraction finds no identifiers\n\n` +
      `URLs with user intent "ignore" or "archive" will be skipped.`
    );

    if (!confirmed) return;

    setIsExecuting(true);
    try {
      await onProcessBatch(selectedIds);
      onActionComplete();
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Handle bulk ignore
   */
  const handleBulkIgnore = async () => {
    const confirmed = confirm(
      `Mark ${selectedCount} URL(s) as ignored?\n\n` +
      `This will:\n` +
      `- Skip these URLs in batch processing\n` +
      `- Keep URLs in database\n` +
      `- Can be unignored later`
    );

    if (!confirmed) return;

    setIsExecuting(true);
    try {
      const result = await bulkIgnoreUrls(selectedIds);
      
      if (result.successful > 0) {
        alert(`Successfully ignored ${result.successful} URL(s)`);
        onActionComplete();
      }
      
      if (result.failed > 0) {
        alert(`Failed to ignore ${result.failed} URL(s)`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Handle bulk archive
   */
  const handleBulkArchive = async () => {
    const confirmed = confirm(
      `Archive ${selectedCount} URL(s)?\n\n` +
      `This will:\n` +
      `- Permanently hide these URLs from default views\n` +
      `- Skip in all processing operations\n` +
      `- Can be un-archived later\n\n` +
      `Use this for URLs you definitely don't want to process.`
    );

    if (!confirmed) return;

    setIsExecuting(true);
    try {
      const result = await bulkArchiveUrls(selectedIds);
      
      if (result.successful > 0) {
        alert(`Successfully archived ${result.successful} URL(s)`);
        onActionComplete();
      }
      
      if (result.failed > 0) {
        alert(`Failed to archive ${result.failed} URL(s)`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = async () => {
    const confirmed = confirm(
      `⚠️ DELETE ${selectedCount} URL(s)?\n\n` +
      `This will:\n` +
      `- Permanently remove URLs from database\n` +
      `- Remove all associated data (identifiers, metadata, cache)\n` +
      `- NOT delete Zotero items (items stay in library)\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you sure?`
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(
      `FINAL CONFIRMATION\n\n` +
      `You are about to PERMANENTLY DELETE ${selectedCount} URL(s).\n\n` +
      `Type "yes" in the next prompt to proceed.`
    );

    if (!doubleConfirm) return;

    setIsExecuting(true);
    try {
      const result = await deleteUrls(selectedIds);
      
      if (result.success) {
        alert(`Successfully deleted ${selectedCount} URL(s)`);
        onActionComplete();
      } else {
        alert(`Failed to delete URLs: ${result.error}`);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const isDisabled = isProcessing || isExecuting;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
      {/* Selection Info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} URL{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleBulkProcess}
          variant="default"
          size="sm"
          disabled={isDisabled}
          title="Process selected URLs with Zotero (auto-cascades on failure)"
        >
          <Database className="h-4 w-4 mr-2" />
          Process
        </Button>

        <Button
          onClick={handleBulkIgnore}
          variant="outline"
          size="sm"
          disabled={isDisabled}
          title="Mark selected URLs as ignored (skip processing)"
        >
          <EyeOff className="h-4 w-4 mr-2" />
          Ignore
        </Button>

        <Button
          onClick={handleBulkArchive}
          variant="outline"
          size="sm"
          disabled={isDisabled}
          title="Archive selected URLs (permanent ignore)"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>

        <Button
          onClick={handleBulkDelete}
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Permanently delete selected URLs from database"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}

/**
 * Bulk Actions Summary
 * Shows what will happen for selected URLs
 */
export function BulkActionsSummary({
  selectedUrls,
  className,
}: {
  selectedUrls: any[];
  className?: string;
}) {
  const processable = selectedUrls.filter(u =>
    u.processingStatus === 'not_started' || u.processingStatus === 'awaiting_selection'
  ).length;

  const ignored = selectedUrls.filter(u =>
    u.userIntent === 'ignore' || u.processingStatus === 'ignored'
  ).length;

  const stored = selectedUrls.filter(u =>
    u.processingStatus.startsWith('stored')
  ).length;

  return (
    <div className={`text-xs text-gray-600 space-y-1 ${className}`}>
      <div>• {processable} ready to process</div>
      <div>• {ignored} will be skipped (ignored)</div>
      <div>• {stored} already stored</div>
    </div>
  );
}

