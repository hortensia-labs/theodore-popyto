/**
 * Processing Status Badge
 * 
 * Visual indicator for URL processing status with:
 * - Color-coded badges for each status
 * - Icons for visual distinction
 * - Animated indicators for processing states
 * - Tooltips with status descriptions
 * 
 * Based on PRD Section 9.1: Status Badge Design
 */

'use client';

import { cn } from '@/lib/utils';
import { getStateDescription } from '@/lib/utils/state-machine-utils';
import type { ProcessingStatus } from '@/lib/types/url-processing';
import {
  CheckCircle,
  AlertTriangle,
  Star,
  Loader,
  Hand,
  XCircle,
  EyeOff,
  Circle,
  Archive,
} from 'lucide-react';

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Status configuration with colors, icons, and labels
 */
const STATUS_CONFIG: Record<ProcessingStatus, {
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
  icon: typeof CheckCircle;
  animated?: boolean;
}> = {
  stored: {
    label: 'Stored',
    color: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      dot: 'bg-green-500',
    },
    icon: CheckCircle,
  },
  stored_incomplete: {
    label: 'Incomplete',
    color: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
    },
    icon: AlertTriangle,
  },
  stored_custom: {
    label: 'Custom',
    color: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200',
      dot: 'bg-purple-500',
    },
    icon: Star,
  },
  processing_zotero: {
    label: 'Processing',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    icon: Loader,
    animated: true,
  },
  processing_content: {
    label: 'Extracting',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    icon: Loader,
    animated: true,
  },
  processing_llm: {
    label: 'AI Processing',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    icon: Loader,
    animated: true,
  },
  awaiting_selection: {
    label: 'Select ID',
    color: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
    },
    icon: Hand,
  },
  awaiting_metadata: {
    label: 'Review',
    color: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500',
    },
    icon: Hand,
  },
  exhausted: {
    label: 'Manual Needed',
    color: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    icon: XCircle,
  },
  ignored: {
    label: 'Ignored',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200',
      dot: 'bg-gray-500',
    },
    icon: EyeOff,
  },
  archived: {
    label: 'Archived',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200',
      dot: 'bg-gray-500',
    },
    icon: Archive,
  },
  not_started: {
    label: 'Not Started',
    color: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-300',
      dot: 'bg-gray-500',
    },
    icon: Circle,
  },
};

/**
 * Processing Status Badge Component
 * 
 * Displays the current processing status of a URL with visual indicators
 */
export function ProcessingStatusBadge({
  status,
  showLabel = true,
  animated = true,
  className,
  size = 'md',
}: ProcessingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const shouldAnimate = animated && config.animated;
  
  // Size variants
  const sizeClasses = {
    sm: {
      badge: 'px-1.5 py-1.5 text-xs',
      icon: 'h-3 w-3',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      badge: 'px-3 py-1 text-xs',
      icon: 'h-3.5 w-3.5',
      dot: 'w-1.5 h-1.5',
    },
    lg: {
      badge: 'px-3 py-1 text-sm',
      icon: 'h-4 w-4',
      dot: 'w-2 h-2',
    },
  };
  
  const sizes = sizeClasses[size];
  
  // Get description for tooltip
  const description = getStateDescription(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.color.bg,
        config.color.text,
        config.color.border,
        sizes.badge,
        className
      )}
      title={description}
    >
      {/* Animated icon for processing states */}
      {shouldAnimate ? (
        <Icon className={cn(sizes.icon, 'animate-spin')} />
      ) : (
        <span className={cn(sizes.dot, 'rounded-full', config.color.dot, size == 'md' && 'mr-1')} />
      )}
      
      {/* Label */}
      {showLabel && (
        <span className="font-medium">{config.label}</span>
      )}
    </span>
  );
}

/**
 * Get status badge color for use in other components
 */
export function getStatusColor(status: ProcessingStatus): string {
  const config = STATUS_CONFIG[status];
  return config?.color.text || 'text-gray-700';
}

/**
 * Get status badge background for use in other components
 */
export function getStatusBackground(status: ProcessingStatus): string {
  const config = STATUS_CONFIG[status];
  return config?.color.bg || 'bg-gray-100';
}

