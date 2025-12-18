import { type UrlStatus, URL_STATUS_CONFIG } from '@/lib/db/computed';
import { cn } from '@/lib/utils';
import { Tooltip } from './ui/tooltip';

type BadgeVariant = 'success' | 'warning' | 'error' | 'secondary' | 'default';
type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: UrlStatus | string;
  showLabel?: boolean;
  className?: string;
  tooltipContent?: React.ReactNode;
  // New props for generic badge usage
  variant?: BadgeVariant;
  label?: string;
  size?: BadgeSize;
}

export function StatusBadge({
  status,
  showLabel = true,
  className,
  tooltipContent,
  variant,
  label,
  size = 'md',
}: StatusBadgeProps) {
  // Try to get config from URL_STATUS_CONFIG if status is a UrlStatus
  const config = URL_STATUS_CONFIG[status as UrlStatus];

  // Use provided variant/label or fall back to config
  const finalVariant = variant || (config ? variantFromColor(config.color) : 'default');
  const finalLabel = label || (config ? config.label : status);
  const description = config?.description;

  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    default: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const dotClasses = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    secondary: 'bg-gray-500',
    default: 'bg-blue-500',
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  const paddingClasses = {
    sm: showLabel ? 'px-2 py-0.5' : 'px-1 py-1',
    md: showLabel ? 'px-2.5 py-0.5' : 'px-1.5 py-1.5',
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        sizeClasses[size],
        paddingClasses[size],
        variantClasses[finalVariant],
        className
      )}
      title={tooltipContent ? undefined : description}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClasses[finalVariant])} />
      {showLabel && finalLabel}
    </span>
  );

  if (tooltipContent) {
    return <Tooltip content={tooltipContent}>{badge}</Tooltip>;
  }

  return badge;
}

// Helper to convert legacy color to variant
function variantFromColor(color: string): BadgeVariant {
  switch (color) {
    case 'green':
      return 'success';
    case 'red':
    case 'pink':
      return 'error';
    case 'blue':
      return 'default';
    case 'gray':
      return 'secondary';
    case 'black':
      return 'default';
    default:
      return 'default';
  }
}

