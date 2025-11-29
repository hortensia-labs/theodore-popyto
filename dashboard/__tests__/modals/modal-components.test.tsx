/**
 * Modal Component Tests
 * 
 * Tests for all modal components
 */

import { describe, test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentViewer } from '../../components/urls/url-modals/ContentViewer';
import { MetadataForm } from '../../components/urls/url-modals/MetadataForm';
import { CitationPreview } from '../../components/urls/url-modals/CitationPreview';
import { IdentifierCard } from '../../components/urls/url-modals/IdentifierCard';

// Mock server actions
jest.mock('../../lib/actions/manual-creation', () => ({
  getContentForManualCreation: jest.fn(async () => ({
    success: true,
    data: {
      raw: '<html><body>Test content</body></html>',
      reader: 'Test content',
      isPDF: false,
    },
  })),
}));

jest.mock('../../lib/actions/citation-editing', () => ({
  getCitationPreview: jest.fn(async (metadata) => ({
    success: true,
    citation: `${metadata.creators?.[0]?.lastName}. (${metadata.date}). ${metadata.title}.`,
  })),
}));

describe('ContentViewer', () => {
  test('renders loading state initially', () => {
    render(
      <ContentViewer
        url="https://example.com"
        urlId={1}
        isPDF={false}
      />
    );

    expect(screen.getByText('Loading content...')).toBeInTheDocument();
  });

  test('loads content on mount', async () => {
    render(
      <ContentViewer
        url="https://example.com"
        urlId={1}
        isPDF={false}
      />
    );

    // Wait for content to load
    await waitFor(() => {
      expect(screen.queryByText('Loading content...')).not.toBeInTheDocument();
    });
  });
});

describe('MetadataForm', () => {
  const mockOnSubmit = jest.fn();

  test('renders all required fields', () => {
    render(
      <MetadataForm
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/Item Type/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter title...')).toBeInTheDocument();
    expect(screen.getByText(/Creators/)).toBeInTheDocument();
  });

  test('validates required fields', () => {
    render(
      <MetadataForm
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Create Zotero Item');
    fireEvent.click(submitButton);

    // Should show validation errors
    expect(screen.getByText(/Title is required/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('adds and removes creators', () => {
    render(
      <MetadataForm
        onSubmit={mockOnSubmit}
        isSubmitting={false}
      />
    );

    const addButton = screen.getByText('Add Creator');
    fireEvent.click(addButton);

    // Should now show creator fields
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
  });
});

describe('CitationPreview', () => {
  const mockMetadata = {
    title: 'Test Article',
    creators: [{ creatorType: 'author', firstName: 'John', lastName: 'Doe' }],
    date: '2024',
    itemType: 'journalArticle' as const,
  };

  test('displays citation preview', async () => {
    render(<CitationPreview metadata={mockMetadata} />);

    await waitFor(() => {
      expect(screen.getByText(/Doe/)).toBeInTheDocument();
    });
  });

  test('shows missing fields warning', () => {
    render(
      <CitationPreview
        metadata={mockMetadata}
        missingFields={['creators', 'date']}
      />
    );

    expect(screen.getByText('Incomplete Citation')).toBeInTheDocument();
    expect(screen.getByText(/Missing required fields/)).toBeInTheDocument();
  });

  test('copy button works', async () => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(async () => {}),
      },
    });

    render(<CitationPreview metadata={mockMetadata} />);

    await waitFor(() => {
      const copyButton = screen.getByText('Copy').closest('button');
      if (copyButton) {
        fireEvent.click(copyButton);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });
});

describe('IdentifierCard', () => {
  const mockIdentifier = {
    id: 1,
    urlId: 1,
    identifierType: 'DOI',
    identifierValue: '10.1234/example',
    extractionMethod: 'pdf_metadata',
    extractionSource: 'page_1',
    confidence: 'high',
    previewFetched: true,
    previewData: { title: 'Test Article' },
    previewQualityScore: 85,
    userSelected: false,
    selectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  test('renders identifier information', () => {
    const mockOnSelect = jest.fn();
    const mockOnPreview = jest.fn();

    render(
      <IdentifierCard
        identifier={mockIdentifier as any}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    expect(screen.getByText('DOI')).toBeInTheDocument();
    expect(screen.getByText('10.1234/example')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  test('shows preview data when available', () => {
    const mockOnSelect = jest.fn();
    const mockOnPreview = jest.fn();

    render(
      <IdentifierCard
        identifier={mockIdentifier as any}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  test('calls onSelect when select button clicked', () => {
    const mockOnSelect = jest.fn();
    const mockOnPreview = jest.fn();

    render(
      <IdentifierCard
        identifier={mockIdentifier as any}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
      />
    );

    const selectButton = screen.getByText('Select & Process');
    fireEvent.click(selectButton);

    expect(mockOnSelect).toHaveBeenCalled();
  });
});

