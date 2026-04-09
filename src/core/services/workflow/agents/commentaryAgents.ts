import type { Scene, ScriptSegment, VideoAnalysis } from '@/core/types';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';
import { sceneCommentaryAlignmentService } from '@/core/services/scene-commentary-alignment.service';

export type CommentaryAgentRole =
  | 'director-agent'
  | 'visual-analyst-agent'
  | 'narration-writer-agent'
  | 'timing-aligner-agent'
  | 'overlay-planner-agent';

export interface CommentaryAgentTask {
  id: string;
  role: CommentaryAgentRole;
  goal: string;
  inputs: string[];
  outputs: string[];
}

export interface CommentaryOrchestrationResult {
  tasks: CommentaryAgentTask[];
  alignedSegments: ScriptSegment[];
  overlayPlan: ReturnType<typeof sceneCommentaryAlignmentService.buildOriginalOverlayPlan>;
  alignmentSummary: {
    averageConfidence: number;
    maxDriftSeconds: number;
  };
}

const createAgentTasks = (mode: WorkflowMode): CommentaryAgentTask[] => {
  const modeGoalMap: Record<WorkflowMode, string> = {
    'ai-commentary': '确保专业解说与镜头信息密切对应，优先准确性和信息密度。',
    'ai-first-person': '构建第一人称叙事连贯性，保证主观镜头与口吻一致。',
    'ai-mixclip': '强化混剪节奏，确保高能片段与短旁白节拍同步。',
    'ai-repurposing': '突出精彩片段的冲击感，确保高能片段与短旁白节拍同步。',
  } as Record<WorkflowMode, string>;

  return [
    {
      id: 'task-director',
      role: 'director-agent',
      goal: `制定镜头节奏策略。${modeGoalMap[mode]}`,
      inputs: ['视频时长', '镜头分布', '目标模式'],
      outputs: ['节奏计划', '段落优先级'],
    },
    {
      id: 'task-visual',
      role: 'visual-analyst-agent',
      goal: '解析场景语义与情绪峰值，提供可讲述画面锚点。',
      inputs: ['场景列表', '标签', '情绪信息'],
      outputs: ['场景摘要', '关键镜头锚点'],
    },
    {
      id: 'task-narration',
      role: 'narration-writer-agent',
      goal: '生成分段解说草稿并保持语言风格一致。',
      inputs: ['段落模板', '模式约束', '场景摘要'],
      outputs: ['分段文案', '语气一致性标记'],
    },
    {
      id: 'task-align',
      role: 'timing-aligner-agent',
      goal: '将文案段落时间映射到镜头段落，降低漂移。',
      inputs: ['场景时间轴', '文案段落'],
      outputs: ['对齐后段落', '漂移评估'],
    },
    {
      id: 'task-overlay',
      role: 'overlay-planner-agent',
      goal: '生成自动原画覆盖建议，增强画面与解说一致性。',
      inputs: ['对齐结果', '场景强度'],
      outputs: ['原画覆盖计划'],
    },
  ];
};

const allocateSegmentsToScenes = (
  scenes: Scene[],
  segments: ScriptSegment[],
  mode: WorkflowMode
): ScriptSegment[] => {
  if (!segments.length) return [];
  if (!scenes.length) return segments;

  const sortedScenes = [...scenes]
    .filter((scene) => scene.endTime > scene.startTime)
    .sort((a, b) => a.startTime - b.startTime);
  if (!sortedScenes.length) return segments;

  const sceneCount = sortedScenes.length;
  const segmentCount = segments.length;

  return segments.map((segment, index) => {
    const sceneIndex = Math.min(
      sceneCount - 1,
      Math.floor((index / Math.max(segmentCount - 1, 1)) * (sceneCount - 1))
    );
    const scene = sortedScenes[sceneIndex];
    const baseStart = scene.startTime;
    const baseEnd = scene.endTime;

    if (mode === 'ai-mixclip') {
      const sceneDuration = Math.max(baseEnd - baseStart, 0.4);
      const focusDuration = Math.min(sceneDuration, Math.max(sceneDuration * 0.7, 0.8));
      const center = (baseStart + baseEnd) / 2;
      return {
        ...segment,
        startTime: Math.max(0, center - focusDuration / 2),
        endTime: center + focusDuration / 2,
      };
    }

    return {
      ...segment,
      startTime: baseStart,
      endTime: baseEnd,
    };
  });
};

export function orchestrateCommentaryAgents(input: {
  mode: WorkflowMode;
  analysis: VideoAnalysis;
  segments: ScriptSegment[];
}): CommentaryOrchestrationResult {
  const tasks = createAgentTasks(input.mode);
  const scenes = input.analysis.scenes ?? [];
  const alignedSegments = allocateSegmentsToScenes(scenes, input.segments, input.mode);
  const alignmentItems = sceneCommentaryAlignmentService.align(scenes, alignedSegments);
  const overlayPlan = sceneCommentaryAlignmentService.buildOriginalOverlayPlan(scenes);
  const averageConfidence =
    alignmentItems.reduce((sum, item) => sum + item.confidence, 0) / Math.max(alignmentItems.length, 1);
  const maxDriftSeconds = alignmentItems.reduce((max, item) => Math.max(max, item.driftSeconds), 0);

  return {
    tasks,
    alignedSegments,
    overlayPlan,
    alignmentSummary: {
      averageConfidence: Number(averageConfidence.toFixed(4)),
      maxDriftSeconds: Number(maxDriftSeconds.toFixed(4)),
    },
  };
}

