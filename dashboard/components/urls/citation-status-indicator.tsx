'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';

export type CitationStatus = 'valid' | 'incomplete' | null;

interface CitationStatusIndicatorProps {
  status: CitationStatus;
  missingFields?: string[];
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CitationStatusIndicator({ 
  status, 
  missingFields = [],
  showLabel = false,
  size = 'sm'
}: CitationStatusIndicatorProps) {
  if (!status) return null;
  
  const sizeClasses = {
    sm: 'h-[22px] w-[22px]',
    md: 'h-5 w-5',
  };
  
  const getTooltipContent = () => {
    if (status === 'valid') {
      return 'Citation is valid (has title, authors, and date)';
    }
    
    if (missingFields.length > 0) {
      return (
        <div className="space-y-1">
          <p className="font-semibold">Citation is incomplete</p>
          <p className="text-xs">Missing: {missingFields.join(', ')}</p>
        </div>
      );
    }
    
    return 'Citation is incomplete';
  };
  
  const indicator = (
    <div className="inline-flex items-center gap-2 mt-2.5">
      {status === 'valid' ? (
        <CheckCircle2 className={`${sizeClasses[size]} text-green-600 shrink-0`} />
      ) : (
        <AlertCircle className={`${sizeClasses[size]} text-amber-600 shrink-0`} />
      )}
      {showLabel && (
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} font-medium ${status === 'valid' ? 'text-green-800' : 'text-amber-800'}`}>
          {status === 'valid' ? 'Valid' : 'Incomplete'}
        </span>
      )}
    </div>
  );
  
  return (
    <Tooltip content={getTooltipContent()}>
      {indicator}
    </Tooltip>
  );
}

