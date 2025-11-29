/**
 * URL Filters Hook
 * 
 * Manages filter state for URL table with:
 * - Multiple filter types (status, intent, section, domain, etc.)
 * - URL parameter persistence
 * - Clear/reset functionality
 * - Type-safe filter values
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProcessingStatus, UserIntent } from '@/lib/types/url-processing';

export interface URLFilters {
  search: string;
  section: string;
  domain: string;
  processingStatus: ProcessingStatus | '';
  userIntent: UserIntent | '';
  citationStatus: 'valid' | 'incomplete' | '';
  minAttempts: number | '';
  maxAttempts: number | '';
}

const DEFAULT_FILTERS: URLFilters = {
  search: '',
  section: '',
  domain: '',
  processingStatus: '',
  userIntent: '',
  citationStatus: '',
  minAttempts: '',
  maxAttempts: '',
};

/**
 * Custom hook for managing URL table filters
 * 
 * Features:
 * - State management for all filter types
 * - URL parameter synchronization
 * - Reset functionality
 * - Active filter tracking
 */
export function useURLFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<URLFilters>(() => {
    return {
      search: searchParams.get('search') || '',
      section: searchParams.get('section') || '',
      domain: searchParams.get('domain') || '',
      processingStatus: (searchParams.get('status') as ProcessingStatus) || '',
      userIntent: (searchParams.get('intent') as UserIntent) || '',
      citationStatus: (searchParams.get('citation') as 'valid' | 'incomplete') || '',
      minAttempts: searchParams.get('minAttempts') ? parseInt(searchParams.get('minAttempts')!) : '',
      maxAttempts: searchParams.get('maxAttempts') ? parseInt(searchParams.get('maxAttempts')!) : '',
    };
  });

  // Track which filters are active (non-default)
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value !== '' && value !== DEFAULT_FILTERS[key as keyof URLFilters]
  ).length;

  /**
   * Update a single filter value
   */
  const updateFilter = useCallback((key: keyof URLFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Update multiple filters at once
   */
  const updateMultiple = useCallback((updates: Partial<URLFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clear = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Clear a specific filter
   */
  const clearFilter = useCallback((key: keyof URLFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: DEFAULT_FILTERS[key],
    }));
  }, []);

  /**
   * Sync filters to URL parameters
   */
  const syncToURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.section) params.set('section', filters.section);
    if (filters.domain) params.set('domain', filters.domain);
    if (filters.processingStatus) params.set('status', filters.processingStatus);
    if (filters.userIntent) params.set('intent', filters.userIntent);
    if (filters.citationStatus) params.set('citation', filters.citationStatus);
    if (filters.minAttempts) params.set('minAttempts', String(filters.minAttempts));
    if (filters.maxAttempts) params.set('maxAttempts', String(filters.maxAttempts));
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    router.push(newUrl, { scroll: false });
  }, [filters, router]);

  /**
   * Get active filter count (for badge display)
   */
  const getActiveCount = useCallback((): number => {
    return activeFilters;
  }, [activeFilters]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = activeFilters > 0;

  /**
   * Get filters in format for server action
   */
  const getServerFilters = useCallback(() => {
    const serverFilters: any = {};
    
    if (filters.search) serverFilters.search = filters.search;
    if (filters.section) serverFilters.section = filters.section;
    if (filters.domain) serverFilters.domain = filters.domain;
    if (filters.processingStatus) serverFilters.processingStatus = filters.processingStatus;
    if (filters.userIntent) serverFilters.userIntent = filters.userIntent;
    if (filters.citationStatus) serverFilters.citationStatus = filters.citationStatus;
    if (filters.minAttempts !== '') serverFilters.minAttempts = filters.minAttempts;
    if (filters.maxAttempts !== '') serverFilters.maxAttempts = filters.maxAttempts;
    
    return serverFilters;
  }, [filters]);

  return {
    // Current filter values
    filters,
    
    // Update methods
    updateFilter,
    updateMultiple,
    setFilters,
    
    // Clear methods
    clear,
    clearFilter,
    
    // URL sync
    syncToURL,
    
    // Helper methods
    getActiveCount,
    hasActiveFilters,
    getServerFilters,
    
    // Computed
    activeCount: activeFilters,
  };
}

