/**
 * Performance optimization utilities
 * Includes: memoization helpers, performance monitoring, lazy loading
 */

import React, { useMemo, useCallback, useRef, useEffect, DependencyList, RefObject } from 'react';
import { logger } from './logger';

/**
 * Creates a memoized callback that only changes if dependencies change
 * Use this instead of useCallback when you need stable references
 */
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => callback, deps) as T;
}

/**
 * Creates a stable reference for objects that change frequently
 * Useful for avoiding unnecessary re-renders when passing objects to child components
 */
export function useStableRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

/**
 * Debounced version of useEffect for performance-intensive operations
 */
export function useDebouncedEffect(
  effect: () => void,
  delay: number,
  deps: DependencyList
): void {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

/**
 * Hook to track if component is mounted
 * Useful for avoiding state updates on unmounted components
 */
export function useIsMounted(): RefObject<boolean> {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Hook to throttle function calls
 * Useful for expensive operations like window resize handlers
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Measure time for a specific operation
   */
  measure: (name: string, fn: () => void): void => {
    const start = performance.now();
    fn();
    const end = performance.now();
    logger.debug(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  },

  /**
   * Measure async operation
   */
  measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    logger.debug(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Get memory usage (Chrome only)
   */
  getMemoryUsage: (): { usedJSHeapSize: number; totalJSHeapSize: number } | null => {
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
      };
    }
    return null;
  },

  /**
   * Log memory usage
   */
  logMemoryUsage: (): void => {
    const memory = PerformanceMonitor.getMemoryUsage();
    if (memory) {
      logger.debug(
        `[Memory] Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB / ` +
          `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      );
    }
  },
};

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (ref.current) {
      observer.current = new IntersectionObserver(([entry]) => {
        callback(entry.isIntersecting);
      }, options);

      observer.current.observe(ref.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [callback, options]);

  return ref;
}

/**
 * Lazy load component wrapper with loading state
 */
export interface LazyLoadOptions {
  loadingPlaceholder?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Calculate if value is within threshold for conditional rendering
 */
export function shouldRender<T>(value: T, threshold: number): boolean {
  if (Array.isArray(value)) {
    return value.length <= threshold;
  }
  if (typeof value === 'string') {
    return value.length <= threshold;
  }
  if (typeof value === 'number') {
    return value <= threshold;
  }
  return true;
}

/**
 * React Profiler callback for measuring render performance
 */
export function onRenderCallback(
  id: string,
  _phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  _startTime2: number,
  _commitTime2: number
): void {
  // Log slow renders (renders taking more than 16ms)
  if (actualDuration > 16) {
    logger.warn(
      `[Performance] Slow render in "${id}": ` +
        `${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`
    );
  }
}

/**
 * Batch state updates for better performance
 */
export function batchUpdates<T>(updates: (() => T)[], callback: (results: T[]) => void): void {
  const results = updates.map(update => update());
  callback(results);
}

/**
 * Create a custom memo component for expensive computations
 */
export function createMemoizedComponent<P extends object>(
  Component: React.ComponentType<P>,
  compare?: (prev: P, next: P) => boolean
): React.FC<P> {
  const StableMemo = compare ? React.memo(Component, compare) : React.memo(Component);
  const MemoizedComponent = (props: P) => {
    return React.createElement(StableMemo as unknown as React.ComponentType<P>, props);
  };
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name || 'Component'})`;
  return MemoizedComponent;
}
