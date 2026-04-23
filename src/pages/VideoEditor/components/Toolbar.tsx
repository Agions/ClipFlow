import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  Upload,
  Undo2,
  Redo2,
  Plus,
  Bot,
  Save,
  Download,
} from 'lucide-react';
import styles from '../index.module.less';

interface ToolbarProps {
  loading: boolean;
  analyzing: boolean;
  isSaving: boolean;
  isExporting: boolean;
  hasVideo: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onLoadVideo: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddSegment: () => void;
  onSmartClip: () => void;
  onSave: () => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  loading,
  analyzing,
  isSaving,
  isExporting,
  hasVideo,
  canUndo,
  canRedo,
  onLoadVideo,
  onUndo,
  onRedo,
  onAddSegment,
  onSmartClip,
  onSave,
  onExport,
}) => {
  return (
    <TooltipProvider>
      <div className={styles.toolbar} role="toolbar" aria-label="视频编辑器工具栏">
        <div className={styles.leftTools}>
          <Button
            className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
            onClick={onLoadVideo}
            disabled={loading}
            aria-label="加载视频"
          >
            <Upload size={16} className="mr-1" />
            {loading ? '加载中...' : '加载视频'}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="撤销"
                aria-disabled={!canUndo}
              >
                <Undo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="重做"
                aria-disabled={!canRedo}
              >
                <Redo2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onAddSegment}
                disabled={!hasVideo}
                aria-label="添加片段"
              >
                <Plus size={16} className="mr-1" />
                添加片段
              </Button>
            </TooltipTrigger>
            <TooltipContent>添加片段</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onSmartClip}
                disabled={!hasVideo || analyzing}
              >
                {analyzing ? (
                  <>
                    <Bot size={16} className="mr-1" />
                    剪辑中...
                  </>
                ) : (
                  <>
                    <Bot size={16} className="mr-1" />
                    智能剪辑
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>智能剪辑</TooltipContent>
          </Tooltip>
        </div>

        <div className={styles.rightTools}>
          <Button
            variant="ghost"
            onClick={onSave}
            disabled={!hasVideo || loading || analyzing || isSaving || isExporting}
            aria-label="保存项目"
          >
            <Save size={16} className="mr-1" />
            保存
          </Button>

          <Button
            className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
            onClick={onExport}
            disabled={!hasVideo || loading || analyzing || isSaving || isExporting}
            aria-label="导出视频"
          >
            <Download size={16} className="mr-1" />
            导出
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default memo(Toolbar);
