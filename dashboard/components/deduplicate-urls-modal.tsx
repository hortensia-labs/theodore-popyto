'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { DuplicateGroup, ResolutionDecision, DuplicateUrl } from '@/lib/actions/deduplicate-urls';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Trash2, Lock } from 'lucide-react';

interface DeduplicateUrlsModalProps {
  onClose: () => void;
  onComplete: () => void;
}

interface GroupResolution {
  groupId: string;
  primaryUrlId: number | null;
  primaryZoteroItemKey: string | null;
  secondaryUrlIds: Set<number>;
  itemsToDelete: Set<string>;
  mergeMetadata: boolean;
}

export function DeduplicateUrlsModal({ onClose, onComplete }: DeduplicateUrlsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupResolutions, setGroupResolutions] = useState<Map<string, GroupResolution>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [currentStage, setCurrentStage] = useState<'loading' | 'resolving' | 'processing' | 'complete'>(
    'loading'
  );

  // Load duplicates on mount
  const loadDuplicates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching duplicate URL groups...');
      const response = await fetch('/api/deduplicate-urls/detect');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect duplicates');
      }

      const data = await response.json();

      console.log(`✅ Found ${data.data.totalGroups} duplicate groups`);
      setDuplicateGroups(data.data.duplicateGroups);

      // Initialize resolutions for each group
      const resolutions = new Map<string, GroupResolution>();
      for (const group of data.data.duplicateGroups) {
        // Auto-select oldest URL as primary (safest default)
        const primaryUrl = group.urls[0]; // Already sorted by creation date
        const secondaryUrlIds = new Set<number>(group.urls.slice(1).map((u: DuplicateUrl) => u.id));

        // Auto-select primary item if any Zotero items are linked
        const primaryItem = group.zoteroItems.length > 0 ? group.zoteroItems[0].itemKey : null;

        resolutions.set(group.groupId, {
          groupId: group.groupId,
          primaryUrlId: primaryUrl.id,
          primaryZoteroItemKey: primaryItem,
          secondaryUrlIds,
          itemsToDelete: new Set(),
          mergeMetadata: false,
        });
      }

      setGroupResolutions(resolutions);
      setCurrentStage('resolving');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error loading duplicates:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Update primary URL for a group
  const updatePrimaryUrl = useCallback((groupId: string, urlId: number) => {
    setGroupResolutions(prev => {
      const next = new Map(prev);
      const resolution = next.get(groupId);
      if (resolution) {
        // Swap: new primary becomes old secondary and vice versa
        const oldPrimary = resolution.primaryUrlId;
        resolution.primaryUrlId = urlId;
        resolution.secondaryUrlIds.delete(urlId);
        if (oldPrimary) {
          resolution.secondaryUrlIds.add(oldPrimary);
        }
      }
      return next;
    });
  }, []);

  // Update primary Zotero item for a group
  const updatePrimaryZoteroItem = useCallback((groupId: string, itemKey: string | null) => {
    setGroupResolutions(prev => {
      const next = new Map(prev);
      const resolution = next.get(groupId);
      if (resolution) {
        resolution.primaryZoteroItemKey = itemKey;
      }
      return next;
    });
  }, []);

  // Toggle item deletion
  const toggleItemDeletion = useCallback((groupId: string, itemKey: string) => {
    setGroupResolutions(prev => {
      const next = new Map(prev);
      const resolution = next.get(groupId);
      if (resolution) {
        if (resolution.itemsToDelete.has(itemKey)) {
          resolution.itemsToDelete.delete(itemKey);
        } else {
          resolution.itemsToDelete.add(itemKey);
        }
      }
      return next;
    });
  }, []);

  // Get group by ID
  const getGroup = useCallback(
    (groupId: string) => duplicateGroups.find(g => g.groupId === groupId),
    [duplicateGroups]
  );

  // Handle form submission
  const handleResolve = async () => {
    setIsProcessing(true);
    setCurrentStage('processing');

    try {
      // Convert resolution map to array
      const resolutions: ResolutionDecision[] = Array.from(groupResolutions.values()).map(r => ({
        groupId: r.groupId,
        primaryUrlId: r.primaryUrlId || 0,
        primaryZoteroItemKey: r.primaryZoteroItemKey,
        secondaryUrlIds: Array.from(r.secondaryUrlIds),
        itemsToDelete: Array.from(r.itemsToDelete),
        mergeMetadata: r.mergeMetadata,
      }));

      console.log('📤 Submitting resolutions...', resolutions);

      const response = await fetch('/api/deduplicate-urls/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resolve duplicates');
      }

      const data = await response.json();
      console.log('✅ Deduplication complete:', data.data);

      setResults(data.data);
      setCurrentStage('complete');

      // Close modal after 3 seconds
      setTimeout(() => {
        onComplete();
        onClose();
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error resolving duplicates:', errorMsg);
      setError(errorMsg);
      setIsProcessing(false);
      setCurrentStage('resolving');
    }
  };

  // Initialize on mount
  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Deduplicate URLs</h2>
              <p className="text-sm text-gray-600">
                {currentStage === 'loading' && 'Detecting duplicate URLs...'}
                {currentStage === 'resolving' &&
                  `Found ${duplicateGroups.length} groups with ${duplicateGroups.reduce((sum, g) => sum + g.urlCount, 0)} duplicate URLs`}
                {currentStage === 'processing' && 'Processing deduplication...'}
                {currentStage === 'complete' && 'Deduplication complete!'}
              </p>
            </div>
            {currentStage !== 'processing' && !isLoading && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Loading State */}
          {isLoading && currentStage === 'loading' && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Scanning for duplicate URLs...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Duplicate Groups */}
          {currentStage === 'resolving' && duplicateGroups.length > 0 && (
            <div className="space-y-4">
              {duplicateGroups.map(group => {
                const resolution = groupResolutions.get(group.groupId);
                const isExpanded = expandedGroups.has(group.groupId);

                return (
                  <div key={group.groupId} className="border rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.groupId)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{group.urlCount} Duplicate URLs</p>
                          <p className="text-sm text-gray-600 truncate">{group.normalizedUrl}</p>
                        </div>
                      </div>
                      {group.zoteroItems.length > 0 && (
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {group.zoteroItems.length} Zotero items
                        </div>
                      )}
                    </button>

                    {/* Group Details */}
                    {isExpanded && resolution && (
                      <div className="p-4 space-y-4 border-t">
                        {/* URLs Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">URLs ({group.urls.length})</h4>
                          <div className="space-y-2">
                            {group.urls.map(url => (
                              <label
                                key={url.id}
                                className="flex items-start gap-3 p-3 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="radio"
                                  name={`primary-${group.groupId}`}
                                  value={url.id}
                                  checked={resolution.primaryUrlId === url.id}
                                  onChange={() => updatePrimaryUrl(group.groupId, url.id)}
                                  className="mt-1 h-4 w-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{url.url}</p>
                                  <p className="text-xs text-gray-600">
                                    {url.sectionName} • {new Date(url.createdAt).toLocaleDateString()}
                                    {url.zoteroItemKey && ` • Zotero: ${url.zoteroItemKey}`}
                                  </p>
                                </div>
                                {resolution.primaryUrlId === url.id && (
                                  <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    PRIMARY
                                  </div>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Zotero Items Section */}
                        {group.zoteroItems.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Zotero Items ({group.zoteroItems.length})</h4>
                            <div className="space-y-3">
                              {group.zoteroItems.map(item => (
                                <div
                                  key={item.itemKey}
                                  className="p-3 rounded border border-gray-200 space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{item.title}</p>
                                      {item.creators.length > 0 && (
                                        <p className="text-sm text-gray-600">
                                          {item.creators.slice(0, 2).map(c => c.name).join(', ')}
                                          {item.creators.length > 2 && ` et al.`}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        {item.date} • Linked to {item.urlCount} URL(s) in this group
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {item.createdByTheodore && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={resolution.itemsToDelete.has(item.itemKey)}
                                            onChange={() => toggleItemDeletion(group.groupId, item.itemKey)}
                                            className="h-4 w-4"
                                          />
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </label>
                                      )}
                                      {!item.createdByTheodore && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                          <Lock className="h-4 w-4" />
                                          Pre-existing
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Primary Item Selection */}
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="radio"
                                      name={`primary-item-${group.groupId}`}
                                      checked={resolution.primaryZoteroItemKey === item.itemKey}
                                      onChange={() => updatePrimaryZoteroItem(group.groupId, item.itemKey)}
                                      className="h-4 w-4"
                                    />
                                    <span className="text-gray-700">Keep this item</span>
                                  </label>

                                  {/* Warnings */}
                                  {item.userModified && (
                                    <div className="text-xs text-yellow-600 flex items-start gap-1">
                                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                      <span>This item was modified by user in Zotero</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-gray-700">
                          <strong>Summary:</strong> Keep{' '}
                          <span className="font-semibold">
                            {group.urls.find(u => u.id === resolution.primaryUrlId)?.url.substring(0, 40)}...
                          </span>
                          , delete {resolution.secondaryUrlIds.size} URL(s) and {resolution.itemsToDelete.size}{' '}
                          Zotero item(s)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Processing State */}
          {currentStage === 'processing' && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing deduplication...</p>
              </div>
            </div>
          )}

          {/* Complete State */}
          {currentStage === 'complete' && results && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900">Deduplication Complete!</h3>
                  <p className="text-sm text-green-800 mt-1">
                    Successfully processed {results.groupsProcessed} group(s). Deleted {results.urlsDeleted}{' '}
                    URL(s) and {results.itemsDeleted} Zotero item(s).
                  </p>
                  {results.orphanedItemsFound > 0 && (
                    <p className="text-sm text-yellow-800 mt-2">
                      ⚠️ Found {results.orphanedItemsFound} orphaned Zotero item(s) that were not linked to URLs
                    </p>
                  )}
                </div>
              </div>

              {results.results.map((result: any) => (
                <div key={result.groupId} className="border rounded p-3">
                  <p className="text-sm font-medium">
                    {result.success ? '✅' : '❌'} {result.groupId}
                  </p>
                  {result.error && <p className="text-xs text-red-600">{result.error}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    Deleted: {result.deletedUrls.length} URL(s), {result.deletedItems.length} item(s)
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {currentStage === 'resolving' && duplicateGroups.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">No Duplicates Found</p>
              <p className="text-sm text-gray-600 mt-1">Your URLs are all unique!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-2">
          {currentStage === 'resolving' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={isProcessing || duplicateGroups.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Processing...' : 'Resolve Duplicates'}
              </Button>
            </>
          )}
          {currentStage === 'complete' && (
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Close
            </Button>
          )}
          {currentStage !== 'resolving' && currentStage !== 'complete' && !isLoading && error && (
            <Button onClick={() => loadDuplicates()}>Try Again</Button>
          )}
        </div>
      </div>
    </div>
  );
}
