/**
 * Table Component Tests
 * 
 * Tests for URL table components
 */

import { describe, test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { URLTableFilters } from '../../components/urls/url-table/URLTableFilters';
import { URLTableBulkActions } from '../../components/urls/url-table/URLTableBulkActions';

// Mock implementations
const mockFilters = {
  search: '',
  section: '',
  domain: '',
  processingStatus: '' as any,
  userIntent: '' as any,
  citationStatus: '' as any,
  minAttempts: '' as any,
  maxAttempts: '' as any,
};

const mockSections = [
  { id: 1, name: 'section-1', title: 'Section 1', path: '/path', createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: 'section-2', title: 'Section 2', path: '/path', createdAt: new Date(), updatedAt: new Date() },
];

const mockDomains = ['example.com', 'test.com'];

describe('URLTableFilters', () => {
  const mockOnChange = jest.fn();
  const mockOnClear = jest.fn();
  const mockOnApply = jest.fn();

  test('renders all filter inputs', () => {
    render(
      <URLTableFilters
        filters={mockFilters}
        sections={mockSections}
        domains={mockDomains}
        activeCount={0}
        onChange={mockOnChange}
        onClear={mockOnClear}
        onApply={mockOnApply}
      />
    );

    expect(screen.getByPlaceholderText('Search URLs...')).toBeInTheDocument();
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
  });

  test('shows active filter count', () => {
    render(
      <URLTableFilters
        filters={mockFilters}
        sections={mockSections}
        domains={mockDomains}
        activeCount={3}
        onChange={mockOnChange}
        onClear={mockOnClear}
        onApply={mockOnApply}
      />
    );

    expect(screen.getByText('3 active')).toBeInTheDocument();
  });

  test('calls onChange when filter changes', () => {
    render(
      <URLTableFilters
        filters={mockFilters}
        sections={mockSections}
        domains={mockDomains}
        activeCount={0}
        onChange={mockOnChange}
        onClear={mockOnClear}
        onApply={mockOnApply}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search URLs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(mockOnChange).toHaveBeenCalledWith('search', 'test');
  });

  test('shows clear button when filters active', () => {
    render(
      <URLTableFilters
        filters={mockFilters}
        sections={mockSections}
        domains={mockDomains}
        activeCount={2}
        onChange={mockOnChange}
        onClear={mockOnClear}
        onApply={mockOnApply}
      />
    );

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });
});

describe('URLTableBulkActions', () => {
  const mockOnProcessBatch = jest.fn();
  const mockOnActionComplete = jest.fn();

  test('renders when URLs selected', () => {
    render(
      <URLTableBulkActions
        selectedCount={5}
        selectedIds={[1, 2, 3, 4, 5]}
        onProcessBatch={mockOnProcessBatch}
        onActionComplete={mockOnActionComplete}
      />
    );

    expect(screen.getByText('5 URLs selected')).toBeInTheDocument();
  });

  test('renders all action buttons', () => {
    render(
      <URLTableBulkActions
        selectedCount={5}
        selectedIds={[1, 2, 3, 4, 5]}
        onProcessBatch={mockOnProcessBatch}
        onActionComplete={mockOnActionComplete}
      />
    );

    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('Ignore')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('disables buttons when processing', () => {
    render(
      <URLTableBulkActions
        selectedCount={5}
        selectedIds={[1, 2, 3, 4, 5]}
        onProcessBatch={mockOnProcessBatch}
        onActionComplete={mockOnActionComplete}
        isProcessing={true}
      />
    );

    const processButton = screen.getByText('Process').closest('button');
    expect(processButton).toBeDisabled();
  });
});

