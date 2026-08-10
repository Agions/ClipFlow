/**
 * understanding-page — L0 内容理解层页面（container）
 *
 * 职责：
 *  - 接线 `useUnderstandingStore`（状态机驱动：idle → running → done/failed）
 *  - 编排导入（视频选择）→ 分析（进度）→ 产物预览 三段视图
 *  - 失败时提供重试；完成后支持加载 storyline 明细
 *
 * 视图组件见 `views/`（纯展示，props 驱动）。
 */

import { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useUnderstandingStore } from '@/stores/understanding-store';
import { ImportStep } from './views/import-step';
import { AnalysisProgress } from './views/analysis-progress';
import { StorylinePreview } from './views/storyline-preview';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function UnderstandingPage() {
  const [videoPath, setVideoPath] = useState('');
  // M1 简化：每次进入页面生成临时 productionId；M2 与 Production 工程文件整合后由工程创建流程提供
  const productionId = useMemo(() => `prod_${Date.now()}`, []);

  const status = useUnderstandingStore(s => s.status);
  const progress = useUnderstandingStore(s => s.progress);
  const message = useUnderstandingStore(s => s.message);
  const stats = useUnderstandingStore(s => s.stats);
  const storyline = useUnderstandingStore(s => s.storyline);
  const artifactPath = useUnderstandingStore(s => s.artifactPath);
  const error = useUnderstandingStore(s => s.error);
  const startAnalysis = useUnderstandingStore(s => s.startAnalysis);
  const loadStoryline = useUnderstandingStore(s => s.loadStoryline);
  const reset = useUnderstandingStore(s => s.reset);

  const handleSelectVideo = useCallback(async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      title: '选择源视频',
      multiple: false,
      filters: [{ name: '视频', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm'] }],
    });
    if (typeof selected === 'string' && selected) {
      setVideoPath(selected);
    }
  }, []);

  const handleStart = useCallback(() => {
    if (!videoPath) return;
    void startAnalysis({ productionId, videoPath });
  }, [videoPath, productionId, startAnalysis]);

  const handleLoadDetail = useCallback(() => {
    if (artifactPath) void loadStoryline(artifactPath);
  }, [artifactPath, loadStoryline]);

  const handleReset = useCallback(() => {
    reset();
    setVideoPath('');
  }, [reset]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">内容理解（L0）</h1>
        {status !== 'idle' && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="size-4" />
            重新开始
          </Button>
        )}
      </header>

      {/* 导入步骤（分析前） */}
      {status === 'idle' && (
        <ImportStep
          videoPath={videoPath}
          onSelectVideo={() => void handleSelectVideo()}
          onStart={handleStart}
        />
      )}

      {/* 分析进行中 */}
      {status === 'running' && <AnalysisProgress progress={progress} message={message} />}

      {/* 完成：产物预览 */}
      {status === 'done' && (
        <StorylinePreview
          stats={stats}
          storyline={storyline}
          artifactPath={artifactPath}
          onLoadDetail={handleLoadDetail}
        />
      )}

      {/* 失败：错误 + 重试 */}
      {status === 'failed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              分析失败
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{error ?? '未知错误'}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStart} disabled={!videoPath}>
                重试分析
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
