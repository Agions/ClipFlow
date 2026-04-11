import React from 'react';
import { Card, Button, Row, Col, Space, Typography, Divider, Slider, Switch, Radio, Select } from 'antd';
import {
  RobotOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import type { AIClipConfig } from '@/core/services/aiClip.service';
import type { VideoInfo } from '@/core/types';
import styles from '../index.module.less';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ConfigStepProps {
  videoInfo: VideoInfo;
  config: AIClipConfig;
  analyzing: boolean;
  onConfigChange: (updates: Partial<AIClipConfig>) => void;
  onAnalyze: () => void;
  onSmartClip: () => void;
}

const ConfigStep: React.FC<ConfigStepProps> = ({
  videoInfo,
  config,
  analyzing,
  onConfigChange,
  onAnalyze,
  onSmartClip
}) => {
  return (
    <Card className={styles.configCard}>
      <Title level={5}>剪辑检测配置</Title>
      <Row gutter={[24, 16]}>
        <Col span={8}>
          <div className={styles.configItem}>
            <Space>
              <Switch
                checked={config.detectSceneChange}
                onChange={(v) => onConfigChange({ detectSceneChange: v })}
              />
              <Text>场景切换检测</Text>
            </Space>
            <Paragraph type="secondary" className={styles.configDesc}>
              自动识别视频中的场景变化
            </Paragraph>
          </div>
        </Col>
        <Col span={8}>
          <div className={styles.configItem}>
            <Space>
              <Switch
                checked={config.detectSilence}
                onChange={(v) => onConfigChange({ detectSilence: v })}
              />
              <Text>静音检测</Text>
            </Space>
            <Paragraph type="secondary" className={styles.configDesc}>
              识别并标记静音片段
            </Paragraph>
          </div>
        </Col>
        <Col span={8}>
          <div className={styles.configItem}>
            <Space>
              <Switch
                checked={config.detectKeyframes}
                onChange={(v) => onConfigChange({ detectKeyframes: v })}
              />
              <Text>关键帧检测</Text>
            </Space>
            <Paragraph type="secondary" className={styles.configDesc}>
              提取重要的视觉关键帧
            </Paragraph>
          </div>
        </Col>
      </Row>

      <Divider />

      <Title level={5}>剪辑优化配置</Title>
      <Row gutter={[24, 16]}>
        <Col span={12}>
          <div className={styles.configItem}>
            <Text>剪辑风格</Text>
            <Radio.Group
              value={config.pacingStyle}
              onChange={(e) => onConfigChange({ pacingStyle: e.target.value })}
              className={styles.radioGroup}
            >
              <Radio.Button value="fast">
                <ThunderboltOutlined /> 快速
              </Radio.Button>
              <Radio.Button value="normal">
                <ClockCircleOutlined /> 标准
              </Radio.Button>
              <Radio.Button value="slow">
                <VideoCameraOutlined /> 舒缓
              </Radio.Button>
            </Radio.Group>
          </div>
        </Col>
        <Col span={12}>
          <div className={styles.configItem}>
            <Text>转场效果</Text>
            <Select
              value={config.transitionType}
              onChange={(v) => onConfigChange({ transitionType: v })}
              style={{ width: '100%' }}
            >
              <Option value="fade">淡入淡出</Option>
              <Option value="cut">直接切换</Option>
              <Option value="dissolve">溶解</Option>
              <Option value="slide">滑动</Option>
            </Select>
          </div>
        </Col>
      </Row>

      <Row gutter={[24, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <div className={styles.configItem}>
            <Space>
              <Switch
                checked={config.removeSilence}
                onChange={(v) => onConfigChange({ removeSilence: v })}
              />
              <Text>自动移除静音</Text>
            </Space>
          </div>
        </Col>
        <Col span={12}>
          <div className={styles.configItem}>
            <Space>
              <Switch
                checked={config.autoTransition}
                onChange={(v) => onConfigChange({ autoTransition: v })}
              />
              <Text>自动添加转场</Text>
            </Space>
          </div>
        </Col>
      </Row>

      <Divider />

      <Title level={5}>目标时长（可选）</Title>
      <Row>
        <Col span={24}>
          <div className={styles.configItem}>
            <Slider
              min={10}
              max={Math.min(300, videoInfo.duration)}
              value={config.targetDuration || videoInfo.duration}
              onChange={(v: number) => onConfigChange({ targetDuration: v })}
              marks={{
                30: '30s',
                60: '1min',
                120: '2min',
                180: '3min'
              }}
            />
            <Text type="secondary">
              当前视频时长: {Math.round(videoInfo.duration)}秒
              {config.targetDuration && ` → 目标: ${config.targetDuration}秒`}
            </Text>
          </div>
        </Col>
      </Row>

      <div className={styles.actionButtons}>
        <Space>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={onAnalyze}
            loading={analyzing}
            size="large"
          >
            开始分析
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            onClick={onSmartClip}
            loading={analyzing}
            size="large"
          >
            一键智能剪辑
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default ConfigStep;
