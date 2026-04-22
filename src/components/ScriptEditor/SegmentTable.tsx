import React, { memo } from 'react';
import { List, Space, Tooltip, Tag } from 'antd';
import { Button } from '@/components/ui/button';
import { EditOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatDuration } from '@/core/video';
import type { ScriptSegment } from '@/core/types';
import { getTypeLabel } from './types';
import styles from './ScriptEditor.module.less';

const Text = ({ children, type, strong, style }: { children: React.ReactNode; type?: string; strong?: boolean; style?: React.CSSProperties }) => {
  return strong ? <strong style={style}>{children}</strong> : <span style={style}>{children}</span>;
};

interface SegmentTableProps {
  segments: ScriptSegment[];
  onEdit: (index: number) => void;
  onPreview: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

const SegmentTable: React.FC<SegmentTableProps> = ({
  segments,
  onEdit,
  onPreview,
  onDelete,
  onAdd,
}) => {
  return (
    <List
      className={styles.segmentsTable}
      dataSource={segments}
      locale={{ emptyText: '暂无片段，请先添加' }}
      renderItem={(record: ScriptSegment, index: number) => (
        <List.Item
          key={`${record.startTime}-${record.endTime}-${index}`}
          actions={[
            <Tooltip key="edit" title="编辑">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(index)}><EditOutlined /></Button>
            </Tooltip>,
            <Tooltip key="preview" title="预览">
              <Button variant="ghost" size="icon-sm" onClick={() => onPreview(index)}><PlayCircleOutlined /></Button>
            </Tooltip>,
            <Tooltip key="delete" title="删除">
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(index)}><DeleteOutlined /></Button>
            </Tooltip>,
          ]}
        >
          <List.Item.Meta
            title={
              <Space size={10} wrap>
          <Tag>{getTypeLabel(record.type || '')}</Tag>
                <Text>{formatDuration(record.startTime)} - {formatDuration(record.endTime)}</Text>
                <Text type="secondary">时长 {formatDuration(record.endTime - record.startTime)}</Text>
              </Space>
            }
            description={
              <div className={styles.contentCell}>
                {record.content || <span className={styles.emptyContent}>（无内容）</span>}
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default memo(SegmentTable);
