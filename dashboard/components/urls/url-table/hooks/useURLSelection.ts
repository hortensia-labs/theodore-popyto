/**
 * URL Selection Hook
 * 
 * Manages selection state for URLs in the table with:
 * - Individual selection toggling
 * - Select/deselect all
 * - Selection count tracking
 * - Filtered selection (select all visible, select by filter)
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';

/**
 * Custom hook for managing URL selection state
 * 
 * Features:
 * - Track selected URL IDs
 * - Toggle individual selection
 * - Select/deselect all
 * - Filter-aware selection
 * - Clear selection
 */
export function useURLSelection(urls: UrlWithCapabilitiesAndStatus[] | any[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /**
   * Toggle selection for a single URL
   */
  const toggle = useCallback((urlId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(urlId)) {
        next.delete(urlId);
      } else {
        next.add(urlId);
      }
      return next;
    });
  }, []);

  /**
   * Select a specific URL
   */
  const select = useCallback((urlId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(urlId);
      return next;
    });
  }, []);

  /**
   * Deselect a specific URL
   */
  const deselect = useCallback((urlId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(urlId);
      return next;
    });
  }, []);

  /**
   * Select all URLs (from current filtered list)
   */
  const selectAll = useCallback(() => {
    const allIds = new Set(urls.map(url => url.id));
    setSelectedIds(allIds);
  }, [urls]);

  /**
   * Deselect all URLs
   */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Toggle all (select all if none/some selected, deselect all if all selected)
   */
  const toggleAll = useCallback(() => {
    if (selectedIds.size === urls.length && urls.length > 0) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, urls.length, selectAll, deselectAll]);

  /**
   * Select URLs matching a filter
   */
  const selectByFilter = useCallback((
    filter: (url: UrlWithCapabilitiesAndStatus | any) => boolean
  ) => {
    const matchingIds = new Set(
      urls.filter(filter).map(url => url.id)
    );
    setSelectedIds(matchingIds);
  }, [urls]);

  /**
   * Add URLs matching a filter to current selection
   */
  const addByFilter = useCallback((
    filter: (url: UrlWithCapabilitiesAndStatus | any) => boolean
  ) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      urls.filter(filter).forEach(url => next.add(url.id));
      return next;
    });
  }, [urls]);

  /**
   * Check if a URL is selected
   */
  const isSelected = useCallback((urlId: number): boolean => {
    return selectedIds.has(urlId);
  }, [selectedIds]);

  /**
   * Get array of selected IDs
   */
  const idsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  /**
   * Check if all visible URLs are selected
   */
  const allSelected = useMemo(() => {
    return urls.length > 0 && selectedIds.size === urls.length;
  }, [selectedIds.size, urls.length]);

  /**
   * Check if some (but not all) URLs are selected
   */
  const someSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < urls.length;
  }, [selectedIds.size, urls.length]);

  /**
   * Get count of selected URLs
   */
  const count = selectedIds.size;

  /**
   * Get selected URL objects
   */
  const selectedUrls = useMemo(() => {
    return urls.filter(url => selectedIds.has(url.id));
  }, [urls, selectedIds]);

  /**
   * Clear selection
   */
  const clear = deselectAll;

  return {
    // State
    selectedIds: selectedIds,
    ids: idsArray,
    count,
    selectedUrls,
    
    // Computed
    allSelected,
    someSelected,
    hasSelection: count > 0,
    
    // Individual operations
    toggle,
    select,
    deselect,
    isSelected,
    
    // Bulk operations
    selectAll,
    deselectAll,
    toggleAll,
    clear,
    
    // Filter-based selection
    selectByFilter,
    addByFilter,
  };
}

