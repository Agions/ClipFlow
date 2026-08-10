/**
 * Project Tauri Methods — 单元测试
 *
 * 测试七个 invoke 封装方法：
 *  - getExportDir / saveProjectFile / loadProjectFile / deleteProjectFile /
 *    listProjectFiles / listAppDataFiles / checkAppDataDirectory
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../invoke', () => ({
  invoke: vi.fn(),
  TauriCommand: {
    GET_EXPORT_DIR: 'get_export_dir',
    PROJECT_SAVE: 'save_project_file',
    PROJECT_LOAD: 'load_project_file',
    PROJECT_DELETE: 'delete_project_file',
    PROJECT_LIST: 'list_project_files',
    LIST_APP_DATA_FILES: 'list_app_data_files',
    CHECK_APP_DATA_DIR: 'check_app_data_directory',
  },
}));

import { invoke, TauriCommand } from '../invoke';
import { project } from './project';

const invokeMock = vi.mocked(invoke);

describe('project tauri methods', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe('project.getExportDir', () => {
    it('invokes GET_EXPORT_DIR with undefined args and returns the path', async () => {
      invokeMock.mockResolvedValue('/Users/zfkc/Exports');

      const result = await project.getExportDir();

      expect(result).toBe('/Users/zfkc/Exports');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.GET_EXPORT_DIR, undefined);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('home dir unavailable'));

      await expect(project.getExportDir()).rejects.toThrow('home dir unavailable');
    });
  });

  describe('project.saveProjectFile', () => {
    it('invokes PROJECT_SAVE with { projectId, content } and returns success flag', async () => {
      invokeMock.mockResolvedValue(true);

      const result = await project.saveProjectFile('p-1', '{"name":"demo"}');

      expect(result).toBe(true);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.PROJECT_SAVE, {
        projectId: 'p-1',
        content: '{"name":"demo"}',
      });
    });

    it('returns false when save fails', async () => {
      invokeMock.mockResolvedValue(false);

      const result = await project.saveProjectFile('p-1', '{}');

      expect(result).toBe(false);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('disk full'));

      await expect(project.saveProjectFile('p-1', '{}')).rejects.toThrow('disk full');
    });
  });

  describe('project.loadProjectFile', () => {
    it('invokes PROJECT_LOAD with { projectId } and returns content', async () => {
      invokeMock.mockResolvedValue('{"name":"demo"}');

      const result = await project.loadProjectFile('p-1');

      expect(result).toBe('{"name":"demo"}');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.PROJECT_LOAD, {
        projectId: 'p-1',
      });
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('project not found'));

      await expect(project.loadProjectFile('missing')).rejects.toThrow('project not found');
    });
  });

  describe('project.deleteProjectFile', () => {
    it('invokes PROJECT_DELETE with { projectId } and returns success flag', async () => {
      invokeMock.mockResolvedValue(true);

      const result = await project.deleteProjectFile('p-1');

      expect(result).toBe(true);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.PROJECT_DELETE, {
        projectId: 'p-1',
      });
    });

    it('returns false when delete fails', async () => {
      invokeMock.mockResolvedValue(false);

      const result = await project.deleteProjectFile('p-1');

      expect(result).toBe(false);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('locked'));

      await expect(project.deleteProjectFile('p-1')).rejects.toThrow('locked');
    });
  });

  describe('project.listProjectFiles', () => {
    it('invokes PROJECT_LIST with undefined args and returns the list', async () => {
      const projects = [
        { id: 'p-1', name: 'demo', updatedAt: '2026-01-01' },
        { id: 'p-2', name: 'sample' },
      ];
      invokeMock.mockResolvedValue(projects);

      const result = await project.listProjectFiles();

      expect(result).toEqual(projects);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.PROJECT_LIST, undefined);
    });

    it('returns empty array when no projects exist', async () => {
      invokeMock.mockResolvedValue([]);

      const result = await project.listProjectFiles();

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('data dir missing'));

      await expect(project.listProjectFiles()).rejects.toThrow('data dir missing');
    });
  });

  describe('project.listAppDataFiles', () => {
    it('invokes LIST_APP_DATA_FILES with { directory } and returns the list', async () => {
      invokeMock.mockResolvedValue(['cache.json', 'logs.txt']);

      const result = await project.listAppDataFiles('cache');

      expect(result).toEqual(['cache.json', 'logs.txt']);
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.LIST_APP_DATA_FILES, {
        directory: 'cache',
      });
    });

    it('returns empty array for empty directory', async () => {
      invokeMock.mockResolvedValue([]);

      const result = await project.listAppDataFiles('cache');

      expect(result).toEqual([]);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('directory not found'));

      await expect(project.listAppDataFiles('cache')).rejects.toThrow('directory not found');
    });
  });

  describe('project.checkAppDataDirectory', () => {
    it('invokes CHECK_APP_DATA_DIR with undefined args and returns the path', async () => {
      invokeMock.mockResolvedValue('/Users/zfkc/.story-fab');

      const result = await project.checkAppDataDirectory();

      expect(result).toBe('/Users/zfkc/.story-fab');
      expect(invokeMock).toHaveBeenCalledWith(TauriCommand.CHECK_APP_DATA_DIR, undefined);
    });

    it('propagates errors thrown by invoke', async () => {
      invokeMock.mockRejectedValue(new Error('home not resolved'));

      await expect(project.checkAppDataDirectory()).rejects.toThrow('home not resolved');
    });
  });
});
