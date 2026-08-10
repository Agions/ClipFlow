/**
 * core/services/auth/api-key-service.ts — 单元测试
 *
 * 通过 mock @tauri-apps/plugin-store 验证 4 个 API key 操作的语义。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 共享 mock store 句柄，方便在每个 test 中检查调用
const storeHandle = {
  data: new Map<string, unknown>(),
  load: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  entries: vi.fn(),
};

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(async () => storeHandle),
}));

import { load } from '@tauri-apps/plugin-store';
import { getApiKey, setApiKey, deleteApiKey, getAllApiKeys } from './api-key-service';

beforeEach(() => {
  storeHandle.data.clear();
  storeHandle.load.mockClear();
  storeHandle.get.mockClear();
  storeHandle.set.mockClear();
  storeHandle.save.mockClear();
  storeHandle.delete.mockClear();
  storeHandle.entries.mockClear();

  // 默认：get 返回 undefined (key 不存在)
  storeHandle.get.mockImplementation(async (key: string) => storeHandle.data.get(key));
  // 默认：entries 返回 data Map 的快照数组
  storeHandle.entries.mockImplementation(async () => {
    return Array.from(storeHandle.data.entries()) as Array<[string, unknown]>;
  });
  storeHandle.set.mockImplementation(async (key: string, value: unknown) => {
    storeHandle.data.set(key, value);
  });
  storeHandle.delete.mockImplementation(async (key: string) => {
    storeHandle.data.delete(key);
  });
  storeHandle.save.mockResolvedValue(undefined);

  vi.mocked(load).mockResolvedValue(storeHandle as unknown as Awaited<ReturnType<typeof load>>);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── getApiKey ───────────────────────────────────────────────────────────────

describe('getApiKey', () => {
  it('loads store with defaults + autoSave=false', async () => {
    await getApiKey('openai');
    expect(load).toHaveBeenCalledWith('api_keys.json', { defaults: {}, autoSave: false });
  });

  it('returns the stored key when present', async () => {
    storeHandle.data.set('openai', 'sk-abc');
    const result = await getApiKey('openai');
    expect(result).toBe('sk-abc');
  });

  it('returns empty string when key is missing', async () => {
    const result = await getApiKey('missing');
    expect(result).toBe('');
  });

  it('returns empty string and logs when store throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(load).mockRejectedValue(new Error('store load failed'));
    const result = await getApiKey('openai');
    expect(result).toBe('');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

// ─── setApiKey ───────────────────────────────────────────────────────────────

describe('setApiKey', () => {
  it('writes the key into the store', async () => {
    await setApiKey('openai', 'sk-new');
    expect(storeHandle.set).toHaveBeenCalledWith('openai', 'sk-new');
  });

  it('calls store.save() to persist', async () => {
    await setApiKey('openai', 'sk-new');
    expect(storeHandle.save).toHaveBeenCalledOnce();
  });

  it('rethrows when store.set fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storeHandle.set.mockRejectedValueOnce(new Error('disk full'));
    await expect(setApiKey('openai', 'sk')).rejects.toThrow('disk full');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('does not call save when set throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storeHandle.set.mockRejectedValueOnce(new Error('set failed'));
    await expect(setApiKey('openai', 'sk')).rejects.toThrow('set failed');
    expect(storeHandle.save).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('overwrites existing value', async () => {
    storeHandle.data.set('openai', 'old');
    await setApiKey('openai', 'new');
    expect(storeHandle.data.get('openai')).toBe('new');
  });
});

// ─── deleteApiKey ────────────────────────────────────────────────────────────

describe('deleteApiKey', () => {
  it('removes the key from the store', async () => {
    storeHandle.data.set('openai', 'sk-abc');
    await deleteApiKey('openai');
    expect(storeHandle.delete).toHaveBeenCalledWith('openai');
    expect(storeHandle.data.has('openai')).toBe(false);
  });

  it('calls store.save() to persist the deletion', async () => {
    await deleteApiKey('openai');
    expect(storeHandle.save).toHaveBeenCalledOnce();
  });

  it('rethrows when store.delete fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    storeHandle.delete.mockRejectedValueOnce(new Error('perm denied'));
    await expect(deleteApiKey('openai')).rejects.toThrow('perm denied');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('does not throw when deleting non-existent key', async () => {
    // storeHandle.delete 默认 mock 不报错，删除不存在的键是 no-op
    await expect(deleteApiKey('missing')).resolves.toBeUndefined();
  });
});

// ─── getAllApiKeys ───────────────────────────────────────────────────────────

describe('getAllApiKeys', () => {
  it('returns empty object when store is empty', async () => {
    const result = await getAllApiKeys();
    expect(result).toEqual({});
  });

  it('returns all string entries as a Record', async () => {
    storeHandle.data.set('openai', 'sk-1');
    storeHandle.data.set('anthropic', 'sk-2');
    const result = await getAllApiKeys();
    expect(result).toEqual({ openai: 'sk-1', anthropic: 'sk-2' });
  });

  it('filters out non-string values', async () => {
    storeHandle.data.set('good', 'sk-good');
    storeHandle.data.set('number-key', 42);
    storeHandle.data.set('bool-key', true);
    storeHandle.data.set('obj-key', { nested: true });
    storeHandle.data.set('null-key', null);

    const result = await getAllApiKeys();
    expect(result).toEqual({ good: 'sk-good' });
  });

  it('returns empty object and logs when store load fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(load).mockRejectedValue(new Error('load failed'));
    const result = await getAllApiKeys();
    expect(result).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

// ─── integration scenarios ──────────────────────────────────────────────────

describe('integration: write → read → delete → re-read', () => {
  it('round-trip through the store', async () => {
    await setApiKey('openai', 'sk-round');
    expect(await getApiKey('openai')).toBe('sk-round');
    expect(await getAllApiKeys()).toEqual({ openai: 'sk-round' });

    await deleteApiKey('openai');
    expect(await getApiKey('openai')).toBe('');
    expect(await getAllApiKeys()).toEqual({});
  });

  it('preserves multiple independent services', async () => {
    await setApiKey('openai', 'sk-1');
    await setApiKey('anthropic', 'sk-2');
    await setApiKey('google', 'sk-3');

    expect(await getApiKey('openai')).toBe('sk-1');
    expect(await getApiKey('anthropic')).toBe('sk-2');
    expect(await getApiKey('google')).toBe('sk-3');

    await deleteApiKey('anthropic');
    expect(await getAllApiKeys()).toEqual({ openai: 'sk-1', google: 'sk-3' });
  });
});
