/**
 * URL Table Component (New Implementation)
 * 
 * Main orchestrator component for the URL management interface.
 * Brings together all Phase 3 components into a cohesive UI.
 * 
 * Features:
 * - Comprehensive filtering
 * - Bulk selection and operations
 * - Individual URL actions
 * - Detail panel
 * - Pagination
 * - Loading states
 * - Error handling
 * 
 * Based on PRD Section 8: Component Architecture
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useURLFilters } from './hooks/useURLFilters';
import { useURLSelection } from './hooks/useURLSelection';
import { useURLProcessing } from './hooks/useURLProcessing';
import { getUrlsWithCapabilities } from '@/lib/actions/url-with-capabilities';
import { getSections, getUniqueDomains, deleteUrls } from '@/lib/actions/urls';
import { startBatchProcessing } from '@/lib/actions/batch-actions';
import { unlinkUrlFromZotero } from '@/lib/actions/zotero';
import { resetProcessingState, ignoreUrl, unignoreUrl, archiveUrl } from '@/lib/actions/state-transitions';
import { retryFailedUrl } from '@/lib/actions/process-url-action';
import { URLTableFilters } from './URLTableFilters';
import { URLTableBulkActions } from './URLTableBulkActions';
import { URLTableRow } from './URLTableRow';
import { URLDetailPanel } from '../url-detail-panel';
import { ManualCreateModal } from '../url-modals/ManualCreateModal';
import { EditCitationModal } from '../url-modals/EditCitationModal';
import { IdentifierSelectionModal } from '../url-modals/IdentifierSelectionModal';
import { ProcessingHistoryModal } from '../url-modals/ProcessingHistoryModal';
import { AddIdentifierModal } from '../add-identifier-modal';
import { BatchProgressModal } from '../batch-progress-modal';
import { Button } from '@/components/ui/button';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import type { Section } from '@/drizzle/schema';

interface URLTableNewProps {
  initialUrls?: UrlWithCapabilitiesAndStatus[];
  initialTotalPages?: number;
}

/**
 * URL Table Component
 * 
 * Main table component with filters, bulk actions, and detail panel
 */
export function URLTableNew({ 
  initialUrls = [],
  initialTotalPages = 1,
}: URLTableNewProps) {
  // Data state
  const [urls, setUrls] = useState<UrlWithCapabilitiesAndStatus[]>(initialUrls);
  const [sections, setSections] = useState<Section[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Detail panel state
  const [selectedUrlForDetail, setSelectedUrlForDetail] = useState<UrlWithCapabilitiesAndStatus | null>(null);
  
  // Modal states
  const [manualCreateModalOpen, setManualCreateModalOpen] = useState(false);
  const [manualCreateUrlId, setManualCreateUrlId] = useState<number | null>(null);
  const [editCitationModalOpen, setEditCitationModalOpen] = useState(false);
  const [editCitationData, setEditCitationData] = useState<{ urlId: number; itemKey: string } | null>(null);
  const [identifierSelectionModalOpen, setIdentifierSelectionModalOpen] = useState(false);
  const [identifierSelectionUrlId, setIdentifierSelectionUrlId] = useState<number | null>(null);
  const [processingHistoryModalOpen, setProcessingHistoryModalOpen] = useState(false);
  const [processingHistoryData, setProcessingHistoryData] = useState<{ urlId: number; url: string; history: any[] } | null>(null);
  const [addIdentifierModalOpen, setAddIdentifierModalOpen] = useState(false);
  const [addIdentifierUrlId, setAddIdentifierUrlId] = useState<number | null>(null);
  const [batchProgressModalOpen, setBatchProgressModalOpen] = useState(false);
  const [batchUrlIds, setBatchUrlIds] = useState<number[]>([]);

  // Custom hooks
  const filters = useURLFilters();
  const selection = useURLSelection(urls);
  const processing = useURLProcessing();
  
  // Ref for the select-all checkbox to set indeterminate property
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  
  // Update indeterminate property when selection changes
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = selection.someSelected;
    }
  }, [selection.someSelected]);

  /**
   * Load filter options (sections and domains)
   */
  const loadFilterOptions = useCallback(async () => {
    const [sectionsResult, domainsResult] = await Promise.all([
      getSections(),
      getUniqueDomains(),
    ]);

    if (sectionsResult.success && sectionsResult.data) {
      setSections(sectionsResult.data);
    }

    if (domainsResult.success && domainsResult.data) {
      setDomains(domainsResult.data);
    }
  }, []);

  /**
   * Load URLs with current filters and pagination
   */
  const loadUrls = useCallback(async (page: number = currentPage) => {
    setIsLoading(true);
    processing.clearMessages();

    try {
      const result = await getUrlsWithCapabilities(
        filters.getServerFilters(),
        { page, pageSize: 100 }
      );

      if (result.success && result.data) {
        setUrls(result.data.urls);
        setTotalPages(result.data.pagination.totalPages);
        setTotalCount(result.data.pagination.totalCount);
        setCurrentPage(page);
      } else {
        processing.clearMessages();
        // Would set error here if we had error state
        console.error('Failed to load URLs:', result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters, processing]);

  /**
   * Handle filter apply
   */
  const handleApplyFilters = useCallback(() => {
    filters.syncToURL();
    loadUrls(1); // Reset to first page
    selection.clear();
  }, [filters, loadUrls, selection]);

  /**
   * Handle bulk process - Opens progress modal
   */
  const handleBulkProcess = useCallback(async (urlIds: number[]) => {
    // Store URL IDs and open modal
    setBatchUrlIds(urlIds);
    setBatchProgressModalOpen(true);
  }, []);

  /**
   * Start batch processing (called from modal)
   */
  const handleStartBatchProcessing = useCallback(async () => {
    const session = await processing.processBatch(batchUrlIds, {
      concurrency: 5,
      respectUserIntent: true,
      onProgress: (progress) => {
        console.log(`Batch progress: ${progress?.percentage.toFixed(1)}%`);
      },
    });

    // Reload URLs after batch completes
    await loadUrls();
    selection.clear();
    
    return session;
  }, [processing, batchUrlIds, loadUrls, selection]);

  /**
   * Handle single URL processing
   */
  const handleProcessSingle = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    await processing.processSingle(url.id, url.url);
    await loadUrls();
  }, [processing, loadUrls]);

  /**
   * Handle URL click (open detail panel)
   */
  const handleUrlClick = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    setSelectedUrlForDetail(url);
  }, []);

  /**
   * Handle detail panel close
   */
  const handleDetailPanelClose = useCallback(() => {
    setSelectedUrlForDetail(null);
  }, []);

  /**
   * Handle detail panel update (refresh data)
   */
  const handleDetailPanelUpdate = useCallback(async () => {
    await loadUrls();
    // Refresh the selected URL for detail panel
    if (selectedUrlForDetail) {
      const updatedUrl = urls.find(u => u.id === selectedUrlForDetail.id);
      if (updatedUrl) {
        setSelectedUrlForDetail(updatedUrl);
      }
    }
  }, [loadUrls, selectedUrlForDetail, urls]);

  /**
   * Modal handlers
   */
  const handleManualCreate = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    setManualCreateUrlId(url.id);
    setManualCreateModalOpen(true);
  }, []);

  const handleEditCitation = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    if (url.zoteroItemKey) {
      setEditCitationData({ urlId: url.id, itemKey: url.zoteroItemKey });
      setEditCitationModalOpen(true);
    }
  }, []);

  const handleSelectIdentifier = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    setIdentifierSelectionUrlId(url.id);
    setIdentifierSelectionModalOpen(true);
  }, []);

  const handleAddIdentifier = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    setAddIdentifierUrlId(url.id);
    setAddIdentifierModalOpen(true);
  }, []);

  const handleIdentifierAdded = useCallback(async () => {
    setAddIdentifierModalOpen(false);
    setAddIdentifierUrlId(null);
    await loadUrls();
  }, [loadUrls]);

  const handleApproveMetadata = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    // TODO: Implement metadata approval modal trigger
    console.log('Approve metadata for URL:', url.id);
  }, []);

  const handleViewHistory = useCallback((url: UrlWithCapabilitiesAndStatus) => {
    setProcessingHistoryData({
      urlId: url.id,
      url: url.url,
      history: url.processingHistory || [],
    });
    setProcessingHistoryModalOpen(true);
  }, []);

  const handleUnlink = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const confirmed = confirm('Unlink this URL from Zotero? The URL will return to "not_started" state.');
    if (!confirmed) return;

    const result = await unlinkUrlFromZotero(url.id);
    if (result.success) {
      await loadUrls();
    } else {
      alert(`Failed to unlink: ${result.error}`);
    }
  }, [loadUrls]);

  const handleReset = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const confirmed = confirm('Reset processing state? This will clear all processing history for this URL.');
    if (!confirmed) return;

    const result = await resetProcessingState(url.id);
    if (result.success) {
      await loadUrls();
    } else {
      alert(`Failed to reset: ${result.error}`);
    }
  }, [loadUrls]);

  const handleIgnore = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const result = await ignoreUrl(url.id);
    if (result.success) {
      await loadUrls();
      // Update detail panel if this URL is selected
      if (selectedUrlForDetail?.id === url.id) {
        const updatedUrl = urls.find(u => u.id === url.id);
        if (updatedUrl) {
          setSelectedUrlForDetail(updatedUrl);
        }
      }
    } else {
      alert(`Failed to ignore URL: ${result.error}`);
    }
  }, [loadUrls, selectedUrlForDetail, urls]);

  const handleUnignore = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const result = await unignoreUrl(url.id);
    if (result.success) {
      await loadUrls();
      // Update detail panel if this URL is selected
      if (selectedUrlForDetail?.id === url.id) {
        const updatedUrl = urls.find(u => u.id === url.id);
        if (updatedUrl) {
          setSelectedUrlForDetail(updatedUrl);
        }
      }
    } else {
      alert(`Failed to unignore URL: ${result.error}`);
    }
  }, [loadUrls, selectedUrlForDetail, urls]);

  const handleArchive = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const result = await archiveUrl(url.id);
    if (result.success) {
      await loadUrls();
      // Update detail panel if this URL is selected
      if (selectedUrlForDetail?.id === url.id) {
        const updatedUrl = urls.find(u => u.id === url.id);
        if (updatedUrl) {
          setSelectedUrlForDetail(updatedUrl);
        }
      }
    } else {
      alert(`Failed to archive URL: ${result.error}`);
    }
  }, [loadUrls, selectedUrlForDetail, urls]);

  const handleDelete = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const confirmed = confirm(`Are you sure you want to delete this URL?\n\nURL: ${url.url}\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    const result = await deleteUrls([url.id]);
    if (result.success) {
      // Close detail panel if this URL was selected
      if (selectedUrlForDetail?.id === url.id) {
        setSelectedUrlForDetail(null);
      }
      await loadUrls();
    } else {
      alert(`Failed to delete URL: ${result.error}`);
    }
  }, [loadUrls, selectedUrlForDetail]);

  const handleRetry = useCallback(async (url: UrlWithCapabilitiesAndStatus) => {
    const result = await retryFailedUrl(url.id);
    if (result.success) {
      await loadUrls();
      // Update detail panel if this URL is selected
      if (selectedUrlForDetail?.id === url.id) {
        const updatedUrl = urls.find(u => u.id === url.id);
        if (updatedUrl) {
          setSelectedUrlForDetail(updatedUrl);
        }
      }
    } else {
      alert(`Failed to retry processing: ${result.error || 'Unknown error'}`);
    }
  }, [loadUrls, selectedUrlForDetail, urls]);

  /**
   * Load filter options on mount
   */
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const isDetailPaneOpen = selectedUrlForDetail !== null;
  
  // Get current URL for manual create
  const manualCreateUrl = manualCreateUrlId ? urls.find(u => u.id === manualCreateUrlId) : null;

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Main Content Area */}
      <div className={isDetailPaneOpen ? 'flex-1 overflow-y-auto overflow-x-hidden min-w-0' : 'w-full overflow-y-auto overflow-x-hidden'}>
        {/* Sticky Header Zone */}
        <div className="sticky top-0 z-20 pb-4 space-y-4">
          {/* Filters */}
          <URLTableFilters
            filters={filters.filters}
            sections={sections}
            domains={domains}
            activeCount={filters.activeCount}
            onChange={filters.updateFilter}
            onClear={filters.clear}
            onApply={handleApplyFilters}
            isPending={isLoading}
          />

          {/* Error Message */}
          {processing.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {processing.error}
            </div>
          )}

          {/* Success Message */}
          {processing.successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
              {processing.successMessage}
            </div>
          )}

          {/* Bulk Actions */}
          {selection.hasSelection && (
            <URLTableBulkActions
              selectedCount={selection.count}
              selectedIds={selection.ids}
              onProcessBatch={handleBulkProcess}
              onActionComplete={handleDetailPanelUpdate}
              isProcessing={processing.isProcessing}
            />
          )}
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-[50px]">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={selection.allSelected}
                    onChange={selection.toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  IDs
                </th>
                {!isDetailPaneOpen && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Methods
                  </th>
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
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={isDetailPaneOpen ? 7 : 8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : urls.length === 0 ? (
                <tr>
                  <td colSpan={isDetailPaneOpen ? 7 : 8} className="px-4 py-8 text-center text-gray-500">
                    No URLs found
                  </td>
                </tr>
              ) : (
                  urls.map((url) => (
                  <URLTableRow
                    key={url.id}
                    url={url}
                    selected={selection.isSelected(url.id)}
                    onSelect={(checked) => selection.toggle(url.id)}
                    onClick={() => handleUrlClick(url)}
                    onProcess={() => handleProcessSingle(url)}
                    onUnlink={() => handleUnlink(url)}
                    onEditCitation={() => handleEditCitation(url)}
                    onSelectIdentifier={() => handleSelectIdentifier(url)}
                    onAddIdentifier={() => handleAddIdentifier(url)}
                    onApproveMetadata={() => handleApproveMetadata(url)}
                    onManualCreate={() => handleManualCreate(url)}
                    onReset={() => handleReset(url)}
                    onIgnore={() => handleIgnore(url)}
                    onUnignore={() => handleUnignore(url)}
                    onArchive={() => handleArchive(url)}
                    onDelete={() => handleDelete(url)}
                    onRetry={() => handleRetry(url)}
                    onViewHistory={() => handleViewHistory(url)}
                    isProcessing={processing.isProcessing}
                    compact={isDetailPaneOpen}
                    isDetailSelected={selectedUrlForDetail?.id === url.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 bg-white border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadUrls(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadUrls(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedUrlForDetail && (
        <div className="w-[500px] shrink-0">
          <div className="sticky top-0 h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border bg-white border-gray-200 shadow-sm">
            <URLDetailPanel
              url={selectedUrlForDetail}
              onClose={handleDetailPanelClose}
              onUpdate={handleDetailPanelUpdate}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {manualCreateUrl && (
        <ManualCreateModal
          open={manualCreateModalOpen}
          onOpenChange={setManualCreateModalOpen}
          urlId={manualCreateUrl.id}
          url={manualCreateUrl.url}
          isPDF={manualCreateUrl.capability?.isPDF || false}
          onSuccess={() => {
            setManualCreateModalOpen(false);
            loadUrls();
          }}
        />
      )}

      {editCitationData && (
        <EditCitationModal
          open={editCitationModalOpen}
          onOpenChange={setEditCitationModalOpen}
          urlId={editCitationData.urlId}
          itemKey={editCitationData.itemKey}
          onSuccess={() => {
            setEditCitationModalOpen(false);
            loadUrls();
          }}
        />
      )}

      {identifierSelectionUrlId && (
        <IdentifierSelectionModal
          open={identifierSelectionModalOpen}
          onOpenChange={setIdentifierSelectionModalOpen}
          urlId={identifierSelectionUrlId}
          onSuccess={() => {
            setIdentifierSelectionModalOpen(false);
            loadUrls();
          }}
        />
      )}

      {processingHistoryData && (
        <ProcessingHistoryModal
          open={processingHistoryModalOpen}
          onOpenChange={setProcessingHistoryModalOpen}
          urlId={processingHistoryData.urlId}
          url={processingHistoryData.url}
          history={processingHistoryData.history}
          onUpdate={handleDetailPanelUpdate}
        />
      )}

      {/* Add Identifier Modal */}
      {addIdentifierUrlId !== null && (
        <AddIdentifierModal
          urlId={addIdentifierUrlId}
          open={addIdentifierModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAddIdentifierModalOpen(false);
              setAddIdentifierUrlId(null);
            }
          }}
          onSuccess={handleIdentifierAdded}
        />
      )}

      {/* Batch Progress Modal */}
      <BatchProgressModal
        open={batchProgressModalOpen}
        onOpenChange={setBatchProgressModalOpen}
        urlIds={batchUrlIds}
        onProcessingStart={handleStartBatchProcessing}
        session={processing.batchSession}
        progress={processing.batchProgress}
        onPause={processing.pauseCurrentBatch}
        onResume={processing.resumeCurrentBatch}
        onCancel={processing.cancelCurrentBatch}
        isProcessing={processing.isProcessing}
      />
    </div>
  );
}

