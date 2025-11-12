'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Position tooltip above the trigger, centered
      let top = triggerRect.top - tooltipRect.height - 8;
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      
      // Adjust if tooltip goes off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        // Show below instead
        top = triggerRect.bottom + 8;
      }
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg max-w-xs',
            'pointer-events-none',
            className
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

