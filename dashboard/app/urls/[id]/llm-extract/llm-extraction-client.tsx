'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentViewer } from '@/components/urls/llm/content-viewer';
import { ProviderStatus } from '@/components/urls/llm/provider-status';
import { MetadataForm } from '@/components/urls/llm/metadata-form';
import { triggerLlmExtraction } from '@/lib/actions/llm-extraction-action';
import { approveAndStoreMetadata } from '@/lib/actions/metadata-approval-action';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { ZoteroItemType } from '@/lib/actions/zotero-types-action';

interface LlmExtractionClientProps {
  urlId: number;
  url: string;
  contentType: string;
  itemTypes: ZoteroItemType[];
  llmAvailability: {
    available: boolean;
    providers: Array<{ name: string; available: boolean; error?: string }>;
  };
  existingMetadata: any;
}

export function LlmExtractionClient({
  urlId,
  url,
  contentType,
  itemTypes,
  llmAvailability,
  existingMetadata,
}: LlmExtractionClientProps) {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState(existingMetadata);
  const [confidence, setConfidence] = useState<Record<string, number>>(
    existingMetadata?.confidenceScores || {}
  );
  const [providerUsed, setProviderUsed] = useState<string>(
    existingMetadata?.llmProvider || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const hasExistingExtraction = !!existingMetadata;
  
  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await triggerLlmExtraction(urlId);
    
    setIsExtracting(false);
    
    if (result.success) {
      // Reload the metadata from database to get full data with confidence scores
      const { getLlmExtractionData } = await import('@/lib/actions/llm-extraction-action');
      const fullMetadata = await getLlmExtractionData(urlId);
      
      setExtractedMetadata(fullMetadata);
      setConfidence(fullMetadata?.confidenceScores || result.confidence || {});
      setProviderUsed(fullMetadata?.llmProvider || result.providerUsed || '');
      setSuccessMessage(
        `Metadata extracted successfully using ${result.providerUsed || 'LLM'} ` +
        `(${result.extractionMethod} extraction, ${result.duration}ms)`
      );
    } else {
      setError(result.error || 'Extraction failed');
    }
  };
  
  const handleSubmit = async (
    metadata: any,
    attachSnapshot: boolean
  ) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    const result = await approveAndStoreMetadata(urlId, attachSnapshot);
    
    setIsSubmitting(false);
    
    if (result.success) {
      setSuccessMessage(`Item created in Zotero: ${result.itemKey}`);
      
      // Redirect back to URLs page after 2 seconds
      setTimeout(() => {
        router.push('/urls');
      }, 2000);
    } else {
      setError(result.error || 'Failed to create item');
    }
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Content Viewer */}
      <div className="w-1/2 border-r flex flex-col overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Content Preview</h2>
          <p className="text-xs text-gray-600 mt-1">
            {contentType.includes('html') ? 'HTML Content' : 
             contentType.includes('pdf') ? 'PDF Text Extract' : 
             'Document Content'}
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <ContentViewer
            urlId={urlId}
            contentType={contentType}
          />
        </div>
      </div>
      
      {/* Right Panel - Extraction & Form */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
              {successMessage}
            </div>
          )}
          
          {/* Provider Status */}
          <ProviderStatus
            availability={llmAvailability}
            providerUsed={providerUsed}
          />
          
          {/* Extract Button */}
          {!hasExistingExtraction && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-medium mb-2">Extract Metadata with LLM</h3>
              <p className="text-sm text-gray-600 mb-4">
                Use AI to automatically extract bibliographic metadata from this content.
                {llmAvailability.providers.some(p => p.name.includes('anthropic')) && (
                  <span className="block mt-1 text-xs text-gray-500">
                    Estimated cost: ~$0.003 (if using Claude)
                  </span>
                )}
              </p>
              <Button
                onClick={handleExtract}
                disabled={!llmAvailability.available || isExtracting}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract with LLM
                  </>
                )}
              </Button>
              {!llmAvailability.available && (
                <p className="text-xs text-red-600 mt-2">
                  No LLM providers available. Check configuration.
                </p>
              )}
            </div>
          )}
          
          {hasExistingExtraction && (
            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">Metadata Already Extracted</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Review and edit the metadata below, then create the Zotero item.
                  </p>
                </div>
                <Button
                  onClick={handleExtract}
                  disabled={!llmAvailability.available || isExtracting}
                  size="sm"
                  variant="outline"
                >
                  {isExtracting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Re-extract
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Metadata Form */}
          {extractedMetadata && (
            <MetadataForm
              metadata={extractedMetadata}
              confidence={confidence}
              itemTypes={itemTypes}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
          
          {!extractedMetadata && !hasExistingExtraction && (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">
                Click &quot;Extract with LLM&quot; above to begin metadata extraction
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

