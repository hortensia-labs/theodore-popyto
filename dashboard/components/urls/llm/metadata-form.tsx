'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConfidenceIndicator } from './confidence-indicator';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { ZoteroItemType } from '@/lib/actions/zotero-types-action';

interface Creator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface MetadataFormProps {
  metadata: any;
  confidence?: Record<string, number>;
  itemTypes: ZoteroItemType[];
  onSubmit: (metadata: any, attachSnapshot: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export function MetadataForm({
  metadata: initialMetadata,
  confidence,
  itemTypes,
  onSubmit,
  isSubmitting,
}: MetadataFormProps) {
  const [itemType, setItemType] = useState(initialMetadata?.itemType || 'webpage');
  const [title, setTitle] = useState(initialMetadata?.title || '');
  const [creators, setCreators] = useState<Creator[]>(
    initialMetadata?.creators || [{ creatorType: 'author', firstName: '', lastName: '' }]
  );
  const [date, setDate] = useState(initialMetadata?.date || '');
  const [publicationTitle, setPublicationTitle] = useState(initialMetadata?.publicationTitle || '');
  const [abstractNote, setAbstractNote] = useState(initialMetadata?.abstractNote || '');
  const [language, setLanguage] = useState(initialMetadata?.language || '');
  const [attachSnapshot, setAttachSnapshot] = useState(true);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Update when metadata changes (after LLM extraction)
  useEffect(() => {
    if (initialMetadata) {
      setItemType(initialMetadata.itemType || 'webpage');
      setTitle(initialMetadata.title || '');
      setCreators(initialMetadata.creators || [{ creatorType: 'author', firstName: '', lastName: '' }]);
      setDate(initialMetadata.date || '');
      setPublicationTitle(initialMetadata.publicationTitle || '');
      setAbstractNote(initialMetadata.abstractNote || '');
      setLanguage(initialMetadata.language || '');
    }
  }, [initialMetadata]);
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Title required
    if (!title || title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }
    
    // At least one creator required
    const validCreators = creators.filter(c => {
      const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
      return name.length > 0;
    });
    
    if (validCreators.length === 0) {
      newErrors.creators = 'At least one author is required';
    }
    
    // Date required
    if (!date || date.trim().length === 0) {
      newErrors.date = 'Date is required';
    }
    
    // Item type required
    if (!itemType) {
      newErrors.itemType = 'Item type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    // Filter out empty creators
    const validCreators = creators.filter(c => {
      const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
      return name.length > 0;
    });
    
    const metadata = {
      itemType,
      title: title.trim(),
      creators: validCreators,
      date: date.trim(),
      publicationTitle: publicationTitle.trim() || undefined,
      abstractNote: abstractNote.trim() || undefined,
      language: language.trim() || undefined,
      url: initialMetadata?.url,
      accessDate: new Date().toISOString(),
      extractionSources: initialMetadata?.extractionSources || {},
    };
    
    await onSubmit(metadata, attachSnapshot);
  };
  
  const addCreator = () => {
    setCreators([...creators, { creatorType: 'author', firstName: '', lastName: '' }]);
  };
  
  const removeCreator = (index: number) => {
    setCreators(creators.filter((_, i) => i !== index));
  };
  
  const updateCreator = (index: number, field: keyof Creator, value: string) => {
    const updated = [...creators];
    updated[index] = { ...updated[index], [field]: value };
    setCreators(updated);
  };
  
  const globalQualityScore = initialMetadata?.qualityScore || 0;
  
  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 bg-white space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Extracted Metadata</h3>
        {globalQualityScore > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Quality:</span>
            <span className={`ml-2 font-semibold ${
              globalQualityScore >= 80 ? 'text-green-600' :
              globalQualityScore >= 60 ? 'text-blue-600' :
              globalQualityScore >= 40 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {globalQualityScore}/100
            </span>
          </div>
        )}
      </div>
      
      {/* Item Type */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Item Type <span className="text-red-500">*</span>
          <ConfidenceIndicator confidence={confidence.itemType} />
        </label>
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select item type...</option>
          {itemTypes.map((type) => (
            <option key={type.itemType} value={type.itemType}>
              {type.localized}
            </option>
          ))}
        </select>
        {errors.itemType && (
          <p className="text-xs text-red-600 mt-1">{errors.itemType}</p>
        )}
      </div>
      
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Title <span className="text-red-500">*</span>
          <ConfidenceIndicator confidence={confidence.title} />
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Article or document title"
          required
        />
        {errors.title && (
          <p className="text-xs text-red-600 mt-1">{errors.title}</p>
        )}
      </div>
      
      {/* Creators */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Authors <span className="text-red-500">*</span>
          <ConfidenceIndicator confidence={confidence.creators} />
        </label>
        
        <div className="space-y-3">
          {creators.map((creator, index) => (
            <div key={index} className="flex gap-2 items-start">
              <select
                value={creator.creatorType}
                onChange={(e) => updateCreator(index, 'creatorType', e.target.value)}
                className="w-24 px-2 py-2 border rounded-md text-sm"
              >
                <option value="author">Author</option>
                <option value="editor">Editor</option>
                <option value="contributor">Contributor</option>
              </select>
              
              <input
                type="text"
                value={creator.firstName || ''}
                onChange={(e) => updateCreator(index, 'firstName', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="First name"
              />
              
              <input
                type="text"
                value={creator.lastName || ''}
                onChange={(e) => updateCreator(index, 'lastName', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                placeholder="Last name"
              />
              
              {creators.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCreator(index)}
                  className="px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCreator}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Author
        </Button>
        
        {errors.creators && (
          <p className="text-xs text-red-600 mt-1">{errors.creators}</p>
        )}
      </div>
      
      {/* Date */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Date <span className="text-red-500">*</span>
          <ConfidenceIndicator confidence={confidence.date} />
        </label>
        <input
          type="text"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="YYYY-MM-DD or YYYY"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter as YYYY-MM-DD (full date) or YYYY (year only)
        </p>
        {errors.date && (
          <p className="text-xs text-red-600 mt-1">{errors.date}</p>
        )}
      </div>
      
      {/* Publication Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Publication/Journal
          <ConfidenceIndicator confidence={confidence.publicationTitle} />
        </label>
        <input
          type="text"
          value={publicationTitle}
          onChange={(e) => setPublicationTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Journal name, website, or publication"
        />
      </div>
      
      {/* Abstract */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Abstract
          <ConfidenceIndicator confidence={confidence.abstractNote} />
        </label>
        <textarea
          value={abstractNote}
          onChange={(e) => setAbstractNote(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Abstract or summary"
          rows={4}
        />
      </div>
      
      {/* Language */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Auto-detect</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
        </select>
      </div>
      
      {/* Options */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={attachSnapshot}
            onChange={(e) => setAttachSnapshot(e.target.checked)}
            className="rounded"
          />
          <span>Attach HTML snapshot to Zotero item</span>
        </label>
      </div>
      
      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Creating Item...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Create Zotero Item
            </>
          )}
        </Button>
      </div>
      
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          <p className="font-medium">Please fix the following errors:</p>
          <ul className="mt-2 space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

