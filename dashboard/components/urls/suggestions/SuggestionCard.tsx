/**
 * Suggestion Card Component
 * 
 * Displays individual suggestions with:
 * - Icon based on type (error/warning/info)
 * - Priority indicator
 * - Message text
 * - Action button
 * - Dismiss functionality
 */

'use client';

import { Button } from '@/components/ui/button';
import { X, AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import type { Suggestion } from '@/lib/types/url-suggestions';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAction: (handler: string, params?: Record<string, unknown>) => void;
  onDismiss?: () => void;
  compact?: boolean;
}

/**
 * Suggestion Card Component
 * 
 * Displays a single suggestion with action button
 */
export function SuggestionCard({
  suggestion,
  onAction,
  onDismiss,
  compact = false,
}: SuggestionCardProps) {
  // Icon based on type
  const typeConfig = {
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      iconColor: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
  };

  const config = typeConfig[suggestion.type];
  const Icon = config.icon;

  // Priority badge color
  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-gray-100 text-gray-600 border-gray-300',
  };

  const handleActionClick = () => {
    if (suggestion.action) {
      onAction(suggestion.action.handler, suggestion.action.params);
    }
  };

  if (compact) {
    // Compact mode - minimal design
    return (
      <div className={`flex items-center gap-2 p-2 rounded border ${config.bg} ${config.border}`}>
        <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconColor}`} />
        <p className={`text-xs flex-1 ${config.text}`}>
          {suggestion.message}
        </p>
        {suggestion.action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleActionClick}
            className="flex-shrink-0"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Full mode - complete card
  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Priority Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${priorityColors[suggestion.priority]}`}>
              {suggestion.priority.toUpperCase()}
            </span>
          </div>

          {/* Message */}
          <p className={`text-sm ${config.text} leading-relaxed`}>
            {suggestion.message}
          </p>

          {/* Action Button */}
          {suggestion.action && (
            <div className="mt-3">
              <Button
                size="sm"
                variant={suggestion.priority === 'high' ? 'default' : 'outline'}
                onClick={handleActionClick}
              >
                {suggestion.action.label}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
            title="Dismiss suggestion"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}

