'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { CheckCircle2, ChevronDown, RefreshCw, Star } from 'lucide-react';

interface PreviewData {
  id: number;
  type: string;
  value: string;
  confidence: string;
  extractionSource?: string;
  preview?: any;
  previewFetched: boolean;
  qualityScore?: number;
  userSelected: boolean;
}

interface PreviewComparisonProps {
  identifiers: PreviewData[];
  onSelectIdentifier: (identifierId: number) => Promise<void>;
  onRefreshPreview?: (identifierId: number) => Promise<void>;
  isProcessing?: boolean;
}

export function PreviewComparison({
  identifiers,
  onSelectIdentifier,
  onRefreshPreview,
  isProcessing = false,
}: PreviewComparisonProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    identifiers.find(id => id.userSelected)?.id || null
  );
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  
  // Sort by quality score (highest first)
  const sortedIdentifiers = [...identifiers].sort((a, b) => {
    if (!a.previewFetched && b.previewFetched) return 1;
    if (a.previewFetched && !b.previewFetched) return -1;
    return (b.qualityScore || 0) - (a.qualityScore || 0);
  });
  
  const handleSelect = async (identifierId: number) => {
    setSelectedId(identifierId);
    setProcessingId(identifierId);
    
    try {
      await onSelectIdentifier(identifierId);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleRefresh = async (identifierId: number) => {
    if (!onRefreshPreview) return;
    
    setRefreshingId(identifierId);
    try {
      await onRefreshPreview(identifierId);
    } finally {
      setRefreshingId(null);
    }
  };
  
  if (identifiers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No identifiers found for this URL
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Found {identifiers.length} Identifier{identifiers.length !== 1 ? 's' : ''}
        </h3>
        {identifiers.some(id => id.previewFetched) && (
          <div className="text-sm text-gray-600">
            Select the best metadata for your citation
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedIdentifiers.map((identifier) => (
          <PreviewCard
            key={identifier.id}
            identifier={identifier}
            selected={selectedId === identifier.id}
            processing={processingId === identifier.id}
            refreshing={refreshingId === identifier.id}
            onSelect={() => handleSelect(identifier.id)}
            onRefresh={() => handleRefresh(identifier.id)}
            disabled={isProcessing || processingId !== null}
          />
        ))}
      </div>
    </div>
  );
}

interface PreviewCardProps {
  identifier: PreviewData;
  selected: boolean;
  processing: boolean;
  refreshing: boolean;
  onSelect: () => void;
  onRefresh: () => void;
  disabled: boolean;
}

function PreviewCard({
  identifier,
  selected,
  processing,
  refreshing,
  onSelect,
  onRefresh,
  disabled,
}: PreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const item = identifier.preview?.items?.[0];
  
  return (
    <Card className={`${selected ? 'ring-2 ring-blue-500 border-blue-500' : ''} relative`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Badge
              variant={getIdentifierBadgeVariant(identifier.type)}
              className="mb-2"
            >
              {identifier.type}: {identifier.value}
            </Badge>
            {identifier.qualityScore !== null && identifier.qualityScore !== undefined && (
              <QualityScoreBadge score={identifier.qualityScore} />
            )}
          </div>
          {selected && (
            <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ConfidenceBadge confidence={identifier.confidence} />
          {identifier.extractionSource && (
            <span className="text-xs">from {formatSource(identifier.extractionSource)}</span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 space-y-3">
        {!identifier.previewFetched ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <p>Preview not fetched</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing || disabled}
              className="mt-2"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Preview'
              )}
            </Button>
          </div>
        ) : !item ? (
          <div className="text-center py-6 text-amber-600 text-sm">
            <p>Preview failed or no data available</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing || disabled}
              className="mt-2"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry'
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Title */}
            {item.title && (
              <div>
                <div className="text-xs text-gray-600 mb-1">Title</div>
                <div className="font-semibold text-sm line-clamp-3">{item.title}</div>
              </div>
            )}
            
            {/* Creators */}
            {item.creators && item.creators.length > 0 && (
              <div>
                <div className="text-xs text-gray-600 mb-1">Authors</div>
                <div className="text-sm text-gray-700">
                  {formatCreators(item.creators)}
                </div>
              </div>
            )}
            
            {/* Publication Info */}
            <div className="text-xs text-gray-600 space-y-1">
              {item.publicationTitle && (
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">Journal:</span>
                  <span className="text-gray-700">{item.publicationTitle}</span>
                </div>
              )}
              {item.date && (
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">Date:</span>
                  <span className="text-gray-700">{item.date}</span>
                </div>
              )}
              {item.DOI && (
                <div className="flex items-baseline gap-1">
                  <span className="font-medium">DOI:</span>
                  <span className="text-gray-700 font-mono text-xs">{item.DOI}</span>
                </div>
              )}
            </div>
            
            {/* Field Completeness */}
            <FieldCompletenessBar item={item} />
            
            {/* Collapsible Full Details */}
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Hide' : 'Show'} Full Metadata
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-gray-50 rounded p-3 text-xs space-y-2 max-h-64 overflow-y-auto">
                  {item.abstractNote && (
                    <div>
                      <div className="font-medium text-gray-700">Abstract:</div>
                      <div className="text-gray-600 mt-1 text-xs">{item.abstractNote}</div>
                    </div>
                  )}
                  <div className="font-medium text-gray-700">All Fields:</div>
                  <pre className="text-xs overflow-x-auto text-gray-600">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 border-t">
        <Button
          onClick={onSelect}
          disabled={disabled || !identifier.previewFetched || !item}
          className="w-full"
          variant={selected ? 'default' : 'outline'}
        >
          {processing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : selected ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Selected
            </>
          ) : (
            'Select This'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function QualityScoreBadge({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  const getStars = (score: number) => {
    const stars = Math.ceil(score / 20);
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < stars ? 'fill-current' : ''}`}
      />
    ));
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getColor(score)}`}>
      <span>Quality: {score}/100</span>
      <div className="flex">{getStars(score)}</div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[confidence as keyof typeof colors] || colors.low}`}>
      {confidence}
    </span>
  );
}

function FieldCompletenessBar({ item }: { item: any }) {
  const essentialFields = ['title', 'creators', 'date'];
  const importantFields = ['publicationTitle', 'DOI', 'abstractNote'];
  const additionalFields = ['volume', 'issue', 'pages', 'publisher', 'ISBN', 'ISSN'];
  
  const hasField = (field: string) => {
    if (field === 'creators') {
      return item.creators && item.creators.length > 0;
    }
    return item[field] && item[field] !== '';
  };
  
  const essentialCount = essentialFields.filter(hasField).length;
  const importantCount = importantFields.filter(hasField).length;
  const additionalCount = additionalFields.filter(hasField).length;
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">Field Completeness</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${(essentialCount / essentialFields.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 w-16">
            Essential: {essentialCount}/{essentialFields.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(importantCount / importantFields.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 w-16">
            Important: {importantCount}/{importantFields.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-400 h-2 rounded-full transition-all"
              style={{ width: `${(additionalCount / additionalFields.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 w-16">
            Extra: {additionalCount}/{additionalFields.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatCreators(creators: Array<{ firstName?: string; lastName?: string; name?: string }>): string {
  return creators
    .slice(0, 3)
    .map(creator => {
      if (creator.name) return creator.name;
      const parts = [];
      if (creator.firstName) parts.push(creator.firstName);
      if (creator.lastName) parts.push(creator.lastName);
      return parts.join(' ');
    })
    .join(', ') + (creators.length > 3 ? `, et al.` : '');
}

function formatSource(source: string): string {
  if (source.startsWith('meta[')) {
    return 'meta tag';
  }
  if (source.includes('JSON-LD')) {
    return 'structured data';
  }
  if (source.includes('og:')) {
    return 'OpenGraph';
  }
  if (source.includes('pdf:')) {
    return 'PDF metadata';
  }
  return source;
}

function getIdentifierBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  if (type === 'DOI') return 'default';
  if (type === 'PMID') return 'secondary';
  return 'outline';
}

