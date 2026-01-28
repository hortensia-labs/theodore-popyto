/**
 * Content Processing Section
 *
 * Displays the complete content processing pipeline status in the URL detail panel.
 * Shows content fetch status, identifier extraction, metadata extraction, and LLM processing.
 */

'use client';

import { useState } from 'react';
import type { UrlWithCapabilitiesAndStatus } from '@/lib/actions/url-with-capabilities';
import { ContentAvailabilitySubsection } from './content-processing/ContentAvailabilitySubsection';
import { IdentifierExtractionSubsection } from './content-processing/IdentifierExtractionSubsection';
import { MetadataExtractionSubsection } from './content-processing/MetadataExtractionSubsection';
import { LLMProcessingSubsection } from './content-processing/LLMProcessingSubsection';
import { ErrorInformationSubsection } from './content-processing/ErrorInformationSubsection';

interface ContentProcessingSectionProps {
  url: UrlWithCapabilitiesAndStatus;
  onUpdate?: () => void;
  isProcessing?: boolean;
}

/**
 * Main Content Processing Section Component
 */
export function ContentProcessingSection({
  url,
  onUpdate,
  isProcessing = false,
}: ContentProcessingSectionProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contentAvailability: true,
    identifierExtraction: true,
    metadataExtraction: true,
    llmProcessing: true,
    errorInformation: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Check if we should show each subsection
  const showIdentifierExtraction = url.contentCache || (url.identifiers?.length && url.identifiers?.length > 0);
  const showMetadataExtraction = url.extractedMetadata?.length > 0;
  const showLLMProcessing = url.capability.canUseLLM || url.llmExtractionStatus;
  const showErrorInformation = url.lastFetchError || url.llmExtractionError;

  return (
    <div className="border rounded-lg bg-white p-4 space-y-3">
      <h3 className="font-medium">Content Processing</h3>

      <div className="space-y-3">
        {/* Content Availability - Always shown */}
        <ContentAvailabilitySubsection
          url={url}
          isExpanded={expandedSections.contentAvailability}
          onToggle={() => toggleSection('contentAvailability')}
          onUpdate={onUpdate}
          isProcessing={isProcessing}
        />

        {/* Identifier Extraction - Shown if content processed */}
        {showIdentifierExtraction && (
          <IdentifierExtractionSubsection
            url={url}
            isExpanded={expandedSections.identifierExtraction}
            onToggle={() => toggleSection('identifierExtraction')}
            onUpdate={onUpdate}
            isProcessing={isProcessing}
          />
        )}

        {/* Metadata Extraction - Shown if metadata exists */}
        {showMetadataExtraction && (
          <MetadataExtractionSubsection
            url={url}
            isExpanded={expandedSections.metadataExtraction}
            onToggle={() => toggleSection('metadataExtraction')}
            onUpdate={onUpdate}
            isProcessing={isProcessing}
          />
        )}

        {/* LLM Processing - Shown if LLM available or attempted */}
        {showLLMProcessing && (
          <LLMProcessingSubsection
            url={url}
            isExpanded={expandedSections.llmProcessing}
            onToggle={() => toggleSection('llmProcessing')}
            onUpdate={onUpdate}
            isProcessing={isProcessing}
          />
        )}

        {/* Error Information - Shown if errors exist */}
        {showErrorInformation && (
          <ErrorInformationSubsection
            url={url}
            isExpanded={expandedSections.errorInformation}
            onToggle={() => toggleSection('errorInformation')}
            onUpdate={onUpdate}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </div>
  );
}
