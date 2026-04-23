import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  FlaskConical,
  Zap,
  Clock,
  Video,
} from 'lucide-react';
import type { AIClipConfig } from '@/core/services/aiClip.service';
import type { VideoInfo } from '@/core/types';
import styles from '../index.module.less';

interface ConfigStepProps {
  videoInfo: VideoInfo;
  config: AIClipConfig;
  analyzing: boolean;
  onConfigChange: (updates: Partial<AIClipConfig>) => void;
  onAnalyze: () => void;
  onSmartClip: () => void;
}

const ConfigStep: React.FC<ConfigStepProps> = ({
  videoInfo,
  config,
  analyzing,
  onConfigChange,
  onAnalyze,
  onSmartClip
}) => {
  return (
    <Card className={styles.configCard + ' p-6'}>
      <h3 className="text-lg font-semibold mb-4">剪辑检测配置</h3>
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className={styles.configItem}>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.detectSceneChange}
              onCheckedChange={(v) => onConfigChange({ detectSceneChange: v })}
            />
            <span className="text-sm font-medium">场景切换检测</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            自动识别视频中的场景变化
          </p>
        </div>
        <div className={styles.configItem}>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.detectSilence}
              onCheckedChange={(v) => onConfigChange({ detectSilence: v })}
            />
            <span className="text-sm font-medium">静音检测</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            识别并标记静音片段
          </p>
        </div>
        <div className={styles.configItem}>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.detectKeyframes}
              onCheckedChange={(v) => onConfigChange({ detectKeyframes: v })}
            />
            <span className="text-sm font-medium">关键帧检测</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            提取重要的视觉关键帧
          </p>
        </div>
      </div>

      <div className="border-t border-border my-4" />

      <h3 className="text-lg font-semibold mb-4">剪辑优化配置</h3>
      <div className="grid grid-cols-2 gap-6 mb-4">
        <div className={styles.configItem}>
          <span className="text-sm font-medium block mb-2">剪辑风格</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded border ${config.pacingStyle === 'fast' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}
              onClick={() => onConfigChange({ pacingStyle: 'fast' })}
            >
              <Zap size={14} /> 快速
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded border ${config.pacingStyle === 'normal' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}
              onClick={() => onConfigChange({ pacingStyle: 'normal' })}
            >
              <Clock size={14} /> 标准
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded border ${config.pacingStyle === 'slow' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}
              onClick={() => onConfigChange({ pacingStyle: 'slow' })}
            >
              <Video size={14} /> 舒缓
            </button>
          </div>
        </div>
        <div className={styles.configItem}>
          <span className="text-sm font-medium block mb-2">转场效果</span>
          <Select
            value={config.transitionType}
            onValueChange={(v) => onConfigChange({ transitionType: v as AIClipConfig['transitionType'] })}
          >
            <SelectTrigger className="w-full">
              {config.transitionType === 'fade' ? '淡入淡出' :
               config.transitionType === 'cut' ? '直接切换' :
               config.transitionType === 'dissolve' ? '溶解' : '滑动'}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">淡入淡出</SelectItem>
              <SelectItem value="cut">直接切换</SelectItem>
              <SelectItem value="dissolve">溶解</SelectItem>
              <SelectItem value="slide">滑动</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className={styles.configItem}>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.removeSilence}
              onCheckedChange={(v) => onConfigChange({ removeSilence: v })}
            />
            <span className="text-sm font-medium">自动移除静音</span>
          </div>
        </div>
        <div className={styles.configItem}>
          <div className="flex items-center gap-3">
            <Switch
              checked={config.autoTransition}
              onCheckedChange={(v) => onConfigChange({ autoTransition: v })}
            />
            <span className="text-sm font-medium">自动添加转场</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border my-4" />

      <h3 className="text-lg font-semibold mb-4">目标时长（可选）</h3>
      <div className={styles.configItem}>
        <Slider
          min={10}
          max={Math.min(300, videoInfo.duration)}
          value={config.targetDuration || videoInfo.duration}
          onValueChange={(v) => onConfigChange({ targetDuration: typeof v === 'number' ? v : v[0] })}
          step={5}
          className="mb-2"
        />
        <p className="text-xs text-muted-foreground">
          当前视频时长: {Math.round(videoInfo.duration)}秒
          {config.targetDuration && ` → 目标: ${config.targetDuration}秒`}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
          onClick={onAnalyze}
          disabled={analyzing}
        >
          <Bot size={16} className="mr-1" />
          {analyzing ? '分析中...' : '开始分析'}
        </Button>
        <Button
          variant="outline"
          onClick={onSmartClip}
          disabled={analyzing}
        >
          <FlaskConical size={16} className="mr-1" />
          一键智能剪辑
        </Button>
      </div>
    </Card>
  );
};

export default ConfigStep;
