/**
 * Pipeline 断点存储服务
 * 支持 localStorage 持久化（开发/浏览器端）
 * + Tauri FS 持久化（生产环境）
 */

import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';

export type PipelineStep = 'analyze' | 'segment' | 'subtitle' | 'export';

export interface PipelineCheckpoint {
  videoId: string;
  completedSteps: PipelineStep[];
  currentStep: PipelineStep;
  partialResults: Record<string, unknown>;
  failedReason?: string;
  timestamp: number;
}

const CHECKPOINT_PREFIX = 'cutdeck_checkpoint_';

/** 初始化 Tauri checkpoint 存储目录 */
async function ensureCheckpointDir(): Promise<string> {
  const appDir = await appDataDir();
  const checkpointDir = `${appDir}checkpoints`;
  const dirExists = await exists(checkpointDir, { baseDir: BaseDirectory.AppData }).catch(() => false);
  if (!dirExists) {
    await mkdir(checkpointDir, { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => null);
  }
  return checkpointDir;
}

export function createCheckpoint(
  videoId: string,
  currentStep: PipelineStep,
  partialResults: PipelineCheckpoint['partialResults'] = {}
): PipelineCheckpoint {
  return {
    videoId,
    completedSteps: [],
    currentStep,
    partialResults,
    timestamp: Date.now(),
  };
}

export function saveCheckpoint(cp: PipelineCheckpoint): void {
  localStorage.setItem(
    `${CHECKPOINT_PREFIX}${cp.videoId}`,
    JSON.stringify(cp)
  );
}

export function loadCheckpoint(videoId: string): PipelineCheckpoint | null {
  const raw = localStorage.getItem(`${CHECKPOINT_PREFIX}${videoId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PipelineCheckpoint;
  } catch {
    return null;
  }
}

export function clearCheckpoint(videoId: string): void {
  localStorage.removeItem(`${CHECKPOINT_PREFIX}${videoId}`);
}

/** Tauri FS 异步存储 checkpoint（生产环境） */
export async function saveCheckpointTauri(cp: PipelineCheckpoint): Promise<void> {
  try {
    const dir = await ensureCheckpointDir();
    const path = `${dir}${CHECKPOINT_PREFIX}${cp.videoId}.json`;
    await writeTextFile(path, JSON.stringify(cp), { baseDir: BaseDirectory.AppData });
  } catch (err) {
    console.warn('[checkpoint] Tauri save failed, fallback to localStorage:', err);
    saveCheckpoint(cp);
  }
}

/** Tauri FS 异步加载 checkpoint（生产环境） */
export async function loadCheckpointTauri(videoId: string): Promise<PipelineCheckpoint | null> {
  try {
    const dir = await ensureCheckpointDir();
    const path = `${dir}${CHECKPOINT_PREFIX}${videoId}.json`;
    const fileExists = await exists(path, { baseDir: BaseDirectory.AppData }).catch(() => false);
    if (!fileExists) return null;
    const raw = await readTextFile(path, { baseDir: BaseDirectory.AppData });
    return JSON.parse(raw) as PipelineCheckpoint;
  } catch (err) {
    console.warn('[checkpoint] Tauri load failed, fallback to localStorage:', err);
    return loadCheckpoint(videoId);
  }
}

/** Tauri FS 异步删除 checkpoint */
export async function clearCheckpointTauri(videoId: string): Promise<void> {
  try {
    const dir = await ensureCheckpointDir();
    const path = `${dir}${CHECKPOINT_PREFIX}${videoId}.json`;
    const fileExists = await exists(path, { baseDir: BaseDirectory.AppData }).catch(() => false);
    if (fileExists) {
      const { remove } = await import('@tauri-apps/plugin-fs');
      await remove(path, { baseDir: BaseDirectory.AppData });
    }
  } catch (err) {
    console.warn('[checkpoint] Tauri clear failed:', err);
  } finally {
    clearCheckpoint(videoId);
  }
}