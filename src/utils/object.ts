/**
 * 对象工具函数
 */

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as unknown as T;
  if (obj instanceof Set) return new Set(Array.from(obj).map((item) => deepClone(item))) as unknown as T;
  if (obj instanceof Map) return new Map(Array.from(obj).map(([k, v]) => [deepClone(k), deepClone(v)])) as unknown as T;
  
  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned as T;
}

/**
 * 合并对象
 */
export function merge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
  for (const source of sources) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const targetVal = target[key];
        const sourceVal = source[key];
        
        if (
          targetVal &&
          sourceVal &&
          typeof targetVal === 'object' &&
          typeof sourceVal === 'object' &&
          !Array.isArray(targetVal) &&
          !Array.isArray(sourceVal)
        ) {
          target[key] = merge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>) as T[Extract<keyof T, string>];
        } else {
          target[key] = sourceVal as T[Extract<keyof T, string>];
        }
      }
    }
  }
  return target;
}

/**
 * 选择字段
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * 排除字段
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * 字段映射
 */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  fn: (key: string, value: T[Extract<keyof T, string>]) => string
): Record<string, T[Extract<keyof T, string>]> {
  const result: Record<string, T[Extract<keyof T, string>]> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = fn(key, obj[key]);
      result[newKey] = obj[key];
    }
  }
  return result;
}

/**
 * 值映射
 */
export function mapValues<T extends Record<string, unknown>, U>(
  obj: T,
  fn: (value: T[Extract<keyof T, string>], key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = fn(obj[key], key);
    }
  }
  return result;
}

/**
 * 筛选
 */
export function filter<T extends Record<string, unknown>>(
  obj: T,
  fn: (value: T[Extract<keyof T, string>], key: string) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && fn(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * 查找
 */
export function find<T extends Record<string, unknown>>(
  obj: T,
  fn: (value: T[Extract<keyof T, string>], key: string) => boolean
): T[Extract<keyof T, string>] | undefined {
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && fn(obj[key], key)) {
      return obj[key];
    }
  }
  return undefined;
}

/**
 * 键值对转换
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function entries<T extends Record<string, unknown>>(obj: T): Array<[string, unknown]> {
  return Object.entries(obj);
}

/**
 * 键值对构建对象
 */
export function fromEntries<T extends Record<string, unknown>>(
  entries: Array<[string, T[Extract<keyof T, string>] | undefined]>
): T {
  const obj = {} as T;
  for (const [key, value] of entries) {
    if (value !== undefined) {
      obj[key as keyof T] = value;
    }
  }
  return obj;
}

/**
 * 检查空对象
 */
export function isEmpty(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 获取嵌套值
 */
export function get<T = unknown>(
  obj: unknown,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = (result as Record<string, unknown>)[key];
  }
  
  return (result as T) ?? defaultValue;
}

/**
 * 设置嵌套值
 */
export function set<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let current: Record<string, unknown> = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[lastKey] = value;
  return obj;
}

/**
 * 比较对象差异
 */
export function diff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
): { added: Record<string, unknown>; removed: Record<string, unknown>; changed: Record<string, { from: unknown; to: unknown }> } {
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  for (const key of allKeys) {
    if (!(key in obj1)) {
      added[key] = obj2[key];
    } else if (!(key in obj2)) {
      removed[key] = obj1[key];
    } else if (obj1[key] !== obj2[key]) {
      changed[key] = { from: obj1[key], to: obj2[key] };
    }
  }
  
  return { added, removed, changed };
}
