'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Database, RefreshCw, ExternalLink, Unlink, Trash, DiamondPlus, Trash2 } from 'lucide-react';
import { type UrlWithStatus } from '@/lib/db/computed';
import { type UrlEnrichment } from '@/lib/db/schema';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import { updateEnrichment, addIdentifier, removeIdentifier, getEnrichment } from '@/lib/actions/enrichments';
import { processUrlWithZotero, unlinkUrlFromZotero, deleteZoteroItemAndUnlink, getZoteroItemMetadata, revalidateCitation, linkUrlToExistingZoteroItem } from '@/lib/actions/zotero';
import { processSingleUrl } from '@/lib/actions/process-url-action';
import { extractSemanticScholarBibTeX } from '@/lib/actions/extract-semantic-scholar-bibtex';
import { getIdentifiersWithPreviews, refreshIdentifierPreview, fetchAllPreviews } from '@/lib/actions/identifier-selection-action';
import { getExtractedMetadata, approveAndStoreMetadata, rejectMetadata } from '@/lib/actions/metadata-approval-action';
import { checkHasCachedContent } from '@/lib/actions/cache-check-action';
import { resetProcessingState, ignoreUrl, unignoreUrl, archiveUrl } from '@/lib/actions/state-transitions';
import { deleteUrls } from '@/lib/actions/urls';
import { clearAnalysisErrors } from '@/lib/actions/clear-errors';
import { getZoteroWebUrl, type ZoteroItemResponse } from '@/lib/zotero-client';
import { StatusBadge } from '../../status-badge';
import { Button } from '../../ui/button';
import { UnlinkConfirmationModal } from '../unlink-confirmation-modal';
import { CitationStatusIndicator, type CitationStatus } from '../citation-status-indicator';
import { PreviewComparison } from '../preview-comparison';
import { MetadataReview } from '../metadata-review';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { StatusSummarySection } from './StatusSummarySection';
import { CapabilitiesSection } from './CapabilitiesSection';
import { ProcessingHistorySection } from './ProcessingHistorySection';
import { QuickActionsSection } from './QuickActionsSection';
import { AddIdentifierModal } from '../add-identifier-modal';
import { ReplaceZoteroItemModal } from '../replace-zotero-item-modal';
import { LinkToItemDialog } from '../dialogs/LinkToItemDialog';
import { processCustomIdentifier } from '@/lib/actions/process-custom-identifier';

interface URLDetailPanelProps {
  url: UrlWithStatus | UrlWithCapabilitiesAndStatus;
  onClose?: () => void;
  onUpdate?: () => void;
}

export function URLDetailPanel({ url, onClose, onUpdate }: URLDetailPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enrichment, setEnrichment] = useState<UrlEnrichment | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [zoteroItemMetadata, setZoteroItemMetadata] = useState<ZoteroItemResponse | null>(null);
  const [identifiersWithPreviews, setIdentifiersWithPreviews] = useState<any[]>([]);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [canUseLlm, setCanUseLlm] = useState(false);
  
  // Modal states for custom identifiers
  const [addIdentifierModalOpen, setAddIdentifierModalOpen] = useState(false);
  const [replaceItemModalOpen, setReplaceItemModalOpen] = useState(false);
  const [selectedCustomIdentifier, setSelectedCustomIdentifier] = useState<string | null>(null);

  // Modal state for linking to existing item
  const [linkItemDialogOpen, setLinkItemDialogOpen] = useState(false);
  const [isLinkingItem, setIsLinkingItem] = useState(false);

  // Check if URL has new processing system fields
  const hasNewFields = 'processingStatus' in url && 'userIntent' in url;
  const urlWithCap = hasNewFields ? (url as UrlWithCapabilitiesAndStatus) : null;

  // Normalize URL object to work with both UrlWithStatus and UrlWithCapabilitiesAndStatus
  const normalizedUrl = (() => {
    // Check if it's UrlWithCapabilitiesAndStatus
    if (hasNewFields && urlWithCap) {
      return {
        ...url,
        status: urlWithCap.zoteroItemKey ? 'stored' as const : 'unknown' as const,
        zoteroProcessingStatus: urlWithCap.processingStatus as any,
        identifierCount: urlWithCap.analysisData?.validIdentifiers?.length || 0,
        hasExtractedMetadata: !!urlWithCap.analysisData,
        statusCode: null,
        contentType: null,
        isAccessible: true,
        finalUrl: urlWithCap.url,
        redirectCount: 0,
        zoteroProcessingMethod: null,
        zoteroProcessedAt: null,
        zoteroProcessingError: null,
      } as unknown as UrlWithStatus;
    }
    return url as UrlWithStatus;
  })();

  useEffect(() => {
    async function loadEnrichment() {
      const result = await getEnrichment(normalizedUrl.id);
      if (result.success && result.data) {
        setEnrichment(result.data);
        setNotes(result.data.notes || '');
      }
    }
    loadEnrichment();
  }, [normalizedUrl.id]);

  useEffect(() => {
    async function loadZoteroMetadata() {
      if (normalizedUrl.zoteroItemKey && normalizedUrl.status === 'stored') {
        const result = await getZoteroItemMetadata(normalizedUrl.zoteroItemKey);
        if (result.success && result.data) {
          setZoteroItemMetadata(result.data);
        }
      } else {
        setZoteroItemMetadata(null);
      }
    }
    loadZoteroMetadata();
  }, [normalizedUrl.zoteroItemKey, normalizedUrl.status]);

  useEffect(() => {
    async function loadIdentifiers() {
      if (normalizedUrl.zoteroProcessingStatus === 'identifiers_found' || normalizedUrl.identifierCount && normalizedUrl.identifierCount > 0) {
        const identifiers = await getIdentifiersWithPreviews(normalizedUrl.id);
        setIdentifiersWithPreviews(identifiers);
      } else {
        setIdentifiersWithPreviews([]);
      }
    }
    loadIdentifiers();
  }, [normalizedUrl.id, normalizedUrl.zoteroProcessingStatus, normalizedUrl.identifierCount]);

  useEffect(() => {
    async function loadExtractedMetadata() {
      if (normalizedUrl.zoteroProcessingStatus === 'no_identifiers' && normalizedUrl.hasExtractedMetadata) {
        const metadata = await getExtractedMetadata(normalizedUrl.id);
        setExtractedMetadata(metadata);
      } else {
        setExtractedMetadata(null);
      }
    }
    loadExtractedMetadata();
  }, [normalizedUrl.id, normalizedUrl.zoteroProcessingStatus, normalizedUrl.hasExtractedMetadata]);

  useEffect(() => {
    async function checkLlmEligibility() {
      // URL is eligible for LLM extraction if it meets ANY of these conditions:
      // 1. Has cached content from automated workflow with issues
      // 2. Has incomplete citation (stored but incomplete validation)
      // 3. Zotero processing failed (cached or can cache)
      // 4. Is extractable/translatable but not stored (can process to cache first)
      
      const cached = await checkHasCachedContent(normalizedUrl.id);
      
      const eligible =
        // Condition 1: Cached content with metadata issues
        (cached && normalizedUrl.zoteroProcessingStatus === 'no_identifiers' && 
         extractedMetadata?.validationStatus === 'incomplete') ||
        (cached && normalizedUrl.zoteroProcessingStatus === 'no_identifiers' &&
         extractedMetadata?.qualityScore && extractedMetadata.qualityScore < 80) ||
        (cached && normalizedUrl.zoteroProcessingStatus === 'failed_parse') ||
        (cached && normalizedUrl.zoteroProcessingStatus === 'failed_fetch') ||
        
        // Condition 2: Zotero processing failed - always show LLM as alternative
        (normalizedUrl.zoteroProcessingStatus === 'failed') ||
        
        // Condition 3: Stored in Zotero but incomplete citation
        (normalizedUrl.zoteroItemKey && normalizedUrl.citationValidationStatus === 'incomplete') ||
        
        // Condition 4: Not yet processed but extractable/translatable (show LLM as option)
        (!normalizedUrl.zoteroItemKey && 
         (normalizedUrl.status === 'extractable' || normalizedUrl.status === 'translatable' || normalizedUrl.status === 'resolvable'));
      
      setCanUseLlm(eligible);
    }
    
    checkLlmEligibility();
  }, [normalizedUrl.id, normalizedUrl.zoteroProcessingStatus, extractedMetadata, normalizedUrl.zoteroItemKey, normalizedUrl.citationValidationStatus, normalizedUrl.status]);

  // Extract ZOTERO analysis data from rawMetadata
  const rawMetadata = normalizedUrl.analysisData?.rawMetadata as Record<string, unknown> | undefined;
  const zoteroData = rawMetadata || {};

  // Helper function to format creators
  function formatCreators(creators?: Array<{ firstName?: string; lastName?: string; name?: string }>): string {
    if (!creators || creators.length === 0) return '';
    
    return creators.map(creator => {
      if (creator.name) return creator.name;
      const parts = [];
      if (creator.firstName) parts.push(creator.firstName);
      if (creator.lastName) parts.push(creator.lastName);
      return parts.join(' ');
    }).join(', ');
  }

  // Helper function to get title from fields (field 1 is title)
  function getTitleFromFields(fields?: Record<string, string>): string {
    if (!fields) return '';
    return fields['1'] || '';
  }

  // Helper function to get date from fields (field 6 is date)
  function getDateFromFields(fields?: Record<string, string>): string {
    if (!fields) return '';
    return fields['6'] || '';
  }

  async function handleSaveNotes() {
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      
      const result = await updateEnrichment(normalizedUrl.id, {
        notes: notes.trim() || undefined,
        customIdentifiers: enrichment?.customIdentifiers || [],
      });
      
      if (result.success && result.data) {
        setEnrichment(result.data);
        setSuccessMessage('Notes saved successfully');
        onUpdate?.();
      } else {
        setError(result.error || 'Unknown error saving notes');
      }
    });
  }

  async function handleIdentifierAdded() {
    setAddIdentifierModalOpen(false);
    
    // Reload enrichment data
    const result = await getEnrichment(normalizedUrl.id);
    if (result.success && result.data) {
      setEnrichment(result.data);
      setSuccessMessage('Identifier added successfully');
    }
    
    onUpdate?.();
  }

  async function handleRemoveIdentifier(identifier: string) {
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      
      const result = await removeIdentifier(normalizedUrl.id, identifier);
      
      if (result.success && result.data) {
        setEnrichment(result.data);
        setSuccessMessage('Identifier removed successfully');
        onUpdate?.();
      } else {
        setError(result.error || 'Unknown error removing identifier');
      }
    });
  }

  async function handleProcessWithZotero() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await processUrlWithZotero(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(
        result.isExisting 
          ? 'Item already exists in Zotero library' 
          : `Successfully stored in Zotero (${result.itemKey})`
      );
      
      // Reload Zotero metadata
      if (result.itemKey) {
        const metadata = await getZoteroItemMetadata(result.itemKey);
        if (metadata.success && metadata.data) {
          setZoteroItemMetadata(metadata.data);
        }
      }
      
      onUpdate?.();
      router.refresh(); // Refresh to get updated citation status
    } else {
      setError(result.error || 'Processing failed');
    }
  }

  async function handleExtractSemanticScholar() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    startTransition(async () => {
      try {
        const result = await extractSemanticScholarBibTeX(normalizedUrl.id, normalizedUrl.url);
        
        if (result.success) {
          setSuccessMessage(result.message || `Citation extracted and linked to Zotero (${result.itemKey})`);
          
          // Reload Zotero metadata
          if (result.itemKey) {
            const metadata = await getZoteroItemMetadata(result.itemKey);
            if (metadata.success && metadata.data) {
              setZoteroItemMetadata(metadata.data);
            }
          }
          
          onUpdate?.();
          router.refresh(); // Refresh to get updated citation status
        } else {
          setError(result.error || 'Failed to extract BibTeX');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    });
  }

  async function handleUnlinkOnly() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await unlinkUrlFromZotero(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('Successfully unlinked from Zotero (item kept in library)');
      setZoteroItemMetadata(null); // Clear metadata
      onUpdate?.();
    } else {
      setError(result.error || 'Unlink failed');
    }
  }

  async function handleUnlinkAndDelete() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await deleteZoteroItemAndUnlink(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('Successfully unlinked and deleted from Zotero');
      setZoteroItemMetadata(null); // Clear metadata
      onUpdate?.();
    } else {
      setError(result.error || 'Delete failed');
    }
  }

  async function handleRevalidateCitation() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await revalidateCitation(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(
        `Citation validated: ${result.validationStatus}` +
        (result.missingFields && result.missingFields.length > 0 
          ? ` (missing: ${result.missingFields.join(', ')})` 
          : '')
      );
      
      // Reload Zotero metadata
      if (normalizedUrl.zoteroItemKey) {
        const metadata = await getZoteroItemMetadata(normalizedUrl.zoteroItemKey);
        if (metadata.success && metadata.data) {
          setZoteroItemMetadata(metadata.data);
        }
      }
      
      // Trigger parent update
      onUpdate?.();
      
      // Force router refresh to get updated citation status
      router.refresh();
    } else {
      setError(result.error || 'Validation failed');
    }
  }

  async function handleProcessUrlContent() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    const result = await processSingleUrl(url.id);

    setIsProcessing(false);

    if (result.success) {
      setSuccessMessage(
        `URL processed: ${result.state}` +
        (result.identifierCount ? ` - Found ${result.identifierCount} identifier(s)` : '')
      );

      // Reload identifiers if found
      if (result.identifierCount && result.identifierCount > 0) {
        const identifiers = await getIdentifiersWithPreviews(url.id);
        setIdentifiersWithPreviews(identifiers);
      }

      onUpdate?.();
    } else {
      setError(result.error || 'Processing failed');
    }
  }

  async function handleProcessContent() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    const result = await processSingleUrl(url.id);

    setIsProcessing(false);

    if (result.success) {
      if (result.identifierCount && result.identifierCount > 0) {
        setSuccessMessage(`Content processed - Found ${result.identifierCount} identifier(s)`);

        // Reload identifiers
        const identifiers = await getIdentifiersWithPreviews(url.id);
        setIdentifiersWithPreviews(identifiers);
      } else {
        setSuccessMessage('Content processed - No identifiers found, but metadata may be available');

        // Reload extracted metadata if available
        const metadata = await getExtractedMetadata(url.id);
        setExtractedMetadata(metadata);
      }

      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Content processing failed');
    }
  }

  async function handleSelectIdentifier(identifierId: number) {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    // Find the identifier in the preview data to get its value
    const identifier = identifiersWithPreviews.find(id => id.id === identifierId);
    if (!identifier) {
      setError('Identifier not found');
      setIsProcessing(false);
      return;
    }

    // Use processCustomIdentifier which works from any state
    const result = await processCustomIdentifier(url.id, identifier.value, false);

    setIsProcessing(false);

    if (result.success) {
      setSuccessMessage(`Item stored in Zotero: ${result.itemKey}`);
      onUpdate?.();
      router.refresh(); // Refresh to get updated citation status
    } else {
      setError(result.error || 'Failed to process identifier');
    }
  }

  async function handleRefreshPreview(identifierId: number) {
    const result = await refreshIdentifierPreview(identifierId);
    
    if (result.success) {
      // Reload identifiers
      const identifiers = await getIdentifiersWithPreviews(url.id);
      setIdentifiersWithPreviews(identifiers);
    } else {
      setError(result.error || 'Failed to refresh preview');
    }
  }

  async function handleFetchAllPreviews() {
    setIsProcessing(true);
    setError(null);
    
    const result = await fetchAllPreviews(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(`Fetched ${result.count} preview(s)`);
      // Reload identifiers
      const identifiers = await getIdentifiersWithPreviews(url.id);
      setIdentifiersWithPreviews(identifiers);
    } else {
      setError(result.error || 'Failed to fetch previews');
    }
  }

  async function handleApproveMetadata(attachSnapshot: boolean) {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await approveAndStoreMetadata(url.id, attachSnapshot);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(`Item created in Zotero: ${result.itemKey}`);
      onUpdate?.();
      router.refresh(); // Refresh to get updated citation status
    } else {
      setError(result.error || 'Failed to create item');
    }
  }

  async function handleRejectMetadata(reason?: string) {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await rejectMetadata(url.id, reason);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('Metadata rejected');
      onUpdate?.();
    } else {
      setError(result.error || 'Failed to reject metadata');
    }
  }

  async function handleProcessZoteroItemWithCustomIdentifier(identifier: string) {
    // Check if URL already has a Zotero item
    if (normalizedUrl.zoteroItemKey) {
      // Show replacement modal with preview
      setSelectedCustomIdentifier(identifier);
      setReplaceItemModalOpen(true);
    } else {
      // Process directly without replacement
      await processCustomIdentifierDirect(identifier, false);
    }
  }
  
  async function processCustomIdentifierDirect(identifier: string, replaceExisting: boolean) {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setReplaceItemModalOpen(false);
    
    const result = await processCustomIdentifier(
      normalizedUrl.id,
      identifier,
      replaceExisting
    );
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(
        result.replaced 
          ? `Successfully replaced Zotero item with ${identifier} (${result.itemKey})`
          : `Successfully stored in Zotero using ${identifier} (${result.itemKey})`
      );
      
      // Reload Zotero metadata
      if (result.itemKey) {
        const metadata = await getZoteroItemMetadata(result.itemKey);
        if (metadata.success && metadata.data) {
          setZoteroItemMetadata(metadata.data);
        }
      }
      
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Processing failed');
    }
  }
  
  async function handleConfirmReplaceItem() {
    if (selectedCustomIdentifier) {
      await processCustomIdentifierDirect(selectedCustomIdentifier, true);
      setSelectedCustomIdentifier(null);
    }
  }

  async function handleReset() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await resetProcessingState(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(result.message || 'Processing state reset successfully');
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Failed to reset processing state');
    }
  }

  async function handleIgnore() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await ignoreUrl(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('URL marked as ignored');
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Failed to ignore URL');
    }
  }

  async function handleUnignore() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await unignoreUrl(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('URL un-ignored successfully');
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Failed to un-ignore URL');
    }
  }

  async function handleArchive() {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await archiveUrl(url.id);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('URL archived successfully');
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Failed to archive URL');
    }
  }

  async function handleDelete() {
    // Confirm deletion since it's destructive
    const confirmed = window.confirm(
      'Are you sure you want to delete this URL? This action cannot be undone and will remove all associated data.'
    );
    
    if (!confirmed) {
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await deleteUrls([url.id]);
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage('URL deleted successfully');
      // Close the panel and refresh since URL no longer exists
      onUpdate?.();
      router.refresh();
      onClose?.();
    } else {
      setError(result.error || 'Failed to delete URL');
    }
  }

  async function handleClearErrors() {
    // Confirm action
    const confirmed = window.confirm(
      'Clear analysis errors and reset processing state?\n\n' +
      'This will:\n' +
      '• Remove error messages from analysis data\n' +
      '• Reset processing status to "not_started"\n' +
      '• Add a clear errors event to processing history\n' +
      '• Allow you to process this URL again\n\n' +
      'Continue?'
    );
    
    if (!confirmed) {
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await clearAnalysisErrors(url.id, true); // true = also reset processing state
    
    setIsProcessing(false);
    
    if (result.success) {
      setSuccessMessage(
        result.message ||
        `Cleared ${result.clearedErrors} error(s)${result.resetState ? ' and reset processing state' : ''}`
      );
      onUpdate?.();
      router.refresh();
    } else {
      setError(result.error || 'Failed to clear errors');
    }
  }

  async function handleLinkToExistingItem(
    itemKey: string,
  ) {
    setIsLinkingItem(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await linkUrlToExistingZoteroItem(url.id, itemKey);

      if (result.success) {
        setSuccessMessage(
          `Successfully linked to: ${result.itemTitle || 'Zotero item'}`
        );
        onUpdate?.();
        router.refresh();
      } else {
        setError(result.error || 'Failed to link item');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLinkingItem(false);
    }
  }

  return (
    <div className="h-full flex flex-col w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex items-start bg-gray-50 border-b justify-between sticky top-0 pt-6 px-6 pb-8 min-w-0 shadow-lg z-30">
              <div className="flex-1 pr-4 min-w-0">
                <h2 className="text-xl font-semibold mb-2">URL Details</h2>
                <a
                  href={normalizedUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm wrap-break-word break-all"
                >
                  {normalizedUrl.url}
                </a>
                
                {/* Zotero Citation */}
                {zoteroItemMetadata?.citation && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="items-center flex-row-reverse gap-2 text-sm">
                    <p className="py-1 rounded text-lg font-serif wrap-break-word break-all">
                        {zoteroItemMetadata.citation}
                      </p>    
                    {zoteroItemMetadata.itemType && (
                        <p className="inline-flex items-center px-2 py-1 rounded text-[10px] mt-2 font-medium bg-gray-200 text-black tracking-wider">
                          {zoteroItemMetadata.itemType
                            .replace(/([a-z])([A-Z])/g, '$1 $2')      // add space before capitals
                            .replace(/^./, s => s.toUpperCase())      // capitalize first letter
                            .toUpperCase()
                          }
                        </p>
                      )}
                                      
                    </div>
                  </div>
                )}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
        </div>
          {/* Content */}
        <div className="px-6 pt-6 space-y-6">
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

          {/* NEW: Status Summary Section */}
          {urlWithCap && (
            <div className="border rounded-lg bg-white p-4">
              <StatusSummarySection
                processingStatus={urlWithCap.processingStatus}
                userIntent={urlWithCap.userIntent}
                processingAttempts={urlWithCap.processingAttempts || 0}
                urlId={url.id}
                onUpdate={onUpdate}
              />
            </div>
          )}

          {/* NEW: Capabilities Section */}
          {urlWithCap && urlWithCap.capability && (
            <div className="border rounded-lg bg-white p-4">
              <CapabilitiesSection capability={urlWithCap.capability} />
            </div>
          )}

          {/* NEW: Quick Actions Section */}
          {urlWithCap && (
            <div className="border rounded-lg bg-white p-4">
              <QuickActionsSection
                url={{
                  id: url.id,
                  url: url.url,
                  processingStatus: urlWithCap.processingStatus,
                  userIntent: urlWithCap.userIntent,
                  zoteroItemKey: url.zoteroItemKey || null,
                  createdByTheodore: (url as any).createdByTheodore || null,
                  userModifiedInZotero: (url as any).userModifiedInZotero || null,
                  linkedUrlCount: (url as any).linkedUrlCount || null,
                  processingAttempts: urlWithCap.processingAttempts || 0,
                  capability: urlWithCap.capability,
                }}
                onProcess={handleProcessWithZotero}
                onProcessContent={handleProcessContent}
                onExtractSemanticScholar={handleExtractSemanticScholar}
                onLinkToItem={() => setLinkItemDialogOpen(true)}
                onUnlink={() => setUnlinkModalOpen(true)}
                onEditCitation={() => router.push(`/urls/${url.id}/manual/edit`)}
                onSelectIdentifier={() => {
                  // Focus on identifier selection if available
                  if (identifiersWithPreviews.length > 0) {
                    document.getElementById('identifier-previews')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                onApproveMetadata={() => handleApproveMetadata(false)}
                onManualCreate={() => router.push(`/urls/${url.id}/manual/create`)}
                onReset={handleReset}
                onIgnore={handleIgnore}
                onUnignore={handleUnignore}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewHistory={() => {
                  // Scroll to processing history section
                  document.getElementById('processing-history')?.scrollIntoView({ behavior: 'smooth' });
                }}
                isProcessing={isProcessing || isLinkingItem}
              />
            </div>
          )}

          {/* URL Info */}
          <div className="border rounded-lg bg-white mt-10 p-4 space-y-3">
            <h3 className="font-medium">URL Information</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="mt-1">
                  <StatusBadge status={normalizedUrl.status} />
                </div>
              </div>
              
              <div>
                <span className="text-gray-600">Domain:</span>
                <div className="mt-1 font-medium">{url.domain || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">HTTP Status:</span>
                <div className="mt-1 font-medium">{normalizedUrl.statusCode || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Content Type:</span>
                <div className="mt-1 font-medium">{normalizedUrl.contentType || (zoteroData.contentType as string | undefined) || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Accessible:</span>
                <div className="mt-1 font-medium">{normalizedUrl.isAccessible || (zoteroData.urlAccessible as boolean | undefined) ? 'Yes' : 'No'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Final URL:</span>
                <div className="mt-1 font-medium wrap-break-word break-all">{normalizedUrl.finalUrl || '-'}</div>
              </div>
              
              {normalizedUrl.redirectCount !== null && normalizedUrl.redirectCount !== undefined && (
                <div>
                  <span className="text-gray-600">Redirect Count:</span>
                  <div className="mt-1 font-medium">{normalizedUrl.redirectCount}</div>
                </div>
              )}
            </div>
          </div>

          {/* Zotero Processing */}
          <div className="border rounded-lg bg-white p-4 space-y-3">
            <h3 className="font-medium">Zotero Processing</h3>
            
            <div className="space-y-3 text-sm">
              {normalizedUrl.zoteroItemKey ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Processing Status */}
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black text-white">
                          Stored
                        </span>
                      </div>
                    </div>
                    
                    {/* Citation Status */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Citation Status:</span>
                        <Button
                          onClick={handleRevalidateCitation}
                          disabled={isProcessing}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Revalidate citation"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-1">
                        {url.citationValidationStatus ? (
                          <div className="flex flex-col gap-1">
                            <CitationStatusIndicator 
                              status={url.citationValidationStatus as CitationStatus}
                              missingFields={url.citationValidationDetails?.missingFields}
                              showLabel={false}
                              size="sm"
                            />
                            {url.citationValidationDetails?.missingFields && 
                             url.citationValidationDetails.missingFields.length > 0 && (
                              <div className="text-xs text-amber-700">
                                Missing: {url.citationValidationDetails.missingFields.join(', ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not validated</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Title */}
                  {zoteroItemMetadata && getTitleFromFields(zoteroItemMetadata.fields) && (
                    <div className="flex flex-col gap-2 mt-10 min-w-0">
                      <span className="text-gray-600">Title:</span>
                      <div className="mt-1 font-medium text-lg font-serif wrap-break-word break-all">
                        {getTitleFromFields(zoteroItemMetadata.fields)}
                      </div>
                    </div>
                  )}
                  
                  {/* Creators */}
                  {zoteroItemMetadata?.creators && zoteroItemMetadata.creators.length > 0 && (
                    <div className="flex flex-col gap-2 mt-4 min-w-0">
                      <span className="text-gray-600">Authors:</span>
                      <div className="mt-1 font-medium font-serif wrap-break-word break-all">
                        {formatCreators(zoteroItemMetadata.creators)}
                      </div>
                    </div>
                  )}
                  
                  {/* Date */}
                  {zoteroItemMetadata && getDateFromFields(zoteroItemMetadata.fields) && (
                    <div className="flex flex-col gap-2 mt-4 min-w-0">
                      <span className="text-gray-600">Date:</span>
                      <div className="mt-1 font-medium font-serif wrap-break-word break-all">
                        {getDateFromFields(zoteroItemMetadata.fields)}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 mt-8 border-t pt-8">
                    <span className="text-gray-600">Zotero Item Key:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 bg-gray-50 px-2 py-1 rounded font-mono text-xs break-all min-w-0">
                        {url.zoteroItemKey}
                      </code>
                      <a
                        href={zoteroItemMetadata?.apiURL || (normalizedUrl.zoteroItemKey ? getZoteroWebUrl(normalizedUrl.zoteroItemKey) : '#')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="View in Zotero API"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  
                  {normalizedUrl.zoteroProcessingMethod && (
                    <div className="mt-3">
                      <span className="text-gray-600">Processing Method:</span>
                      <div className="mt-1 font-medium capitalize">{normalizedUrl.zoteroProcessingMethod}</div>
                    </div>
                  )}
                  
                  {normalizedUrl.zoteroProcessedAt && (
                    <div>
                      <span className="text-gray-600">Processed At:</span>
                      <div className="mt-1 font-medium">
                        {new Date(normalizedUrl.zoteroProcessedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => setUnlinkModalOpen(true)}
                    disabled={isProcessing}
                    size="sm"
                    variant="destructive"
                    className="w-full mt-2 text-white font-bold cursor-pointer"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink from Zotero
                  </Button>
                </>
              ) : normalizedUrl.zoteroProcessingStatus === 'failed' ? (
                <>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Zotero Processing Failed
                      </span>
                    </div>
                  </div>
                  
                  {normalizedUrl.zoteroProcessingError && (
                    <div className="min-w-0">
                      <span className="text-gray-600">Error:</span>
                      <div className="mt-1 bg-red-50 text-red-800 px-3 py-2 rounded text-xs wrap-break-word break-all">
                        {normalizedUrl.zoteroProcessingError}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <p className="text-gray-600 text-xs">
                      Zotero couldn&apos;t process this URL. Try alternative methods:
                    </p>
                    
                    {/* Retry Original Method */}
                    <Button
                      onClick={handleProcessWithZotero}
                      disabled={isProcessing}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Zotero Processing
                        </>
                      )}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-500">Or try alternative methods</span>
                      </div>
                    </div>
                    
                    {/* Content Analysis Method */}
                    <Button
                      onClick={handleProcessUrlContent}
                      disabled={isProcessing}
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Extract Identifiers from Content
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 italic">
                      Analyzes content for DOI, PMID, ArXiv, ISBN and metadata
                    </p>
                    
                    {/* LLM Extraction Method */}
                    {canUseLlm && (
                      <>
                        <Button
                          onClick={() => router.push(`/urls/${url.id}/llm-extract`)}
                          disabled={isProcessing}
                          size="sm"
                          variant="default"
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Extract with LLM (AI)
                        </Button>
                        <p className="text-xs text-gray-500 italic">
                          Use AI to extract metadata from the page content
                        </p>
                      </>
                    )}
                  </div>
                </>
              ) : (normalizedUrl.status === 'extractable' || normalizedUrl.status === 'translatable' || normalizedUrl.status === 'resolvable') ? (
                <>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Processed
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-xs">
                    Process this URL with Zotero to fetch bibliographic data and store it in your library.
                  </p>
                  
                  <Button
                    onClick={handleProcessWithZotero}
                    disabled={isProcessing}
                    size="sm"
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Process with Zotero
                      </>
                    )}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleProcessUrlContent}
                    disabled={isProcessing}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Process URL Content (Phase 1)
                      </>
                    )}
                  </Button>
                  <p className="text-gray-600 text-xs italic">
                    Extracts identifiers from URL content (DOI, PMID, ArXiv, ISBN)
                  </p>
                  
                  {/* LLM Extraction Option for Unprocessed URLs */}
                  {canUseLlm && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-gray-500">Advanced</span>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <h4 className="font-medium text-purple-900 flex items-center gap-2 text-sm mb-2">
                          <Sparkles className="h-4 w-4" />
                          Extract with AI
                        </h4>
                        <p className="text-xs text-purple-700 mb-3">
                          Use LLM to extract metadata directly from the page content
                        </p>
                        <Button
                          onClick={() => router.push(`/urls/${url.id}/llm-extract`)}
                          variant="outline"
                          size="sm"
                          className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Try LLM Extraction
                        </Button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not Available
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-xs">
                    This URL cannot be processed with Zotero. Only URLs with status &quot;extractable&quot; or &quot;translatable&quot; can be processed.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Identifier Previews */}
          {identifiersWithPreviews.length > 0 && (
            <div id="identifier-previews" className="w-full border rounded-lg bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Identifier Previews</h3>
                <Button
                  onClick={handleFetchAllPreviews}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh All Previews
                </Button>
              </div>
              
              <PreviewComparison
                identifiers={identifiersWithPreviews}
                onSelectIdentifier={handleSelectIdentifier}
                onRefreshPreview={handleRefreshPreview}
                isProcessing={isProcessing}
              />
            </div>
          )}

          {/* Extracted Metadata Review */}
          {extractedMetadata && (
            <div className="border rounded-lg bg-white p-4 space-y-4">
              <MetadataReview
                metadata={extractedMetadata}
                onApprove={handleApproveMetadata}
                onReject={handleRejectMetadata}
                isProcessing={isProcessing}
              />
              
              {/* LLM Extraction Option */}
              {canUseLlm && (extractedMetadata.validationStatus === 'incomplete' || 
                             extractedMetadata.qualityScore < 80) && (
                <div className="border-t pt-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-purple-900 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Improve with LLM Extraction
                        </h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Use AI to extract missing or incomplete metadata fields
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push(`/urls/${url.id}/llm-extract`)}
                        variant="outline"
                        size="sm"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Try LLM
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* LLM Extraction for Failed Processing */}
          {!extractedMetadata && canUseLlm && (
            normalizedUrl.zoteroProcessingStatus === 'failed_parse' ||
            normalizedUrl.zoteroProcessingStatus === 'failed_fetch'
          ) && (
            <div className="border rounded-lg bg-white p-4">
              <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                <h4 className="font-medium text-purple-900 flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" />
                  Try LLM Extraction
                </h4>
                <p className="text-sm text-purple-700 mb-4">
                  Standard extraction failed, but you can try using AI to extract metadata from the cached content.
                </p>
                <Button
                  onClick={() => router.push(`/urls/${url.id}/llm-extract`)}
                  variant="default"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract with LLM
                </Button>
              </div>
            </div>
          )}

          {/* ZOTERO Analysis Response */}
          {rawMetadata && (
            <div className="border rounded-lg bg-white p-4 space-y-3">
              <h3 className="font-medium">ZOTERO Analysis Response</h3>
              
              <div className="space-y-3 text-sm">
                {(zoteroData.processingRecommendation as string | undefined) && (
                  <div>
                    <span className="text-gray-600">Processing Recommendation:</span>
                    <div className="mt-1 font-medium uppercase">{zoteroData.processingRecommendation as string}</div>
                  </div>
                )}
                
                {(zoteroData.status as string | undefined) && (
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1 font-medium">{zoteroData.status as string}</div>
                  </div>
                )}
                
                {(zoteroData.itemKey as string | undefined) && (
                  <div>
                    <span className="text-gray-600">Item Key:</span>
                    <div className="mt-1 font-mono text-xs bg-gray-50 px-2 py-1 rounded">{zoteroData.itemKey as string}</div>
                  </div>
                )}
                
                {(zoteroData.timestamp as string | number | undefined) && (
                  <div>
                    <span className="text-gray-600">Timestamp:</span>
                    <div className="mt-1 font-medium">{new Date(zoteroData.timestamp as string | number).toLocaleString()}</div>
                  </div>
                )}
                
                {Array.isArray(zoteroData.errors) && zoteroData.errors.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Errors:</span>
                      <Button
                        onClick={handleClearErrors}
                        disabled={isProcessing}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Clear errors and reset processing state"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Clear Errors
                      </Button>
                    </div>
                    <div className="mt-1 space-y-1">
                      {(zoteroData.errors as string[]).map((error: string, index: number) => (
                        <div
                          key={index}
                          className="bg-red-50 text-red-800 px-2 py-1 rounded text-xs break-all whitespace-pre-wrap"
                          style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                        >
                          {typeof error === 'string' && error.length > 1000
                            ? error.slice(0, 1000) + '...'
                            : error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {Array.isArray(zoteroData.identifiers) && zoteroData.identifiers.length > 0 && (
                  <div>
                    <span className="text-gray-600">All Identifiers:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(zoteroData.identifiers as string[]).map((id: string, index: number) => (
                        <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {(zoteroData.primaryDOI as string | undefined) && (
                  <div>
                    <span className="text-gray-600">Primary DOI:</span>
                    <div className="mt-1 space-y-1">
                      <div className="font-mono text-xs bg-green-50 px-2 py-1 rounded">{zoteroData.primaryDOI as string}</div>
                      {(zoteroData.primaryDOIScore as number | undefined) !== undefined && (
                        <div className="text-xs text-gray-500">
                          Score: {(zoteroData.primaryDOIScore as number).toFixed(2)}
                        </div>
                      )}
                      {(zoteroData.primaryDOIConfidence as string | undefined) && (
                        <div className="text-xs text-gray-500">
                          Confidence: {zoteroData.primaryDOIConfidence as string}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {Array.isArray(zoteroData.alternativeDOIs) && zoteroData.alternativeDOIs.length > 0 && (
                  <div>
                    <span className="text-gray-600">Alternative DOIs:</span>
                    <div className="mt-1 space-y-2">
                      {(zoteroData.alternativeDOIs as Array<{ doi?: string; score?: number; confidence?: string }>).map((alt: { doi?: string; score?: number; confidence?: string }, index: number) => (
                        <div key={index} className="bg-yellow-50 px-2 py-1 rounded text-xs">
                          {alt.doi && <div className="font-mono">{alt.doi}</div>}
                          {alt.score !== undefined && (
                            <div className="text-gray-500">Score: {alt.score.toFixed(2)}</div>
                          )}
                          {alt.confidence && (
                            <div className="text-gray-500">Confidence: {alt.confidence}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(zoteroData.disambiguationUsed as boolean | undefined) !== undefined && (
                  <div>
                    <span className="text-gray-600">Disambiguation Used:</span>
                    <div className="mt-1 font-medium">{(zoteroData.disambiguationUsed as boolean) ? 'Yes' : 'No'}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Data */}
          <div className="border rounded-lg bg-white p-4 space-y-3">
            <h3 className="font-medium">Analysis Data</h3>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Valid Identifiers:</span>
                <div className="mt-1">
                  {url.analysisData?.validIdentifiers && url.analysisData.validIdentifiers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {url.analysisData.validIdentifiers.map((id: string, index: number) => (
                        <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {id}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-gray-600">Web Translators:</span>
                <div className="mt-1">
                  {url.analysisData?.webTranslators && url.analysisData.webTranslators.length > 0 ? (
                    <div className="space-y-1">
                      {url.analysisData.webTranslators.map((translator: string | { translatorID?: string; label?: string; creator?: string; priority?: number }, index: number) => {
                        // Handle both string and object formats
                        const translatorObj = typeof translator === 'string' 
                          ? { translatorID: translator, label: translator }
                          : translator as { translatorID?: string; label?: string; creator?: string; priority?: number };
                        return (
                          <div key={index} className="bg-blue-50 px-2 py-1 rounded text-xs">
                            {translatorObj.label && (
                              <div className="font-medium">{translatorObj.label}</div>
                            )}
                            {translatorObj.translatorID && (
                              <div className="text-gray-600 font-mono text-xs">{translatorObj.translatorID}</div>
                            )}
                            {translatorObj.creator && (
                              <div className="text-gray-500">by {translatorObj.creator}</div>
                            )}
                            {translatorObj.priority !== undefined && (
                              <div className="text-gray-500">Priority: {translatorObj.priority}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-500">None</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="text-gray-600">AI Translation:</span>
                <div className="mt-1 font-medium">
                  {url.analysisData?.aiTranslation || (zoteroData.aiTranslation as boolean | undefined) ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Identifiers */}
          <div className="border rounded-lg bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Custom Identifiers</h3>
              <Button
                onClick={() => setAddIdentifierModalOpen(true)}
                disabled={isPending || isProcessing}
                size="sm"
                variant="outline"
              >
                Add Identifier
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              Add custom identifiers (DOI, PMID, ISBN, ArXiv) that have been validated and can be used to process this URL with Zotero.
            </p>
            
            <div className="space-y-2">
              {enrichment?.customIdentifiers && enrichment.customIdentifiers.length > 0 ? (
                enrichment.customIdentifiers.map((identifier, index) => (
                  <div key={index} className="flex items-center bg-gray-50 border px-3 py-2 rounded group hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-mono flex-1 truncate">{identifier}</span>
                    <div className="flex gap-0 ml-2">
                      <Button
                        onClick={() => handleProcessZoteroItemWithCustomIdentifier(identifier)}
                        // disabled={isProcessing || isPending}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Process with Zotero using this identifier"
                      >
                        <DiamondPlus className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        onClick={() => handleRemoveIdentifier(identifier)}
                        disabled={isPending || isProcessing}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Remove this identifier"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border border-dashed rounded-md px-4 py-8 text-center">
                  <p className="text-sm text-gray-500 mb-3">No custom identifiers yet</p>
                  <Button
                    onClick={() => setAddIdentifierModalOpen(true)}
                    disabled={isPending || isProcessing}
                    size="sm"
                    variant="outline"
                  >
                    Add Your First Identifier
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* NEW: Processing History Section */}
          {urlWithCap && (
            <div id="processing-history" className="border rounded-lg bg-white p-4">
              <ProcessingHistorySection 
                history={urlWithCap.processingHistory || []} 
                urlId={url.id}
                onReset={handleReset}
                isResetting={isProcessing}
              />
            </div>
          )}

          {/* Notes */}
          <div className="border rounded-lg bg-white p-4 space-y-3">
            <h3 className="font-medium">Notes</h3>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this URL..."
              rows={4}
              className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              disabled={isPending}
            />
            
            <Button
              onClick={handleSaveNotes}
              disabled={isPending}
              size="sm"
            >
              Save Notes
            </Button>
          </div>

        </div>
      </div>
      
      {/* Footer */}
      {onClose && (
        <div className="border-t p-4 bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      )}
      
      {/* Unlink Confirmation Modal */}
      <UnlinkConfirmationModal
        open={unlinkModalOpen}
        onOpenChange={setUnlinkModalOpen}
        itemCount={1}
        onUnlinkOnly={handleUnlinkOnly}
        onUnlinkAndDelete={handleUnlinkAndDelete}
        isProcessing={isProcessing}
      />
      
      {/* Add Identifier Modal */}
      <AddIdentifierModal
        urlId={normalizedUrl.id}
        open={addIdentifierModalOpen}
        onOpenChange={setAddIdentifierModalOpen}
        onSuccess={handleIdentifierAdded}
      />

      {/* Link to Existing Item Dialog */}
      <LinkToItemDialog
        urlId={normalizedUrl.id}
        open={linkItemDialogOpen}
        onOpenChange={setLinkItemDialogOpen}
        onConfirm={handleLinkToExistingItem}
        isLoading={isLinkingItem}
      />

      {/* Replace Zotero Item Modal */}
      {selectedCustomIdentifier && normalizedUrl.zoteroItemKey && (
        <ReplaceZoteroItemModal
          open={replaceItemModalOpen}
          onOpenChange={setReplaceItemModalOpen}
          identifier={selectedCustomIdentifier}
          currentItemKey={normalizedUrl.zoteroItemKey}
          onConfirm={handleConfirmReplaceItem}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

