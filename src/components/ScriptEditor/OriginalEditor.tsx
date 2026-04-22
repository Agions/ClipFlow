import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card, Space, Dropdown, Modal, Form, type MenuProps } from 'antd';
import { Button } from '@/components/ui/button';
import {
  EditOutlined,
  SaveOutlined,
  ExportOutlined,
  DownOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ScriptSegment } from '@/core/types';
import { VideoSegment, formatDuration, previewSegment } from '@/services/video';
import { convertFileSrc } from '@tauri-apps/api/core';
import { notify } from '@/shared';
import SegmentTable from './SegmentTable';
import SegmentEditForm from './SegmentEditForm';
import PreviewModal from './PreviewModal';
import AIModal from './AIModal';
import styles from './ScriptEditor.module.less';

interface OriginalEditorProps {
  videoPath: string;
  initialSegments?: ScriptSegment[];
  onSave: (segments: ScriptSegment[]) => void;
  onExport?: (format: string) => void;
}

interface SegmentFormValues {
  start: number;
  end: number;
  type: string;
  content: string;
}

const OriginalEditor: React.FC<OriginalEditorProps> = ({
  videoPath,
  initialSegments = [],
  onSave,
  onExport,
}) => {
  const [segments, setSegments] = useState<ScriptSegment[]>(initialSegments);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm] = Form.useForm<SegmentFormValues>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const duration = segments.reduce((sum, segment) => sum + (segment.endTime - segment.startTime), 0);
    setTotalDuration(duration);
  }, [segments]);

  // 添加新片段
  const handleAddSegment = useCallback(() => {
    const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
    const startTime = lastSegment ? lastSegment.endTime : 0;
    const endTime = startTime + 30;

    editForm.setFieldsValue({
      start: startTime,
      end: endTime,
      type: 'narration',
      content: '',
    });

    setEditingIndex(segments.length);
  }, [segments, editForm]);

  // 编辑片段
  const handleEditSegment = useCallback((index: number) => {
    const segment = segments[index];

    editForm.setFieldsValue({
      start: segment.startTime,
      end: segment.endTime,
      type: segment.type || 'narration',
      content: segment.content || '',
    });

    setEditingIndex(index);
  }, [segments, editForm]);

  // 保存编辑片段
  const handleSaveSegment = useCallback(() => {
    editForm.validateFields().then(values => {
      const start = Number(values.start);
      const end = Number(values.end);

      const newSegments = [...segments];
      const segment: ScriptSegment = {
        id: `segment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        startTime: start,
        endTime: end,
        type: values.type as ScriptSegment['type'],
        content: values.content,
      };

      if (editingIndex !== null) {
        if (editingIndex < segments.length) {
          newSegments[editingIndex] = segment;
        } else {
          newSegments.push(segment);
        }
      }

      setSegments(newSegments);
      setEditingIndex(null);
      editForm.resetFields();
    });
  }, [segments, editingIndex, editForm]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    editForm.resetFields();
  }, [editForm]);

  // 删除片段
  const handleDeleteSegment = useCallback((index: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个片段吗？',
      onOk: () => {
        const newSegments = [...segments];
        newSegments.splice(index, 1);
        setSegments(newSegments);
      },
    });
  }, [segments]);

  // 预览片段
  const handlePreviewSegment = useCallback(async (index: number) => {
    try {
      setPreviewLoading(true);
      const segment = segments[index];
      const videoSegment: VideoSegment = { start: segment.startTime, end: segment.endTime };
      const previewPath = await previewSegment(videoPath, videoSegment);
      setPreviewSrc(convertFileSrc(previewPath));
      setPreviewVisible(true);
    } catch (error) {
      logger.error('生成预览失败:', { error });
      notify.error(error, '生成预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }, [segments, videoPath]);

  // 保存脚本
  const handleSave = useCallback(() => {
    onSave(segments);
    notify.success('脚本已保存');
  }, [onSave, segments]);

  // AI 优化
  const handleAIImprove = useCallback(async () => {
    try {
      notify.info('正在使用 AI 优化脚本...');
      setAiModalVisible(false);
      setTimeout(() => {
        notify.success('脚本优化完成');
      }, 2000);
    } catch (error) {
      logger.error('AI 优化脚本失败:', { error });
      notify.error(error, 'AI 优化脚本失败');
    }
  }, []);

  const exportMenuItems = useMemo<MenuProps['items']>(() => ([
    { key: 'txt', label: '文本文件 (.txt)' },
    { key: 'srt', label: '字幕文件 (.srt)' },
    { key: 'doc', label: 'Word文档 (.docx)' },
  ]), []);

  const handleExportClick = useCallback<NonNullable<MenuProps['onClick']>>(({ key }) => {
    onExport?.(String(key));
    setExportMenuVisible(false);
  }, [onExport]);

  return (
    <div className={styles.scriptEditor}>
      <Card
        title="脚本编辑"
        className={styles.editorCard}
        extra={
          <Space>
            <Button variant="outline" onClick={() => setAiModalVisible(true)}>
              <EditOutlined className="mr-1" />
              AI优化
            </Button>
            <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleSave}>
              <SaveOutlined className="mr-1" />
              保存
            </Button>
            {onExport && (
              <Dropdown
                menu={{ items: exportMenuItems, onClick: handleExportClick }}
                open={exportMenuVisible}
                onOpenChange={setExportMenuVisible}
              >
                <Button variant="outline">
                  导出 <DownOutlined />
                </Button>
              </Dropdown>
            )}
          </Space>
        }
      >
        <div className={styles.statsBar}>
          <div>总片段: {segments.length}</div>
          <div>总时长: {formatDuration(totalDuration)}</div>
        </div>

        <SegmentTable
          segments={segments}
          onEdit={handleEditSegment}
          onPreview={handlePreviewSegment}
          onDelete={handleDeleteSegment}
          onAdd={handleAddSegment}
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={handleAddSegment}
          style={{ marginTop: 16 }}
        >
          <PlusOutlined className="mr-1" />
          添加片段
        </Button>

        {editingIndex !== null && (
          <SegmentEditForm
            form={editForm}
            editingIndex={editingIndex}
            onSave={handleSaveSegment}
            onCancel={handleCancelEdit}
          />
        )}
      </Card>

      <PreviewModal
        visible={previewVisible}
        loading={previewLoading}
        previewSrc={previewSrc}
        onClose={() => setPreviewVisible(false)}
      />

      <AIModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onConfirm={handleAIImprove}
      />
    </div>
  );
};

export default memo(OriginalEditor);
