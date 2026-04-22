/**
 * AnalyzeStep — 分析视频步骤
 */
import React from 'react';
import { Card, Typography, Spin, Space } from 'antd';
import { Button } from '@/components/ui/button';
const { Title, Paragraph } = Typography;
import { EditOutlined } from '@ant-design/icons';
import VideoSelector from '@/components/VideoSelector';
import styles from '../../index.module.less';

interface AnalyzeStepProps {
  videoPath: string;
  keyFrames: string[];
  scriptSegmentsCount: number;
  loading: boolean;
  onVideoSelect: (path: string) => void;
  onVideoRemove: () => void;
  onAnalyze: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const AnalyzeStep: React.FC<AnalyzeStepProps> = ({
  videoPath,
  keyFrames,
  scriptSegmentsCount,
  loading,
  onVideoSelect,
  onVideoRemove,
  onAnalyze,
  onPrev,
  onNext,
}) => (
  <Card className={styles.stepCard}>
    <Title level={4}><EditOutlined /> 分析视频内容</Title>
    <Paragraph>分析视频获取关键帧和内容信息，生成脚本草稿。</Paragraph>

    <Spin spinning={loading} tip="正在分析视频...">
      <div className={styles.analyzeContent}>
        <VideoSelector
          initialVideoPath={videoPath}
          onVideoSelect={onVideoSelect}
          onVideoRemove={onVideoRemove}
          loading={false}
        />

        {keyFrames.length > 0 && (
          <div className={styles.keyFrames}>
            <Title level={5}>已提取 {keyFrames.length} 个关键帧</Title>
            <div className={styles.keyFramesList}>
              {keyFrames.map((frame, index) => (
                <img
                  key={index}
                  src={frame}
                  alt={`关键帧 ${index + 1}`}
                  className={styles.keyFrameImage}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Spin>

    <div className={styles.stepActions}>
      <Space>
        <Button variant="outline" onClick={onPrev}>上一步</Button>
        {scriptSegmentsCount > 0 ? (
          <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={onNext}>下一步</Button>
        ) : (
          <Button className="bg-[--accent-primary] hover:bg-[--accent-primary-hover] text-white" onClick={onAnalyze} disabled={loading}>
            {loading ? '分析中...' : '分析视频'}
          </Button>
        )}
      </Space>
    </div>
  </Card>
);
