/**
 * Metadata Form Component
 * 
 * Comprehensive form for Zotero item metadata with:
 * - All critical fields (title, creators, date)
 * - Item type selector
 * - Dynamic creator fields (add/remove)
 * - Validation
 * - Citation preview
 * - Submit handling
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { getCitationPreview } from '@/lib/actions/citation-editing';
import type { ZoteroItem } from '@/lib/zotero-client';

interface Creator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface MetadataFormProps {
  initialMetadata?: Partial<ZoteroItem>;
  onChange?: (metadata: Partial<ZoteroItem>) => void;
  onSubmit: (metadata: Partial<ZoteroItem>) => void;
  isSubmitting: boolean;
}

const ITEM_TYPES = [
  { value: 'webpage', label: 'Web Page' },
  { value: 'journalArticle', label: 'Journal Article' },
  { value: 'blogPost', label: 'Blog Post' },
  { value: 'book', label: 'Book' },
  { value: 'bookSection', label: 'Book Section' },
  { value: 'magazineArticle', label: 'Magazine Article' },
  { value: 'newspaperArticle', label: 'Newspaper Article' },
  { value: 'thesis', label: 'Thesis' },
  { value: 'conferencePaper', label: 'Conference Paper' },
  { value: 'report', label: 'Report' },
  { value: 'document', label: 'Document' },
];

/**
 * Metadata Form Component
 * 
 * Form for creating/editing Zotero item metadata
 */
export function MetadataForm({
  initialMetadata,
  onChange,
  onSubmit,
  isSubmitting,
}: MetadataFormProps) {
  const [metadata, setMetadata] = useState<Partial<ZoteroItem>>({
    itemType: 'webpage',
    creators: [],
    ...initialMetadata,
  });

  const [citationPreview, setCitationPreview] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  /**
   * Update metadata and notify parent
   */
  const updateMetadata = (updates: Partial<ZoteroItem>) => {
    const updated = { ...metadata, ...updates };
    setMetadata(updated);
    onChange?.(updated);
    
    // Update citation preview
    updateCitationPreview(updated);
  };

  /**
   * Update citation preview
   */
  const updateCitationPreview = async (data: Partial<ZoteroItem>) => {
    if (data.title && data.creators && data.creators.length > 0) {
      const result = await getCitationPreview(data as ZoteroItem);
      if (result.success && result.citation) {
        setCitationPreview(result.citation);
      }
    }
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const errors: string[] = [];

    if (!metadata.title || metadata.title.trim() === '') {
      errors.push('Title is required');
    }

    if (!metadata.creators || metadata.creators.length === 0) {
      errors.push('At least one creator is required');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(metadata);
    }
  };

  /**
   * Add creator
   */
  const addCreator = () => {
    const newCreator: Creator = {
      creatorType: 'author',
      firstName: '',
      lastName: '',
    };

    updateMetadata({
      creators: [...(metadata.creators || []), newCreator],
    });
  };

  /**
   * Remove creator
   */
  const removeCreator = (index: number) => {
    const creators = [...(metadata.creators || [])];
    creators.splice(index, 1);
    updateMetadata({ creators });
  };

  /**
   * Update creator
   */
  const updateCreator = (index: number, updates: Partial<Creator>) => {
    const creators = [...(metadata.creators || [])];
    creators[index] = { ...creators[index], ...updates };
    updateMetadata({ creators });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1">
            {validationErrors.map((error, index) => (
              <p key={index} className="text-sm text-red-800">• {error}</p>
            ))}
          </div>
        )}

        {/* Item Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Type <span className="text-red-500">*</span>
          </label>
          <select
            value={metadata.itemType || 'webpage'}
            onChange={(e) => updateMetadata({ itemType: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            {ITEM_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={metadata.title || ''}
            onChange={(e) => updateMetadata({ title: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Enter title..."
            required
          />
        </div>

        {/* Creators */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Creators <span className="text-red-500">*</span>
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCreator}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Creator
            </Button>
          </div>

          <div className="space-y-3">
            {metadata.creators && metadata.creators.length > 0 ? (
              metadata.creators.map((creator, index) => (
                <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 space-y-2">
                    <select
                      value={creator.creatorType}
                      onChange={(e) => updateCreator(index, { creatorType: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="author">Author</option>
                      <option value="editor">Editor</option>
                      <option value="contributor">Contributor</option>
                      <option value="translator">Translator</option>
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={creator.firstName || ''}
                        onChange={(e) => updateCreator(index, { firstName: e.target.value })}
                        placeholder="First name"
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <input
                        type="text"
                        value={creator.lastName || ''}
                        onChange={(e) => updateCreator(index, { lastName: e.target.value })}
                        placeholder="Last name"
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCreator(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
                No creators added. Click &quot;Add Creator&quot; to add one.
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="text"
            value={metadata.date || ''}
            onChange={(e) => updateMetadata({ date: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="YYYY-MM-DD or YYYY"
          />
        </div>

        {/* Publication Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publication Title
          </label>
          <input
            type="text"
            value={metadata.publicationTitle || ''}
            onChange={(e) => updateMetadata({ publicationTitle: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Journal, website, or publication name..."
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            type="url"
            value={metadata.url || ''}
            onChange={(e) => updateMetadata({ url: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="https://..."
          />
        </div>

        {/* Abstract */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abstract
          </label>
          <textarea
            value={metadata.abstractNote || ''}
            onChange={(e) => updateMetadata({ abstractNote: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            rows={4}
            placeholder="Brief summary or abstract..."
          />
        </div>

        {/* Citation Preview */}
        {citationPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <label className="block text-xs font-medium text-blue-900 mb-1">
              Citation Preview (APA)
            </label>
            <p className="text-sm text-blue-800">{citationPreview}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex-none py-4 border-t">
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Item...' : 'Create Zotero Item'}
        </Button>
      </div>
    </form>
  );
}

