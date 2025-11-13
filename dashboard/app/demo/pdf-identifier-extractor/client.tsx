'use client';

import { useState } from 'react';
import { processPdfDemo, clearDemoCache, type PdfDemoResult } from '@/lib/actions/pdf-demo-action';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function PdfDemoClient() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<PdfDemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const demoResult = await processPdfDemo(formData);
      
      if (demoResult.success) {
        setResult(demoResult);
      } else {
        setError(demoResult.error || 'Failed to process PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    setProcessing(true);
    try {
      await clearDemoCache();
      setFile(null);
      setResult(null);
      setError(null);
      // Reset file input
      const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'low':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Select a PDF file to extract identifiers from
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pdf-upload" className="block text-sm font-medium mb-2">
                PDF File
              </label>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
                disabled={processing}
              />
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="submit" disabled={!file || processing}>
                {processing ? 'Processing...' : 'Extract Identifiers'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClear}
                disabled={processing || (!file && !result)}
              >
                Clear & Start Over
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Cached Text */}
          {result.cachedText && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted PDF Text (Cached)</CardTitle>
                <CardDescription>
                  Text content extracted from the first 3 pages of the PDF
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.cachedText.pages.map((page, idx) => (
                    <Collapsible key={idx}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between">
                          <span>Page {page.pageNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {page.text.length} characters
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 p-4 bg-muted rounded-md">
                          <pre className="text-sm whitespace-pre-wrap font-mono">
                            {page.text || '(No text found)'}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {result.cachedText.pages.length === 0 && (
                    <p className="text-sm text-muted-foreground">No text extracted</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Extraction Results */}
          {result.customExtraction && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Text-Based Extraction</CardTitle>
                <CardDescription>
                  Identifiers found using regex patterns on extracted text
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.customExtraction.identifiers.length > 0 ? (
                  <div className="space-y-2">
                    {result.customExtraction.identifiers.map((id, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-3 p-3 bg-muted rounded-md"
                      >
                        <Badge variant="outline" className="min-w-[60px]">
                          {id.type}
                        </Badge>
                        <code className="flex-1 text-sm font-mono">{id.value}</code>
                        <Badge className={getConfidenceColor(id.confidence)}>
                          {id.confidence}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {id.source}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No identifiers found using custom extraction
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Zotero Extraction Results */}
          {result.zoteroExtraction && (
            <Card>
              <CardHeader>
                <CardTitle>Zotero Endpoint Extraction</CardTitle>
                <CardDescription>
                  Identifiers found using Zotero&apos;s /previewpdf endpoint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.zoteroExtraction.metadata && (
                    <div className="p-3 bg-muted rounded-md">
                      <h4 className="font-semibold mb-2">Metadata</h4>
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        {result.zoteroExtraction.metadata.title && (
                          <>
                            <dt className="text-muted-foreground">Title:</dt>
                            <dd>{result.zoteroExtraction.metadata.title}</dd>
                          </>
                        )}
                        {result.zoteroExtraction.metadata.author && (
                          <>
                            <dt className="text-muted-foreground">Author:</dt>
                            <dd>{result.zoteroExtraction.metadata.author}</dd>
                          </>
                        )}
                        {result.zoteroExtraction.metadata.pageCount && (
                          <>
                            <dt className="text-muted-foreground">Pages:</dt>
                            <dd>{result.zoteroExtraction.metadata.pageCount}</dd>
                          </>
                        )}
                        {result.zoteroExtraction.metadata.textLength && (
                          <>
                            <dt className="text-muted-foreground">Text Length:</dt>
                            <dd>{result.zoteroExtraction.metadata.textLength.toLocaleString()} chars</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  )}
                  
                  {result.zoteroExtraction.identifiers.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Identifiers</h4>
                      {result.zoteroExtraction.identifiers.map((id, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-3 p-3 bg-muted rounded-md"
                        >
                          <Badge variant="outline" className="min-w-[60px]">
                            {id.type}
                          </Badge>
                          <code className="flex-1 text-sm font-mono">{id.value}</code>
                          <Badge className={getConfidenceColor(id.confidence)}>
                            {id.confidence}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {id.source}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No identifiers found using Zotero extraction
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Merged Results */}
          {result.mergedIdentifiers && result.mergedIdentifiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Merged Results</CardTitle>
                <CardDescription>
                  All identifiers found (deduplicated and merged from both methods)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.mergedIdentifiers.map((id, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-3 bg-muted rounded-md"
                    >
                      <Badge variant="outline" className="min-w-[60px]">
                        {id.type}
                      </Badge>
                      <code className="flex-1 text-sm font-mono">{id.value}</code>
                      <Badge className={getConfidenceColor(id.confidence)}>
                        {id.confidence}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {id.source}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {result.error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{result.error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

