'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface ContentViewerProps {
  urlId: number;
  contentType: string;
}

export function ContentViewer({ urlId, contentType }: ContentViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isHtml = contentType.includes('html') || contentType.includes('xml');
  const isPdf = contentType.includes('pdf');
  
  useEffect(() => {
    // Set loading to false after iframe loads or for non-iframe content
    if (!isHtml) {
      setLoading(false);
    }
  }, [isHtml]);
  
  if (isPdf) {
    return <PdfTextViewer urlId={urlId} />;
  }
  
  if (isHtml) {
    return (
      <div className="h-full flex flex-col">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading content...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 m-4 rounded-md text-sm">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}
        <iframe
          src={`/api/urls/${urlId}/content`}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          title="Cached Content"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Failed to load content');
            setLoading(false);
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm">Unsupported content type: {contentType}</p>
      </div>
    </div>
  );
}

function PdfTextViewer({ urlId }: { urlId: number }) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchPdfText();
  }, [urlId]);
  
  async function fetchPdfText() {
    try {
      // Get cached PDF text via server action
      const { getCachedPdfTextAction } = await import('@/lib/actions/cache-check-action');
      const cachedText = await getCachedPdfTextAction(urlId);
      
      if (cachedText) {
        setText(cachedText);
      } else {
        setError('PDF text not available. It will be extracted during LLM extraction.');
      }
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF text');
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading PDF text...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm max-w-md">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <FileText className="h-4 w-4" />
          <span>PDF Text Extract (First 3 Pages)</span>
        </div>
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
            {text}
          </pre>
        </div>
      </div>
    </div>
  );
}

