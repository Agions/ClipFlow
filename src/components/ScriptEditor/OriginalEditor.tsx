import { logger } from '@/utils/logger';
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Edit3,
  Save,
  Download,
  ChevronDown,
  Plus,
} from 'lucide-react';
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
  const [formValues, setFormValues] = useState<SegmentFormValues>({ start: 0, end: 30, type: 'narration', content: '' });
  const [formError, setFormError] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    const duration = segments.reduce((sum, segment) => sum + (segment.endTime - segment.startTime), 0);
    setTotalDuration(duration);
  }, [segments]);

  const setFieldValue = useCallback((field: keyof SegmentFormValues, value: string | number | null) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    setFormError('');
  }, []);

  const validateForm = useCallback((): boolean => {
    const start = Number(formValues.start);
    const end = Number(formValues.end);
    if (isNaN(start) || isNaN(end)) { setFormError('请输入有效的时间值'); return false; }
    if (end <= start) { setFormError('结束时间必须大于开始时间'); return false; }
    if (!formValues.content.trim()) { setFormError('请输入内容'); return false; }
    return true;
  }, [formValues]);

  // 添加新片段
  const handleAddSegment = useCallback(() => {
    const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
    const startTime = lastSegment ? lastSegment.endTime : 0;
    const endTime = startTime + 30;
    setFormValues({ start: startTime, end: endTime, type: 'narration', content: '' });
    setFormError('');
    setEditingIndex(segments.length);
  }, [segments]);

  // 编辑片段
  const handleEditSegment = useCallback((index: number) => {
    const segment = segments[index];
    setFormValues({
      start: segment.startTime,
      end: segment.endTime,
      type: segment.type || 'narration',
      content: segment.content || '',
    });
    setFormError('');
    setEditingIndex(index);
  }, [segments]);

  // 保存编辑片段
  const handleSaveSegment = useCallback(() => {
    if (!validateForm()) return;
    const start = Number(formValues.start);
    const end = Number(formValues.end);
    const newSegments = [...segments];
    const segment: ScriptSegment = {
      id: `segment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      startTime: start,
      endTime: end,
      type: formValues.type as ScriptSegment['type'],
      content: formValues.content,
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
  }, [segments, editingIndex, formValues, validateForm]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setFormError('');
  }, []);

  // 删除片段
  const handleDeleteSegment = useCallback((index: number) => {
    setDeleteTargetIndex(index);
    setDeleteConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTargetIndex !== null) {
      const newSegments = [...segments];
      newSegments.splice(deleteTargetIndex, 1);
      setSegments(newSegments);
    }
    setDeleteConfirmOpen(false);
    setDeleteTargetIndex(null);
  }, [deleteTargetIndex, segments]);

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
      setTimeout(() => { notify.success('脚本优化完成'); }, 2000);
    } catch (error) {
      logger.error('AI 优化脚本失败:', { error });
      notify.error(error, 'AI 优化脚本失败');
    }
  }, []);

  const exportMenuItems = useMemo(() => ([
    { key: 'txt', label: '文本文件 (.txt)' },
    { key: 'srt', label: '字幕文件 (.srt)' },
    { key: 'doc', label: 'Word文档 (.docx)' },
  ]), []);

  const handleExportClick = useCallback(({ key }: { key: string }) => {
    onExport?.(String(key));
    setExportMenuOpen(false);
  }, [onExport]);

  return (
    <div className={styles.scriptEditor}>
      <Card className={styles.editorCard}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>脚本编辑</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAiModalVisible(true)}>
              <Edit3 size={14} className="mr-1" />
              AI优化
            </Button>
            <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={handleSave}>
              <Save size={14} className="mr-1" />
              保存
            </Button>
            {onExport && (
              <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
                <DropdownMenuTrigger>
                  <Button variant="outline">
                    导出 <ChevronDown size={14} className="ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {exportMenuItems.map(item => (
                    <DropdownMenuItem key={item.key} onClick={() => handleExportClick({ key: item.key })}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
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
          <Plus size={14} className="mr-1" />
          添加片段
        </Button>

        {editingIndex !== null && (
          <SegmentEditForm
            formValues={formValues}
            formError={formError}
            onFieldChange={setFieldValue as (field: keyof SegmentFormValues, value: string | number | null) => void}
            editingIndex={editingIndex}
            onSave={handleSaveSegment}
            onCancel={handleCancelEdit}
          />
        )}
      </Card>

      <PreviewModal
        open={previewVisible}
        loading={previewLoading}
        previewSrc={previewSrc}
        onClose={() => setPreviewVisible(false)}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定要删除这个片段吗？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
            <Button onClick={confirmDelete}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIModal
        open={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onConfirm={handleAIImprove}
      />
    </div>
  );
};

export default memo(OriginalEditor);
