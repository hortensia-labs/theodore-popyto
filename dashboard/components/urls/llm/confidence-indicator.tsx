'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence?: number; // 0-1 scale
  showLabel?: boolean;
}

export function ConfidenceIndicator({
  confidence,
  showLabel = false,
}: ConfidenceIndicatorProps) {
  if (confidence === undefined || confidence === null) {
    return null;
  }
  
  const getIndicator = () => {
    if (confidence >= 0.8) {
      return {
        icon: <CheckCircle2 className="h-3 w-3 text-green-600" />,
        label: 'High confidence',
        color: 'text-green-600',
      };
    } else if (confidence >= 0.5) {
      return {
        icon: <AlertTriangle className="h-3 w-3 text-yellow-600" />,
        label: 'Medium confidence',
        color: 'text-yellow-600',
      };
    } else {
      return {
        icon: <XCircle className="h-3 w-3 text-red-600" />,
        label: 'Low confidence - review carefully',
        color: 'text-red-600',
      };
    }
  };
  
  const indicator = getIndicator();
  
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      {indicator.icon}
      {showLabel && (
        <span className={`text-xs ${indicator.color}`}>
          {indicator.label}
        </span>
      )}
    </span>
  );
}

