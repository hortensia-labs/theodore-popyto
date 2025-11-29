/**
 * Quick Actions Section
 * 
 * Context-aware action buttons for the URL detail panel
 * Shows actions based on current state and capabilities
 */

'use client';

import { Button } from '@/components/ui/button';
import { StateGuards } from '@/lib/state-machine/state-guards';
import type { UrlForGuardCheck } from '@/lib/state-machine/state-guards';
import {
  Database,
  Unlink,
  Edit,
  Hand,
  FilePlus,
  CheckSquare,
  RotateCcw,
  EyeOff,
  Eye,
  Archive,
  Trash2,
  FileText,
} from 'lucide-react';

interface QuickActionsSectionProps {
  url: UrlForGuardCheck;
  onProcess?: () => void;
  onProcessContent?: () => void;
  onExtractSemanticScholar?: () => void;
  onUnlink?: () => void;
  onEditCitation?: () => void;
  onSelectIdentifier?: () => void;
  onApproveMetadata?: () => void;
  onManualCreate?: () => void;
  onReset?: () => void;
  onIgnore?: () => void;
  onUnignore?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onViewHistory?: () => void;
  isProcessing?: boolean;
}

/**
 * Quick Actions Component
 * 
 * Shows context-appropriate actions for the current URL
 */
export function QuickActionsSection({
  url,
  onProcess,
  onProcessContent,
  onExtractSemanticScholar,
  onUnlink,
  onEditCitation,
  onSelectIdentifier,
  onApproveMetadata,
  onManualCreate,
  onReset,
  onIgnore,
  onUnignore,
  onArchive,
  onDelete,
  onViewHistory,
  isProcessing,
}: QuickActionsSectionProps) {
  // Get available actions
  const actions = StateGuards.getAvailableActions(url);

  // Sort actions by priority
  const sortedActions = actions.sort((a, b) =>
    StateGuards.getActionPriority(b) - StateGuards.getActionPriority(a)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>

      <div className="space-y-2">
        {/* Primary Actions */}
        {actions.includes('process') && onProcess && (
          <Button
            onClick={onProcess}
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Database className="h-4 w-4 mr-2" />
            Process with Zotero
          </Button>
        )}

        {actions.includes('process_content') && onProcessContent && (
          <Button
            onClick={onProcessContent}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Database className="h-4 w-4 mr-2" />
            Fetch Content & Extract IDs
          </Button>
        )}

        {actions.includes('extract_semantic_scholar') && onExtractSemanticScholar && (
          <Button
            onClick={onExtractSemanticScholar}
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <FileText className="h-4 w-4 mr-2" />
            Extract BibTeX Citation
          </Button>
        )}

        {actions.includes('select_identifier') && onSelectIdentifier && (
          <Button
            onClick={onSelectIdentifier}
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Hand className="h-4 w-4 mr-2" />
            Select Identifier
          </Button>
        )}

        {actions.includes('approve_metadata') && onApproveMetadata && (
          <Button
            onClick={onApproveMetadata}
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Review & Approve Metadata
          </Button>
        )}

        {actions.includes('edit_citation') && onEditCitation && (
          <Button
            onClick={onEditCitation}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Citation
          </Button>
        )}

        {actions.includes('manual_create') && onManualCreate && (
          <Button
            onClick={onManualCreate}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Create Manual Item
          </Button>
        )}

        {/* Management Actions */}
        {actions.includes('unlink') && onUnlink && (
          <Button
            onClick={onUnlink}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Unlink className="h-4 w-4 mr-2" />
            Unlink from Zotero
          </Button>
        )}

        {actions.includes('reset') && onReset && (
          <Button
            onClick={onReset}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Processing State
          </Button>
        )}

        {actions.includes('ignore') && onIgnore && (
          <Button
            onClick={onIgnore}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <EyeOff className="h-4 w-4 mr-2" />
            Mark as Ignored
          </Button>
        )}

        {actions.includes('unignore') && onUnignore && (
          <Button
            onClick={onUnignore}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Eye className="h-4 w-4 mr-2" />
            Remove Ignore
          </Button>
        )}

        {actions.includes('archive') && onArchive && (
          <Button
            onClick={onArchive}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={isProcessing}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        )}

        {/* View History */}
        {actions.includes('view_history') && onViewHistory && (
          <Button
            onClick={onViewHistory}
            variant="ghost"
            className="w-full justify-start"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Processing History
          </Button>
        )}

        {/* Destructive Actions */}
        {actions.includes('delete') && onDelete && (
          <Button
            onClick={onDelete}
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            size="sm"
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete URL
          </Button>
        )}
      </div>

      {/* Action Count */}
      <div className="text-xs text-gray-500 text-center">
        {sortedActions.length} action{sortedActions.length !== 1 ? 's' : ''} available
      </div>
    </div>
  );
}

