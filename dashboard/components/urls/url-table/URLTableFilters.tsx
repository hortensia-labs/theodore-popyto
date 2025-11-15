/**
 * URL Table Filters Component
 * 
 * Comprehensive filter panel with:
 * - Search input
 * - Section/Domain dropdowns
 * - Processing status checkboxes
 * - User intent checkboxes
 * - Citation status filter
 * - Processing attempts range
 * - Apply/Clear buttons
 * - Active filter chips
 * - Collapsible accordion layout
 * 
 * Based on PRD Section 9.3: Filter Panel Layout
 */

'use client';

import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { URLFilters } from './hooks/useURLFilters';
import type { ProcessingStatus, UserIntent } from '@/lib/types/url-processing';
import type { Section } from '@/drizzle/schema';

interface URLTableFiltersProps {
  filters: URLFilters;
  sections: Section[];
  domains: string[];
  activeCount: number;
  onChange: (key: keyof URLFilters, value: any) => void;
  onClear: () => void;
  onApply: () => void;
  isPending?: boolean;
}

/**
 * URL Table Filters Component
 * 
 * Provides comprehensive filtering UI for URL table
 */
export function URLTableFilters({
  filters,
  sections,
  domains,
  activeCount,
  onChange,
  onClear,
  onApply,
  isPending,
}: URLTableFiltersProps) {
  const processingStatuses: { value: ProcessingStatus; label: string }[] = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'processing_zotero', label: 'Processing (Zotero)' },
    { value: 'processing_content', label: 'Processing (Content)' },
    { value: 'processing_llm', label: 'Processing (LLM)' },
    { value: 'awaiting_selection', label: 'Awaiting Selection' },
    { value: 'awaiting_metadata', label: 'Awaiting Metadata' },
    { value: 'stored', label: 'Stored' },
    { value: 'stored_incomplete', label: 'Incomplete' },
    { value: 'stored_custom', label: 'Custom' },
    { value: 'exhausted', label: 'Exhausted' },
    { value: 'ignored', label: 'Ignored' },
    { value: 'archived', label: 'Archived' },
  ];

  const userIntents: { value: UserIntent; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'ignore', label: 'Ignore' },
    { value: 'priority', label: 'Priority' },
    { value: 'manual_only', label: 'Manual Only' },
    { value: 'archive', label: 'Archive' },
  ];

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {activeCount} active
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              {/* Filters Grid - 4 columns starting with search */}
              <div className="grid grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => onChange('search', e.target.value)}
                    placeholder="Search URLs..."
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={filters.section}
                    onChange={(e) => onChange('section', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Sections</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.name}>
                        {section.title || section.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <select
                    value={filters.domain}
                    onChange={(e) => onChange('domain', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Domains</option>
                    {domains.slice(0, 50).map(domain => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Citation Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Citation
                  </label>
                  <select
                    value={filters.citationStatus}
                    onChange={(e) => onChange('citationStatus', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Citations</option>
                    <option value="valid">Valid</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                </div>

                {/* Processing Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing Status
                  </label>
                  <select
                    value={filters.processingStatus}
                    onChange={(e) => onChange('processingStatus', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Statuses</option>
                    {processingStatuses.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Intent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Intent
                  </label>
                  <select
                    value={filters.userIntent}
                    onChange={(e) => onChange('userIntent', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">All Intents</option>
                    {userIntents.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Processing Attempts Min */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Attempts
                  </label>
                  <input
                    type="number"
                    value={filters.minAttempts}
                    onChange={(e) => onChange('minAttempts', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Min"
                    min="0"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                {/* Processing Attempts Max */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={filters.maxAttempts}
                    onChange={(e) => onChange('maxAttempts', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Max"
                    min="0"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Active Filter Chips */}
              {activeCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {filters.search && (
                    <FilterChip
                      label={`Search: "${filters.search}"`}
                      onRemove={() => onChange('search', '')}
                    />
                  )}
                  {filters.section && (
                    <FilterChip
                      label={`Section: ${filters.section}`}
                      onRemove={() => onChange('section', '')}
                    />
                  )}
                  {filters.domain && (
                    <FilterChip
                      label={`Domain: ${filters.domain}`}
                      onRemove={() => onChange('domain', '')}
                    />
                  )}
                  {filters.processingStatus && (
                    <FilterChip
                      label={`Status: ${filters.processingStatus}`}
                      onRemove={() => onChange('processingStatus', '')}
                    />
                  )}
                  {filters.userIntent && (
                    <FilterChip
                      label={`Intent: ${filters.userIntent}`}
                      onRemove={() => onChange('userIntent', '')}
                    />
                  )}
                  {filters.citationStatus && (
                    <FilterChip
                      label={`Citation: ${filters.citationStatus}`}
                      onRemove={() => onChange('citationStatus', '')}
                    />
                  )}
                  {(filters.minAttempts !== '' || filters.maxAttempts !== '') && (
                    <FilterChip
                      label={`Attempts: ${filters.minAttempts || '0'}-${filters.maxAttempts || '∞'}`}
                      onRemove={() => {
                        onChange('minAttempts', '');
                        onChange('maxAttempts', '');
                      }}
                    />
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onApply}
                  disabled={isPending}
                  className="flex-1"
                >
                  Apply Filters
                </Button>
                {activeCount > 0 && (
                  <Button
                    onClick={onClear}
                    variant="outline"
                    disabled={isPending}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/**
 * Filter Chip Component
 * 
 * Individual chip for active filters with remove button
 */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-blue-100 rounded p-0.5 transition-colors"
        type="button"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

