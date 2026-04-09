import {
  ensureAppDataDir,
  saveProjectToFile as saveProjectToFileFromTauri,
  loadProjectFromFile as loadProjectFromFileFromTauri,
  listProjects as listProjectsFromTauri,
  deleteProject as deleteProjectFromTauri,
  exportScriptToFile as exportScriptToFileFromTauri,
} from '@/services/tauri';

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

export { ensureAppDataDir };

export const saveProjectToFile = async (projectId: string, project: object): Promise<void> => {
  await saveProjectToFileFromTauri(projectId, project);
};

export const loadProjectFromFile = async <T = ProjectFileData>(projectId: string): Promise<T> => {
  return loadProjectFromFileFromTauri<T>(projectId);
};

export const listProjects = async <T = ProjectFileData>(): Promise<T[]> => {
  const results = await listProjectsFromTauri();
  return results as T[];
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
  return deleteProjectFromTauri(projectId);
};

export const exportScriptToFile = async (
  script: ExportScriptData,
  filename: string
): Promise<void> => {
  await exportScriptToFileFromTauri(script, filename);
};
