import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Settings,
  Plus,
  Trash2,
  Play,
  Scissors,
  Volume2,
  VolumeX,
  CheckCircle,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { notify } from '@/shared';
import type { VideoSegment } from '@/core/types';
import { BasicSettings, EffectsSettings, BatchProcessing } from './VideoProcessingController/modules';
import type { QualityValue, FormatValue, TransitionValue, AudioProcessValue } from './VideoProcessingController/constants';
import styles from './VideoProcessingController.module.less';

const QUALITY_OPTIONS = [
  { value: 'low', label: '低质量 (720p)', description: '适合快速预览或网络分享' },
  { value: 'medium', label: '中等质量 (1080p)', description: '平衡文件大小和清晰度' },
  { value: 'high', label: '高质量 (原始分辨率)', description: '保持原始视频质量' },
  { value: 'custom', label: '自定义', description: '设置自定义的编码参数' }
];

const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4', description: '通用兼容性最佳' },
  { value: 'mov', label: 'MOV', description: '适合苹果设备' },
  { value: 'webm', label: 'WebM', description: '网页视频，体积小' },
  { value: 'gif', label: 'GIF', description: '适合短循环动画' }
];

const AUDIO_PROCESS_OPTIONS = [
  { value: 'original', label: '保持原始音频' },
  { value: 'normalize', label: '音量标准化' },
  { value: 'denoise', label: '降噪处理' },
  { value: 'none', label: '无音频 (静音)' }
];

const TRANSITION_OPTIONS = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'slide', label: '滑动效果' },
  { value: 'wipe', label: '擦除效果' },
];

interface VideoProcessingControllerProps {
  videoPath: string;
  segments: Array<{ start: number; end: number; type?: string; content?: string }>;
  onProcessingComplete?: (outputPath: string) => void;
  defaultQuality?: (typeof QUALITY_OPTIONS)[number]['value'];
  defaultFormat?: (typeof FORMAT_OPTIONS)[number]['value'];
  defaultTransition?: (typeof TRANSITION_OPTIONS)[number]['value'];
  defaultAudioProcess?: (typeof AUDIO_PROCESS_OPTIONS)[number]['value'];
}

interface BatchItem {
  id: string;
  segments: Array<{ start: number; end: number; type?: string; content?: string }>;
  name: string;
  completed: boolean;
}

interface CustomQualitySettings {
  resolution: string;
  bitrate: number;
  framerate: number;
  useHardwareAcceleration: boolean;
}

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<{ name: string }>;

const calculateTotalDuration = (segments: Array<{ start: number; end: number }>): number => {
  return segments.reduce((total, segment) => total + (segment.end - segment.start), 0);
};

const VideoProcessingController: React.FC<VideoProcessingControllerProps> = ({
  videoPath,
  segments,
  onProcessingComplete,
  defaultQuality = 'medium',
  defaultFormat = 'mp4',
  defaultAudioProcess = 'original'
}) => {
  const [videoQuality, setVideoQuality] = useState<QualityValue>(defaultQuality as QualityValue);
  const [exportFormat, setExportFormat] = useState<FormatValue>(defaultFormat as FormatValue);
  const [transitionType, setTransitionType] = useState<TransitionValue>('fade');
  const [transitionDuration, setTransitionDuration] = useState(1);
  const [audioProcess, setAudioProcess] = useState<AudioProcessValue>(defaultAudioProcess as AudioProcessValue);
  const [audioVolume, setAudioVolume] = useState(100);
  const [useSubtitles, setUseSubtitles] = useState(true);

  const [processingBatch, setProcessingBatch] = useState(false);
  const [currentBatchItem, setCurrentBatchItem] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

  const [customSettings, setCustomSettings] = useState<CustomQualitySettings>({
    resolution: '1920x1080',
    bitrate: 4000,
    framerate: 30,
    useHardwareAcceleration: true
  });

  useEffect(() => {
    const cleanup = () => {};
    return cleanup;
  }, []);

  const addBatchItem = useCallback(() => {
    if (!segments || segments.length === 0) {
      notify.warning('没有可用的脚本片段');
      return;
    }
    const newBatchItem: BatchItem = {
      id: Date.now().toString(),
      segments: [...segments],
      name: `批处理 ${batchItems.length + 1}`,
      completed: false
    };
    setBatchItems(prev => [...prev, newBatchItem]);
  }, [segments, batchItems.length]);

  const removeBatchItem = useCallback((id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateCustomSettings = useCallback((patch: Partial<CustomQualitySettings>) => {
    setCustomSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const processVideo = useCallback(async (segmentsToProcess: VideoSegment[], itemName?: string): Promise<string> => {
    try {
      const fileName = itemName ?
        `${itemName.replace(/[^\w\s-]/gi, '')}_${new Date().toISOString().split('T')[0]}` :
        `剪辑_${new Date().toISOString().split('T')[0]}`;

      const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
      if (typeof showSaveFilePicker !== 'function') {
        throw new Error('当前环境不支持文件选择器');
      }

      const saveHandle = await showSaveFilePicker({
        suggestedName: `${fileName}.${exportFormat}`,
        types: [{
          description: '视频文件',
          accept: { 'video/*': [`.${exportFormat}`] }
        }]
      });
      const outputPath = saveHandle.name;

      let qualityParams: Record<string, unknown> = {};
      if (videoQuality === 'custom') {
        qualityParams = {
          resolution: customSettings.resolution,
          bitrate: customSettings.bitrate,
          framerate: customSettings.framerate,
          useHardwareAccel: customSettings.useHardwareAcceleration
        };
      }

      const audioParams = { volume: audioVolume / 100, process: audioProcess };

      await invoke('cut_video', {
        inputPath: videoPath,
        outputPath,
        segments: segmentsToProcess,
        quality: videoQuality,
        format: exportFormat,
        transition: transitionType,
        transitionDuration: transitionDuration,
        audioParams,
        addSubtitles: useSubtitles
      });

      if (onProcessingComplete) {
        onProcessingComplete(outputPath);
      }
      return outputPath;
    } catch (error) {
      logger.error('视频处理失败:', { error });
      notify.error(error, '视频处理失败');
      throw error;
    }
  }, [exportFormat, videoQuality, customSettings, audioVolume, audioProcess, transitionType, transitionDuration, useSubtitles, videoPath, onProcessingComplete]);

  const startBatchProcessing = useCallback(async () => {
    if (batchItems.length === 0) {
      notify.warning('请先添加批处理项目');
      return;
    }

    setProcessingBatch(true);
    setCurrentBatchItem(0);
    setBatchProgress(0);

    const newOutputPaths: string[] = [];

    for (let i = 0; i < batchItems.length; i++) {
      setCurrentBatchItem(i);
      const item = batchItems[i];

      try {
        const segmentsToProcess: VideoSegment[] = item.segments.map((s, i) => ({
          id: `batch-${item.id}-${i}`,
          sourceIndex: i,
          startTime: s.start,
          endTime: s.end,
          duration: s.end - s.start,
        }));
        const outputPath = await processVideo(segmentsToProcess, item.name);
        newOutputPaths.push(outputPath);

        setBatchItems(prevItems => prevItems.map((prevItem, idx) =>
          idx === i ? { ...prevItem, completed: true } : prevItem
        ));

        setBatchProgress(((i + 1) / batchItems.length) * 100);
      } catch (error) {
        logger.error(`处理批次项 ${i + 1} 失败:`, { error });
        notify.error(error, `处理 "${item.name}" 失败`);
        continue;
      }
    }

    setProcessingBatch(false);
    notify.success(`完成批量处理，共 ${newOutputPaths.length} 个文件`);
  }, [batchItems, processVideo]);

  const handleProcessCurrentVideo = useCallback(async () => {
    if (!segments || segments.length === 0) {
      notify.warning('没有可用的脚本片段');
      return;
    }

    try {
      const segmentsToProcess: VideoSegment[] = segments.map((s, i) => ({
        id: `seg-${i}`,
        sourceIndex: i,
        startTime: s.start,
        endTime: s.end,
        duration: s.end - s.start,
      }));
      await processVideo(segmentsToProcess);
      notify.success('视频处理完成');
    } catch {
      // 错误已在processVideo内部处理
    }
  }, [segments, processVideo]);

  const handleAudioVolumeChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setAudioVolume(val);
  };

  const [activePanels, setActivePanels] = useState<string[]>(['basic']);

  const togglePanel = (key: string) => {
    setActivePanels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className={styles.container}>
      <Card className={styles.controllerCard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={18} />
            视频处理控制器
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">

          {/* 基本设置 */}
          <details className={styles.panel} open={activePanels.includes('basic')}>
            <summary
              className="cursor-pointer p-2 font-medium flex items-center justify-between rounded-md hover:bg-accent"
              onClick={(e) => { e.preventDefault(); togglePanel('basic'); }}
            >
              基本设置
              <span className="text-muted-foreground">{activePanels.includes('basic') ? '▼' : '▶'}</span>
            </summary>
            {activePanels.includes('basic') && (
              <div className="p-2">
                <BasicSettings
                  videoQuality={videoQuality}
                  exportFormat={exportFormat}
                  customSettings={customSettings}
                  onQualityChange={(v) => setVideoQuality(v as QualityValue)}
                  onFormatChange={(v) => setExportFormat(v as FormatValue)}
                  onCustomSettingsChange={updateCustomSettings}
                />
              </div>
            )}
          </details>

          {/* 转场和音频效果 */}
          <details className={styles.panel} open={activePanels.includes('effects')}>
            <summary
              className="cursor-pointer p-2 font-medium flex items-center justify-between rounded-md hover:bg-accent"
              onClick={(e) => { e.preventDefault(); togglePanel('effects'); }}
            >
              转场和音频效果
              <span className="text-muted-foreground">{activePanels.includes('effects') ? '▼' : '▶'}</span>
            </summary>
            {activePanels.includes('effects') && (
              <div className="p-2">
                <EffectsSettings
                  transitionType={transitionType}
                  transitionDuration={transitionDuration}
                  audioProcess={audioProcess}
                  audioVolume={audioVolume}
                  useSubtitles={useSubtitles}
                  onTransitionChange={(v) => setTransitionType(v as TransitionValue)}
                  onTransitionDurationChange={setTransitionDuration}
                  onAudioProcessChange={(v) => setAudioProcess(v as AudioProcessValue)}
                  onAudioVolumeChange={handleAudioVolumeChange}
                  onSubtitlesChange={setUseSubtitles}
                />
              </div>
            )}
          </details>

          {/* 批量处理 */}
          <details className={styles.panel} open={activePanels.includes('batch')}>
            <summary
              className="cursor-pointer p-2 font-medium flex items-center justify-between rounded-md hover:bg-accent"
              onClick={(e) => { e.preventDefault(); togglePanel('batch'); }}
            >
              批量处理
              <span className="text-muted-foreground">{activePanels.includes('batch') ? '▼' : '▶'}</span>
            </summary>
            {activePanels.includes('batch') && (
              <div className="p-2">
                <BatchProcessing
                  batchItems={batchItems}
                  processingBatch={processingBatch}
                  currentBatchItem={currentBatchItem}
                  batchProgress={batchProgress}
                  onAddBatchItem={addBatchItem}
                  onRemoveBatchItem={removeBatchItem}
                  onStartBatchProcessing={startBatchProcessing}
                  calculateTotalDuration={calculateTotalDuration as (segments: Array<{ start?: number; end?: number }>) => number}
                />
              </div>
            )}
          </details>

          <div className={styles.actionButtons}>
            <Button
              variant="default"
              onClick={handleProcessCurrentVideo}
            >
              <Scissors size={14} className="mr-1" />
              处理当前视频
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(VideoProcessingController);
