import React, { memo } from 'react';
import { Card, Alert, Space, Tag, Progress, Statistic, Row, Col, Divider, Typography, List, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import ExportPanel from '@/components/ExportPanel';
import type { ScriptExportSettings } from '@/components/ExportPanel';
import type { ExportSettings } from '@/core/types';
import type { WorkflowData } from '@/core/services/workflow/types';
import styles from '../index.module.less';

const { Text } = Typography;

interface ExportStepProps {
  onExport: (settings: ExportSettings) => Promise<string>;
  alignmentGateReport?: WorkflowData['alignmentGateReport'];
  onJumpToTimeline?: () => void;
  onLocateSegment?: (segmentId: string) => void;
}

const DEFAULT_VIDEO_EXPORT_SETTINGS: ExportSettings = {
  format: 'mp4',
  quality: 'high',
  resolution: '1080p',
  fps: 30,
  includeSubtitles: true,
  includeWatermark: false,
  burnSubtitles: true,
};

const toVideoExportSettings = (_settings: ScriptExportSettings): ExportSettings => {
  // 当前复用脚本文档导出面板，统一映射为视频导出默认参数。
  return DEFAULT_VIDEO_EXPORT_SETTINGS;
};

const ExportStep: React.FC<ExportStepProps> = ({
  onExport,
  alignmentGateReport,
  onJumpToTimeline,
  onLocateSegment,
}) => {
  return (
    <Card title="导出视频" className={styles.stepCard}>
      {alignmentGateReport && (
        <Card size="small" style={{ marginBottom: 16 }} title="解说-画面对齐门禁">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              type={alignmentGateReport.passed ? 'success' : 'error'}
              showIcon
              message={alignmentGateReport.passed ? '门禁通过，可导出' : '门禁未通过，已阻断导出'}
              description={
                <Space wrap>
                  <Text>阈值:</Text>
                  <Tag color="blue">平均置信度 ≥ {alignmentGateReport.threshold.minConfidence}</Tag>
                  <Tag color="blue">最大漂移 ≤ {alignmentGateReport.threshold.maxDriftSeconds}s</Tag>
                  <Tag color="purple">自动修复段落 {alignmentGateReport.autoFixedSegments}</Tag>
                </Space>
              }
            />

            <Row gutter={12}>
              <Col span={12}>
                <Statistic
                  title="修复前平均置信度"
                  value={Math.round(alignmentGateReport.before.averageConfidence * 100)}
                  suffix="%"
                />
                <Progress
                  percent={Math.round(alignmentGateReport.before.averageConfidence * 100)}
                  status={alignmentGateReport.before.averageConfidence >= alignmentGateReport.threshold.minConfidence ? 'success' : 'exception'}
                  showInfo={false}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="修复后平均置信度"
                  value={Math.round(alignmentGateReport.after.averageConfidence * 100)}
                  suffix="%"
                />
                <Progress
                  percent={Math.round(alignmentGateReport.after.averageConfidence * 100)}
                  status={alignmentGateReport.after.averageConfidence >= alignmentGateReport.threshold.minConfidence ? 'success' : 'exception'}
                  showInfo={false}
                />
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0' }} />

            <Row gutter={12}>
              <Col span={12}>
                <Statistic title="修复前最大漂移" value={alignmentGateReport.before.maxDriftSeconds} precision={2} suffix="s" />
                <Text type={alignmentGateReport.before.maxDriftSeconds <= alignmentGateReport.threshold.maxDriftSeconds ? 'success' : 'danger'}>
                  低置信度段落 {alignmentGateReport.before.lowConfidenceCount}，高漂移段落 {alignmentGateReport.before.highDriftCount}
                </Text>
              </Col>
              <Col span={12}>
                <Statistic title="修复后最大漂移" value={alignmentGateReport.after.maxDriftSeconds} precision={2} suffix="s" />
                <Text type={alignmentGateReport.after.maxDriftSeconds <= alignmentGateReport.threshold.maxDriftSeconds ? 'success' : 'danger'}>
                  低置信度段落 {alignmentGateReport.after.lowConfidenceCount}，高漂移段落 {alignmentGateReport.after.highDriftCount}
                </Text>
              </Col>
            </Row>

            {!!alignmentGateReport.failedSegmentsAfter.length && (
              <>
                <Divider style={{ margin: '8px 0' }} />
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Text strong>未通过段落（修复后）</Text>
                    {onJumpToTimeline && (
                      <Button icon={<EditOutlined />} size="small" onClick={onJumpToTimeline}>
                        前往时间轴修正
                      </Button>
                    )}
                  </Space>
                  <List
                    size="small"
                    bordered
                    dataSource={alignmentGateReport.failedSegmentsAfter}
                    renderItem={(item) => (
                      <List.Item>
                        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space wrap>
                            <Tag color="red">{item.segmentId}</Tag>
                            <Text type="danger">漂移 {item.driftSeconds.toFixed(2)}s</Text>
                            <Text type="warning">置信度 {(item.confidence * 100).toFixed(0)}%</Text>
                          </Space>
                          {onLocateSegment && (
                            <Button
                              size="small"
                              type="link"
                              onClick={() => onLocateSegment(item.segmentId)}
                            >
                              定位到时间轴
                            </Button>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Space>
              </>
            )}
          </Space>
        </Card>
      )}
      <ExportPanel onExport={(settings) => onExport(toVideoExportSettings(settings))} />
    </Card>
  );
};

export default memo(ExportStep);
