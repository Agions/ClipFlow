/**
 * exportScriptToFile — 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
}));

import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { exportScriptToFile } from './script-export-service';

const saveMock = vi.mocked(save);
const writeMock = vi.mocked(writeTextFile);

describe('exportScriptToFile', () => {
  beforeEach(() => {
    saveMock.mockReset();
    writeMock.mockReset();
  });

  it('writes formatted content (project/segments) to the chosen path', async () => {
    saveMock.mockResolvedValue('/tmp/script.txt');
    writeMock.mockResolvedValue(undefined);

    const script = {
      projectName: 'Demo Project',
      createdAt: '2026-08-06T10:00:00Z',
      segments: [
        { startTime: 0, endTime: 5, content: 'Hello world' },
        { startTime: 10, endTime: 20, content: 'Second segment' },
      ],
    };

    await exportScriptToFile(script, 'script.txt');

    expect(saveMock).toHaveBeenCalledWith({
      defaultPath: 'script.txt',
      filters: [{ name: '文本文件', extensions: ['txt'] }],
    });
    expect(writeMock).toHaveBeenCalledTimes(1);
    const [path, content] = writeMock.mock.calls[0];
    expect(path).toBe('/tmp/script.txt');
    expect(content).toContain('项目: Demo Project');
    expect(content).toContain('[00:00 - 00:05]');
    expect(content).toContain('Hello world');
    expect(content).toContain('[00:10 - 00:20]');
    expect(content).toContain('Second segment');
  });

  it('returns early (no write) when user cancels the save dialog', async () => {
    saveMock.mockResolvedValue(null);
    await exportScriptToFile(
      { projectName: 'p', createdAt: '2026-01-01T00:00:00Z', segments: [] },
      'p.txt'
    );
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('handles empty segments array', async () => {
    saveMock.mockResolvedValue('/tmp/empty.txt');
    writeMock.mockResolvedValue(undefined);

    await exportScriptToFile(
      { projectName: 'Empty', createdAt: '2026-01-01T00:00:00Z', segments: [] },
      'empty.txt'
    );

    const [, content] = writeMock.mock.calls[0];
    expect(content).toContain('项目: Empty');
    // 不应有 [HH:MM - HH:MM] 时间戳行
    expect(content).not.toMatch(/^\[\d{2}:\d{2} - \d{2}:\d{2}\]/m);
  });

  it('formats createdAt using local date format', async () => {
    saveMock.mockResolvedValue('/tmp/x.txt');
    writeMock.mockResolvedValue(undefined);

    await exportScriptToFile(
      { projectName: 'p', createdAt: '2026-08-06T10:30:00Z', segments: [] },
      'x.txt'
    );
    const [, content] = writeMock.mock.calls[0];
    // 中文 "创建时间: " 标签
    expect(content).toMatch(/创建时间: .+/);
  });

  it('propagates errors from writeTextFile', async () => {
    saveMock.mockResolvedValue('/tmp/x.txt');
    writeMock.mockRejectedValue(new Error('disk full'));

    await expect(
      exportScriptToFile(
        { projectName: 'p', createdAt: '2026-01-01T00:00:00Z', segments: [] },
        'x.txt'
      )
    ).rejects.toThrow('disk full');
  });

  it('propagates errors from save dialog', async () => {
    saveMock.mockRejectedValue(new Error('dialog crashed'));

    await expect(
      exportScriptToFile(
        { projectName: 'p', createdAt: '2026-01-01T00:00:00Z', segments: [] },
        'x.txt'
      )
    ).rejects.toThrow('dialog crashed');
    expect(writeMock).not.toHaveBeenCalled();
  });
});
