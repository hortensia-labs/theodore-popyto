import { type UrlStatus, URL_STATUS_CONFIG } from '@/lib/db/computed';
import { cn } from '@/lib/utils';
import { Tooltip } from './ui/tooltip';

interface StatusBadgeProps {
  status: UrlStatus;
  showLabel?: boolean;
  className?: string;
  tooltipContent?: React.ReactNode;
}

export function StatusBadge({ status, showLabel = true, className, tooltipContent }: StatusBadgeProps) {
  const config = URL_STATUS_CONFIG[status];
  
  const colorClasses = {
    black: 'bg-black text-white border-black',
    red: 'bg-red-100 text-red-800 border-red-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClasses[config.color],
        className
      )}
      title={tooltipContent ? undefined : config.description}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', 
        config.color === 'black' && 'bg-white',
        config.color === 'red' && 'bg-red-500',
        config.color === 'green' && 'bg-green-500',
        config.color === 'blue' && 'bg-blue-500',
        config.color === 'pink' && 'bg-pink-500',
        config.color === 'gray' && 'bg-gray-500',
      )} />
      {showLabel && config.label}
    </span>
  );
  
  if (tooltipContent) {
    return <Tooltip content={tooltipContent}>{badge}</Tooltip>;
  }
  
  return badge;
}

