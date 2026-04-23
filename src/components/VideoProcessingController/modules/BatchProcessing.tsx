/**
 * BatchProcessing Component
 * Part of VideoProcessingController - handles batch video processing
 */
import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { BatchItem } from '../types';
import type { VideoSegment } from '@/core/types';

interface BatchProcessingProps {
  batchItems: BatchItem[];
  processingBatch: boolean;
  currentBatchItem: number;
  batchProgress: number;
  onAddBatchItem: () => void;
  onRemoveBatchItem: (id: string) => void;
  onStartBatchProcessing: () => void;
  calculateTotalDuration: (segments: Array<{ start?: number; end?: number }>) => number;
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({
  batchItems,
  processingBatch,
  currentBatchItem,
  batchProgress,
  onAddBatchItem,
  onRemoveBatchItem,
  onStartBatchProcessing,
  calculateTotalDuration,
}) => {
  return (
    <div className="batchContainer">
      <div className="batchHeader">
        <Button
          className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
          onClick={onAddBatchItem}
        >
          <PlusOutlined className="mr-1" />
          添加当前视频到批处理
        </Button>

        <Tooltip title="开始处理所有批次项">
          <Button
            className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white"
            onClick={onStartBatchProcessing}
            disabled={processingBatch || batchItems.length === 0}
          >
            {processingBatch ? '处理中...' : '开始批量处理'}
          </Button>
        </Tooltip>
      </div>

      {processingBatch && (
        <div className="batchProgress">
          <Progress value={batchProgress} />
          <div className="batchStatus">
            处理中: {currentBatchItem + 1}/{batchItems.length} - {batchItems[currentBatchItem]?.name}
          </div>
        </div>
      )}

      <div className="batchList">
        {batchItems.length === 0 ? (
          <div className="emptyBatch">
            <p>暂无批处理项目</p>
            <p>添加当前视频及其片段到批处理列表</p>
          </div>
        ) : (
          batchItems.map((item, index) => (
            <div
              key={item.id}
              className={`batchItem ${item.completed ? 'completed' : ''}`}
            >
              <div className="batchItemContent">
                <div className="batchItemHeader">
                  <div className="batchItemName">
                    <span className="batchNumber">{index + 1}.</span> {item.name}
                  </div>
                  <div className="batchItemActions">
                    {item.completed && (
                      <Tag color="success">已完成</Tag>
                    )}
                    <Popconfirm
                      title="确定要移除此项目吗？"
                      onConfirm={() => onRemoveBatchItem(item.id)}
                      okText="确定"
                      cancelText="取消"
                      disabled={processingBatch}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={processingBatch}
                      >
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
                <div className="batchItemInfo">
                  <div>片段数量: {item.segments.length}</div>
                  <div>总时长: {calculateTotalDuration(item.segments)}秒</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BatchProcessing;
