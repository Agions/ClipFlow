import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, BaseDirectory, mkdir, exists } from '@tauri-apps/plugin-fs';
import { appConfigDir } from '@tauri-apps/api/path';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { normalizeProjectId, buildProjectIdCandidates } from '@/core/utils/project-id';
import { logger } from '@/utils/logger';

type ProjectFileData = {
  aiModel?: {
    apiKey?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ExportScriptSegment = {
  startTime: number;
  endTime: number;
  content: string;
};

type ExportScriptData = {
  projectName: string;
  createdAt: string;
  segments: ExportScriptSegment[];
};

export const PROJECTS_CHANGED_EVENT = 'clipflow:projects:changed';

const emitProjectsChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT));
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeListedProject = (value: unknown): ProjectFileData | null => {
  if (!isRecord(value)) return null;

  const rawId = typeof value.id === 'string' ? value.id : '';
  const fallbackId = typeof value.projectId === 'string' ? value.projectId : '';
  const normalizedId = normalizeProjectId(rawId || fallbackId);
  if (!normalizedId) return null;

  const merged: ProjectFileData = {
    ...value,
    id: normalizedId,
  };

  if (typeof merged.name !== 'string' || !merged.name.trim()) {
    merged.name = `项目 ${normalizedId.slice(0, 8)}`;
  }
  if (typeof merged.updatedAt !== 'string') {
    merged.updatedAt = typeof merged.createdAt === 'string'
      ? merged.createdAt
      : new Date().toISOString();
  }

  return merged;
};

// 确保应用数据目录
export const ensureAppDataDir = async (): Promise<void> => {
  try {
    const appDir = 'ClipFlow';
    
    // 先尝试使用Rust函数检查目录
    try {
      const dirPath = await invoke('check_app_data_directory');
      logger.info('Rust目录检查成功:', dirPath);
      return;
    } catch (rustError) {
      logger.warn('Rust目录检查失败，回退到前端检查:', rustError);
    }
    
    // 前端备用检查
    let dirExists = false;
    try {
      dirExists = await exists(appDir, { baseDir: BaseDirectory.AppData });
    } catch (existsError) {
      logger.error('检查目录是否存在时出错:', existsError);
      throw new Error(`检查目录出错: ${existsError instanceof Error ? existsError.message : '未知错误'}`);
    }
    
    if (!dirExists) {
      logger.info('应用数据目录不存在，创建目录:', appDir);
      try {
        await mkdir(appDir, { baseDir: BaseDirectory.AppData, recursive: true });
      } catch (createError) {
        logger.error('创建目录失败:', createError);
        throw new Error(`创建目录失败: ${createError instanceof Error ? createError.message : '未知错误'}`);
      }
      
      // 验证目录是否创建成功
      try {
        const checkExists = await exists(appDir, { baseDir: BaseDirectory.AppData });
        if (!checkExists) {
          throw new Error('无法创建应用数据目录，请检查权限');
        }
      } catch (verifyError) {
        logger.error('验证目录是否创建成功时出错:', verifyError);
        throw new Error(`验证目录出错: ${verifyError instanceof Error ? verifyError.message : '未知错误'}`);
      }
      logger.info('应用数据目录创建成功');
    }
    
    return;
  } catch (error) {
    logger.error('创建应用数据目录失败:', error);
    throw error;
  }
};

// 保存项目数据到文件
export const saveProjectToFile = async (projectId: string, project: object): Promise<void> => {
  const normalizedProjectId = normalizeProjectId(projectId || '');

  if (!project || !normalizedProjectId) {
    logger.error('保存项目文件失败: 项目数据无效');
    throw new Error('无效的项目数据');
  }

  try {
    // 确保目录存在
    await ensureAppDataDir().catch(_err => {
      logger.error('确保应用数据目录存在时出错:', _err);
      throw new Error(`应用数据目录错误: ${_err.message || '未知错误'}`);
    });
    
    const projectPath = `ClipFlow/${normalizedProjectId}.json`;
    logger.info('正在保存项目文件:', projectPath);
    
    // 准备项目数据
    let projectData: string;
    try {
      // 移除可能导致循环引用的字段
      const cleanProject = { ...(project as ProjectFileData) };
      if (cleanProject.aiModel && cleanProject.aiModel.apiKey) {
        // 创建新对象避免修改原始对象
        cleanProject.aiModel = { 
          ...cleanProject.aiModel,
          apiKey: undefined // 不保存API密钥到项目文件中
        };
      }
      
      projectData = JSON.stringify(cleanProject, null, 2);
      if (!projectData) {
        throw new Error('项目数据序列化为空');
      }
    } catch (_err) {
      logger.error('序列化项目数据失败:', _err);
      throw new Error('无法序列化项目数据');
    }
    
    // 使用Rust函数直接写入文件，提供更好的错误处理
    try {
      await invoke('save_project_file', {
        projectId: normalizedProjectId,
        content: projectData
      });
      emitProjectsChanged();
      logger.info('文件写入成功 (通过Rust函数)');
      return;
    } catch (rustErr) {
      logger.warn('通过Rust保存文件失败，尝试使用JS API保存:', rustErr);
      // 继续使用JS API作为备选方案
    }
    
    // 检查文件是否已存在
    const fileExists = await exists(projectPath, { baseDir: BaseDirectory.AppData })
      .catch(_err => {
        logger.error('检查文件是否存在时出错:', err);
        return false;
      });
      
    logger.info(`项目文件${fileExists ? '已存在' : '不存在'}，准备${fileExists ? '更新' : '新建'}`);
    
    // 执行写入
    try {
      await writeTextFile(
        projectPath,
        projectData,
        { baseDir: BaseDirectory.AppData }
      );
      logger.info('文件写入完成');
    } catch (writeErr) {
      logger.error('文件写入失败:', writeErr);
      
      // 尝试备用方法保存
      try {
        const configDir = await getConfigDir();
        const backupPath = `${configDir}${normalizedProjectId}.json`;
        await writeTextFile(backupPath, projectData);
        emitProjectsChanged();
        logger.info('使用备用路径保存成功:', backupPath);
        return;
      } catch (backupErr) {
        logger.error('备用保存也失败:', backupErr);
        const writeErrMessage = writeErr instanceof Error ? writeErr.message : '未知错误';
        throw new Error(`文件写入失败: ${writeErrMessage}`);
      }
    }
    
    // 验证文件是否写入成功
    try {
      const verifyExists = await exists(projectPath, { baseDir: BaseDirectory.AppData });
      if (!verifyExists) {
        throw new Error('文件似乎已写入但无法验证其存在');
      }
      logger.info('验证文件存在: 成功');
    } catch (verifyErr) {
      logger.error('验证文件存在时出错:', verifyErr);
      const verifyErrMessage = verifyErr instanceof Error ? verifyErr.message : '未知错误';
      throw new Error(`无法验证文件是否保存成功: ${verifyErrMessage}`);
    }
    
    emitProjectsChanged();
    logger.info('项目文件保存成功:', projectPath);
    return;
  } catch (error) {
    logger.error('保存项目文件失败:', error);
    throw error;
  }
};

// 读取项目数据
export const loadProjectFromFile = async <T = ProjectFileData>(projectId: string): Promise<T> => {
  const candidates = buildProjectIdCandidates(projectId);
  if (!candidates.length) {
    throw new Error('项目ID不能为空');
  }

  let lastError: unknown = null;

  for (const candidateId of candidates) {
    try {
      // 优先使用 Rust 命令读取，避免前端 fs 插件权限/路径配置差异导致失败
      try {
        const content = await invoke<string>('load_project_file', { projectId: candidateId });
        return JSON.parse(content) as T;
      } catch (rustError) {
        lastError = rustError;
        logger.warn(`通过 Rust 加载项目失败(${candidateId})，尝试使用 JS API 兜底:`, rustError);
      }

      const projectPath = `ClipFlow/${candidateId}.json`;
      const existsFile = await exists(projectPath, { baseDir: BaseDirectory.AppData });
      if (!existsFile) {
        lastError = new Error(`项目文件不存在: ${candidateId}.json`);
        continue;
      }

      const content = await readTextFile(projectPath, { baseDir: BaseDirectory.AppData });
      return JSON.parse(content) as T;
    } catch (error) {
      lastError = error;
    }
  }

  // 兼容历史版本：尝试从旧配置目录加载（曾作为备份路径写入）
  try {
    const configDir = await getConfigDir();
    for (const candidateId of candidates) {
      const legacyPaths = [
        `${configDir}${candidateId}.json`,
        `${configDir}ClipFlow/${candidateId}.json`,
      ];

      for (const legacyPath of legacyPaths) {
        try {
          const found = await exists(legacyPath);
          if (!found) continue;
          const content = await readTextFile(legacyPath);
          return JSON.parse(content) as T;
        } catch (legacyError) {
          lastError = legacyError;
        }
      }
    }
  } catch (legacyRootError) {
    lastError = legacyRootError;
  }

  logger.error('读取项目文件失败:', lastError);
  throw (lastError || new Error(`读取项目失败: ${projectId}`));
};

/**
 * 带轻量重试的项目读取，缓解插件初始化/瞬时 IO 波动导致的偶发失败。
 */
export const loadProjectWithRetry = async <T = ProjectFileData>(
  projectId: string,
  options?: { retries?: number; retryDelayMs?: number }
): Promise<T> => {
  const retries = Math.max(0, options?.retries ?? 2);
  const retryDelayMs = Math.max(100, options?.retryDelayMs ?? 220);

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loadProjectFromFile<T>(projectId);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    }
  }

  throw (lastError || new Error(`读取项目失败: ${projectId}`));
};

// 导出脚本到文本文件
export const exportScriptToFile = async (script: ExportScriptData, filename: string): Promise<void> => {
  try {
    const savePath = await save({
      defaultPath: filename,
      filters: [{
        name: '文本文件',
        extensions: ['txt']
      }]
    });
    
    if (!savePath) return;
    
    let content = '';
    
    // 构建脚本内容
    content += `项目: ${script.projectName}\n`;
    content += `创建时间: ${new Date(script.createdAt).toLocaleString()}\n\n`;
    
    // 添加脚本内容
    script.segments.forEach((segment) => {
      content += `[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]\n`;
      content += `${segment.content}\n\n`;
    });
    
    await writeTextFile(savePath, content);
  } catch (error) {
    logger.error('导出脚本失败:', error);
    throw error;
  }
};

// 格式化时间
const formatTime = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

/**
 * 获取应用配置目录
 */
export const getConfigDir = async (): Promise<string> => {
  try {
    const configDir = await appConfigDir();
    // 确保目录存在
    const configExists = await exists(configDir);
    if (!configExists) {
      await mkdir(configDir, { recursive: true });
    }
    return configDir;
  } catch (error) {
    logger.error('获取配置目录失败:', error);
    return '';
  }
};

/**
 * 获取API密钥
 * @param service 服务名称，如'openai'
 */
export const getApiKey = async (service: string): Promise<string> => {
  try {
    const configDir = await getConfigDir();
    if (!configDir) return '';
    
    const configPath = `${configDir}api_keys.json`;
    const configExists = await exists(configPath);
    
    if (!configExists) {
      await writeTextFile(configPath, JSON.stringify({}));
      return '';
    }
    
    const configContent = await readTextFile(configPath);
    const config = JSON.parse(configContent) as Record<string, string>;
    
    return config[service] || '';
  } catch (error) {
    logger.error(`获取${service}的API密钥失败:`, error);
    return '';
  }
};

/**
 * 保存API密钥
 * @param service 服务名称，如'openai'
 * @param apiKey 密钥
 */
export const saveApiKey = async (service: string, apiKey: string): Promise<boolean> => {
  try {
    const configDir = await getConfigDir();
    if (!configDir) return false;
    
    const configPath = `${configDir}api_keys.json`;
    const configExists = await exists(configPath);
    
    let config: Record<string, string> = {};
    if (configExists) {
      const configContent = await readTextFile(configPath);
      config = JSON.parse(configContent) as Record<string, string>;
    }
    
    config[service] = apiKey;
    
    await writeTextFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    logger.error(`保存${service}的API密钥失败:`, error);
    return false;
  }
};

/**
 * 选择文件
 * @param filters 文件过滤器
 */
export const selectFile = async (filters?: { name: string, extensions: string[] }[]): Promise<string | null> => {
  try {
    const selected = await open({
      multiple: false,
      filters: filters || [
        { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv'] }
      ]
    });
    
    if (selected === null) {
      return null;
    }
    
    // Tauri的open函数在选择单个文件时可能返回字符串或数组
    return Array.isArray(selected) ? selected[0] : selected;
  } catch (error) {
    logger.error('选择文件失败:', error);
    return null;
  }
};

/**
 * 保存文件
 * @param defaultPath 默认保存路径
 * @param filters 文件过滤器
 */
export const saveFile = async (
  content: string,
  defaultPath?: string,
  filters?: { name: string, extensions: string[] }[]
): Promise<boolean> => {
  try {
    const savePath = await save({
      defaultPath,
      filters: filters || [
        { name: '文本文件', extensions: ['txt'] }
      ]
    });
    
    if (savePath === null) {
      return false;
    }
    
    await writeTextFile(savePath, content);
    return true;
  } catch (error) {
    logger.error('保存文件失败:', error);
    return false;
  }
};

/**
 * 获取应用数据
 * @param key 数据键名
 */
export const getAppData = async <T>(key: string): Promise<T | null> => {
  try {
    const configDir = await getConfigDir();
    if (!configDir) return null;
    
    const dataPath = `${configDir}${key}.json`;
    const dataExists = await exists(dataPath);
    
    if (!dataExists) {
      return null;
    }
    
    const dataContent = await readTextFile(dataPath);
    return JSON.parse(dataContent) as T;
  } catch (error) {
    logger.error(`获取应用数据(${key})失败:`, error);
    return null;
  }
};

/**
 * 保存应用数据
 * @param key 数据键名
 * @param data 要保存的数据
 */
export const saveAppData = async <T>(key: string, data: T): Promise<boolean> => {
  try {
    const configDir = await getConfigDir();
    if (!configDir) return false;
    
    const dataPath = `${configDir}${key}.json`;
    await writeTextFile(dataPath, JSON.stringify(data, null, 2));
    
    return true;
  } catch (error) {
    logger.error(`保存应用数据(${key})失败:`, error);
    return false;
  }
};

/**
 * 打开外部URL
 * @param url 要打开的URL
 * @returns 是否成功打开
 */
export const openExternalUrl = async (url: string): Promise<boolean> => {
  try {
    // 确保URL有效
    let validUrl = url.trim();
    
    // 添加https前缀如果缺少协议
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    
    logger.info(`正在打开外部链接: ${validUrl}`);
    await openExternal(validUrl);
    return true;
  } catch (error) {
    logger.error('打开外部链接失败:', error);
    
    // 降级处理：尝试使用window.open
    try {
      let validUrl = url.trim();
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
      
      window.open(validUrl, '_blank', 'noopener,noreferrer');
      logger.info('通过window.open打开链接');
      return true;
    } catch (windowError) {
      logger.error('无法打开链接:', windowError);
      return false;
    }
  }
};

// 列出所有项目
export const listProjects = async <T = ProjectFileData>(): Promise<T[]> => {
  try {
    // 尝试使用 Rust 函数列出项目
    try {
      const projects = await invoke<unknown[]>('list_project_files');
      const normalized = (Array.isArray(projects) ? projects : [])
        .map(normalizeListedProject)
        .filter((item): item is ProjectFileData => item !== null);
      if (normalized.length > 0) {
        logger.info('通过 Rust 函数获取项目列表成功:', normalized.length);
        return normalized as T[];
      }
      logger.warn('Rust 项目列表为空或数据异常，切换到文件扫描兜底');
    } catch (rustError) {
      logger.warn('通过 Rust 获取项目列表失败，使用 JS API 替代:', rustError);
    }
    
    // 确保应用数据目录存在
    await ensureAppDataDir();
    
    // 通过 Tauri API 获取所有 .json 文件
    const appDir = 'ClipFlow';
    
    // 这里需要实现列出目录文件的逻辑，但 @tauri-apps/api/fs 没有直接的 readDir 函数
    // 使用 invoke 调用 Rust 端的自定义函数
    const files = await invoke('list_app_data_files', { directory: appDir });
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }
    
    // 加载每个项目文件
    const projectsPromises = (files as string[])
      .filter(file => file.endsWith('.json'))
      .map(async (file) => {
        try {
          const projectId = file.replace('.json', '');
          return await loadProjectFromFile(projectId);
        } catch (error) {
          logger.error(`加载项目 ${file} 失败:`, error);
          return null;
        }
      });
    
    const projects = await Promise.all(projectsPromises);
    const normalized = projects
      .map(normalizeListedProject)
      .filter((project): project is ProjectFileData => project !== null);
    
    return normalized as unknown as T[];
  } catch (error) {
    logger.error('列出项目失败:', error);
    throw error;
  }
};

// 删除项目
export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    const normalizedProjectId = normalizeProjectId(projectId || '');
    if (!normalizedProjectId) return false;
    await invoke('delete_project_file', { projectId: normalizedProjectId });
    emitProjectsChanged();
    logger.info('项目删除成功:', projectId);
    return true;
  } catch (error) {
    logger.error('删除项目出错:', error);
    return false;
  }
};

/**
 * 获取文件字节大小
 */
export const getFileSizeBytes = async (path: string): Promise<number> => {
  if (!path?.trim()) {
    return 0;
  }
  try {
    const bytes = await invoke<number>('get_file_size', { path });
    return Number.isFinite(bytes) ? bytes : 0;
  } catch (error) {
    logger.warn('获取文件大小失败:', path, error);
    return 0;
  }
};

/**
 * 检查FFmpeg是否已安装
 * @returns {Promise<{installed: boolean, version?: string}>} FFmpeg安装状态和版本信息
 */
export async function checkFFmpeg(): Promise<{installed: boolean, version?: string}> {
  try {
    const result = await invoke<{installed: boolean, version?: string}>('check_ffmpeg');
    return result;
  } catch (error) {
    logger.error('检查FFmpeg失败:', error);
    return { installed: false };
  }
} 
