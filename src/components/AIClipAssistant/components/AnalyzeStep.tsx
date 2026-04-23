import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import type { ClipAnalysisResult } from '@/core/services/aiClip.service';
import styles from '../index.module.less';

interface AnalyzeStepProps {
  analyzing: boolean;
  analysisProgress: number;
  analysisResult: ClipAnalysisResult | null;
}

const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
  analyzing,
  analysisProgress,
  analysisResult
}) => {
  const getProgressText = () => {
    if (analysisProgress < 30) return '正在检测场景切换...';
    if (analysisProgress < 60) return '正在分析音频和静音片段...';
    if (analysisProgress < 90) return '正在提取关键帧...';
    return '正在生成剪辑建议...';
  };

  if (analyzing) {
    return (
      <Card className={styles.analyzeCard}>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="animate-spin text-3xl">⟳</div>
          <h5 className="text-base font-medium">正在分析视频...</h5>
          <Progress value={Math.round(analysisProgress)} className="w-full max-w-xs">
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <span className="text-sm text-muted-foreground">{getProgressText()}</span>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Card className={styles.analyzeCard}>
        <CardContent className="py-8 text-center text-muted-foreground">
          请先开始分析
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles.analyzeCard}>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-4 gap-4">
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analysisResult.cutPoints.length}</div>
            <div className={styles.statLabel}>检测到剪辑点</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analysisResult.silenceSegments.length}</div>
            <div className={styles.statLabel}>静音片段</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{analysisResult.keyframeTimestamps.length}</div>
            <div className={styles.statLabel}>关键帧</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {Math.round(analysisResult.estimatedFinalDuration)}s
            </div>
            <div className={styles.statLabel}>预估最终时长</div>
          </div>
        </div>

        <Separator />

        <h5 className="text-base font-medium">剪辑点分布</h5>
        <div className={styles.timelineVisualization}>
          <div className={styles.timelineBar}>
            {analysisResult.cutPoints.map((cp) => (
              <Tooltip key={cp.id}>
                <TooltipTrigger
                  render={
                    <div
                      className={`${styles.cutPoint} ${styles[cp.type]}`}
                      style={{
                        left: `${(cp.timestamp / analysisResult.duration) * 100}%`
                      }}
                    />
                  }
                />
                <TooltipContent>
                  <p>{`${cp.description} (${cp.confidence > 0.8 ? '高' : cp.confidence > 0.5 ? '中' : '低'}置信度)`}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className={styles.timelineLabels}>
            <span className="text-xs text-muted-foreground">0s</span>
            <span className="text-xs text-muted-foreground">{Math.round(analysisResult.duration / 2)}s</span>
            <span className="text-xs text-muted-foreground">{Math.round(analysisResult.duration)}s</span>
          </div>
        </div>

        <div className={styles.legend}>
          <div className="flex flex-wrap gap-4">
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.scene}`} />
              场景切换
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.silence}`} />
              静音
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.keyframe}`} />
              关键帧
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.emotion}`} />
              情感变化
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyzeStep;
