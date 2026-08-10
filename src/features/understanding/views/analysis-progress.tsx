/**
 * analysis-progress — L0 理解层：分析进度（view）
 *
 * 纯展示组件：展示整体进度条 + 当前阶段描述。
 */

import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface AnalysisProgressProps {
  /** 整体进度 0-100 */
  progress: number;
  /** 当前阶段描述 */
  message: string | null;
}

export function AnalysisProgress({ progress, message }: AnalysisProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          正在分析视频
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={Math.min(100, Math.max(0, progress))} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{message ?? '准备中...'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
