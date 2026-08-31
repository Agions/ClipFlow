import React, { memo } from 'react';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import {
  Edit3,
  Save,
  ChevronDown,
  Plus,
} from 'lucide-react';
import type { ScriptSegment } from '@/types';
import { formatDuration } from '@/shared/utils/formatting';
import SegmentTable from './segment-table';
import SegmentEditForm from './segment-edit-form';
import PreviewModal from './preview-modal';
import AIModal from './ai-modal';
import { useScriptEditor } from '@/hooks/use-script-editor';
import styles from '././script-editor.module.less';

interface OriginalEditorProps {
  videoPath: string;
  initialSegments?: ScriptSegment[];
  onSave: (segments: ScriptSegment[]) => void;
  onExport?: (format: string) => void;
}

const OriginalEditor: React.FC<OriginalEditorProps> = ({
  videoPath,
  initialSegments = [],
  onSave,
  onExport,
}) => {
  const {
    segments, editingIndex, formValues, formError,
    previewVisible, previewLoading, previewSrc,
    aiModalVisible, exportMenuOpen, deleteConfirmOpen,
    totalDuration,
    setAiModalVisible, setExportMenuOpen, setDeleteConfirmOpen, setPreviewVisible,
    setFieldValue,
    handleAddSegment, handleEditSegment, handleSaveSegment, handleCancelEdit,
    handleDeleteSegment, confirmDelete, handlePreviewSegment,
    handleSave, handleAIImprove, handleExportClick,
    exportMenuItems,
  } = useScriptEditor({ videoPath, initialSegments, onSave, onExport });

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
            <Button className="bg-accent-primary hover:bg-accent-primary-hover text-primary-foreground" onClick={handleSave}>
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
            onFieldChange={setFieldValue as (field: 'start' | 'end' | 'type' | 'content', value: string | number | null) => void}
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
