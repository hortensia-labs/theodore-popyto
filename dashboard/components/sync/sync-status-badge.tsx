'use client';

import { cn } from '@/lib/utils';

export type SyncStatusType = 'up-to-date' | 'changes-detected' | 'never-synced' | 'syncing';

interface SyncStatusBadgeProps {
  status: SyncStatusType;
  lastSyncedAt?: Date | null;
  className?: string;
}

export function SyncStatusBadge({ status, lastSyncedAt, className }: SyncStatusBadgeProps) {
  const statusConfig = {
    'up-to-date': {
      label: 'Up to date',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✓',
    },
    'changes-detected': {
      label: 'Changes detected',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⚠',
    },
    'never-synced': {
      label: 'Never synced',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '○',
    },
    'syncing': {
      label: 'Syncing...',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '⟳',
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border w-fit',
          config.color
        )}
      >
        <span className="text-sm">{config.icon}</span>
        {config.label}
      </span>
      {lastSyncedAt && status === 'up-to-date' && (
        <span className="text-xs text-gray-500">
          Last synced: {new Date(lastSyncedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

