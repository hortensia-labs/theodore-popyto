'use client';

import { useState, useTransition, useEffect } from 'react';
import { Plus, Eye, Database, RefreshCw, Unlink } from 'lucide-react';
import { getUrls, deleteUrls, getUniqueDomains, getSections } from '@/lib/actions/urls';
import { getEnrichmentsForUrls } from '@/lib/actions/enrichments';
import { processUrlWithZotero, unlinkUrlFromZotero, deleteZoteroItemAndUnlink, bulkUnlinkFromZotero, bulkDeleteZoteroItemsAndUnlink } from '@/lib/actions/zotero';
import { type UrlWithStatus, type UrlStatus } from '@/lib/db/computed';
import { type Section } from '@/lib/db/schema';
import { StatusBadge } from '../status-badge';
import { Button } from '../ui/button';
import { AddIdentifierModal } from './add-identifier-modal';
import { PreviewModal } from './preview-modal';
import { URLDetailPanel } from './url-detail-panel/url-detail-panel';
import { ProcessingProgressModal, type ProcessingLogEntry } from './processing-progress-modal';
import { UnlinkConfirmationModal } from './unlink-confirmation-modal';
import { CitationStatusIndicator, type CitationStatus } from './citation-status-indicator';
import { formatUrlForDisplay } from '@/lib/utils';

interface URLTableProps {
  initialUrls?: UrlWithStatus[];
  initialTotalPages?: number;
}

export function URLTable({ initialUrls = [], initialTotalPages = 1 }: URLTableProps) {
  const [isPending, startTransition] = useTransition();
  const [urls, setUrls] = useState<UrlWithStatus[]>(initialUrls);
  const [selectedUrls, setSelectedUrls] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<UrlStatus | ''>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedCitationStatus, setSelectedCitationStatus] = useState<'valid' | 'incomplete' | ''>('');
  
  // Filter options
  const [sections, setSections] = useState<Section[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  
  // Enrichments data
  const [enrichments, setEnrichments] = useState<Record<number, { customIdentifiers?: string[] | null }>>({});
  
  // Modal state
  const [modalUrlId, setModalUrlId] = useState<number | null>(null);
  const [previewIdentifier, setPreviewIdentifier] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Detail panel state
  const [selectedUrlForDetail, setSelectedUrlForDetail] = useState<UrlWithStatus | null>(null);
  
  // Processing state
  const [processingModalOpen, setProcessingModalOpen] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<ProcessingLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAborted, setProcessingAborted] = useState(false);
  
  // Unlink state
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [urlsToUnlink, setUrlsToUnlink] = useState<number[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load filters on mount
  useEffect(() => {
    async function loadFilters() {
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
    }
    
    loadFilters();
    
    // Load initial enrichments
    if (initialUrls.length > 0) {
      const urlIds = initialUrls.map(u => u.id);
      getEnrichmentsForUrls(urlIds).then(result => {
        if (result.success && result.data) {
          setEnrichments(result.data);
        }
      });
    }
  }, [initialUrls]);

  async function loadUrls(page: number = 1) {
    startTransition(async () => {
      setError(null);
      
      const filters: Record<string, string | number | undefined> = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedStatus) filters.status = selectedStatus;
      if (selectedDomain) filters.domain = selectedDomain;
      if (selectedCitationStatus) filters.citationStatus = selectedCitationStatus;
      
      // Find section ID if section name is selected
      if (selectedSection) {
        const section = sections.find(s => s.name === selectedSection);
        if (section) filters.sectionId = section.id;
      }
      
      const result = await getUrls(filters, { page, pageSize: 100 });
      
      if (result.success && result.data) {
        setUrls(result.data.urls);
        setTotalPages(result.data.pagination.totalPages);
        setTotalCount(result.data.pagination.totalCount);
        setCurrentPage(page);
        
        // Fetch enrichments for the loaded URLs
        const urlIds = result.data.urls.map(u => u.id);
        const enrichmentsResult = await getEnrichmentsForUrls(urlIds);
        if (enrichmentsResult.success && enrichmentsResult.data) {
          setEnrichments(enrichmentsResult.data);
        }
      } else {
        setError(result.error || 'Unknown error loading URLs');
      }
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedUrls(new Set(urls.map(u => u.id)));
    } else {
      setSelectedUrls(new Set());
    }
  }

  function handleSelectUrl(urlId: number, checked: boolean) {
    const newSelected = new Set(selectedUrls);
    if (checked) {
      newSelected.add(urlId);
    } else {
      newSelected.delete(urlId);
    }
    setSelectedUrls(newSelected);
  }

  async function handleBulkDelete() {
    if (selectedUrls.size === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedUrls.size} URL(s)?`);
    if (!confirmed) return;
    
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      
      const result = await deleteUrls(Array.from(selectedUrls));
      
      if (result.success) {
        setSuccessMessage(`Successfully deleted ${selectedUrls.size} URL(s)`);
        setSelectedUrls(new Set());
        await loadUrls(currentPage);
      } else {
        setError(result.error || 'Unknown error deleting URLs');
      }
    });
  }

  function handleAddIdentifier(urlId: number) {
    setModalUrlId(urlId);
  }

  async function handleIdentifierAdded() {
    // Reload URLs to refresh status (which now considers custom identifiers)
    await loadUrls(currentPage);
    setModalUrlId(null);
  }

  function handleFilterChange() {
    loadUrls(1);
  }

  function handleRowClick(url: UrlWithStatus, event: React.MouseEvent<HTMLTableRowElement>) {
    // Don't open detail panel if clicking on interactive elements
    const target = event.target as HTMLElement;
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
    
    setSelectedUrlForDetail(url);
  }

  function handleCloseDetailPanel() {
    setSelectedUrlForDetail(null);
  }

  function handleDetailUpdate() {
    // Reload URLs to refresh data
    loadUrls(currentPage);
  }

  // Zotero processing handlers
  async function handleProcessSingle(url: UrlWithStatus) {
    // Prepare logs
    const logs: ProcessingLogEntry[] = [{
      urlId: url.id,
      url: url.url,
      status: 'pending',
    }];
    
    setProcessingLogs(logs);
    setProcessingModalOpen(true);
    setIsProcessing(true);
    setProcessingAborted(false);
    
    // Update status to processing
    setProcessingLogs(prev => prev.map(log =>
      log.urlId === url.id ? { ...log, status: 'processing' } : log
    ));
    
    // Process URL
    const result = await processUrlWithZotero(url.id);
    
    // Update log with result
    setProcessingLogs(prev => prev.map(log =>
      log.urlId === url.id
        ? {
            ...log,
            status: result.success ? 'success' : 'failed',
            itemKey: result.itemKey,
            error: result.error,
            isExisting: result.isExisting,
          }
        : log
    ));
    
    setIsProcessing(false);
    
    // Refresh URLs
    await loadUrls(currentPage);
    
    // Show success/error message
    if (result.success) {
      setSuccessMessage(`Successfully processed URL and stored in Zotero`);
    } else {
      setError(result.error || 'Processing failed');
    }
  }

  async function handleBulkProcess() {
    if (selectedUrls.size === 0) return;
    
    // Filter URLs that can be processed
    const processableUrls = urls.filter(url =>
      selectedUrls.has(url.id) &&
      (url.status === 'extractable' || url.status === 'translatable')
    );
    
    if (processableUrls.length === 0) {
      setError('No processable URLs selected. Only URLs with status "extractable" or "translatable" can be processed.');
      return;
    }
    
    const confirmed = confirm(
      `Process ${processableUrls.length} URL(s) with Zotero?\n\n` +
      `This will fetch bibliographic data and store items in your Zotero library.`
    );
    
    if (!confirmed) return;
    
    // Prepare logs
    const logs: ProcessingLogEntry[] = processableUrls.map(url => ({
      urlId: url.id,
      url: url.url,
      status: 'pending',
    }));
    
    setProcessingLogs(logs);
    setProcessingModalOpen(true);
    setIsProcessing(true);
    setProcessingAborted(false);
    
    // Process URLs
    for (let i = 0; i < processableUrls.length; i++) {
      if (processingAborted) {
        // Mark remaining as failed
        setProcessingLogs(prev => prev.map(log =>
          log.status === 'pending' ? { ...log, status: 'failed', error: 'Processing cancelled' } : log
        ));
        break;
      }
      
      const url = processableUrls[i];
      
      // Update status to processing
      setProcessingLogs(prev => prev.map(log =>
        log.urlId === url.id ? { ...log, status: 'processing' } : log
      ));
      
      // Process URL
      const result = await processUrlWithZotero(url.id);
      
      // Update log with result
      setProcessingLogs(prev => prev.map(log =>
        log.urlId === url.id
          ? {
              ...log,
              status: result.success ? 'success' : 'failed',
              itemKey: result.itemKey,
              error: result.error,
              isExisting: result.isExisting,
            }
          : log
      ));
    }
    
    setIsProcessing(false);
    
    // Refresh URLs
    await loadUrls(currentPage);
    
    // Show summary
    const successCount = processingLogs.filter(l => l.status === 'success').length;
    const failedCount = processingLogs.filter(l => l.status === 'failed').length;
    
    if (failedCount === 0) {
      setSuccessMessage(`Successfully processed ${successCount} URL(s)`);
    } else {
      setError(`Processed ${successCount} URL(s) successfully, ${failedCount} failed`);
    }
    
    // Clear selection
    setSelectedUrls(new Set());
  }

  function handleCancelProcessing() {
    setProcessingAborted(true);
  }

  function handleCloseProcessingModal() {
    setProcessingModalOpen(false);
    setProcessingLogs([]);
  }

  // Unlink handlers
  function handleUnlinkSingle(urlId: number) {
    setUrlsToUnlink([urlId]);
    setUnlinkModalOpen(true);
  }

  function handleBulkUnlink() {
    // Filter only stored URLs
    const storedUrls = urls.filter(url =>
      selectedUrls.has(url.id) && url.status === 'stored'
    );
    
    if (storedUrls.length === 0) {
      setError('No stored URLs selected. Only URLs with status "stored" can be unlinked.');
      return;
    }
    
    setUrlsToUnlink(storedUrls.map(url => url.id));
    setUnlinkModalOpen(true);
  }

  async function handleUnlinkOnly() {
    setError(null);
    setSuccessMessage(null);
    
    startTransition(async () => {
      if (urlsToUnlink.length === 1) {
        // Single unlink
        const result = await unlinkUrlFromZotero(urlsToUnlink[0]);
        
        if (result.success) {
          setSuccessMessage('Successfully unlinked from Zotero (item kept in library)');
          await loadUrls(currentPage);
        } else {
          setError(result.error || 'Unlink failed');
        }
      } else {
        // Bulk unlink
        const result = await bulkUnlinkFromZotero(urlsToUnlink);
        
        if (result.successful > 0) {
          setSuccessMessage(`Successfully unlinked ${result.successful} URL(s) from Zotero (items kept in library)`);
          await loadUrls(currentPage);
          setSelectedUrls(new Set());
        }
        
        if (result.failed > 0) {
          setError(`Failed to unlink ${result.failed} URL(s)`);
        }
      }
    });
  }

  async function handleUnlinkAndDelete() {
    setError(null);
    setSuccessMessage(null);
    
    startTransition(async () => {
      if (urlsToUnlink.length === 1) {
        // Single delete
        const result = await deleteZoteroItemAndUnlink(urlsToUnlink[0]);
        
        if (result.success) {
          setSuccessMessage('Successfully unlinked and deleted from Zotero');
          await loadUrls(currentPage);
        } else {
          setError(result.error || 'Delete failed');
        }
      } else {
        // Bulk delete
        const result = await bulkDeleteZoteroItemsAndUnlink(urlsToUnlink);
        
        if (result.successful > 0) {
          setSuccessMessage(`Successfully unlinked and deleted ${result.successful} item(s) from Zotero`);
          await loadUrls(currentPage);
          setSelectedUrls(new Set());
        }
        
        if (result.failed > 0) {
          setError(`Failed to delete ${result.failed} item(s)`);
        }
      }
    });
  }

  function getTooltipContent(url: UrlWithStatus): React.ReactNode | undefined {
    if (url.status !== 'error' && url.status !== 'unknown') {
      return undefined;
    }

    const rawMetadata = url.analysisData?.rawMetadata as Record<string, unknown> | undefined;
    const processingRecommendation = rawMetadata?.processingRecommendation as string | undefined;
    const errors = rawMetadata?.errors as string[] | undefined;

    if (!processingRecommendation && (!errors || errors.length === 0)) {
      return undefined;
    }

    return (
      <div className="space-y-1">
        {processingRecommendation && (
          <div className="font-semibold mb-1">
            {processingRecommendation.toUpperCase()}
          </div>
        )}
        {errors && errors.length > 0 && (
          <div className="space-y-1">
            {errors.slice(0, 5).map((error, index) => {
              const trimmedError = error.length > 100 ? `${error.substring(0, 100)}...` : error;
              return (
                <p key={index} className="text-xs">
                  {trimmedError}
                </p>
              );
            })}
            {errors.length > 5 && (
              <p className="text-xs text-gray-400">
                +{errors.length - 5} more error(s)
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const isDetailPaneOpen = selectedUrlForDetail !== null;

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Left Column - Main scrollable area */}
      <div className={isDetailPaneOpen ? 'flex-1 overflow-y-auto overflow-x-hidden min-w-0' : 'w-full overflow-y-auto overflow-x-hidden'}>
        {/* Sticky Header Zone - Contains filters, messages, and bulk actions */}
        <div className="sticky top-0 z-20 bg-gray-50 pb-4 space-y-4">
          {/* Filters */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search URLs..."
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All sections</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.name}>
                      {section.title || section.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as UrlStatus | '')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="stored">Stored</option>
                  <option value="extractable">Extractable</option>
                  <option value="translatable">Translatable</option>
                  <option value="resolvable">Resolvable</option>
                  <option value="error">Error</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All domains</option>
                  {domains.slice(0, 50).map(domain => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Citation
                </label>
                <select
                  value={selectedCitationStatus}
                  onChange={(e) => setSelectedCitationStatus(e.target.value as 'valid' | 'incomplete' | '')}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">All citations</option>
                  <option value="valid">Valid</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={handleFilterChange} disabled={isPending}>
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSection('');
                  setSelectedStatus('');
                  setSelectedDomain('');
                  setSelectedCitationStatus('');
                  loadUrls(1);
                }}
                variant="outline"
                disabled={isPending}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
              {successMessage}
            </div>
          )}

          {/* Bulk actions */}
          {selectedUrls.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-900">
                {selectedUrls.size} URL(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkProcess}
                  variant="default"
                  size="sm"
                  disabled={isPending || isProcessing}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Process with Zotero
                </Button>
                <Button
                  onClick={handleBulkUnlink}
                  variant="outline"
                  size="sm"
                  disabled={isPending || isProcessing}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink from Zotero
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  variant="outline"
                  size="sm"
                  disabled={isPending || isProcessing}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Flowing Content - Table and pagination */}
        <div className="space-y-4">
          {/* Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-[50px] bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedUrls.size === urls.length && urls.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase min-w-[150px] max-w-[250px] bg-gray-50">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-[100px] bg-gray-50">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-[100px] bg-gray-50">
                    IDs
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase w-[80px] bg-gray-50">
                    Citation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase w-[100px] bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {urls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {isPending ? 'Loading...' : 'No URLs found'}
                    </td>
                  </tr>
                ) : (
                  urls.map((url) => {
                    const enrichment = enrichments[url.id];
                    const customIdsCount = enrichment?.customIdentifiers?.length || 0;
                    const tooltipContent = getTooltipContent(url);
                    
                    return (
                      <tr
                        key={url.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => handleRowClick(url, e)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUrls.has(url.id)}
                            onChange={(e) => handleSelectUrl(url.id, e.target.checked)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 w-[220px] min-w-[220px] max-w-[220px] overflow-hidden">
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm truncate block max-w-full"
                            title={url.url}
                          >
                            {formatUrlForDisplay(url.url)}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={url.status} tooltipContent={tooltipContent} showLabel={!isDetailPaneOpen} />
                            {url.status === 'extractable' && url.analysisData?.validIdentifiers && url.analysisData.validIdentifiers.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Use the first valid identifier for preview
                                  const firstIdentifier = url.analysisData?.validIdentifiers?.[0];
                                  if (firstIdentifier) {
                                    setPreviewIdentifier(firstIdentifier);
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Preview identifier extraction"
                              >
                                <Eye className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                            {url.status === 'translatable' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewUrl(url.url);
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="Preview URL translation"
                              >
                                <Eye className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                            {url.status === 'stored' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlinkSingle(url.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                title="Unlink from Zotero"
                              >
                                <Unlink className="h-4 w-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 whitespace-nowrap">
                              {url.analysisData?.validIdentifiers?.length || 0} / {customIdsCount}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddIdentifier(url.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                              title="Add custom identifier"
                            >
                              <Plus className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {url.status === 'stored' && url.citationValidationStatus && (
                            <CitationStatusIndicator 
                              status={url.citationValidationStatus as CitationStatus}
                              missingFields={url.citationValidationDetails?.missingFields}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {(url.status === 'extractable' || url.status === 'translatable') && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcessSingle(url);
                                }}
                                disabled={isPending || isProcessing}
                                title="Process with Zotero"
                                className="text-white cursor-pointer"
                              >
                                <Database className="h-4 w-4" />
                                {!isDetailPaneOpen && <span className="ml-1">Process</span>}
                              </Button>
                            )}
                            {url.zoteroProcessingStatus === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProcessSingle(url);
                                }}
                                disabled={isPending || isProcessing}
                                title="Retry processing"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadUrls(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadUrls(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Detail Panel */}
      {selectedUrlForDetail && (
        <div className="w-[500px] shrink-0">
          <div className="sticky top-0 h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border bg-gray-50 border-gray-200">
            <URLDetailPanel
              url={selectedUrlForDetail}
              onClose={handleCloseDetailPanel}
              onUpdate={handleDetailUpdate}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Add Identifier Modal */}
      {modalUrlId !== null && (
        <AddIdentifierModal
          urlId={modalUrlId}
          open={modalUrlId !== null}
          onOpenChange={(open) => {
            if (!open) setModalUrlId(null);
          }}
          onSuccess={handleIdentifierAdded}
        />
      )}

      {/* Preview Identifier Modal */}
      {previewIdentifier && (
        <PreviewModal
          open={previewIdentifier !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewIdentifier(null);
          }}
          identifier={previewIdentifier}
        />
      )}

      {/* Preview URL Modal */}
      {previewUrl && (
        <PreviewModal
          open={previewUrl !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewUrl(null);
          }}
          url={previewUrl}
        />
      )}

      {/* Processing Progress Modal */}
      <ProcessingProgressModal
        open={processingModalOpen}
        onOpenChange={setProcessingModalOpen}
        logs={processingLogs}
        isProcessing={isProcessing}
        onCancel={handleCancelProcessing}
        onClose={handleCloseProcessingModal}
      />

      {/* Unlink Confirmation Modal */}
      <UnlinkConfirmationModal
        open={unlinkModalOpen}
        onOpenChange={setUnlinkModalOpen}
        itemCount={urlsToUnlink.length}
        onUnlinkOnly={handleUnlinkOnly}
        onUnlinkAndDelete={handleUnlinkAndDelete}
        isProcessing={isPending}
      />
    </div>
  );
}

