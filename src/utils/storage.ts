/**
 * 存储工具函数
 */

import { logger } from '@/utils/logger';

/**
 * 本地存储键名前缀
 */
const STORAGE_PREFIX = 'cutdeck_';

/**
 * 存储键名
 */
export const StorageKeys = {
  PROJECTS: `${STORAGE_PREFIX}projects`,
  CURRENT_PROJECT: `${STORAGE_PREFIX}current_project`,
  USER_SETTINGS: `${STORAGE_PREFIX}user_settings`,
  RECENT_FILES: `${STORAGE_PREFIX}recent_files`,
  EDITOR_STATE: `${STORAGE_PREFIX}editor_state`,
} as const;

/**
 * 存储工具
 */
export const storage = {
  /**
   * 获取数据
   */
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      return JSON.parse(item) as T;
    } catch (error) {
      logger.error('[Storage] 读取失败', { key, error });
      return defaultValue ?? null;
    }
  },

  /**
   * 设置数据
   */
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('[Storage] 写入失败', { key, error });
      return false;
    }
  },

  /**
   * 删除数据
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('[Storage] 删除失败', { key, error });
      return false;
    }
  },

  /**
   * 清空所有数据
   */
  clear(): boolean {
    try {
      // 只清除应用相关数据
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      logger.error('[Storage] 清空失败', { error });
      return false;
    }
  },

  /**
   * 检查存储是否可用
   */
  isAvailable(): boolean {
    try {
      const testKey = `${STORAGE_PREFIX}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 获取存储使用情况
   */
  getUsage(): { used: number; quota: number } {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length * 2; // UTF-16 字符
        }
      }
    }
    
    return {
      used,
      quota: 5 * 1024 * 1024, // 5MB 估算
    };
  },
};

/**
 * Session 存储
 */
export const sessionStorage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = globalThis.sessionStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      globalThis.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      globalThis.sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};
