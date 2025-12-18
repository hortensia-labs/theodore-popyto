/**
 * Identifier List
 *
 * Displays a list of identifiers with type, value, and confidence
 */

'use client';

interface Identifier {
  identifierType: string;
  identifierValue: string;
  confidence: string;
  extractionSource?: string | null;
}

interface IdentifierListProps {
  identifiers: Identifier[];
}

export function IdentifierList({ identifiers }: IdentifierListProps) {
  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-2">
      {identifiers.map((identifier, index) => (
        <div
          key={index}
          className="bg-white border rounded-lg p-2 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                  {identifier.identifierType}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getConfidenceBadgeColor(
                    identifier.confidence
                  )}`}
                >
                  {identifier.confidence}
                </span>
              </div>
              <div className="font-mono text-sm break-all">{identifier.identifierValue}</div>
              {identifier.extractionSource && (
                <div className="text-xs text-gray-500 mt-1">
                  Source: {identifier.extractionSource}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
