/**
 * PrepareExportStep — 准备多格式导出任务
 *
 * 输入：ClipScore[]（评分后片段）+ 导出配置
 * 输出：Map<clipStartTime, ExportTask[]>
 *
 * 调用 Rust get_export_dir 获取输出目录，
 * 为每个片段准备多格式导出任务（9:16 / 1:1 / 16:9）
 */

import { createStep, type Step, type PipelineContext, type StepOptions, reportProgress } from '../Step';
import type { ClipScore } from '@/core/services/clipRepurposing/clipScorer';
import type { AspectRatio } from '@/core/services/clipRepurposing/multiFormatExport';
import type { ExportTask } from '@/core/services/clipRepurposing/multiFormatExport';
import { multiFormatExporter } from '@/core/services/clipRepurposing/multiFormatExport';
import { tauri } from '@/core/tauri/TauriBridge';
import type { VideoInfo } from '@/core/types';
import { logger } from '@/utils/logger';

// ============================================================
// Metadata
// ============================================================

const STEP_META = {
  name: 'prepare-export',
  description: '准备多格式导出任务',
  estimatedDuration: 2,
};

// ============================================================
// Input / Output
// ============================================================

export interface PrepareExportInput {
  videoInfo: VideoInfo;
  clips: ClipScore[];
  formats: AspectRatio[];
  outputDir?: string;
  quality?: 'low' | 'medium' | 'high';
}

export type PrepareExportOutput = Map<string, ExportTask[]>;

// ============================================================
// Step Implementation
// ============================================================

export const prepareExportStep: Step<PrepareExportInput, PrepareExportOutput> =
  createStep(STEP_META, async (input, _ctx, options) => {
    const { videoInfo, clips, formats, outputDir, quality = 'high' } = input;
    const result = new Map<string, ExportTask[]>();

    reportProgress(options?.onProgress, STEP_META.name, 0.2, '获取导出目录...');

    // 获取导出目录（优先用户指定，否则调用 Rust）
    const exportDir = outputDir
      ?? (await tauri.getExportDir() as string ?? '/tmp/CutDeck');

    logger.debug(`[PrepareExportStep] 导出目录: ${exportDir}`);

    reportProgress(options?.onProgress, STEP_META.name, 0.4, `准备 ${clips.length} 个片段的导出任务...`);

    for (const scored of clips) {
      const clip = scored.clip;
      const tasks = multiFormatExporter.prepareExportTasks({
        clipId: `clip_${clip.startTime}_${clip.endTime}`,
        sourceVideoPath: videoInfo.path ?? videoInfo.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        formats,
        outputDir: exportDir,
        quality,
      });
      result.set(clip.startTime.toString(), tasks);
    }

    reportProgress(options?.onProgress, STEP_META.name, 0.9, `导出任务准备完成`);
    logger.info(`[PrepareExportStep] 完成，${clips.length} 个片段 × ${formats.length} 种格式`);

    return result;
  });
