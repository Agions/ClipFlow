import { invoke, TauriCommand } from '../invoke';

export interface NarrationSegment {
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface NarrationScriptOutput {
  script: string;
  estimatedDurationSecs: number;
  segments: NarrationSegment[];
}

export const aiScript = {
  /** 生成解说脚本 */
  async generateNarrationScript(input: {
    subtitles: string;
    durationSecs?: number;
    targetDurationSecs?: number;
    style?: string;
    apiKey?: string;
    provider?: string;
    model?: string;
    baseUrl?: string;
  }): Promise<NarrationScriptOutput> {
    return invoke(TauriCommand.GENERATE_NARRATION_SCRIPT, input);
  },

  /** 分析视频内容 */
  async analyzeVideoForNarration(input: { videoPath: string; duration?: number; analysisType?: string }): Promise<{ videoType: string; summary: string; keyScenes: number[] }> {
    return invoke(TauriCommand.ANALYZE_VIDEO_FOR_NARRATION, input);
  },

  /** 列出可用的 AI 模型 */
  async listAvailableModels(): Promise<Array<{ id: string; name: string; provider: string; contextLimit: number }>> {
    return invoke(TauriCommand.LIST_AVAILABLE_MODELS, {});
  },
};
