import React, { memo } from 'react';
import { Button, Tooltip } from 'antd';
import {
  UploadOutlined,
  UndoOutlined,
  RedoOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
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
    <div className={styles.toolbar} role="toolbar" aria-label="视频编辑器工具栏">
      <div className={styles.leftTools}>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={onLoadVideo}
          loading={loading}
          aria-label="加载视频"
        >
          加载视频
        </Button>

        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={onUndo}
            aria-label="撤销"
            aria-disabled={!canUndo}
          />
        </Tooltip>

        <Tooltip title="重做 (Ctrl+Y)">
          <Button
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={onRedo}
            aria-label="重做"
            aria-disabled={!canRedo}
          />
        </Tooltip>

        <Tooltip title="添加片段">
          <Button
            icon={<PlusOutlined />}
            onClick={onAddSegment}
            disabled={!hasVideo}
            aria-label="添加片段"
          />
        </Tooltip>

        <Tooltip title="智能剪辑">
          <Button
            icon={<RobotOutlined />}
            onClick={onSmartClip}
            disabled={!hasVideo || analyzing}
            loading={analyzing}
            aria-label="智能剪辑"
          >
            智能剪辑
          </Button>
        </Tooltip>
      </div>

      <div className={styles.rightTools}>
        <Button
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={isSaving}
          disabled={!hasVideo || loading || analyzing || isSaving || isExporting}
          aria-label="保存项目"
        >
          保存
        </Button>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onExport}
          loading={isExporting}
          disabled={!hasVideo || loading || analyzing || isSaving || isExporting}
          aria-label="导出视频"
        >
          导出
        </Button>
      </div>
    </div>
  );
};

export default memo(Toolbar);
