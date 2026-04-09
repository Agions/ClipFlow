import { scriptTemplateService } from '../../../templates/script.templates';
import { aiService } from '../../ai.service';
import { storageService } from '../../storage.service';
import { orchestrateCommentaryAgents } from '../agents';
import type {
  VideoInfo,
  VideoAnalysis,
  ScriptTemplate,
  ScriptData,
  AIModel,
} from '@/core/types';
import type { WorkflowMode } from '@/core/workflow/featureBlueprint';

export interface ScriptGenerateConfig {
  style: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  targetAudience: string;
  language: string;
}

export interface ScriptGenerateResult {
  script: ScriptData;
}

interface TemplateSection {
  id: string;
  name: string;
  type: string;
  duration: number;
  targetWordCount: number;
  content: string;
  tips?: string[];
}

export async function executeScriptGenerateStep(
  videoInfo: VideoInfo,
  videoAnalysis: VideoAnalysis,
  selectedTemplate: ScriptTemplate,
  model: AIModel,
  params: ScriptGenerateConfig,
  projectId: string,
  mode: WorkflowMode = 'ai-commentary',
  updateProgress: (progress: number) => void = () => {}
): Promise<ScriptGenerateResult> {
  // 阶段1：应用模板 (0-20%)
  updateProgress(5);
  const templateResult = scriptTemplateService.applyTemplate(selectedTemplate.id, {
    topic: videoInfo.name,
    duration: videoInfo.duration,
    keywords: (videoAnalysis.scenes ?? []).flatMap((s) => s.tags),
  });
  updateProgress(20);

  // 阶段2：为每个段落生成内容 (20-80%)
  const segments = await Promise.all(
    templateResult.structure.map(async (section: TemplateSection, index: number) => {
      const prompt = buildSegmentPrompt(section, videoInfo, videoAnalysis, params, mode);
      const content = await aiService.generateText(model, prompt);

      // 进度：20% + (index / total) * 60%
      const segmentProgress = 20 + ((index + 1) / templateResult.structure.length) * 60;
      updateProgress(Math.min(segmentProgress, 80));

      return {
        id: section.id ?? `segment_${index}`,
        startTime: 0,
        endTime: 0,
        content: content.trim(),
        type: getSegmentType(section.type),
        notes: section.tips?.join('\n') ?? '',
      };
    })
  );

  // 阶段3：编排脚本 (80-95%)
  updateProgress(85);
  const orchestrated = orchestrateCommentaryAgents({
    mode,
    analysis: videoAnalysis,
    segments,
  });
  updateProgress(95);

  // 创建脚本数据
  const script: ScriptData = {
    id: `script_${Date.now()}`,
    title: `${videoInfo.name} 解说脚本`,
    content: orchestrated.alignedSegments.map((s) => s.content).join('\n\n'),
    segments: orchestrated.alignedSegments,
    metadata: {
      style: params.style,
      tone: params.tone,
      length: params.length,
      targetAudience: params.targetAudience,
      language: params.language,
      wordCount: segments.reduce((sum, s) => sum + s.content.length, 0),
      estimatedDuration: videoInfo.duration,
      generatedBy: model.id,
      generatedAt: new Date().toISOString(),
      template: selectedTemplate.id,
    } as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 保存脚本 (95-100%)
  updateProgress(98);
  const project = storageService.projects.getById(projectId);
  if (project) {
    project.scripts = project.scripts ?? [];
    project.scripts.push(script);
    storageService.projects.save(project);
  }
  updateProgress(100);

  return { script };
}

function getSegmentType(type: string): ScriptData['segments'][number]['type'] {
  switch (type) {
    case 'hook':
    case 'intro':
    case 'body':
    case 'conclusion':
    case 'cta':
      return 'narration';
    case 'transition':
      return 'transition';
    default:
      return 'narration';
  }
}

function buildSegmentPrompt(
  section: TemplateSection,
  videoInfo: VideoInfo,
  analysis: VideoAnalysis,
  params: ScriptGenerateConfig,
  mode: WorkflowMode = 'ai-commentary'
): string {
  const sceneInfo = (analysis.scenes ?? [])[Math.floor(Math.random() * (analysis.scenes?.length ?? 1))];

  const modeGuidance: Record<WorkflowMode, string> = {
    'ai-commentary': '按专业解说风格写作，重点解释画面信息，避免空洞套话。',
    'ai-first-person': '必须使用第一人称视角叙述（我/我们），并保持主观体验连贯。',
    'ai-mixclip': '按混剪旁白风格写作，多用短句和节奏词，强化转场冲击力。',
    'ai-repurposing': '按重混剪风格写作，突出精彩片段，强调节奏感和冲击力。',
  };

  return `你是一位专业的视频解说文案创作者。请为以下视频段落生成解说词。

【视频信息】
- 视频名称: ${videoInfo.name}
- 视频时长: ${Math.round(videoInfo.duration)}秒
- 分辨率: ${videoInfo.width}x${videoInfo.height}

【当前段落】
- 段落类型: ${section.name}
- 目标时长: ${Math.round(section.duration * videoInfo.duration)}秒
- 目标字数: ${section.targetWordCount}字

【场景信息】
- 场景类型: ${sceneInfo?.type || '未知'}
- 场景描述: ${sceneInfo?.description || '暂无描述'}
- 检测到的元素: ${sceneInfo?.tags?.join(', ') || '无'}

【创作要求】
- 风格: ${params.style}
- 语气: ${params.tone}
- 目标受众: ${params.targetAudience}
- 语言: 中文
- 模式约束: ${modeGuidance[mode]}

【段落说明】
${section.content}

【写作提示】
${section.tips?.map((tip: string) => `- ${tip}`).join('\n')}

请直接输出解说词内容，不要包含任何说明文字。`;
}
