/**
 * storyline-preview — L0 理解层：剧情时间线产物预览（view）
 *
 * 纯展示组件：展示分析统计、产物落盘路径与 storyline 明细列表。
 * 明细列表在 storyline 未加载时显示「加载明细」入口。
 */

import { CheckCircle, FileJson, Clapperboard, Captions, Sparkles, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Storyline } from '@/core/domain/storyline';
import type { UnderstandingState } from '@/stores/understanding-store';
import { formatTimecode } from '@/core/domain/storyline';

export interface StorylinePreviewProps {
  /** 分析统计（Rust 端返回） */
  stats: UnderstandingState['stats'];
  /** 剧情时间线明细（loadStoryline 后填充） */
  storyline: Storyline | null;
  /** storyline.json 落盘路径 */
  artifactPath: string | null;
  /** 加载明细 */
  onLoadDetail: () => void;
}

export function StorylinePreview({
  stats,
  storyline,
  artifactPath,
  onLoadDetail,
}: StorylinePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="size-4 text-green-600" />
          剧情时间线构建完成
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* 统计 */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatItem
              icon={<Clapperboard className="size-4" />}
              label="场景"
              value={stats.scenesCount}
            />
            <StatItem
              icon={<Captions className="size-4" />}
              label="字幕"
              value={stats.subtitlesCount}
            />
            <StatItem
              icon={<Sparkles className="size-4" />}
              label="高光"
              value={stats.highlightsCount}
            />
            <StatItem
              icon={<Clock className="size-4" />}
              label="时长"
              value={formatTimecode(stats.durationSecs)}
            />
          </div>
        )}

        {/* 产物路径 */}
        {artifactPath && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileJson className="size-4 shrink-0" />
            <span className="truncate">{artifactPath}</span>
          </div>
        )}

        {/* 明细加载 */}
        {storyline ? (
          <StorylineDetail storyline={storyline} />
        ) : (
          <Button variant="outline" onClick={onLoadDetail}>
            加载明细
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 px-2 py-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-lg font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StorylineDetail({ storyline }: { storyline: Storyline }) {
  return (
    <div className="flex flex-col gap-4">
      {storyline.scenes.length > 0 && (
        <DetailSection title={`场景（${storyline.scenes.length}）`}>
          {storyline.scenes.map(scene => (
            <div key={scene.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{scene.type}</Badge>
              <span className="text-muted-foreground">
                {formatTimecode(scene.startTime)} - {formatTimecode(scene.endTime)}
              </span>
            </div>
          ))}
        </DetailSection>
      )}

      {storyline.highlights.length > 0 && (
        <DetailSection title={`高光（${storyline.highlights.length}）`}>
          {storyline.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{h.reason}</Badge>
              <span className="text-muted-foreground">
                {formatTimecode(h.startTime)} - {formatTimecode(h.endTime)}
              </span>
              <span className="ml-auto text-xs">{h.score.toFixed(2)}</span>
            </div>
          ))}
        </DetailSection>
      )}

      {storyline.subtitles.length > 0 && (
        <DetailSection title={`字幕（${storyline.subtitles.length}）`}>
          {storyline.subtitles.slice(0, 10).map(entry => (
            <div key={entry.id} className="flex gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">
                {formatTimecode(entry.startTime)}
              </span>
              <span className="truncate">{entry.text}</span>
            </div>
          ))}
          {storyline.subtitles.length > 10 && (
            <p className="text-xs text-muted-foreground">
              …还有 {storyline.subtitles.length - 10} 条
            </p>
          )}
        </DetailSection>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
