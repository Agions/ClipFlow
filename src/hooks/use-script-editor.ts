/**
 * useScriptEditor hook — segment editor集中化入口
 * 来源: refactor/original-editor-usereducer (v3.4 §A2 范式)
 */
import { useMemo, useCallback, useEffect } from 'react';
import { useReducerHookFactory } from '@/shared/hooks/use-reducer-hook';
import { createAutoSetters } from '@/shared/hooks/use-auto-setters';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { ScriptSegment } from '@/types';
import type { SimpleVideoSegment } from '@/core/video';
import { videoProcessor } from '@/core/video';
import { notify } from '@/shared';
import { logger } from '@/shared/utils/logging';
import {
  initialOriginalEditorState,
  originalEditorReducer,
  type SegmentFormValues,
} from './use-script-editor-reducer';

interface UseScriptEditorArgs {
  videoPath: string;
  initialSegments?: ScriptSegment[];
  onSave: (segments: ScriptSegment[]) => void;
  onExport?: (format: string) => void;
}

export const useScriptEditor = ({
  videoPath,
  initialSegments = [],
  onSave,
  onExport,
}: UseScriptEditorArgs) => {
  const { state, dispatch } = useReducerHookFactory(
    originalEditorReducer,
    initialOriginalEditorState(initialSegments)
  );
  const setters = createAutoSetters(dispatch, initialOriginalEditorState(initialSegments));
  const {
    segments,
    editingIndex,
    formValues,
    formError,
    previewVisible,
    previewSrc,
    previewLoading,
    aiModalVisible,
    exportMenuOpen,
    deleteConfirmOpen,
    deleteTargetIndex,
    totalDuration,
  } = state;

  useEffect(() => {
    const duration = segments.reduce(
      (sum, segment) => sum + (segment.endTime - segment.startTime),
      0
    );
    setters.totalDuration(duration);
    // setters is intentionally omitted from deps — createAutoSetters returns a
    // fresh closure object every render, and including it would re-fire this
    // effect (and the totalDuration dispatch) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  const setFieldValue = useCallback(
    (field: keyof SegmentFormValues, value: string | number | null) => {
      setters.formValues(prev => ({ ...prev, [field]: value }));
      setters.formError('');
    },
    [setters]
  );

  const validateForm = useCallback((): boolean => {
    const start = Number(formValues.start);
    const end = Number(formValues.end);
    if (isNaN(start) || isNaN(end)) {
      setters.formError('请输入有效的时间值');
      return false;
    }
    if (end <= start) {
      setters.formError('结束时间必须大于开始时间');
      return false;
    }
    if (!formValues.content.trim()) {
      setters.formError('请输入内容');
      return false;
    }
    return true;
  }, [formValues, setters]);

  // 添加新片段
  const handleAddSegment = useCallback(() => {
    const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
    const startTime = lastSegment ? lastSegment.endTime : 0;
    const endTime = startTime + 30;

    setters.formValues({ start: startTime, end: endTime, type: 'narration', content: '' });
    setters.formError('');
    setters.editingIndex(segments.length);
  }, [segments, setters]);

  // 编辑片段
  const handleEditSegment = useCallback(
    (index: number) => {
      const segment = segments[index];
      setters.formValues({
        start: segment.startTime,
        end: segment.endTime,
        type: segment.type || 'narration',
        content: segment.content || '',
      });
      setters.formError('');
      setters.editingIndex(index);
    },
    [segments, setters]
  );

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
    setters.segments(newSegments);
    setters.editingIndex(null);
  }, [segments, editingIndex, formValues, validateForm, setters]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setters.editingIndex(null);
    setters.formError('');
  }, [setters]);

  // 删除片段
  const handleDeleteSegment = useCallback(
    (index: number) => {
      setters.deleteTargetIndex(index);
      setters.deleteConfirmOpen(true);
    },
    [setters]
  );

  const confirmDelete = useCallback(() => {
    if (deleteTargetIndex !== null) {
      const newSegments = [...segments];
      newSegments.splice(deleteTargetIndex, 1);
      setters.segments(newSegments);
    }
    setters.deleteConfirmOpen(false);
    setters.deleteTargetIndex(null);
  }, [deleteTargetIndex, segments, setters]);

  // 预览片段
  const handlePreviewSegment = useCallback(
    async (index: number) => {
      try {
        setters.previewLoading(true);
        const segment = segments[index];
        const videoSegment: SimpleVideoSegment = { start: segment.startTime, end: segment.endTime };
        const previewPath = await videoProcessor.preview(videoPath, videoSegment);
        setters.previewSrc(convertFileSrc(previewPath));
        setters.previewVisible(true);
      } catch (error) {
        logger.error('生成预览失败:', { error });
        notify.error(error, '生成预览失败');
      } finally {
        setters.previewLoading(false);
      }
    },
    [segments, videoPath, setters]
  );

  // 保存脚本
  const handleSave = useCallback(() => {
    onSave(segments);
    notify.success('脚本已保存');
  }, [onSave, segments]);

  // AI 优化
  const handleAIImprove = useCallback(async () => {
    try {
      notify.info('正在使用 AI 优化脚本...');
      setters.aiModalVisible(false);
      setTimeout(() => {
        notify.success('脚本优化完成');
      }, 2000);
    } catch (error) {
      // 注意：L194/L195 catch 分支在当前实现下属于 dead code — try 块内只
      // 包含 mocked notify 调用和 setTimeout，均不会同步抛错。保留作为防御性
      // 逻辑（若未来 try 块扩展加入可能抛错的同步调用时可自动生效）。
      logger.error('AI 优化脚本失败:', { error });
      notify.error(error, 'AI 优化脚本失败');
    }
  }, [setters]);

  const exportMenuItems = useMemo(
    () => [
      { key: 'txt', label: '文本文件 (.txt)' },
      { key: 'srt', label: '字幕文件 (.srt)' },
      { key: 'doc', label: 'Word文档 (.docx)' },
    ],
    []
  );

  const handleExportClick = useCallback(
    ({ key }: { key: string }) => {
      onExport?.(String(key));
      setters.exportMenuOpen(false);
    },
    [onExport, setters]
  );

  return {
    // state (read)
    segments,
    editingIndex,
    formValues,
    formError,
    previewVisible,
    previewSrc,
    previewLoading,
    aiModalVisible,
    exportMenuOpen,
    deleteConfirmOpen,
    deleteTargetIndex,
    totalDuration,
    // setters (write, 1:1 兼容)
    setSegments: setters.segments,
    setFormValues: setters.formValues,
    setFormError: setters.formError,
    setPreviewVisible: setters.previewVisible,
    setPreviewSrc: setters.previewSrc,
    setPreviewLoading: setters.previewLoading,
    setAiModalVisible: setters.aiModalVisible,
    setExportMenuOpen: setters.exportMenuOpen,
    setDeleteConfirmOpen: setters.deleteConfirmOpen,
    setDeleteTargetIndex: setters.deleteTargetIndex,
    // operations
    setFieldValue,
    validateForm,
    handleAddSegment,
    handleEditSegment,
    handleSaveSegment,
    handleCancelEdit,
    handleDeleteSegment,
    confirmDelete,
    handlePreviewSegment,
    handleSave,
    handleAIImprove,
    handleExportClick,
    exportMenuItems,
  };
};
