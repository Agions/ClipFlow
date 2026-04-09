import { logger } from '@/utils/logger';
/**
 * 脚本生成器组件 V2
 * 优化版本 - 使用常量、减少重复代码
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Radio,
  Tag,
  Progress,
  Alert,
  Divider,
  Tooltip
} from 'antd';
import {
  EditOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from '@/components/common/motion-shim';
import { useModel, useModelCost } from '@/core/hooks';
import ModelSelector from '@/components/ModelSelector';
import { SCRIPT_STYLES, SCRIPT_LENGTHS } from '@/constants';
import { TONE_OPTIONS, TARGET_AUDIENCES } from '@/shared/constants';
import { aiService } from '@/core/services/ai.service';
import { formatDuration } from '@/core/utils';
import type { ScriptData, AIModelSettings } from '@/core/types';
import styles from './index.module.less';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ScriptGeneratorProps {
  projectId?: string;
  videoDuration?: number;
  onGenerate?: (script: ScriptData) => void;
  onSave?: (script: ScriptData) => void;
}

interface ScriptFormValues {
  topic: string;
  keywords?: string[];
  style: string;
  tone: string;
  length: string;
  audience: string;
  requirements?: string;
}

// 表单字段配置
const FORM_FIELDS = {
  topic: { label: '脚本主题', placeholder: '例如：如何制作一杯完美的拿铁咖啡', required: true },
  keywords: { label: '关键词（可选）', placeholder: '输入关键词，按回车添加' },
  style: { label: '脚本风格' },
  tone: { label: '语气语调' },
  length: { label: '脚本长度' },
  audience: { label: '目标受众' },
  requirements: { label: '特殊要求（可选）', placeholder: '例如：需要包含产品介绍、使用步骤、注意事项等' }
};

// 默认表单值
const DEFAULT_FORM_VALUES = {
  style: 'professional',
  tone: 'friendly',
  length: 'medium',
  audience: 'general',
};

export const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  projectId: _projectId,
  videoDuration,
  onGenerate,
  onSave
}) => {
  const { selectedModel, isConfigured, modelSettings } = useModel();
  const { formatCost, estimateScriptCost } = useModelCost();

  const [form] = Form.useForm<ScriptFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState<ScriptData | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // 计算预估成本
  const estimatedCost = useMemo(() => {
    const length = form.getFieldValue('length') || 'medium';
    const lengthConfig = SCRIPT_LENGTHS.find(l => l.value === length);
    const avgWords = lengthConfig?.wordCount ?? 650;
    return formatCost(estimateScriptCost(avgWords));
  }, [form, estimateScriptCost, formatCost]);

  // 生成进度步骤
  const progressSteps = useMemo(() => [
    { progress: 10, message: '分析视频内容...', delay: 800 },
    { progress: 30, message: '提取关键信息...', delay: 1000 },
    { progress: 50, message: '构建脚本结构...', delay: 1200 },
    { progress: 70, message: '生成脚本内容...', delay: 1500 },
    { progress: 90, message: '优化语言表达...', delay: 1000 }
  ], []);

  // 生成脚本
  const handleGenerate = useCallback(async (values: ScriptFormValues) => {
    if (!selectedModel) {
      setShowModelSelector(true);
      return;
    }

    if (!isConfigured) {
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // 执行进度步骤
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setProgress(step.progress);
      }

      // 调用 AI 服务
      const script = await aiService.generateScript(
        selectedModel,
        modelSettings as AIModelSettings,
        { ...values, language: 'zh', videoDuration }
      );

      setProgress(100);
      setGeneratedScript(script);
      onGenerate?.(script);
    } catch (error) {
      logger.error('生成失败:', { error });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedModel, isConfigured, modelSettings, videoDuration, progressSteps, onGenerate]);

  // 渲染模型选择卡片
  const renderModelCard = () => (
    <Card className={styles.modelCard} size="small">
      <div className={styles.modelHeader}>
        <Space>
          <Text strong>当前模型:</Text>
          {selectedModel ? (
            <Tag color={isConfigured ? 'success' : 'warning'}>
              {selectedModel.name} {isConfigured ? '已配置' : '未配置'}
            </Tag>
          ) : (
            <Text type="secondary">未选择</Text>
          )}
        </Space>
        <Button
          type="link"
          icon={<SettingOutlined />}
          onClick={() => setShowModelSelector(!showModelSelector)}
        >
          {showModelSelector ? '收起' : '更改'}
        </Button>
      </div>

      <AnimatePresence>
        {showModelSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Divider />
            <ModelSelector taskType="script" compact onSelect={() => setShowModelSelector(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );

  // 渲染表单字段
  const renderFormFields = () => (
    <>
      <Form.Item
        name="topic"
        label={FORM_FIELDS.topic.label}
        rules={[{ required: FORM_FIELDS.topic.required, message: '请输入脚本主题' }]}
      >
        <Input placeholder={FORM_FIELDS.topic.placeholder} prefix={<FileTextOutlined />} />
      </Form.Item>

      <Form.Item name="keywords" label={FORM_FIELDS.keywords.label}>
        <Select mode="tags" placeholder={FORM_FIELDS.keywords.placeholder} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item name="style" label={FORM_FIELDS.style.label}>
        <Radio.Group optionType="button" buttonStyle="solid">
          {SCRIPT_STYLES.map(opt => (
            <Radio.Button key={opt.value} value={opt.value}>
              <Tooltip title={opt.desc}>{opt.label}</Tooltip>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <Form.Item name="tone" label={FORM_FIELDS.tone.label}>
        <Radio.Group optionType="button">
          {TONE_OPTIONS.map(opt => (
            <Radio.Button key={opt.value} value={opt.value}>{opt.label}</Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <Form.Item name="length" label={FORM_FIELDS.length.label}>
        <Radio.Group optionType="button">
          {SCRIPT_LENGTHS.map(opt => (
            <Radio.Button key={opt.value} value={opt.value}>
              <Tooltip title={`${opt.desc}，约${opt.wordCount}字`}>{opt.label}</Tooltip>
            </Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <Form.Item name="audience" label={FORM_FIELDS.audience.label}>
        <Select placeholder="选择目标受众">
          {TARGET_AUDIENCES.map(opt => (
            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="requirements" label={FORM_FIELDS.requirements.label}>
        <TextArea rows={3} placeholder={FORM_FIELDS.requirements.placeholder} />
      </Form.Item>
    </>
  );

  // 渲染操作按钮
  const renderActions = () => (
    <div className={styles.actions}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          size="large"
          icon={isGenerating ? <LoadingOutlined /> : <ThunderboltOutlined />}
          onClick={() => form.submit()}
          loading={isGenerating}
          disabled={!selectedModel || !isConfigured}
          block
        >
          {isGenerating ? '生成中...' : '生成脚本'}
        </Button>

        {isGenerating && <Progress percent={progress} status="active" />}

        <Alert message={`预估成本: ${estimatedCost}`} type="info" showIcon={false} />
      </Space>
    </div>
  );

  // 渲染结果
  const renderResult = () => {
    if (!generatedScript) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Card
          title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><span>生成结果</span></Space>}
          className={styles.resultCard}
          extra={
            <Space>
              <Button onClick={() => form.submit()} icon={<ThunderboltOutlined />}>重新生成</Button>
              <Button type="primary" onClick={() => onSave?.(generatedScript)} icon={<CheckCircleOutlined />}>保存脚本</Button>
            </Space>
          }
        >
          <div className={styles.scriptContent}>
            <Title level={5}>{generatedScript.title}</Title>
            <Paragraph>{generatedScript.content}</Paragraph>
          </div>

          <Divider />

          <div className={styles.scriptMeta}>
            <Space wrap>
              <Tag icon={<FileTextOutlined />}>{generatedScript.metadata.wordCount} 字</Tag>
              <Tag icon={<ClockCircleOutlined />}>约 {formatDuration(generatedScript.metadata.estimatedDuration * 60)}</Tag>
              <Tag icon={<UserOutlined />}>
                {TARGET_AUDIENCES.find(a => a.value === generatedScript.metadata.targetAudience)?.label}
              </Tag>
              <Tag icon={<GlobalOutlined />}>
                中文
              </Tag>
            </Space>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className={styles.container}>
      <Title level={4} className={styles.title}>
        <EditOutlined /> AI 脚本生成器
      </Title>

      {renderModelCard()}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        initialValues={DEFAULT_FORM_VALUES}
        className={styles.form}
      >
        <Card title="脚本设置" className={styles.settingsCard}>
          {renderFormFields()}
        </Card>

        {renderActions()}
      </Form>

      <AnimatePresence>
        {renderResult()}
      </AnimatePresence>
    </div>
  );
};

export default ScriptGenerator;
