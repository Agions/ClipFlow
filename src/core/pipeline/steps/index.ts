/**
 * Pipeline Steps — 统一导出
 *
 * 使用方式：
 *   import { buildCandidatesStep, scoreClipsStep, generateSEOStep, prepareExportStep } from '@/core/pipeline/steps';
 */

export { buildCandidatesStep } from './BuildCandidatesStep';
export { scoreClipsStep } from './ScoreClipsStep';
export { generateSEOStep } from './GenerateSEOStep';
export { prepareExportStep } from './PrepareExportStep';

// Re-export input/output types for convenience
export type {
  BuildCandidatesInput,
  BuildCandidatesOutput,
} from './BuildCandidatesStep';

export type {
  ScoreClipsInput,
  ScoreClipsOutput,
} from './ScoreClipsStep';

export type {
  GenerateSEOInput,
  GenerateSEOOutput,
} from './GenerateSEOStep';

export type {
  PrepareExportInput,
  PrepareExportOutput,
} from './PrepareExportStep';
