import { PdfDemoClient } from './client';

export default function PdfIdentifierExtractorDemo() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">PDF Identifier Extractor Demo</h1>
        <p className="text-muted-foreground">
          Upload a PDF file to test the parallel identifier extraction system. 
          This demo shows both custom text-based extraction and Zotero endpoint extraction running in parallel.
        </p>
      </div>
      
      <PdfDemoClient />
    </div>
  );
}

