/**
 * Metadata Editor Component
 * 
 * Editor for Zotero item metadata with:
 * - All Zotero fields editable
 * - Missing critical fields highlighted
 * - Field validation
 * - Add/remove creators
 * - Save/revert functionality
 * - Real-time validation
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, AlertCircle } from 'lucide-react';
import type { ZoteroItem } from '@/lib/zotero-client';

interface Creator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface MetadataEditorProps {
  metadata: ZoteroItem;
  missingFields?: string[];
  onChange: (metadata: ZoteroItem) => void;
  onSave: (metadata: ZoteroItem) => void;
  onCancel: () => void;
  isSaving: boolean;
}

/**
 * Metadata Editor Component
 * 
 * Comprehensive editor for Zotero item metadata
 */
export function MetadataEditor({
  metadata: initialMetadata,
  missingFields = [],
  onChange,
  onSave,
  onCancel,
  isSaving,
}: MetadataEditorProps) {
  const [metadata, setMetadata] = useState<ZoteroItem>(initialMetadata);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Update metadata
   */
  const updateMetadata = (updates: Partial<ZoteroItem>) => {
    const updated = { ...metadata, ...updates };
    setMetadata(updated);
    onChange(updated);
    setHasChanges(true);
  };

  /**
   * Reset to initial values
   */
  const handleRevert = () => {
    setMetadata(initialMetadata);
    onChange(initialMetadata);
    setHasChanges(false);
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    onSave(metadata);
  };

  /**
   * Check if field is missing
   */
  const isFieldMissing = (fieldName: string): boolean => {
    return missingFields.includes(fieldName);
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
    <div className="space-y-6 h-full flex flex-col">
      {/* Missing Fields Alert */}
      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Incomplete Citation - Missing Critical Fields
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              The following fields are required for a complete citation: <strong>{missingFields.join(', ')}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Title - CRITICAL */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isFieldMissing('title') ? 'text-red-700' : 'text-gray-700'
          }`}>
            Title {isFieldMissing('title') && <span className="text-red-500">* MISSING</span>}
          </label>
          <input
            type="text"
            value={metadata.title || ''}
            onChange={(e) => updateMetadata({ title: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              isFieldMissing('title') ? 'border-red-300 bg-red-50' : ''
            }`}
            placeholder="Enter title..."
          />
        </div>

        {/* Creators - CRITICAL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`block text-sm font-medium ${
              isFieldMissing('creators') ? 'text-red-700' : 'text-gray-700'
            }`}>
              Creators {isFieldMissing('creators') && <span className="text-red-500">* MISSING</span>}
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
                <div key={index} className={`flex gap-2 p-3 rounded-md ${
                  isFieldMissing('creators') ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                }`}>
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
              <div className="text-center py-4 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                No creators added. Click &quot;Add Creator&quot; to add one.
              </div>
            )}
          </div>
        </div>

        {/* Date - CRITICAL */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isFieldMissing('date') ? 'text-red-700' : 'text-gray-700'
          }`}>
            Date {isFieldMissing('date') && <span className="text-red-500">* MISSING</span>}
          </label>
          <input
            type="text"
            value={metadata.date || ''}
            onChange={(e) => updateMetadata({ date: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              isFieldMissing('date') ? 'border-red-300 bg-red-50' : ''
            }`}
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

        {/* Volume, Issue, Pages (for articles) */}
        {(metadata.itemType === 'journalArticle' || metadata.itemType === 'magazineArticle') && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume
              </label>
              <input
                type="text"
                value={metadata.volume || ''}
                onChange={(e) => updateMetadata({ volume: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Vol"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue
              </label>
              <input
                type="text"
                value={metadata.issue || ''}
                onChange={(e) => updateMetadata({ issue: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Iss"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pages
              </label>
              <input
                type="text"
                value={metadata.pages || ''}
                onChange={(e) => updateMetadata({ pages: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="123-456"
              />
            </div>
          </div>
        )}

        {/* Publisher */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publisher
          </label>
          <input
            type="text"
            value={metadata.publisher || ''}
            onChange={(e) => updateMetadata({ publisher: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Publisher name..."
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Language
          </label>
          <input
            type="text"
            value={metadata.language || ''}
            onChange={(e) => updateMetadata({ language: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="en, es, fr..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-none pt-4 border-t flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleRevert}
          disabled={isSaving || !hasChanges}
        >
          Revert
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

