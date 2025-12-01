/**
 * URL Table Row Component
 * 
 * Individual row in the URL table with:
 * - Selection checkbox
 * - URL link with formatting
 * - All status indicators (Processing, Capability, Intent, Citation)
 * - Dynamic action buttons based on state guards
 * - Processing attempts count
 * - Click to open detail panel
 * - Hover effects
 */

'use client';

import { formatUrlForDisplay, cn } from '@/lib/utils';
import { StateGuards } from '@/lib/state-machine/state-guards';
import { ProcessingStatusBadge } from '../url-status/ProcessingStatusBadge';
import { CapabilitySummary } from '../url-status/CapabilityIndicator';
import { CitationStatusIndicator, type CitationStatus } from '../citation-status-indicator';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Database,
  MoreVertical,
  Unlink,
  Edit,
  Hand,
  FilePlus,
  CheckSquare,
  RotateCcw,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  FileText,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';

interface URLTableRowProps {
  url: UrlWithCapabilitiesAndStatus; // Accept any for backward compatibility
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  onProcess: () => void;
  onUnlink?: () => void;
  onEditCitation?: () => void;
  onSelectIdentifier?: () => void;
  onAddIdentifier?: () => void;
  onApproveMetadata?: () => void;
  onManualCreate?: () => void;
  onReset?: () => void;
  onProcessContent?: () => void;
  onExtractSemanticScholar?: () => void;
  onIgnore?: () => void;
  onUnignore?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onDeleteItem?: () => void;
  onRetry?: () => void;
  onViewHistory?: () => void;
  isProcessing?: boolean;
  compact?: boolean; // Compact mode when detail panel is open
  isDetailSelected?: boolean; // Whether this row is selected for detail view
}

/**
 * URL Table Row Component
 * 
 * Renders a single URL row with all indicators and actions
 */
export function URLTableRow({
  url,
  selected,
  onSelect,
  onClick,
  onProcess,
  onUnlink,
  onEditCitation,
  onSelectIdentifier,
  onAddIdentifier,
  onApproveMetadata,
  onManualCreate,
  onReset,
  onProcessContent,
  onExtractSemanticScholar,
  onIgnore,
  onUnignore,
  onArchive,
  onDelete,
  onDeleteItem,
  onRetry,
  onViewHistory,
  isProcessing,
  compact = false,
  isDetailSelected = false,
}: URLTableRowProps) {
  // Get available actions from guards
  const actions = url.processingStatus && url.userIntent
    ? StateGuards.getAvailableActions({
        id: url.id,
        url: url.url,
        processingStatus: url.processingStatus,
        userIntent: url.userIntent,
        zoteroItemKey: url.zoteroItemKey,
        createdByTheodore: url.createdByTheodore,
        userModifiedInZotero: url.userModifiedInZotero,
        linkedUrlCount: url.linkedUrlCount,
        processingAttempts: url.processingAttempts,
        capability: url.capability,
      })
    : [];

  const canProcess = actions.includes('process');
  
  // Get all actions except 'process' for the dropdown menu
  const dropdownActions = actions.filter(action => action !== 'process');
  
  // Sort dropdown actions by priority (highest first)
  const sortedDropdownActions = dropdownActions.sort((a, b) =>
    StateGuards.getActionPriority(b) - StateGuards.getActionPriority(a)
  );

  return (
    <tr
      className={cn(
        "hover:bg-gray-50 cursor-pointer transition-colors group",
        isDetailSelected && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
      onClick={(e) => {
        // Don't trigger if clicking interactive elements
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'A' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.closest('a') ||
          target.closest('button') ||
          target.closest('input')
        ) {
          return;
        }
        onClick();
      }}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded"
          onClick={(e) => e.stopPropagation()}
        />
      </td>

      {/* URL */}
      <td className="px-4 py-2 max-w-[300px]">
        <div className="flex flex-col gap-0">
          {/* URL */}
          <div className="flex items-center gap-1.5">
            {/* Intent Indicator Dot - only show for non-auto intents */}
            {url.userIntent && url.userIntent !== 'auto' && (
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full shrink-0",
                  url.userIntent === 'ignore' && "bg-gray-400",
                  url.userIntent === 'priority' && "bg-orange-500",
                  url.userIntent === 'manual_only' && "bg-green-500"
                )}
                title={url.userIntent}
              />
            )}
            <a
              href={url.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "hover:underline text-sm truncate block",
                url.userIntent === 'auto' && "text-blue-600",
                url.userIntent === 'ignore' && "text-gray-400",
                url.userIntent === 'priority' && "text-orange-600",
                url.userIntent === 'manual_only' && "text-green-600",
                !url.userIntent && "text-blue-600" // fallback to blue if no intent
              )}
              title={url.url}
              onClick={(e) => e.stopPropagation()}
            >
              {formatUrlForDisplay(url.url)}
            </a>
          </div>
          {url.domain && (
            <div className="font-mono text-xs text-gray-500 mt-1">
              <span className="">
                {url.id.toString()}
              </span>
              <span> - </span>
 
              <span className="">
                {
                  url.domain
                    .replace('www.', '')
                    .replace('http://', '')
                    .replace('https://', '')
                    .replace('/', '')
                }
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Processing Status */}
      <td className="px-4 py-3">
        <ProcessingStatusBadge
          status={url.processingStatus || 'not_started'}
          showLabel={!compact}
          size={compact ? "sm" : "md"}
        />
      </td>

      {/* IDs */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {url.analysisData?.validIdentifiers?.length || 0} / {url.enrichment?.customIdentifiers?.length || 0}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddIdentifier?.();
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
            title="Add custom identifier"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </td>

      {/* Capabilities */}
      {!compact && (
        <td className="px-4 py-3">
          {url.capability && (
            <CapabilitySummary capability={url.capability} />
          )}
        </td>
      )}

      {/* Processing Attempts */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {url.processingAttempts || 0}
          </span>
          {(url.processingAttempts || 0) > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open processing history modal
                onViewHistory?.();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="View processing history"
            >
              <Eye className="h-3 w-3 text-gray-600" />
            </button>
          )}
        </div>
      </td>

      {/* Citation Status */}
      <td className="px-4 py-3 text-center">
        {url.citationValidationStatus && url.processingStatus?.startsWith('stored') && (
          <CitationStatusIndicator
            status={url.citationValidationStatus as CitationStatus}
            missingFields={url.citationValidationDetails?.missingFields}
          />
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-2">
        <div className="flex justify-end gap-1">
          {/* Primary Action Button */}
          {canProcess && onProcess && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                onProcess();
              }}
              disabled={isProcessing}
              title="Process with Zotero (auto-cascades on failure)"
            >
              <Database className="h-4 w-4" />
              {!compact && <span className="ml-1">Process</span>}
            </Button>
          )}

          {/* More Actions Dropdown Menu */}
          {sortedDropdownActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isProcessing}
                  title="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {/* Primary Actions */}
                {actions.includes('process_content') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onProcessContent?.();
                    }}
                    disabled={isProcessing || !onProcessContent}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Fetch Content & Extract IDs
                  </DropdownMenuItem>
                )}

                {actions.includes('extract_semantic_scholar') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onExtractSemanticScholar?.();
                    }}
                    disabled={isProcessing || !onExtractSemanticScholar}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Extract BibTeX Citation
                  </DropdownMenuItem>
                )}

                {actions.includes('select_identifier') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIdentifier?.();
                    }}
                    disabled={isProcessing || !onSelectIdentifier}
                  >
                    <Hand className="h-4 w-4 mr-2" />
                    Select Identifier
                  </DropdownMenuItem>
                )}

                {actions.includes('approve_metadata') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onApproveMetadata?.();
                    }}
                    disabled={isProcessing || !onApproveMetadata}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Review & Approve Metadata
                  </DropdownMenuItem>
                )}

                {actions.includes('edit_citation') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCitation?.();
                    }}
                    disabled={isProcessing || !onEditCitation}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Citation
                  </DropdownMenuItem>
                )}

                {actions.includes('manual_create') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onManualCreate?.();
                    }}
                    disabled={isProcessing || !onManualCreate}
                  >
                    <FilePlus className="h-4 w-4 mr-2" />
                    Create Manual Item
                  </DropdownMenuItem>
                )}

                {actions.includes('retry') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry?.();
                    }}
                    disabled={isProcessing || !onRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Processing
                  </DropdownMenuItem>
                )}

                {/* Separator before management actions */}
                {(actions.includes('unlink') || actions.includes('reset') || actions.includes('ignore') || actions.includes('unignore') || actions.includes('archive') || actions.includes('delete_item')) && (
                  <DropdownMenuSeparator />
                )}

                {/* Management Actions */}
                {actions.includes('unlink') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnlink?.();
                    }}
                    disabled={isProcessing || !onUnlink}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink from Zotero
                  </DropdownMenuItem>
                )}

                {actions.includes('reset') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReset?.();
                    }}
                    disabled={isProcessing || !onReset}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Processing State
                  </DropdownMenuItem>
                )}

                {actions.includes('ignore') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onIgnore?.();
                    }}
                    disabled={isProcessing || !onIgnore}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Mark as Ignored
                  </DropdownMenuItem>
                )}

                {actions.includes('unignore') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnignore?.();
                    }}
                    disabled={isProcessing || !onUnignore}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Remove Ignore
                  </DropdownMenuItem>
                )}

                {actions.includes('archive') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive?.();
                    }}
                    disabled={isProcessing || !onArchive}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}

                {actions.includes('delete_item') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem?.();
                    }}
                    disabled={isProcessing || !onDeleteItem}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Delete Zotero Item
                  </DropdownMenuItem>
                )}

                {/* Separator before view history */}
                {actions.includes('view_history') && (
                  <DropdownMenuSeparator />
                )}

                {/* View History */}
                {actions.includes('view_history') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewHistory?.();
                    }}
                    disabled={!onViewHistory}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Processing History
                  </DropdownMenuItem>
                )}

                {/* Separator before destructive actions */}
                {actions.includes('delete') && (
                  <DropdownMenuSeparator />
                )}

                {/* Destructive Actions */}
                {actions.includes('delete') && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    disabled={isProcessing || !onDelete}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete URL
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  );
}

