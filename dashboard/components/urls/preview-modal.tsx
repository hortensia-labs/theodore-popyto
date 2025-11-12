'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { previewIdentifier, type PreviewIdentifierData } from '@/lib/actions/preview-identifier';
import { previewUrl, type PreviewUrlData } from '@/lib/actions/preview-url';
import { Loader2 } from 'lucide-react';

type PreviewData = PreviewIdentifierData | PreviewUrlData;

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier?: string;
  url?: string;
}

export function PreviewModal({ open, onOpenChange, identifier, url }: PreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && (identifier || url)) {
      setLoading(true);
      setError(null);
      setPreviewData(null);

      const previewPromise = identifier
        ? previewIdentifier(identifier)
        : url
        ? previewUrl(url)
        : Promise.resolve({ success: false, error: 'No identifier or URL provided' });

      previewPromise
        .then((result) => {
          if (result.success && 'data' in result && result.data) {
            setPreviewData(result.data);
          } else {
            setError('error' in result ? (result.error || 'Failed to load preview') : 'Failed to load preview');
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Unknown error');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, identifier, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{identifier ? 'Preview Identifier' : 'Preview URL'}</DialogTitle>
          <DialogDescription>
            {identifier ? (
              <>Preview of the bibliographic item for identifier: <span className="font-mono text-xs">{identifier}</span></>
            ) : (
              <>Preview of the bibliographic item for URL: <span className="font-mono text-xs break-all">{url}</span></>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <span className="text-sm font-medium text-gray-700">Loading preview...</span>
              <span className="text-xs text-gray-500 mt-1">This may take a few seconds</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {previewData && !loading && (
            <div className="space-y-4">
              {/* Generated Citation - Most Important */}
              {previewData.generatedCitation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-blue-700 uppercase mb-1">Generated Citation</div>
                  <div className="text-lg font-medium text-blue-900">{previewData.generatedCitation}</div>
                </div>
              )}

              {/* Title */}
              <div>
                <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Title</div>
                <div className="text-base font-medium text-gray-900">{previewData.title}</div>
              </div>

              {/* Authors */}
              <div>
                <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Authors</div>
                <div className="text-sm text-gray-800">{previewData.authors}</div>
              </div>

              {/* Date */}
              <div>
                <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Date</div>
                <div className="text-sm text-gray-800">{previewData.date}</div>
              </div>

              {/* Publication Details */}
              {(previewData.publicationTitle || previewData.DOI) && (
                <div className="border-t pt-4">
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Publication Details</div>
                  <div className="space-y-1 text-sm">
                    {previewData.publicationTitle && (
                      <div>
                        <span className="text-gray-600">Journal/Publication: </span>
                        <span className="text-gray-800">{previewData.publicationTitle}</span>
                      </div>
                    )}
                    {previewData.DOI && (
                      <div>
                        <span className="text-gray-600">DOI: </span>
                        <span className="font-mono text-gray-800">{previewData.DOI}</span>
                      </div>
                    )}
                    {previewData.url && (
                      <div>
                        <span className="text-gray-600">URL: </span>
                        <a
                          href={previewData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {previewData.url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Abstract */}
              {previewData.abstractNote && (
                <div className="border-t pt-4">
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Abstract</div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {previewData.abstractNote}
                  </div>
                </div>
              )}

              {/* Translation Method (for URL previews) */}
              {'method' in previewData && previewData.method && (
                <div className="border-t pt-4">
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Translation Details</div>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Method: </span>
                      <span className="text-gray-800">{previewData.method}</span>
                    </div>
                    {previewData.translator && (
                      <div>
                        <span className="text-gray-600">Translator: </span>
                        <span className="text-gray-800">{previewData.translator}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Item Type */}
              <div className="border-t pt-4">
                <div className="text-xs text-gray-500">
                  Item Type: <span className="font-medium">{previewData.itemType}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

