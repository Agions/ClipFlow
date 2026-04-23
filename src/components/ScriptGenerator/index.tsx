import { logger } from '@/utils/logger';
/**
 * 脚本生成器组件
 * 专业的 AI 脚本生成界面
 */

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  Zap,
  Clock,
  FileText,
  User,
  Globe,
  CheckCircle,
  Loader,
  Settings,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from '@/components/common/motion-shim';
import { useModel, useModelCost } from '@/hooks/useModel';
import { useProject } from '@/hooks/useProject';
import ModelSelector from '@/components/ModelSelector';
import { notify } from '@/shared';
import type { ScriptData, ScriptSegment } from '@/core/types';
import styles from './index.module.less';

const LENGTH_OPTIONS = [
  { value: 'short', label: '简短', desc: '1-3分钟', words: '300-500字' },
  { value: 'medium', label: '适中', desc: '3-5分钟', words: '500-800字' },
  { value: 'long', label: '详细', desc: '5-10分钟', words: '800-1500字' }
];

const AUDIENCE_OPTIONS = [
  { value: 'general', label: '普通大众' },
  { value: 'professional', label: '专业人士' },
  { value: 'student', label: '学生群体' },
  { value: 'business', label: '商务人士' },
  { value: 'tech', label: '技术爱好者' },
  { value: 'elderly', label: '中老年群体' }
];

const TONE_OPTIONS = [
  { value: 'friendly', label: '友好亲切' },
  { value: 'authoritative', label: '权威专业' },
  { value: 'enthusiastic', label: '热情激昂' },
  { value: 'calm', label: '平静沉稳' },
  { value: 'humorous', label: '幽默诙谐' }
];

const STYLE_OPTIONS = [
  { value: 'professional', label: '专业正式', desc: '适合商业、教育类视频' },
  { value: 'casual', label: '轻松随意', desc: '适合生活、娱乐类视频' },
  { value: 'humorous', label: '幽默风趣', desc: '适合搞笑、娱乐类视频' },
  { value: 'emotional', label: '情感共鸣', desc: '适合故事、情感类视频' },
  { value: 'technical', label: '技术讲解', desc: '适合教程、科普类视频' },
  { value: 'promotional', label: '营销推广', desc: '适合产品、广告类视频' }
];

interface ScriptGeneratorProps {
  projectId?: string;
  videoDuration?: number;
  onGenerate?: (script: ScriptData) => void;
  onSave?: (script: ScriptData) => void;
}

interface ScriptFormValues {
  topic: string;
  keywords?: string[];
  style: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  audience: string;
  requirements?: string;
}

export const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  projectId,
  videoDuration,
  onGenerate,
  onSave
}) => {
  const { updateScript } = useProject(projectId);
  const { selectedModel, isConfigured } = useModel();
  const { estimateScriptCost, formatCost } = useModelCost();

  const [formValues, setFormValues] = useState<ScriptFormValues>({
    topic: '',
    style: 'professional',
    tone: 'friendly',
    length: 'medium',
    audience: 'general',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState<ScriptData | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  const estimatedCost = useCallback(() => {
    const wordCount = LENGTH_OPTIONS.find(l => l.value === formValues.length)?.words || '500-800字';
    const avgWords = parseInt(wordCount.split('-')[0]) + 200;
    return formatCost(estimateScriptCost(avgWords));
  }, [formValues.length, estimateScriptCost, formatCost]);

  const handleGenerate = useCallback(async () => {
    if (!selectedModel) {
      notify.warning('请先选择 AI 模型');
      setShowModelSelector(true);
      return;
    }

    if (!isConfigured) {
      notify.warning('请先配置 API 密钥');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const { aiService } = await import('@/core/services');

      const modelSettings = selectedModel || {
        id: 'gpt-4o',
        name: 'GPT-4o',
        type: 'openai' as const,
        enabled: true,
      };

      setProgress(10);

      const result = await aiService.generateScript(
        modelSettings,
        {},
        {
          topic: formValues.topic || '通用主题',
          style: formValues.style || 'professional',
          tone: formValues.tone || 'friendly',
          length: formValues.length || 'medium',
          audience: formValues.audience || 'general',
          language: 'zh-CN',
          requirements: formValues.requirements,
        }
      );

      setProgress(70);

      setGeneratedScript({
        id: result.id,
        title: result.title,
        content: result.content,
        segments: result.segments,
        metadata: result.metadata,
      } as ScriptData);

      setProgress(100);
      notify.success('脚本生成成功');

    } catch (error) {
      logger.error('脚本生成失败:', { error });
      notify.error(String(error), '脚本生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedModel, isConfigured, formValues]);

  const handleSave = useCallback(() => {
    if (generatedScript) {
      updateScript(generatedScript);
      onSave?.(generatedScript);
      notify.success('脚本已保存');
    }
  }, [generatedScript, updateScript, onSave]);

  return (
    <div className={styles.container}>
      <div className="flex items-center gap-2 mb-4">
        <Edit size={20} />
        <h4 className="text-lg font-semibold">AI 脚本生成器</h4>
      </div>

      {/* 模型选择 */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">当前模型:</span>
            {selectedModel ? (
              <div className="flex items-center gap-2">
                <span>{selectedModel.name}</span>
                <Badge variant={isConfigured ? 'default' : 'secondary'}>
                  {isConfigured ? '已配置' : '未配置'}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">未选择</span>
            )}
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
          >
            <Settings size={14} className="mr-1" />
            {showModelSelector ? '收起' : '更改'}
          </Button>
        </div>

        <AnimatePresence>
          {showModelSelector && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <Separator className="my-3" />
              <ModelSelector
                taskType="script"
                compact
                onSelect={() => setShowModelSelector(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 生成表单 */}
      <Card title="脚本设置" className="mb-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">脚本主题</label>
              <Input
                placeholder="例如：如何制作一杯完美的拿铁咖啡"
                value={formValues.topic}
                onChange={(e) => setFormValues(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">目标受众</label>
              <Select value={formValues.audience} onValueChange={(v: string | null) => setFormValues(prev => ({ ...prev, audience: (v ?? prev.audience) as string }))}>
                <SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">脚本风格</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map(opt => (
                <TooltipProvider key={opt.value}>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                          formValues.style === opt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => setFormValues(prev => ({ ...prev, style: opt.value }))}
                      >
                        {opt.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>{opt.desc}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">语气语调</label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    formValues.tone === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setFormValues(prev => ({ ...prev, tone: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">脚本长度</label>
            <div className="flex flex-wrap gap-2">
              {LENGTH_OPTIONS.map(opt => (
                <TooltipProvider key={opt.value}>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                          formValues.length === opt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => setFormValues(prev => ({ ...prev, length: opt.value as ScriptFormValues['length'] }))}
                      >
                        {opt.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>{opt.desc}，约{opt.words}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">特殊要求（可选）</label>
            <Input
              placeholder="例如：需要包含产品介绍、使用步骤、注意事项等"
              value={formValues.requirements || ''}
              onChange={(e) => setFormValues(prev => ({ ...prev, requirements: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {/* 生成按钮 */}
      <div className="flex flex-col gap-3 mb-4">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!selectedModel || !isConfigured || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <><Loader size={16} className="animate-spin mr-1" />生成中...</>
          ) : (
            <><Zap size={16} className="mr-1" />生成脚本</>
          )}
        </Button>

        {isGenerating && <Progress value={progress} />}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard size={14} />
          <span>预估成本: {estimatedCost()}</span>
        </div>
      </div>

      {/* 生成结果 */}
      <AnimatePresence>
        {generatedScript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card
              className={styles.resultCard}
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-green-500" />
                <span className="font-medium">生成结果</span>
              </div>
              <div className={styles.scriptContent}>
                <h5 className="text-lg font-semibold mb-2">{generatedScript.title}</h5>
                <p className="text-muted-foreground">{generatedScript.content}</p>
              </div>

              <Separator className="my-4" />

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <FileText size={12} className="mr-1" />
                  {generatedScript.metadata?.wordCount ?? 0} 字
                </Badge>
                <Badge variant="outline">
                  <Clock size={12} className="mr-1" />
                  约 {generatedScript.metadata?.estimatedDuration ?? 0} 分钟
                </Badge>
                <Badge variant="outline">
                  <User size={12} className="mr-1" />
                  {AUDIENCE_OPTIONS.find(a => a.value === generatedScript.metadata?.targetAudience)?.label}
                </Badge>
                <Badge variant="outline">
                  <Globe size={12} className="mr-1" />
                  中文
                </Badge>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScriptGenerator;
