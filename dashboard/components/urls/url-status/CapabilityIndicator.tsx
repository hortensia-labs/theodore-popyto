/**
 * Capability Indicator
 * 
 * Shows what processing methods are available for a URL:
 * - Identifiers (DOI, PMID, etc.)
 * - Web translators
 * - Cached content
 * - LLM extraction
 * - PDF support
 */

'use client';

import { cn } from '@/lib/utils';
import type { ProcessingCapability } from '@/lib/types/url-processing';
import {
  Hash,
  Globe,
  Database,
  Sparkles,
  FileText,
  Check,
  X,
} from 'lucide-react';

interface CapabilityIndicatorProps {
  capability: ProcessingCapability;
  compact?: boolean;
  className?: string;
}

interface CapabilityItem {
  key: keyof ProcessingCapability;
  label: string;
  icon: typeof Hash;
  description: string;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    key: 'hasIdentifiers',
    label: 'IDs',
    icon: Hash,
    description: 'Has valid identifiers (DOI, PMID, arXiv, ISBN)',
  },
  {
    key: 'hasWebTranslators',
    label: 'Translator',
    icon: Globe,
    description: 'Zotero web translator available',
  },
  {
    key: 'hasContent',
    label: 'Content',
    icon: Database,
    description: 'Content fetched and cached',
  },
  {
    key: 'canUseLLM',
    label: 'LLM',
    icon: Sparkles,
    description: 'Can use AI extraction',
  },
  {
    key: 'isPDF',
    label: 'PDF',
    icon: FileText,
    description: 'Content is PDF file',
  },
];

/**
 * Capability Indicator Component
 * 
 * Displays available processing methods for a URL
 */
export function CapabilityIndicator({
  capability,
  compact = false,
  className,
}: CapabilityIndicatorProps) {
  // Filter to only show available capabilities
  const available = CAPABILITIES.filter(cap => capability[cap.key]);
  
  if (available.length === 0 && compact) {
    return null;
  }

  if (compact) {
    // Compact mode: just show icons with tooltip
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {available.map(cap => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.key}
              className="p-1 rounded bg-blue-50 border border-blue-200"
              title={cap.description}
            >
              <Icon className="h-3 w-3 text-blue-600" />
            </div>
          );
        })}
      </div>
    );
  }

  // Expanded mode: show all capabilities with status
  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-gray-700">Available Methods</h4>
      <div className="grid grid-cols-1 gap-2">
        {CAPABILITIES.map(cap => {
          const Icon = cap.icon;
          const isAvailable = capability[cap.key];
          
          return (
            <div
              key={cap.key}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
                isAvailable
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              )}
            >
              <div className={cn(
                'p-1 rounded',
                isAvailable ? 'bg-green-100' : 'bg-gray-100'
              )}>
                <Icon className={cn(
                  'h-4 w-4',
                  isAvailable ? 'text-green-600' : 'text-gray-400'
                )} />
              </div>
              
              <div className="flex-1">
                <div className="font-medium">{cap.label}</div>
                <div className="text-xs opacity-75">{cap.description}</div>
              </div>
              
              {isAvailable ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact capability summary for table display
 */
export function CapabilitySummary({
  capability,
  className,
}: {
  capability: ProcessingCapability;
  className?: string;
}) {
  const count = [
    capability.hasIdentifiers,
    capability.hasWebTranslators,
    capability.hasContent,
    capability.canUseLLM,
  ].filter(Boolean).length;

  if (count === 0) {
    return (
      <span className={cn('text-xs text-gray-400', className)}>
        No methods
      </span>
    );
  }

  return (
    <span className={cn('text-xs font-medium text-blue-600', className)} title="Available processing methods">
      {count} method{count !== 1 ? 's' : ''}
    </span>
  );
}

