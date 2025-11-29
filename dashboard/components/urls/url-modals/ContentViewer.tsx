/**
 * Content Viewer Component
 * 
 * Multi-mode viewer for URL content in manual creation modal:
 * - Iframe Preview: Live rendering of the webpage
 * - Reader Mode: Cleaned, readable content
 * - Raw HTML: Syntax-highlighted source
 * - PDF Viewer: Embedded PDF display
 * 
 * Based on PRD Section 8.2: Content Viewer Component
 */

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getContentForManualCreation } from '@/lib/actions/manual-creation';
import { Loader, AlertCircle, FileText, Eye, Code, Download } from 'lucide-react';
import type { ContentViews } from '@/lib/actions/manual-creation';

interface ContentViewerProps {
  url: string;
  urlId: number;
  isPDF: boolean;
  onContentLoaded?: (content: ContentViews) => void;
}

type ViewMode = 'iframe' | 'reader' | 'raw' | 'pdf';

/**
 * Content Viewer Component
 * 
 * Displays URL content in multiple modes for user review during manual creation
 */
export function ContentViewer({
  url,
  urlId,
  isPDF,
  onContentLoaded,
}: ContentViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(isPDF ? 'pdf' : 'iframe');
  const [content, setContent] = useState<ContentViews | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load content on mount
   */
  useEffect(() => {
    loadContent();
  }, [urlId]);

  /**
   * Load cached content or fetch if not available
   */
  const loadContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getContentForManualCreation(urlId);

      if (result.success && result.data) {
        setContent(result.data);
        onContentLoaded?.(result.data);
        
        // Set appropriate default view mode
        if (result.data.isPDF) {
          setViewMode('pdf');
        }
      } else {
        setError(result.error || 'Failed to load content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border">
        <div className="text-center space-y-3">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border border-red-200">
        <div className="text-center space-y-3 p-8">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load content</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={loadContent}
            className="text-sm text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render content viewer
   */
  return (
    <div className="flex flex-col h-full">
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="flex-none">
        <TabsList className="grid w-full grid-cols-4">
          {!isPDF && (
            <>
              <TabsTrigger value="iframe" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Live Preview</span>
              </TabsTrigger>
              <TabsTrigger value="reader" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Reader Mode</span>
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <span>Raw HTML</span>
              </TabsTrigger>
            </>
          )}
          {isPDF && (
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Content Display Area */}
      <div className="flex-1 mt-4 border rounded-lg overflow-hidden bg-white">
        {/* Iframe View */}
        {viewMode === 'iframe' && !isPDF && (
          <div className="relative h-full">
            <iframe
              src={url}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              title="URL Preview"
            />
            <div className="absolute top-2 right-2 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-md text-xs text-yellow-800 shadow-sm">
              ⚠️ External content - may not load correctly
            </div>
          </div>
        )}

        {/* Reader Mode */}
        {viewMode === 'reader' && !isPDF && content?.reader && (
          <div className="h-full overflow-auto p-8 prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content.reader }} />
          </div>
        )}

        {/* Reader Mode - No Content */}
        {viewMode === 'reader' && !isPDF && !content?.reader && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">Reader mode not available</p>
              <p className="text-xs text-gray-500">Try Live Preview or Raw HTML</p>
            </div>
          </div>
        )}

        {/* Raw HTML */}
        {viewMode === 'raw' && !isPDF && content?.raw && (
          <div className="h-full overflow-auto">
            <pre className="p-4 text-xs font-mono bg-gray-50">
              <code>{content.raw}</code>
            </pre>
          </div>
        )}

        {/* Raw HTML - No Content */}
        {viewMode === 'raw' && !isPDF && !content?.raw && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <Code className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">HTML content not available</p>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        {viewMode === 'pdf' && isPDF && content?.pdfUrl && (
          <div className="h-full">
            <object
              data={content.pdfUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                <FileText className="h-16 w-16 text-gray-400" />
                <p className="text-sm text-gray-600">PDF cannot be displayed in browser</p>
                <a
                  href={content.pdfUrl}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </object>
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="flex-none mt-2 px-3 py-2 bg-gray-50 rounded-md text-xs text-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            <span className="font-medium">URL:</span>{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {url.length > 60 ? url.substring(0, 60) + '...' : url}
            </a>
          </span>
          {content?.cachedPath && (
            <span className="text-green-600">● Cached</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPDF && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">PDF</span>
          )}
          <button
            onClick={loadContent}
            className="text-blue-600 hover:text-blue-700 font-medium"
            title="Reload content"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

