/**
 * 通用设置面板
 */
import React from 'react';
import { Card, Form, Switch, Select, Button, Space, Divider } from 'antd';
import { SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { notify } from '@/shared';
import type { ProjectSaveBehavior } from '@/shared/constants/settings';

const { Option } = Select;

interface GeneralSettingsPanelProps {
  autoSave: boolean;
  compactMode: boolean;
  theme: string;
  projectSaveBehavior: ProjectSaveBehavior;
  onAutoSaveChange: (v: boolean) => void;
  onCompactModeChange: (v: boolean) => void;
  onThemeChange: (v: string) => void;
  onProjectSaveBehaviorChange: (v: ProjectSaveBehavior) => void;
  onReset: () => void;
}

const GeneralSettingsPanel: React.FC<GeneralSettingsPanelProps> = ({
  autoSave,
  compactMode,
  theme,
  projectSaveBehavior,
  onAutoSaveChange,
  onCompactModeChange,
  onThemeChange,
  onProjectSaveBehaviorChange,
  onReset,
}) => {
  const handleReset = () => {
    onReset();
    notify.success('设置已重置');
  };

  return (
    <Card title="通用设置" extra={<SettingOutlined />}>
      <Form layout="vertical" aria-label="通用设置表单">
        <Form.Item label="自动保存">
          <Switch
            checked={autoSave}
            onChange={onAutoSaveChange}
            checkedChildren="开启"
            unCheckedChildren="关闭"
            aria-label="自动保存开关"
          />
        </Form.Item>

        <Form.Item label="紧凑模式">
          <Switch
            checked={compactMode}
            onChange={onCompactModeChange}
            checkedChildren="开启"
            unCheckedChildren="关闭"
            aria-label="紧凑模式开关"
          />
        </Form.Item>

        <Form.Item label="主题">
          <Select value={theme} onChange={onThemeChange} style={{ width: 200 }} aria-label="主题选择">
            <Option value="light">浅色</Option>
            <Option value="dark">深色</Option>
            <Option value="auto">跟随系统</Option>
          </Select>
        </Form.Item>

        <Form.Item label="项目保存后跳转">
          <Select<ProjectSaveBehavior>
            value={projectSaveBehavior}
            onChange={onProjectSaveBehaviorChange}
            style={{ width: 220 }}
            aria-label="保存后跳转行为"
          >
            <Option value="stay">留在编辑页</Option>
            <Option value="detail">跳转项目详情</Option>
          </Select>
        </Form.Item>

        <Divider />

        <Form.Item>
          <Space>
            <Button icon={<UndoOutlined />} onClick={handleReset} aria-label="重置设置">
              重置为默认
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default GeneralSettingsPanel;
