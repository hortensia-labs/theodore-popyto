/**
 * Custom Hooks Tests
 * 
 * Tests for URL table custom hooks
 */

import { describe, test, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useURLFilters } from '../../components/urls/url-table/hooks/useURLFilters';
import { useURLSelection } from '../../components/urls/url-table/hooks/useURLSelection';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}));

describe('useURLFilters', () => {
  test('initializes with default filters', () => {
    const { result } = renderHook(() => useURLFilters());
    
    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.processingStatus).toBe('');
    expect(result.current.filters.userIntent).toBe('');
  });

  test('updates individual filter', () => {
    const { result } = renderHook(() => useURLFilters());
    
    act(() => {
      result.current.updateFilter('search', 'test');
    });
    
    expect(result.current.filters.search).toBe('test');
  });

  test('clears all filters', () => {
    const { result } = renderHook(() => useURLFilters());
    
    act(() => {
      result.current.updateFilter('search', 'test');
      result.current.updateFilter('processingStatus', 'stored');
    });
    
    expect(result.current.activeCount).toBeGreaterThan(0);
    
    act(() => {
      result.current.clear();
    });
    
    expect(result.current.activeCount).toBe(0);
    expect(result.current.filters.search).toBe('');
  });

  test('tracks active filter count', () => {
    const { result } = renderHook(() => useURLFilters());
    
    expect(result.current.activeCount).toBe(0);
    
    act(() => {
      result.current.updateFilter('search', 'test');
    });
    
    expect(result.current.activeCount).toBe(1);
    
    act(() => {
      result.current.updateFilter('processingStatus', 'stored');
    });
    
    expect(result.current.activeCount).toBe(2);
  });

  test('provides server filters format', () => {
    const { result } = renderHook(() => useURLFilters());
    
    act(() => {
      result.current.updateFilter('search', 'test');
      result.current.updateFilter('processingStatus', 'stored');
    });
    
    const serverFilters = result.current.getServerFilters();
    
    expect(serverFilters.search).toBe('test');
    expect(serverFilters.processingStatus).toBe('stored');
    expect(serverFilters.userIntent).toBeUndefined(); // Not set
  });
});

describe('useURLSelection', () => {
  const mockUrls = [
    { id: 1, url: 'https://example.com/1' },
    { id: 2, url: 'https://example.com/2' },
    { id: 3, url: 'https://example.com/3' },
  ];

  test('initializes with no selection', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    expect(result.current.count).toBe(0);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.hasSelection).toBe(false);
  });

  test('toggles individual selection', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      result.current.toggle(1);
    });
    
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(false);
  });

  test('selects all URLs', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      result.current.selectAll();
    });
    
    expect(result.current.count).toBe(3);
    expect(result.current.allSelected).toBe(true);
  });

  test('deselects all URLs', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      result.current.selectAll();
      result.current.deselectAll();
    });
    
    expect(result.current.count).toBe(0);
    expect(result.current.allSelected).toBe(false);
  });

  test('toggleAll works correctly', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    // First toggle: select all
    act(() => {
      result.current.toggleAll();
    });
    expect(result.current.allSelected).toBe(true);
    
    // Second toggle: deselect all
    act(() => {
      result.current.toggleAll();
    });
    expect(result.current.count).toBe(0);
  });

  test('tracks someSelected correctly', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      result.current.toggle(1);
    });
    
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);
  });

  test('provides selected URLs array', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      result.current.toggle(1);
      result.current.toggle(2);
    });
    
    expect(result.current.selectedUrls).toHaveLength(2);
    expect(result.current.selectedUrls[0].id).toBe(1);
  });

  test('selectByFilter works correctly', () => {
    const { result } = renderHook(() => useURLSelection(mockUrls));
    
    act(() => {
      // Select URLs with id > 1
      result.current.selectByFilter(url => url.id > 1);
    });
    
    expect(result.current.count).toBe(2);
    expect(result.current.isSelected(1)).toBe(false);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(true);
  });
});

