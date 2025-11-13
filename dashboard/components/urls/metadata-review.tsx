'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Edit2, RefreshCw } from 'lucide-react';

interface MetadataReviewProps {
  metadata: {
    title?: string;
    creators?: Array<{
      creatorType: string;
      firstName?: string;
      lastName?: string;
      name?: string;
    }>;
    date?: string;
    itemType?: string;
    abstractNote?: string;
    publicationTitle?: string;
    language?: string;
    extractionMethod?: string;
    extractionSources?: Record<string, string>;
    qualityScore?: number;
    validationStatus?: string;
    missingFields?: string[];
    validationErrors?: string[];
  };
  onApprove: (attachSnapshot: boolean) => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

export function MetadataReview({
  metadata,
  onApprove,
  onReject,
  isProcessing = false,
}: MetadataReviewProps) {
  const [attachSnapshot, setAttachSnapshot] = useState(true);
  const [showRawData, setShowRawData] = useState(false);
  
  const formatCreators = (creators: any[]) => {
    return creators
      .map(c => {
        if (c.name) return c.name;
        const parts = [];
        if (c.firstName) parts.push(c.firstName);
        if (c.lastName) parts.push(c.lastName);
        return parts.join(' ');
      })
      .join(', ');
  };
  
  const getStatusBadge = () => {
    if (metadata.validationStatus === 'valid') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Valid
        </Badge>
      );
    } else if (metadata.validationStatus === 'incomplete') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Incomplete
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Invalid
        </Badge>
      );
    }
  };
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Extracted Metadata</CardTitle>
            <CardDescription>
              Review the metadata extracted from this URL
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge()}
            {metadata.qualityScore !== null && metadata.qualityScore !== undefined && (
              <div className={`text-sm font-semibold ${getQualityColor(metadata.qualityScore)}`}>
                Quality: {metadata.qualityScore}/100
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {metadata.validationErrors && metadata.validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-1">
            <div className="font-medium text-red-800 text-sm">Validation Errors:</div>
            {metadata.validationErrors.map((error, i) => (
              <div key={i} className="text-red-700 text-xs">• {error}</div>
            ))}
          </div>
        )}
        
        {/* Missing Fields */}
        {metadata.missingFields && metadata.missingFields.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="font-medium text-yellow-800 text-sm">
              Missing Fields: {metadata.missingFields.join(', ')}
            </div>
          </div>
        )}
        
        {/* Metadata Fields */}
        <div className="space-y-3">
          {/* Title */}
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center justify-between">
              <span>Title</span>
              {metadata.extractionSources?.title && (
                <span className="text-xs italic text-gray-500">
                  from {metadata.extractionSources.title}
                </span>
              )}
            </div>
            <div className="font-semibold text-sm bg-gray-50 p-2 rounded">
              {metadata.title || <span className="text-gray-400 italic">Not found</span>}
            </div>
          </div>
          
          {/* Creators */}
          <div>
            <div className="text-xs text-gray-600 mb-1 flex items-center justify-between">
              <span>Authors ({metadata.creators?.length || 0})</span>
              {metadata.extractionSources?.creators && (
                <span className="text-xs italic text-gray-500">
                  from {metadata.extractionSources.creators}
                </span>
              )}
            </div>
            <div className="text-sm bg-gray-50 p-2 rounded">
              {metadata.creators && metadata.creators.length > 0 ? (
                formatCreators(metadata.creators)
              ) : (
                <span className="text-gray-400 italic">Not found</span>
              )}
            </div>
          </div>
          
          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 mb-1 flex items-center justify-between">
                <span>Date</span>
                {metadata.extractionSources?.date && (
                  <span className="text-xs italic text-gray-500">
                    from {metadata.extractionSources.date}
                  </span>
                )}
              </div>
              <div className="text-sm bg-gray-50 p-2 rounded">
                {metadata.date || <span className="text-gray-400 italic">Not found</span>}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-600 mb-1">Item Type</div>
              <div className="text-sm bg-gray-50 p-2 rounded capitalize">
                {metadata.itemType || <span className="text-gray-400 italic">Not set</span>}
              </div>
            </div>
          </div>
          
          {/* Publication Title */}
          {metadata.publicationTitle && (
            <div>
              <div className="text-xs text-gray-600 mb-1 flex items-center justify-between">
                <span>Publication</span>
                {metadata.extractionSources?.publicationTitle && (
                  <span className="text-xs italic text-gray-500">
                    from {metadata.extractionSources.publicationTitle}
                  </span>
                )}
              </div>
              <div className="text-sm bg-gray-50 p-2 rounded">
                {metadata.publicationTitle}
              </div>
            </div>
          )}
          
          {/* Abstract */}
          {metadata.abstractNote && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Abstract</div>
              <div className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                {metadata.abstractNote}
              </div>
            </div>
          )}
          
          {/* Language */}
          {metadata.language && (
            <div>
              <div className="text-xs text-gray-600 mb-1">Language</div>
              <div className="text-sm bg-gray-50 p-2 rounded">
                {metadata.language}
              </div>
            </div>
          )}
          
          {/* Extraction Info */}
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-600 mb-2">Extraction Information</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Method:</span>
                <span className="ml-2 font-medium capitalize">
                  {metadata.extractionMethod?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Sources:</span>
                <span className="ml-2 font-medium">
                  {metadata.extractionSources ? Object.keys(metadata.extractionSources).length : 0} fields
                </span>
              </div>
            </div>
          </div>
          
          {/* Raw Data Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              className="w-full"
            >
              {showRawData ? 'Hide' : 'Show'} Raw Data
            </Button>
            {showRawData && (
              <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-3 border-t pt-4">
        {/* Snapshot Option */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={attachSnapshot}
            onChange={(e) => setAttachSnapshot(e.target.checked)}
            className="rounded"
          />
          <span>Attach HTML snapshot to item</span>
        </label>
        
        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => onApprove(attachSnapshot)}
            disabled={isProcessing || metadata.validationStatus === 'invalid'}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Item...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Zotero Item
              </>
            )}
          </Button>
          
          <Button
            onClick={() => onReject('User rejected metadata')}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
        
        {metadata.validationStatus === 'invalid' && (
          <div className="text-xs text-red-600 text-center">
            Cannot create item with invalid metadata. Please fix errors or use LLM extraction.
          </div>
        )}
        
        {metadata.validationStatus === 'incomplete' && (
          <div className="text-xs text-yellow-600 text-center">
            Metadata is incomplete but can be stored. Missing fields: {metadata.missingFields?.join(', ')}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

