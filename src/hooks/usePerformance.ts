/**
 * 性能优化 Hooks
 * 提供性能监控和优化能力
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * 性能追踪 Hook
 */
export function usePerformance(name: string) {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const duration = performance.now() - startTime.current;
    logger.debug(`[Performance] ${name}:`, { duration: `${duration.toFixed(2)}ms` });
  }, [name]);
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * 延迟加载 Hook
 */
export function useLazyLoad(options?: IntersectionObserverInit) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      options
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView, isLoaded: isInView || isLoaded };
}

/**
 * 媒体查询 Hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * 屏幕尺寸 Hook
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
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

/**
 * 异步状态 Hook
 */
export function useAsyncState<T>(): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (promise: Promise<T>) => Promise<T>;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (promise: Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await promise;
      setData(result);
      return result;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * 存储 Hook (支持 localStorage/sessionStorage)
 */
export function useStorage<T>(key: string, initialValue: T, storage = 'local') {
  const storageEngine = storage === 'local' ? localStorage : sessionStorage;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = storageEngine.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storageEngine.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logger.error('useStorage error:', { error });
    }
  }, [key, storedValue, storageEngine]);

  const removeValue = useCallback(() => {
    try {
      storageEngine.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logger.error('useStorage remove error:', { error });
    }
  }, [key, initialValue, storageEngine]);

  return [storedValue, setValue, removeValue] as const;
}
