/**
 * Quality Score Bar
 *
 * Visual representation of metadata quality score
 */

'use client';

import { computeMetadataQualityColor } from '@/lib/utils/content-processing-helpers';

interface QualityScoreBarProps {
  score: number | null | undefined;
}

export function QualityScoreBar({ score }: QualityScoreBarProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const colors = computeMetadataQualityColor(score);
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600 text-xs">Quality Score</span>
        <span className={`font-medium text-sm ${colors.textColor}`}>
          {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colors.bgColor.replace('100', '500')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
