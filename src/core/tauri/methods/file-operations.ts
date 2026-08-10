import { invoke, TauriCommand } from '../invoke';

export const fileOperations = {
  /** 读取文本文件 */
  async readTextFile(path: string): Promise<string> {
    return invoke(TauriCommand.FILE_READ, { path }) as Promise<string>;
  },

  /** 删除文件 */
  async deleteFile(path: string): Promise<boolean> {
    return invoke(TauriCommand.FILE_DELETE, { path }) as Promise<boolean>;
  },

  /** 清理临时文件 */
  async cleanTempFile(path: string): Promise<void> {
    await invoke(TauriCommand.CLEAN_TEMP_FILE, { path });
  },

  /** 打开文件 */
  async openFile(path: string): Promise<void> {
    await invoke(TauriCommand.OPEN_FILE, { path });
  },

  /** 语音发现（edge-tts 无发现 API，恒返回空列表） */
  async voiceDiscovery(): Promise<Array<{ name: string; locale: string; gender: string }>> {
    const { voices } = await invoke(TauriCommand.VOICE_DISCOVERY, undefined);
    return voices;
  },

  /** 获取文件大小 */
  async getFileSize(path: string): Promise<number> {
    return invoke(TauriCommand.GET_FILE_SIZE, { path }) as Promise<number>;
  },

  /** 获取默认导出目录 */
  async getExportDir(): Promise<string> {
    return invoke(TauriCommand.GET_EXPORT_DIR, undefined) as Promise<string>;
  },
};
