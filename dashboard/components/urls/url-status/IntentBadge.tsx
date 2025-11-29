/**
 * Intent Badge
 * 
 * Visual indicator for user intent with:
 * - Color-coded badges
 * - Click to change (optional)
 * - Icons for each intent type
 * - Tooltips
 */

'use client';

import { cn } from '@/lib/utils';
import type { UserIntent } from '@/lib/types/url-processing';
import {
  Zap,
  EyeOff,
  Star,
  Hand,
  Archive,
} from 'lucide-react';

interface IntentBadgeProps {
  intent: UserIntent;
  onChange?: (intent: UserIntent) => void;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Intent configuration
 */
const INTENT_CONFIG: Record<UserIntent, {
  label: string;
  shortLabel: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  icon: typeof Zap;
  description: string;
}> = {
  auto: {
    label: 'Auto',
    shortLabel: 'A',
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    icon: Zap,
    description: 'Automatic processing',
  },
  ignore: {
    label: 'Ignored',
    shortLabel: 'I',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    },
    icon: EyeOff,
    description: 'Skip processing',
  },
  priority: {
    label: 'Priority',
    shortLabel: 'P',
    color: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
    },
    icon: Star,
    description: 'Process first in batch operations',
  },
  manual_only: {
    label: 'Manual Only',
    shortLabel: 'M',
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
    icon: Hand,
    description: 'No automatic processing',
  },
  archive: {
    label: 'Archived',
    shortLabel: 'Arc',
    color: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-300',
    },
    icon: Archive,
    description: 'Permanently hidden',
  },
};

/**
 * Intent Badge Component
 * 
 * Displays user intent for a URL
 */
export function IntentBadge({
  intent,
  onChange,
  showLabel = true,
  className,
  size = 'md',
}: IntentBadgeProps) {
  const config = INTENT_CONFIG[intent];
  const Icon = config.icon;
  
  // Don't show badge if auto intent (default)
  if (intent === 'auto' && !onChange) {
    return null;
  }
  
  const sizeClasses = {
    sm: {
      badge: 'px-1.5 py-0.5 text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'h-3.5 w-3.5',
    },
  };
  
  const sizes = sizeClasses[size];

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        config.color.bg,
        config.color.text,
        config.color.border,
        sizes.badge,
        onChange && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      title={config.description}
      onClick={onChange ? () => {
        // Cycle through intents or open dropdown
        // For now, just trigger onChange with current intent
        // In real implementation, could open a dropdown menu
      } : undefined}
    >
      <Icon className={sizes.icon} />
      {showLabel && (
        <span>{config.shortLabel}</span>
      )}
    </span>
  );

  return badge;
}

/**
 * Intent selector dropdown (for changing intent)
 */
export function IntentSelector({
  currentIntent,
  onChange,
  className,
}: {
  currentIntent: UserIntent;
  onChange: (intent: UserIntent) => void;
  className?: string;
}) {
  const intents: UserIntent[] = ['auto', 'ignore', 'priority', 'manual_only', 'archive'];

  return (
    <select
      value={currentIntent}
      onChange={(e) => onChange(e.target.value as UserIntent)}
      className={cn(
        'px-3 py-2 border rounded-md text-sm bg-white',
        className
      )}
    >
      {intents.map(intent => {
        const config = INTENT_CONFIG[intent];
        return (
          <option key={intent} value={intent}>
            {config.label}
          </option>
        );
      })}
    </select>
  );
}

/**
 * Get intent color for use in other components
 */
export function getIntentColor(intent: UserIntent): string {
  return INTENT_CONFIG[intent].color.text;
}

/**
 * Get intent label for display
 */
export function getIntentLabel(intent: UserIntent): string {
  return INTENT_CONFIG[intent].label;
}

