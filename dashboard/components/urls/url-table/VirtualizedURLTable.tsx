/**
 * Virtualized URL Table
 * 
 * Optimized table for large datasets (1000+ URLs) using virtualization.
 * Only renders visible rows, significantly improving performance.
 * 
 * Uses react-window for virtualization (add to package.json if needed)
 */

'use client';

import { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { URLTableRow } from './URLTableRow';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';

interface VirtualizedURLTableProps {
  urls: UrlWithCapabilitiesAndStatus[];
  selectedIds: Set<number>;
  onSelect: (urlId: number, selected: boolean) => void;
  onRowClick: (url: UrlWithCapabilitiesAndStatus) => void;
  onProcess: (url: UrlWithCapabilitiesAndStatus) => void;
  onUnlink?: (urlId: number) => void;
  onEditCitation?: (urlId: number) => void;
  onSelectIdentifier?: (urlId: number) => void;
  onApproveMetadata?: (urlId: number) => void;
  onManualCreate?: (urlId: number) => void;
  onReset?: (urlId: number) => void;
  onLinkToItem?: (urlId: number) => void;
  isProcessing?: boolean;
  compact?: boolean;
  height?: number; // Table height in pixels
  rowHeight?: number; // Row height in pixels
}

/**
 * Virtualized URL Table Component
 * 
 * Renders only visible rows for optimal performance with large datasets
 */
export function VirtualizedURLTable({
  urls,
  selectedIds,
  onSelect,
  onRowClick,
  onProcess,
  onUnlink,
  onEditCitation,
  onSelectIdentifier,
  onApproveMetadata,
  onManualCreate,
  onReset,
  onLinkToItem,
  isProcessing,
  compact = false,
  height = 600,
  rowHeight = 60,
}: VirtualizedURLTableProps) {
  /**
   * Row renderer for react-window
   */
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const url = urls[index];

    return (
      <div style={style}>
        <table className="w-full">
          <tbody>
            <URLTableRow
              url={url}
              selected={selectedIds.has(url.id)}
              onSelect={(checked) => onSelect(url.id, checked)}
              onClick={() => onRowClick(url)}
              onProcess={() => onProcess(url)}
              onUnlink={onUnlink ? () => onUnlink(url.id) : undefined}
              onEditCitation={onEditCitation ? () => onEditCitation(url.id) : undefined}
              onSelectIdentifier={onSelectIdentifier ? () => onSelectIdentifier(url.id) : undefined}
              onApproveMetadata={onApproveMetadata ? () => onApproveMetadata(url.id) : undefined}
              onManualCreate={onManualCreate ? () => onManualCreate(url.id) : undefined}
              onReset={onReset ? () => onReset(url.id) : undefined}
              onLinkToItem={onLinkToItem ? () => onLinkToItem(url.id) : undefined}
              isProcessing={isProcessing}
              compact={compact}
            />
          </tbody>
        </table>
      </div>
    );
  }, [urls, selectedIds, onSelect, onRowClick, onProcess, onUnlink, onEditCitation, onSelectIdentifier, onApproveMetadata, onManualCreate, onReset, onLinkToItem, isProcessing, compact]);

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 border-b">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === urls.length && urls.length > 0}
                  onChange={(e) => {
                    // Handle select all
                    urls.forEach(url => onSelect(url.id, e.target.checked));
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Status
              </th>
              {!compact && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Methods
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Intent
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                Attempts
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                Citation
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtualized Rows */}
      <List
        height={height}
        itemCount={urls.length}
        itemSize={rowHeight}
        width="100%"
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}

/**
 * Hook to determine if virtualization should be used
 * Based on dataset size
 */
export function useVirtualization(itemCount: number, threshold: number = 1000): boolean {
  return itemCount >= threshold;
}

