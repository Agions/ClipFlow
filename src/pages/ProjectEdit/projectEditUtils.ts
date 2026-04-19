/**
 * ProjectEdit 纯工具函数
 */
import type { VideoMetadata } from '@/services/video';
import type { ScriptSegment } from '@/core/types';
import type { ProjectFileLike } from '@/core/utils/project-file';
import { normalizeProjectFile } from '@/core/utils/project-file';
import { logger } from '@/utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ProjectData extends ProjectFileLike<unknown, { path?: string }> {
  id: string;
  name: string;
  description: string;
  videoPath: string;
  createdAt: string;
  updatedAt: string;
  metadata?: VideoMetadata;
  keyFrames?: string[];
  script?: ScriptSegment[];
}

export type ProjectSaveBehavior = 'stay' | 'detail';

export const PROJECT_SAVE_BEHAVIOR_KEY = 'cutdeck-project-save-behavior';
export const PROJECT_AUTO_SAVE_KEY = 'cutdeck-project-auto-save-enabled';

// ─────────────────────────────────────────────────────────────────────────────
// Project data normalization
// ─────────────────────────────────────────────────────────────────────────────
export const normalizeProjectData = (project: ProjectData): ProjectData => {
  const normalized = normalizeProjectFile(project);
  return {
    ...project,
    ...normalized,
    description: project.description || '',
    videoPath: project.videoPath || normalized.videoUrl || '',
    createdAt: project.createdAt || new Date().toISOString(),
  };
};

export const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

export const createDefaultProjectName = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `未命名项目-${ts}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Draft fingerprinting (for auto-save deduplication)
// ─────────────────────────────────────────────────────────────────────────────
export const buildDraftFingerprint = (payload: {
  id?: string;
  name?: string;
  description?: string;
  videoPath?: string;
  keyFrameCount?: number;
  scriptCount?: number;
  hasMetadata?: boolean;
}) =>
  JSON.stringify({
    id: payload.id || '',
    name: normalizeText(payload.name) || '',
    description: normalizeText(payload.description),
    videoPath: payload.videoPath || '',
    keyFrameCount: payload.keyFrameCount || 0,
    scriptCount: payload.scriptCount || 0,
    hasMetadata: Boolean(payload.hasMetadata),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Script parsing
// ─────────────────────────────────────────────────────────────────────────────
export const parseTimeString = (timeString: string): number => {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

export const parseScriptText = (text: string): ScriptSegment[] => {
  try {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const result: ScriptSegment[] = [];
    let current: ScriptSegment | null = null;

    for (const line of lines) {
      const match = line.match(/\[(\d{1,2}:\d{2}(?::\d{2})?) - (\d{1,2}:\d{2}(?::\d{2})?)\]/);
      if (match) {
        current = {
          id: `segment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          startTime: parseTimeString(match[1]),
          endTime: parseTimeString(match[2]),
          type: 'narration',
        };
        result.push(current);
      }
    }
    return result;
  } catch (e) {
    logger.error('解析脚本失败:', { error: e });
    return [];
  }
};
