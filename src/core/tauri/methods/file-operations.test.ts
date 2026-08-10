/**
 * File Operations Tauri Methods — 单元测试
 *
 * 测试六个 invoke 封装方法：
 *  - readTextFile / deleteFile / cleanTempFile / openFile / getFileSize：直接转发
 *  - voiceDiscovery：从返回对象解构 voices
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    FILE_READ: 'read_text_file',
    FILE_DELETE: 'delete_file',
    CLEAN_TEMP_FILE: 'clean_temp_file',
    OPEN_FILE: 'open_file',
    VOICE_DISCOVERY: 'voice_discovery',
    GET_FILE_SIZE: 'get_file_size',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { fileOperations } from './file-operations';

const invokeMock = vi.mocked(invoke);

describe('fileOperations tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('fileOperations.readTextFile', () => {
    it('invokes FILE_READ with { path } and returns the text', async () => {
      invokeMock.mockResolvedValue('line1\nline2');

      const result = await fileOperations.readTextFile('/data/note.txt');

      expect(result).toBe('line1\nline2');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.FILE_READ, { path: '/data/note.txt' });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('file not found'));

      await expect(fileOperations.readTextFile('/missing.txt')).rejects.toThrow('file not found');
    });
  });

  describe('fileOperations.deleteFile', () => {
    it('invokes FILE_DELETE with { path } and returns success flag', async () => {
      invokeMock.mockResolvedValue(true);

      const result = await fileOperations.deleteFile('/tmp/junk.bin');

      expect(result).toBe(true);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.FILE_DELETE, { path: '/tmp/junk.bin' });
    });

    it('returns false when delete failed', async () => {
      invokeMock.mockResolvedValue(false);

      const result = await fileOperations.deleteFile('/locked.txt');

      expect(result).toBe(false);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('permission denied'));

      await expect(fileOperations.deleteFile('/etc/passwd')).rejects.toThrow('permission denied');
    });
  });

  describe('fileOperations.cleanTempFile', () => {
    it('invokes CLEAN_TEMP_FILE with { path } and resolves', async () => {
      invokeMock.mockResolvedValue(undefined as never);

      await expect(fileOperations.cleanTempFile('/tmp/cache.dat')).resolves.toBeUndefined();
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.CLEAN_TEMP_FILE, {
        path: '/tmp/cache.dat',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('still in use'));

      await expect(fileOperations.cleanTempFile('/tmp/cache.dat')).rejects.toThrow('still in use');
    });
  });

  describe('fileOperations.openFile', () => {
    it('invokes OPEN_FILE with { path } and resolves', async () => {
      invokeMock.mockResolvedValue(undefined as never);

      await expect(fileOperations.openFile('/tmp/output.mp4')).resolves.toBeUndefined();
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.OPEN_FILE, { path: '/tmp/output.mp4' });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('no associated app'));

      await expect(fileOperations.openFile('/tmp/foo.unknown')).rejects.toThrow(
        'no associated app'
      );
    });
  });

  describe('fileOperations.voiceDiscovery', () => {
    it('invokes VOICE_DISCOVERY with undefined args and returns voices array', async () => {
      const voices = [
        { name: '晓晓', locale: 'zh-CN', gender: 'female' },
        { name: 'Aria', locale: 'en-US', gender: 'female' },
      ];
      invokeMock.mockResolvedValue({ voices });

      const result = await fileOperations.voiceDiscovery();

      expect(result).toEqual(voices);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.VOICE_DISCOVERY, undefined);
    });

    it('returns empty array when no voices are available', async () => {
      invokeMock.mockResolvedValue({ voices: [] });

      const result = await fileOperations.voiceDiscovery();

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('edge tts offline'));

      await expect(fileOperations.voiceDiscovery()).rejects.toThrow('edge tts offline');
    });
  });

  describe('fileOperations.getFileSize', () => {
    it('invokes GET_FILE_SIZE with { path } and returns bytes', async () => {
      invokeMock.mockResolvedValue(4096);

      const result = await fileOperations.getFileSize('/data/blob.bin');

      expect(result).toBe(4096);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_FILE_SIZE, {
        path: '/data/blob.bin',
      });
    });

    it('returns zero bytes for empty file', async () => {
      invokeMock.mockResolvedValue(0);

      const result = await fileOperations.getFileSize('/empty.txt');

      expect(result).toBe(0);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('stat failed'));

      await expect(fileOperations.getFileSize('/gone.txt')).rejects.toThrow('stat failed');
    });
  });
});
