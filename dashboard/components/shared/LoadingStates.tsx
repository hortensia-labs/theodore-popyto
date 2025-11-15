/**
 * Loading States Components
 * 
 * Polished loading skeletons and spinners for better UX
 */

'use client';

import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Table Loading Skeleton
 * Shows while table data is loading
 */
export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 p-4 bg-white border rounded-lg">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
          <div className="w-20 h-6 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Detail Panel Loading Skeleton
 */
export function DetailPanelLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-100 rounded"></div>
        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
        <div className="h-4 bg-gray-100 rounded w-4/6"></div>
      </div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

/**
 * Centered Spinner
 * For full-page or section loading
 */
export function CenteredSpinner({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center p-12', className)}>
      <div className="text-center space-y-3">
        <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        {message && (
          <p className="text-sm text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Spinner
 * For buttons and inline loading
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <Loader className={cn('h-4 w-4 animate-spin', className)} />
  );
}

/**
 * Progress Bar
 * For batch processing progress
 */
export function ProgressBar({
  current,
  total,
  label,
  className,
}: {
  current: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          <span className="text-gray-600">
            {current} / {total} ({percentage.toFixed(1)}%)
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

