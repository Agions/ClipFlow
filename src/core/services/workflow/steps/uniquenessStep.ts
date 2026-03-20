import { uniquenessService } from '../../uniqueness.service';
import type { ScriptData } from '@/core/types';
import type { ContentFingerprint, UniquenessCheckResult } from '../../uniqueness.service';

export interface UniquenessConfig {
  enabled: boolean;
  autoRewrite: boolean;
  similarityThreshold: number;
  addRandomness: boolean;
}

export interface UniquenessResult {
  script: ScriptData;
  isUnique: boolean;
  attempts: number;
  report: {
    fingerprint: ContentFingerprint;
    check: UniquenessCheckResult;
    history: {
      totalScripts: number;
      recentScripts: number;
    };
  };
}

export async function executeUniquenessStep(
  scriptToCheck: ScriptData,
  rewriteFn: (script: ScriptData) => Promise<ScriptData>,
  uniquenessConfig?: UniquenessConfig,
  updateProgress?: (progress: number) => void
): Promise<UniquenessResult> {
  // 配置唯一性服务
  const config = {
    enforceUniqueness: true,
    similarityThreshold: 0.3,
    checkHistory: true,
    autoRewrite: true,
    maxRewriteAttempts: 3,
    addRandomness: true,
    ...uniquenessConfig,
  };

  uniquenessService.updateConfig(config);

  // 添加随机性
  const scriptWithRandomness = uniquenessService.addRandomness(scriptToCheck);
  updateProgress?.(56);

  // 确保唯一性
  const result = await uniquenessService.ensureUniqueness(
    scriptWithRandomness,
    rewriteFn
  );

  updateProgress?.(58);

  // 生成唯一性报告
  const uniquenessReport = uniquenessService.generateUniquenessReport(result.script);

  return {
    script: result.script,
    isUnique: result.isUnique,
    attempts: result.attempts,
    report: uniquenessReport,
  };
}
