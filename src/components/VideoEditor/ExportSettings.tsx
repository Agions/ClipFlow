import React, { memo } from 'react';
import {
  Modal,
  Tabs,
  Space,
  Typography,
  Select,
  Radio,
  InputNumber,
  Slider,
  Row,
  Col,
  Alert,
} from 'antd';

const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe' | 'slide';

export interface ExportSettingsState {
  videoQuality: string;
  exportFormat: string;
  transitionType: TransitionType;
  transitionDuration: number;
  audioVolume: number;
  useSubtitles: boolean;
}

interface ExportSettingsProps {
  visible: boolean;
  settings: ExportSettingsState;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSettingsChange: (settings: Partial<ExportSettingsState>) => void;
  onOk: () => void;
  onCancel: () => void;
}

const transitionOptions = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '交叉溶解' },
  { value: 'wipe', label: '擦除效果' },
  { value: 'slide', label: '滑动效果' },
];

const ExportSettings: React.FC<ExportSettingsProps> = ({
  visible,
  settings,
  activeTab,
  onTabChange,
  onSettingsChange,
  onOk,
  onCancel,
}) => {
  const {
    videoQuality,
    exportFormat,
    transitionType,
    transitionDuration,
    audioVolume,
    useSubtitles,
  } = settings;

  return (
    <Modal
      title="视频导出设置"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="开始导出"
      cancelText="取消"
      width={600}
    >
      <Tabs activeKey={activeTab} onChange={onTabChange}>
        <TabPane tab="基本设置" key="general">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>视频质量:</Text>
              <Select
                value={videoQuality}
                onChange={(value) => onSettingsChange({ videoQuality: value })}
                style={{ width: 200, marginLeft: 10 }}
              >
                <Option value="low">低质量 (720p)</Option>
                <Option value="medium">中等质量 (1080p)</Option>
                <Option value="high">高质量 (原始分辨率)</Option>
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>导出格式:</Text>
              <Select
                value={exportFormat}
                onChange={(value) => onSettingsChange({ exportFormat: value })}
                style={{ width: 200, marginLeft: 10 }}
              >
                <Option value="mp4">MP4 格式</Option>
                <Option value="mov">MOV 格式</Option>
                <Option value="mkv">MKV 格式</Option>
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>添加字幕:</Text>
              <Radio.Group
                value={useSubtitles}
                onChange={(e) => onSettingsChange({ useSubtitles: e.target.value })}
                style={{ marginLeft: 10 }}
              >
                <Radio value={true}>是</Radio>
                <Radio value={false}>否</Radio>
              </Radio.Group>
            </div>
          </Space>
        </TabPane>

        <TabPane tab="高级设置" key="advanced">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>转场效果:</Text>
              <Select
                value={transitionType}
                onChange={(value: TransitionType) => onSettingsChange({ transitionType: value })}
                style={{ width: 200, marginLeft: 10 }}
                options={transitionOptions}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>转场时长(秒):</Text>
              <InputNumber
                value={transitionDuration}
                onChange={(value) => value !== null && onSettingsChange({ transitionDuration: value })}
                min={0.2}
                max={3}
                step={0.1}
                style={{ width: 200, marginLeft: 10 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>音频音量:</Text>
              <Row style={{ width: 300, marginLeft: 10, display: 'flex', alignItems: 'center' }}>
                <Col span={16}>
                  <Slider
                    value={audioVolume}
                    onChange={(value: number) => onSettingsChange({ audioVolume: value })}
                    min={0}
                    max={150}
                    step={5}
                  />
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <InputNumber
                    value={audioVolume}
                    onChange={(value) => value !== null && onSettingsChange({ audioVolume: value })}
                    min={0}
                    max={150}
                    step={5}
                    style={{ marginLeft: 8, width: 70 }}
                    addonAfter="%"
                  />
                </Col>
              </Row>
            </div>
          </Space>

          <Alert
            message="高级设置说明"
            description="转场效果会在片段之间添加流畅过渡，可能会稍微增加处理时间。音频音量调整可以让您控制整个视频的音量大小，100%表示保持原音量不变。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default memo(ExportSettings);
