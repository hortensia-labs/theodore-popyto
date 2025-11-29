/**
 * Manual Edit Page
 * 
 * Full-page interface for editing Zotero citation metadata.
 * Used for fixing incomplete citations or updating stored items.
 * 
 * Features:
 * - Citation preview at top
 * - Metadata editor
 * - Validation and missing field detection
 * - Save to Zotero
 * - Auto-transition when citation becomes complete
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { CitationPreview } from '@/components/urls/url-modals/CitationPreview';
import { MetadataEditor } from '@/components/urls/url-modals/MetadataEditor';
import { updateCitation, getMissingCitationFields } from '@/lib/actions/citation-editing';
import { getZoteroItemMetadata } from '@/lib/actions/zotero';
import { getUrlWithCapabilitiesById } from '@/lib/actions/url-with-capabilities';
import type { ZoteroItem, ZoteroItemResponse } from '@/lib/zotero-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import Link from 'next/link';

export default function ManualEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const urlId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [urlData, setUrlData] = useState<any>(null);
  const [metadata, setMetadata] = useState<ZoteroItem | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Validate URL ID
  if (isNaN(urlId)) {
    notFound();
  }

  /**
   * Load URL and Zotero metadata
   */
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get URL data
      const urlResult = await getUrlWithCapabilitiesById(urlId);
      
      if (!urlResult.success || !urlResult.data) {
        setError(urlResult.error || 'URL not found');
        return;
      }

      const url = urlResult.data;
      setUrlData(url);

      // Check if URL has a Zotero item
      if (!url.zoteroItemKey) {
        setError('This URL is not linked to a Zotero item. Use "Create" instead of "Edit".');
        return;
      }

      // Fetch item metadata from Zotero
      const metadataResult = await getZoteroItemMetadata(url.zoteroItemKey);
      
      if (!metadataResult.success || !metadataResult.data) {
        setError(metadataResult.error || 'Failed to load Zotero item metadata');
        return;
      }

      // Convert ZoteroItemResponse to ZoteroItem
      const responseData: ZoteroItemResponse = metadataResult.data;
      const itemData: ZoteroItem = {
        itemType: responseData.itemType,
        title: responseData.fields?.['1'] || responseData.title,
        creators: responseData.creators || [],
        url: responseData.fields?.['url'] || responseData.webURL || url.url,
        date: responseData.fields?.['6'] || responseData.fields?.['date'],
        accessDate: responseData.fields?.['accessDate'],
        abstractNote: responseData.fields?.['abstractNote'],
        publicationTitle: responseData.fields?.['publicationTitle'],
        DOI: responseData.fields?.['DOI'],
        // Add other fields as needed
      };

      setMetadata(itemData);

      // Fetch missing fields
      const missingResult = await getMissingCitationFields(urlId);
      
      if (missingResult.success) {
        setMissingFields(missingResult.missingFields || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handle metadata change
   */
  const handleMetadataChange = (updated: ZoteroItem) => {
    setMetadata(updated);
    setHasUnsavedChanges(true);
  };

  /**
   * Handle save
   */
  const handleSave = async (updatedMetadata: ZoteroItem) => {
    if (!urlData?.zoteroItemKey) {
      setError('No Zotero item key found');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateCitation(urlId, urlData.zoteroItemKey, updatedMetadata);

      if (result.success) {
        // Reload missing fields after update
        const missingResult = await getMissingCitationFields(urlId);
        const updatedMissingFields = missingResult.success ? (missingResult.missingFields || []) : [];
        setMissingFields(updatedMissingFields);
        
        setSuccessMessage(
          `Citation updated successfully!` +
          (result.validationStatus === 'valid' 
            ? ' Citation is now complete.' 
            : updatedMissingFields.length > 0 
              ? ` Still missing: ${updatedMissingFields.join(', ')}` 
              : '')
        );
        setHasUnsavedChanges(false);
        
        // Reload data to get updated status
        await loadData();
        
        // If citation is now complete, redirect after delay
        if (result.validationStatus === 'valid') {
          setTimeout(() => {
            router.push('/urls');
            router.refresh();
          }, 2000);
        }
      } else {
        setError(result.error || 'Failed to update citation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push('/urls');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700">Loading citation data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metadata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Citation</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/urls">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to URLs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/urls">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to URLs
                </Button>
              </Link>
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold text-gray-900">Edit Zotero Citation</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Update citation metadata to complete missing fields
                </p>
              </div>
            </div>
            {hasUnsavedChanges && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          {/* URL and Item Info */}
          {urlData && (
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Source URL</p>
                <a
                  href={urlData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {urlData.url}
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Zotero Item Key</p>
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {urlData.zoteroItemKey}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        {/* Missing Fields Alert */}
        {missingFields.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-md text-sm mb-4">
            <p className="font-medium flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Citation Incomplete
            </p>
            <p className="text-xs text-yellow-800">
              Missing critical fields: <strong>{missingFields.join(', ')}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="space-y-6">
          {/* Citation Preview */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="border-b px-4 py-3">
              <h3 className="font-semibold text-gray-900">Citation Preview</h3>
              <p className="text-xs text-gray-500 mt-1">
                Live preview of how this item will appear in citations
              </p>
            </div>
            <div className="p-6">
              {metadata && (
                <CitationPreview
                  metadata={metadata}
                  missingFields={missingFields}
                  style="apa"
                />
              )}
            </div>
          </div>

          {/* Metadata Editor */}
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Edit Metadata</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Update bibliographic fields (fields with * are required for complete citation)
                </p>
              </div>
              <Button
                onClick={() => metadata && handleSave(metadata)}
                disabled={isSaving || !metadata || !hasUnsavedChanges}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
            <div className="p-6">
              {metadata && (
                <MetadataEditor
                  metadata={metadata}
                  missingFields={missingFields}
                  onChange={handleMetadataChange}
                  onSave={handleSave}
                  onCancel={handleCancelEdit}
                  isSaving={isSaving}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="bg-white border rounded-lg shadow-sm p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {hasUnsavedChanges ? (
              <span className="text-yellow-700 font-medium">You have unsaved changes</span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCancelEdit}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => metadata && handleSave(metadata)}
              disabled={isSaving || !metadata || !hasUnsavedChanges}
            >
              {isSaving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
