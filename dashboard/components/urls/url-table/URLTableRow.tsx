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
import { IntentBadge } from '../url-status/IntentBadge';
import { CitationStatusIndicator, type CitationStatus } from '../citation-status-indicator';
import { Button } from '@/components/ui/button';
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
  Plus,
} from 'lucide-react';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';

interface URLTableRowProps {
  url: UrlWithCapabilitiesAndStatus | any; // Accept any for backward compatibility
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
  onMoreActions?: () => void;
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
  onMoreActions,
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
  const canUnlink = actions.includes('unlink');
  const canEditCitation = actions.includes('edit_citation');
  const canSelectIdentifier = actions.includes('select_identifier');
  const canApproveMetadata = actions.includes('approve_metadata');
  const canManualCreate = actions.includes('manual_create');
  const canReset = actions.includes('reset');

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
      <td className="px-4 py-3 max-w-[300px]">
        <div className="flex flex-col gap-1">
          <a
            href={url.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm truncate block"
            title={url.url}
            onClick={(e) => e.stopPropagation()}
          >
            {formatUrlForDisplay(url.url)}
          </a>
          {url.domain && (
            <span className="text-xs text-gray-500">{url.domain}</span>
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

      {/* User Intent */}
      {!compact && (
        <td className="px-4 py-3">
          <IntentBadge
            intent={url.userIntent || 'auto'}
            size="sm"
          />
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
                onMoreActions?.();
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
        <div className="flex justify-end gap-0">
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

          {canSelectIdentifier && onSelectIdentifier && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                onSelectIdentifier();
              }}
              disabled={isProcessing}
              title="Select identifier to process"
            >
              <Hand className="h-4 w-4" />
              {!compact && <span className="ml-1">Select ID</span>}
            </Button>
          )}

          {canApproveMetadata && onApproveMetadata && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onApproveMetadata();
              }}
              disabled={isProcessing}
              title="Review and approve extracted metadata"
            >
              <CheckSquare className="h-4 w-4" />
              {!compact && <span className="ml-1">Review</span>}
            </Button>
          )}

          {canEditCitation && onEditCitation && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEditCitation();
              }}
              disabled={isProcessing}
              title="Edit citation metadata"
            >
              <Edit className="h-4 w-4" />
              {!compact && <span className="ml-1">Edit</span>}
            </Button>
          )}

          {canUnlink && onUnlink && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onUnlink();
              }}
              disabled={isProcessing}
              title="Unlink from Zotero"
            >
              <Unlink className="h-4 w-4" />
            </Button>
          )}

          {canReset && onReset && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              disabled={isProcessing}
              title="Reset processing state"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {canManualCreate && onManualCreate && (url.processingStatus === 'exhausted' || (url.processingAttempts || 0) >= 3) && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onManualCreate();
              }}
              disabled={isProcessing}
              title="Create custom Zotero item manually"
            >
              <FilePlus className="h-4 w-4" />
              {!compact && <span className="ml-1">Manual</span>}
            </Button>
          )}

          {/* More Actions Menu */}
          {onMoreActions && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMoreActions();
              }}
              disabled={isProcessing}
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

