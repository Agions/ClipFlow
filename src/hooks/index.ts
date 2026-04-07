/**
 * Hooks 统一导出
 *
 * 命名规范：kebab-case（use-timeline.ts）
 */

// 时间线 & 编辑
export { useTimeline, usePlayback, useHistory, useSelection, useZoom } from './use-timeline';
export { useKeyboardShortcuts, KEYBOARD_SHORTCUTS_HELP } from './use-keyboard-shortcuts';

// ============================================================
// 通用 React Hooks（合并自 src/shared/hooks + src/core/utils/hooks）
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce, throttle } from '@/shared/utils';
import { logger } from '@/utils/logger';

/**
 * 使用本地存储
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error('useLocalStorage error:', { error });
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logger.error('useLocalStorage setValue error:', { error });
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * 使用防抖值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

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
 * 使用防抖回调
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay]
  );
}

/**
 * 使用节流回调
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), limit),
    [limit]
  );
}

/**
 * 使用窗口大小
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * 使用点击外部
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: () => void
) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler]);
}

/**
 * 使用倒计时
 */
export function useCountdown(initialSeconds: number): [
  number,
  () => void,
  () => void,
  () => void
] {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const start = useCallback(() => setIsActive(true), []);
  const pause = useCallback(() => setIsActive(false), []);
  const reset = useCallback(() => {
    setIsActive(false);
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, seconds]);

  return [seconds, start, pause, reset];
}

/**
 * 使用异步操作
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = false
): {
  data: T | null;
  error: Error | null;
  loading: boolean;
  execute: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { data, error, loading, execute };
}

/**
 * 使用上一状态
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * 使用挂载状态
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted;
}

/**
 * 使用更新效果（跳过首次渲染）
 */
export function useUpdateEffect(effect: React.EffectCallback, deps?: React.DependencyList) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    return effect();
  }, deps);
}

/**
 * 使用键盘事件
 */
export function useKeyPress(targetKey: string, callback: () => void) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [targetKey, callback]);
}

/**
 * 使用在线状态
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * 使用媒体查询
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

/**
 * 使用滚动位置
 */
export function useScrollPosition(): { x: number; y: number } {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setPosition({ x: window.scrollX, y: window.scrollY });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return position;
}

/**
 * 使用可见性
 */
export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

/**
 * 使用自动保存
 */
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => void | Promise<void>,
  delay: number = 30000
) {
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveFunction(dataRef.current);
    }, delay);

    return () => clearInterval(interval);
  }, [saveFunction, delay]);
}

/**
 * 使用列表过滤和排序
 */
export function useListFilter<T>(
  items: T[],
  options?: {
    searchKeys?: (keyof T)[];
    sortKey?: keyof T;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | undefined>(options?.sortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(options?.sortOrder || 'desc');

  const filteredItems = useMemo(() => {
    let result = [...items];

    // 搜索过滤
    if (searchQuery && options?.searchKeys) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        options.searchKeys!.some(key => {
          const value = item[key];
          return typeof value === 'string' && value.toLowerCase().includes(query);
        })
      );
    }

    // 排序
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchQuery, sortKey, sortOrder, options?.searchKeys]);

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortOrder,
    setSortOrder,
    toggleSortOrder: () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'),
    filteredItems,
    hasResults: filteredItems.length > 0
  };
}

/**
 * 使用分页
 */
export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    setCurrentPage: goToPage,
    paginatedItems,
    totalPages,
    totalItems: items.length,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage,
    prevPage
  };
}
