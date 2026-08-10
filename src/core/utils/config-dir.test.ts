/**
 * getConfigDir — 单元测试（mock Tauri path/fs）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/path', () => ({
  appConfigDir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

import { appConfigDir } from '@tauri-apps/api/path';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { getConfigDir } from './config-dir';

const appConfigDirMock = vi.mocked(appConfigDir);
const existsMock = vi.mocked(exists);
const mkdirMock = vi.mocked(mkdir);

describe('getConfigDir', () => {
  beforeEach(() => {
    appConfigDirMock.mockReset();
    existsMock.mockReset();
    mkdirMock.mockReset();
  });

  it('returns the config dir when it already exists', async () => {
    appConfigDirMock.mockResolvedValue('/home/user/.config/app');
    existsMock.mockResolvedValue(true);

    const result = await getConfigDir();

    expect(result).toBe('/home/user/.config/app');
    expect(mkdirMock).not.toHaveBeenCalled();
  });

  it('creates the config dir when missing (mkdir recursive)', async () => {
    appConfigDirMock.mockResolvedValue('/home/user/.config/app');
    existsMock.mockResolvedValue(false);
    mkdirMock.mockResolvedValue(undefined);

    const result = await getConfigDir();

    expect(result).toBe('/home/user/.config/app');
    expect(mkdirMock).toHaveBeenCalledWith('/home/user/.config/app', { recursive: true });
  });

  it('returns empty string when appConfigDir throws', async () => {
    appConfigDirMock.mockRejectedValue(new Error('path unavailable'));

    const result = await getConfigDir();

    expect(result).toBe('');
  });

  it('returns empty string when exists() throws', async () => {
    appConfigDirMock.mockResolvedValue('/cfg');
    existsMock.mockRejectedValue(new Error('fs error'));

    const result = await getConfigDir();

    expect(result).toBe('');
  });

  it('returns empty string when mkdir() throws', async () => {
    appConfigDirMock.mockResolvedValue('/cfg');
    existsMock.mockResolvedValue(false);
    mkdirMock.mockRejectedValue(new Error('permission denied'));

    const result = await getConfigDir();

    expect(result).toBe('');
  });
});
