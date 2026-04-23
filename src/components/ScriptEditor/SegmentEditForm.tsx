import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { segmentTypeOptions } from './types';
import styles from './ScriptEditor.module.less';

interface SegmentFormValues {
  start: number;
  end: number;
  type: string;
  content: string;
}

interface SegmentEditFormProps {
  formValues: SegmentFormValues;
  formError: string;
  onFieldChange: (field: keyof SegmentFormValues, value: string | number) => void;
  editingIndex: number;
  onSave: () => void;
  onCancel: () => void;
}

const SegmentEditForm: React.FC<SegmentEditFormProps> = ({
  formValues,
  formError,
  onFieldChange,
  editingIndex,
  onSave,
  onCancel,
}) => {
  return (
    <div className={styles.editForm}>
      <Card className={styles.editCard + ' p-4 mt-4'}>
        <h4 className="text-sm font-semibold mb-4">编辑片段 #{editingIndex + 1}</h4>
        {formError && (
          <div className="text-xs text-destructive mb-3">{formError}</div>
        )}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">开始时间 (秒)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formValues.start}
              onChange={e => onFieldChange('start', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">结束时间 (秒)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={formValues.end}
              onChange={e => onFieldChange('end', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-1">类型</label>
          <Select value={formValues.type} onValueChange={v => onFieldChange('type', v)}>
            <SelectTrigger>
              {segmentTypeOptions.find(o => o.value === formValues.type)?.label ?? '旁白'}
            </SelectTrigger>
            <SelectContent>
              {segmentTypeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-1">内容</label>
          <textarea
            rows={4}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={formValues.content}
            onChange={e => onFieldChange('content', e.target.value)}
            placeholder="输入内容..."
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
          <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" size="sm" onClick={onSave}>保存</Button>
        </div>
      </Card>
    </div>
  );
};

export default memo(SegmentEditForm);
