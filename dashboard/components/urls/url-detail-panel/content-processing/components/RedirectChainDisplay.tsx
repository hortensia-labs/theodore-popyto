/**
 * Redirect Chain Display
 *
 * Shows the redirect chain if URL was redirected
 */

'use client';

import { ArrowRight } from 'lucide-react';

interface RedirectChainDisplayProps {
  redirectChain: string[];
}

export function RedirectChainDisplay({ redirectChain }: RedirectChainDisplayProps) {
  if (!redirectChain || redirectChain.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="text-xs font-semibold text-blue-900 mb-2">
        Redirect Chain ({redirectChain.length} redirect{redirectChain.length > 1 ? 's' : ''})
      </div>
      <div className="space-y-1">
        {redirectChain.map((url, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            {index > 0 && <ArrowRight className="h-3 w-3 text-blue-600 flex-shrink-0 mt-0.5" />}
            <span className="text-blue-800 break-all font-mono">{url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
