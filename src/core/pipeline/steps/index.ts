/**
 * Pipeline Steps — 统一导出
 *
 * Clip 模式 (4 step):
 *   import { buildCandidatesStep, scoreClipsStep, generateSEOStep, prepareExportStep } from '@/core/pipeline/steps';
 *
 * v3 解说模式步骤在 `src/pipeline/steps/` 目录下（Stage 12 重构后）
 */

export { buildCandidatesStep } from './build-candidates-step';
export { scoreClipsStep } from './score-clips-step';
export { generateSEOStep } from './generate-seo-step';
export { prepareExportStep } from './prepare-export-step';

// Re-export input/output types for convenience
export type {
  BuildCandidatesInput,
  BuildCandidatesOutput,
} from './build-candidates-step';

export type {
  ScoreClipsInput,
  ScoreClipsOutput,
} from './score-clips-step';

export type {
  GenerateSEOInput,
  GenerateSEOOutput,
} from './generate-seo-step';

export type {
  PrepareExportInput,
  PrepareExportOutput,
} from './prepare-export-step';
