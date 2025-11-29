/**
 * Empty States Components
 * 
 * Polished empty states for better UX when no data is present
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Database,
  Search,
  Filter,
  FileQuestion,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Base Empty State Component
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex items-center justify-center p-12', className)}>
      <div className="text-center space-y-4 max-w-md">
        <Icon className="h-16 w-16 text-gray-400 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </div>
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * No URLs Found Empty State
 */
export function NoUrlsFound({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters?: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={Filter}
        title="No URLs match your filters"
        description="Try adjusting your filter criteria to see more results."
        action={
          onClearFilters
            ? {
                label: 'Clear All Filters',
                onClick: onClearFilters,
              }
            : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Database}
      title="No URLs yet"
      description="Process URLs from your source documents to get started. URLs will appear here once imported."
    />
  );
}

/**
 * No Search Results Empty State
 */
export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No URLs match "${query}". Try a different search term.`}
    />
  );
}

/**
 * All Done Empty State
 */
export function AllProcessed() {
  return (
    <EmptyState
      icon={CheckCircle}
      title="All URLs processed!"
      description="Great work! All URLs have been successfully processed and stored in Zotero."
      className="bg-green-50"
    />
  );
}

/**
 * No Suggestions Empty State
 */
export function NoSuggestions() {
  return (
    <div className="text-center py-6">
      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
      <p className="text-sm text-gray-600">
        No suggestions - everything looks good!
      </p>
    </div>
  );
}

/**
 * Error Empty State
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

