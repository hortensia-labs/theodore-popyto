'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Database, RefreshCw, ExternalLink, Unlink } from 'lucide-react';
import { type UrlWithStatus } from '@/lib/db/computed';
import { type UrlEnrichment } from '@/lib/db/schema';
import { updateEnrichment, addIdentifier, removeIdentifier, getEnrichment } from '@/lib/actions/enrichments';
import { processUrlWithZotero, unlinkUrlFromZotero, deleteZoteroItemAndUnlink, getZoteroItemMetadata, revalidateCitation } from '@/lib/actions/zotero';
import { getZoteroWebUrl, type ZoteroItemResponse } from '@/lib/zotero-client';
import { StatusBadge } from '../status-badge';
import { Button } from '../ui/button';
import { UnlinkConfirmationModal } from './unlink-confirmation-modal';
import { CitationStatusIndicator, type CitationStatus } from './citation-status-indicator';

interface URLDetailPanelProps {
  url: UrlWithStatus;
  onClose?: () => void;
  onUpdate?: () => void;
}

export function URLDetailPanel({ url, onClose, onUpdate }: URLDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [enrichment, setEnrichment] = useState<UrlEnrichment | null>(null);
  const [notes, setNotes] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [zoteroItemMetadata, setZoteroItemMetadata] = useState<ZoteroItemResponse | null>(null);

  useEffect(() => {
    async function loadEnrichment() {
      const result = await getEnrichment(url.id);
      if (result.success && result.data) {
        setEnrichment(result.data);
        setNotes(result.data.notes || '');
      }
    }
    loadEnrichment();
  }, [url.id]);

  useEffect(() => {
    async function loadZoteroMetadata() {
      if (url.zoteroItemKey && url.status === 'stored') {
        const result = await getZoteroItemMetadata(url.zoteroItemKey);
        if (result.success && result.data) {
          setZoteroItemMetadata(result.data);
        }
      } else {
        setZoteroItemMetadata(null);
      }
    }
    loadZoteroMetadata();
  }, [url.zoteroItemKey, url.status]);

  // Extract ZOTERO analysis data from rawMetadata
  const rawMetadata = url.analysisData?.rawMetadata as Record<string, unknown> | undefined;
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
      
      const result = await updateEnrichment(url.id, {
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

  async function handleAddIdentifier() {
    if (!newIdentifier.trim()) return;
    
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      
      const result = await addIdentifier(url.id, newIdentifier.trim());
      
      if (result.success && result.data) {
        setEnrichment(result.data);
        setNewIdentifier('');
        setSuccessMessage('Identifier added successfully');
        onUpdate?.();
      } else {
        setError(result.error || 'Unknown error adding identifier');
      }
    });
  }

  async function handleRemoveIdentifier(identifier: string) {
    startTransition(async () => {
      setError(null);
      setSuccessMessage(null);
      
      const result = await removeIdentifier(url.id, identifier);
      
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
    } else {
      setError(result.error || 'Processing failed');
    }
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
      if (url.zoteroItemKey) {
        const metadata = await getZoteroItemMetadata(url.zoteroItemKey);
        if (metadata.success && metadata.data) {
          setZoteroItemMetadata(metadata.data);
        }
      }
      
      onUpdate?.();
    } else {
      setError(result.error || 'Validation failed');
    }
  }

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between sticky top-0 bg-white pb-4">
            <div className="flex-1 pr-4">
              <h2 className="text-xl font-semibold mb-2">URL Details</h2>
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {url.url}
              </a>
              
              {/* Zotero Citation */}
              {zoteroItemMetadata?.citation && (
                <div className="mt-3 pt-3 border-t">
                  <div className="items-center flex-row-reverse gap-2 text-sm">
                  <p className="py-1 rounded text-lg font-serif">
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

          {/* URL Info */}
          <div className="border rounded-lg mt-10 p-4 space-y-3">
            <h3 className="font-medium">URL Information</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="mt-1">
                  <StatusBadge status={url.status} />
                </div>
              </div>
              
              <div>
                <span className="text-gray-600">Domain:</span>
                <div className="mt-1 font-medium">{url.domain || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">HTTP Status:</span>
                <div className="mt-1 font-medium">{url.statusCode || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Content Type:</span>
                <div className="mt-1 font-medium">{url.contentType || (zoteroData.contentType as string | undefined) || '-'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Accessible:</span>
                <div className="mt-1 font-medium">{url.isAccessible || (zoteroData.urlAccessible as boolean | undefined) ? 'Yes' : 'No'}</div>
              </div>
              
              <div>
                <span className="text-gray-600">Final URL:</span>
                <div className="mt-1 font-medium break-all">{url.finalUrl || '-'}</div>
              </div>
              
              {url.redirectCount !== null && url.redirectCount !== undefined && (
                <div>
                  <span className="text-gray-600">Redirect Count:</span>
                  <div className="mt-1 font-medium">{url.redirectCount}</div>
                </div>
              )}
            </div>
          </div>

          {/* Zotero Processing */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Zotero Processing</h3>
            
            <div className="space-y-3 text-sm">
              {url.zoteroItemKey ? (
                <>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-black text-white">
                        Stored
                      </span>
                    </div>
                  </div>
                  
                  {/* Title */}
                  {zoteroItemMetadata && getTitleFromFields(zoteroItemMetadata.fields) && (
                    <div className="flex flex-col gap-2 mt-10">
                      <span className="text-gray-600">Title:</span>
                      <div className="mt-1 font-medium text-lg font-serif">
                        {getTitleFromFields(zoteroItemMetadata.fields)}
                      </div>
                    </div>
                  )}
                  
                  {/* Creators */}
                  {zoteroItemMetadata?.creators && zoteroItemMetadata.creators.length > 0 && (
                    <div className="flex flex-col gap-2 mt-4">
                      <span className="text-gray-600">Authors:</span>
                      <div className="mt-1 font-medium font-serif">
                        {formatCreators(zoteroItemMetadata.creators)}
                      </div>
                    </div>
                  )}
                  
                  {/* Date */}
                  {zoteroItemMetadata && getDateFromFields(zoteroItemMetadata.fields) && (
                    <div className="flex flex-col gap-2 mt-4">
                      <span className="text-gray-600">Date:</span>
                      <div className="mt-1 font-medium font-serif">
                        {getDateFromFields(zoteroItemMetadata.fields)}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 mt-8 border-t pt-8">
                    <span className="text-gray-600">Zotero Item Key:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 bg-gray-50 px-2 py-1 rounded font-mono text-xs">
                        {url.zoteroItemKey}
                      </code>
                      <a
                        href={zoteroItemMetadata?.apiURL || getZoteroWebUrl(url.zoteroItemKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="View in Zotero API"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  
                  {/* Citation Validation Status */}
                  {url.citationValidationStatus && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-600">Citation Status:</span>
                          <div className="mt-2 flex items-center gap-2">
                            <CitationStatusIndicator 
                              status={url.citationValidationStatus as CitationStatus}
                              missingFields={url.citationValidationDetails?.missingFields}
                              showLabel={true}
                              size="md"
                            />
                          </div>
                          {url.citationValidationDetails?.missingFields && 
                           url.citationValidationDetails.missingFields.length > 0 && (
                            <div className="mt-2 text-xs text-amber-700">
                              Missing: {url.citationValidationDetails.missingFields.join(', ')}
                            </div>
                          )}
                          {url.citationValidatedAt && (
                            <div className="mt-1 text-xs text-gray-500">
                              Validated: {new Date(url.citationValidatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleRevalidateCitation}
                          disabled={isProcessing}
                          size="sm"
                          variant="outline"
                          title="Revalidate citation (refresh from Zotero)"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {url.zoteroProcessingMethod && (
                    <div className="mt-3">
                      <span className="text-gray-600">Processing Method:</span>
                      <div className="mt-1 font-medium capitalize">{url.zoteroProcessingMethod}</div>
                    </div>
                  )}
                  
                  {url.zoteroProcessedAt && (
                    <div>
                      <span className="text-gray-600">Processed At:</span>
                      <div className="mt-1 font-medium">
                        {new Date(url.zoteroProcessedAt).toLocaleString()}
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
              ) : url.zoteroProcessingStatus === 'failed' ? (
                <>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Failed
                      </span>
                    </div>
                  </div>
                  
                  {url.zoteroProcessingError && (
                    <div>
                      <span className="text-gray-600">Error:</span>
                      <div className="mt-1 bg-red-50 text-red-800 px-3 py-2 rounded text-xs">
                        {url.zoteroProcessingError}
                      </div>
                    </div>
                  )}
                  
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
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry Processing
                      </>
                    )}
                  </Button>
                </>
              ) : (url.status === 'extractable' || url.status === 'translatable') ? (
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

          {/* ZOTERO Analysis Response */}
          {rawMetadata && (
            <div className="border rounded-lg p-4 space-y-3">
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
                    <span className="text-gray-600">Errors:</span>
                    <div className="mt-1 space-y-1">
                      {(zoteroData.errors as string[]).map((error: string, index: number) => (
                        <div key={index} className="bg-red-50 text-red-800 px-2 py-1 rounded text-xs">
                          {error}
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
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Analysis Data</h3>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Valid Identifiers:</span>
                <div className="mt-1">
                  {url.analysisData?.validIdentifiers && url.analysisData.validIdentifiers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {url.analysisData.validIdentifiers.map((id, index) => (
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
                      {url.analysisData.webTranslators.map((translator, index) => {
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
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Custom Identifiers</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddIdentifier()}
                placeholder="Add new identifier..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                disabled={isPending}
              />
              <Button
                onClick={handleAddIdentifier}
                disabled={isPending || !newIdentifier.trim()}
                size="sm"
              >
                Add
              </Button>
            </div>
            
            <div className="space-y-1">
              {enrichment?.customIdentifiers && enrichment.customIdentifiers.length > 0 ? (
                enrichment.customIdentifiers.map((identifier, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm font-mono">{identifier}</span>
                    <button
                      onClick={() => handleRemoveIdentifier(identifier)}
                      disabled={isPending}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No custom identifiers yet</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="border rounded-lg p-4 space-y-3">
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
    </div>
  );
}

