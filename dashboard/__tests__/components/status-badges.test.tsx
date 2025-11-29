/**
 * Status Badge Component Tests
 * 
 * Tests for all status indicator components
 */

import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ProcessingStatusBadge } from '../../components/urls/url-status/ProcessingStatusBadge';
import { CapabilityIndicator, CapabilitySummary } from '../../components/urls/url-status/CapabilityIndicator';
import { IntentBadge } from '../../components/urls/url-status/IntentBadge';
import type { ProcessingStatus, UserIntent, ProcessingCapability } from '../../lib/types/url-processing';

describe('ProcessingStatusBadge', () => {
  test('renders stored status correctly', () => {
    render(<ProcessingStatusBadge status="stored" />);
    expect(screen.getByText('Stored')).toBeInTheDocument();
  });

  test('renders all status types', () => {
    const statuses: ProcessingStatus[] = [
      'not_started',
      'processing_zotero',
      'processing_content',
      'processing_llm',
      'awaiting_selection',
      'awaiting_metadata',
      'stored',
      'stored_incomplete',
      'stored_custom',
      'exhausted',
      'ignored',
      'archived',
    ];

    statuses.forEach(status => {
      const { unmount } = render(<ProcessingStatusBadge status={status} />);
      // Should render without error
      unmount();
    });
  });

  test('hides label when showLabel is false', () => {
    render(<ProcessingStatusBadge status="stored" showLabel={false} />);
    expect(screen.queryByText('Stored')).not.toBeInTheDocument();
  });

  test('shows different sizes', () => {
    const { rerender } = render(<ProcessingStatusBadge status="stored" size="sm" />);
    rerender(<ProcessingStatusBadge status="stored" size="md" />);
    rerender(<ProcessingStatusBadge status="stored" size="lg" />);
    // Should render without error
  });
});

describe('CapabilityIndicator', () => {
  const fullCapability: ProcessingCapability = {
    hasIdentifiers: true,
    hasWebTranslators: true,
    hasContent: true,
    isAccessible: true,
    canUseLLM: true,
    isPDF: false,
    manualCreateAvailable: true,
  };

  const emptyCapability: ProcessingCapability = {
    hasIdentifiers: false,
    hasWebTranslators: false,
    hasContent: false,
    isAccessible: false,
    canUseLLM: false,
    isPDF: false,
    manualCreateAvailable: true,
  };

  test('renders expanded mode with all capabilities', () => {
    render(<CapabilityIndicator capability={fullCapability} compact={false} />);
    expect(screen.getByText('Available Methods')).toBeInTheDocument();
    expect(screen.getByText('IDs')).toBeInTheDocument();
    expect(screen.getByText('Translator')).toBeInTheDocument();
  });

  test('renders compact mode', () => {
    render(<CapabilityIndicator capability={fullCapability} compact={true} />);
    // Should show icons only
  });

  test('handles empty capabilities gracefully', () => {
    render(<CapabilityIndicator capability={emptyCapability} compact={false} />);
    expect(screen.getByText('Available Methods')).toBeInTheDocument();
  });
});

describe('CapabilitySummary', () => {
  test('shows method count', () => {
    const capability: ProcessingCapability = {
      hasIdentifiers: true,
      hasWebTranslators: true,
      hasContent: false,
      isAccessible: true,
      canUseLLM: false,
      isPDF: false,
      manualCreateAvailable: true,
    };

    render(<CapabilitySummary capability={capability} />);
    expect(screen.getByText('2 methods')).toBeInTheDocument();
  });

  test('shows singular for one method', () => {
    const capability: ProcessingCapability = {
      hasIdentifiers: true,
      hasWebTranslators: false,
      hasContent: false,
      isAccessible: true,
      canUseLLM: false,
      isPDF: false,
      manualCreateAvailable: true,
    };

    render(<CapabilitySummary capability={capability} />);
    expect(screen.getByText('1 method')).toBeInTheDocument();
  });

  test('shows "No methods" when none available', () => {
    const capability: ProcessingCapability = {
      hasIdentifiers: false,
      hasWebTranslators: false,
      hasContent: false,
      isAccessible: true,
      canUseLLM: false,
      isPDF: false,
      manualCreateAvailable: true,
    };

    render(<CapabilitySummary capability={capability} />);
    expect(screen.getByText('No methods')).toBeInTheDocument();
  });
});

describe('IntentBadge', () => {
  test('renders all intent types', () => {
    const intents: UserIntent[] = ['auto', 'ignore', 'priority', 'manual_only', 'archive'];

    intents.forEach(intent => {
      const { unmount } = render(<IntentBadge intent={intent} showLabel />);
      unmount();
    });
  });

  test('hides auto intent by default', () => {
    const { container } = render(<IntentBadge intent="auto" />);
    expect(container.firstChild).toBeNull();
  });

  test('shows auto intent when onChange is provided', () => {
    render(<IntentBadge intent="auto" onChange={() => {}} showLabel />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  test('hides label when showLabel is false', () => {
    render(<IntentBadge intent="priority" showLabel={false} />);
    expect(screen.queryByText('P')).not.toBeInTheDocument();
  });
});

