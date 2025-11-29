/**
 * Capabilities Section
 * 
 * Displays available processing methods for a URL in the detail panel
 * Shows what can be done with this URL
 */

'use client';

import { CapabilityIndicator } from '../url-status/CapabilityIndicator';
import type { ProcessingCapability } from '@/lib/types/url-processing';

interface CapabilitiesSectionProps {
  capability: ProcessingCapability;
}

/**
 * Capabilities Display Section
 */
export function CapabilitiesSection({ capability }: CapabilitiesSectionProps) {
  return (
    <div className="space-y-3">
      <CapabilityIndicator capability={capability} compact={false} />
      
      {/* Recommendations based on capabilities */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">Recommended Action</h4>
        <p className="text-xs text-blue-800">
          {getRecommendation(capability)}
        </p>
      </div>
    </div>
  );
}

/**
 * Get processing recommendation based on capabilities
 */
function getRecommendation(capability: ProcessingCapability): string {
  if (capability.hasIdentifiers) {
    return 'This URL has identifiers (DOI, PMID, etc.). Process with Zotero for best results.';
  }
  
  if (capability.hasWebTranslators) {
    return 'Zotero web translator available. Process with Zotero URL method.';
  }
  
  if (capability.hasContent) {
    return 'Content is cached. Can extract identifiers or use LLM extraction.';
  }
  
  if (capability.canUseLLM) {
    return 'Content available for AI extraction. Try LLM processing.';
  }
  
  if (!capability.isAccessible) {
    return 'URL is not accessible. Manual creation may be needed.';
  }
  
  return 'Limited processing options available. Consider manual creation.';
}

