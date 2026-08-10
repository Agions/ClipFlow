/**
 * import-step — L0 理解层：视频导入步骤（view）
 *
 * 纯展示组件：由 container 注入回调，不直接依赖 Tauri dialog。
 */

import { Video, FolderOpen, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ImportStepProps {
  /** 已选中的视频路径（空表示未选择） */
  videoPath: string;
  /** 打开文件选择 */
  onSelectVideo: () => void;
  /** 开始分析 */
  onStart: () => void;
  /** 是否禁用（分析进行中） */
  disabled?: boolean;
}

export function ImportStep({ videoPath, onSelectVideo, onStart, disabled }: ImportStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="size-4" />
          导入视频
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {videoPath ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="size-4 shrink-0" />
            <span className="truncate">{videoPath}</span>
            <Badge variant="secondary" className="ml-auto">
              已选择
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            选择一个源视频，开始内容理解分析（场景切分、字幕转录、高光检测）。
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onSelectVideo} disabled={disabled}>
          <FolderOpen className="size-4" />
          选择视频
        </Button>
        <Button variant="primary" onClick={onStart} disabled={disabled || !videoPath}>
          {disabled ? <Loader2 className="size-4 animate-spin" /> : null}
          开始分析
        </Button>
      </CardFooter>
    </Card>
  );
}
