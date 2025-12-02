/**
 * Performance Optimization Utilities
 * 
 * Hooks and utilities for optimizing component performance:
 * - Memoization helpers
 * - Debouncing
 * - Throttling
 * - Lazy loading
 */

'use client';

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';

/**
 * Debounce hook
 * Delays function execution until after wait time has elapsed
 * Useful for search inputs, filter changes
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Throttle hook
 * Limits function execution to once per time period
 * Useful for scroll handlers, resize handlers
 * 
 * @param callback - Function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;

      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);

  return throttledCallback;
}

/**
 * Memoize expensive computation
 * Only recomputes when dependencies change
 * 
 * @param computation - Function to memoize
 * @param deps - Dependencies array
 * @returns Memoized value
 */
export function useMemoizedComputation<T>(
  computation: () => T,
  deps: React.DependencyList
): T {
  return useMemo(computation, deps);
}

/**
 * Intersection observer hook for lazy loading
 * Detects when element enters viewport
 * 
 * @param options - IntersectionObserver options
 * @returns Ref and isIntersecting boolean
 */
export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref, isIntersecting };
}

/**
 * Previous value hook
 * Returns the previous value of a variable
 * Useful for detecting changes
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Mounted state hook
 * Tracks if component is currently mounted
 * Prevents setState on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Window size hook
 * Tracks window dimensions with debouncing
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

