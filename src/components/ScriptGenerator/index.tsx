import { logger } from '@/utils/logger';
/**
 * 脚本生成器组件
 * 专业的 AI 脚本生成界面
 */

import React, { useState, useCallback } from 'react';
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
  Tooltip,
  Badge,
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
  SettingOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from '@/components/common/motion-shim';
import { useModel, useModelCost } from '@/core/hooks/useModel';
import { useProject } from '@/core/hooks/useProject';
import ModelSelector from '@/components/ModelSelector';
import { notify } from '@/shared';
import type { ScriptData, ScriptSegment } from '@/core/types';
import styles from './index.module.less';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 脚本风格选项
const STYLE_OPTIONS = [
  { value: 'professional', label: '专业正式', desc: '适合商业、教育类视频' },
  { value: 'casual', label: '轻松随意', desc: '适合生活、娱乐类视频' },
  { value: 'humorous', label: '幽默风趣', desc: '适合搞笑、娱乐类视频' },
  { value: 'emotional', label: '情感共鸣', desc: '适合故事、情感类视频' },
  { value: 'technical', label: '技术讲解', desc: '适合教程、科普类视频' },
  { value: 'promotional', label: '营销推广', desc: '适合产品、广告类视频' }
];

// 语气选项
const TONE_OPTIONS = [
  { value: 'friendly', label: '友好亲切' },
  { value: 'authoritative', label: '权威专业' },
  { value: 'enthusiastic', label: '热情激昂' },
  { value: 'calm', label: '平静沉稳' },
  { value: 'humorous', label: '幽默诙谐' }
];

// 长度选项
const LENGTH_OPTIONS = [
  { value: 'short', label: '简短', desc: '1-3分钟', words: '300-500字' },
  { value: 'medium', label: '适中', desc: '3-5分钟', words: '500-800字' },
  { value: 'long', label: '详细', desc: '5-10分钟', words: '800-1500字' }
];

// 目标受众
const AUDIENCE_OPTIONS = [
  { value: 'general', label: '普通大众' },
  { value: 'professional', label: '专业人士' },
  { value: 'student', label: '学生群体' },
  { value: 'business', label: '商务人士' },
  { value: 'tech', label: '技术爱好者' },
  { value: 'elderly', label: '中老年群体' }
];

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
  length: 'short' | 'medium' | 'long';
  audience: string;
  requirements?: string;
}

export const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({
  projectId,
  videoDuration,
  onGenerate,
  onSave
}) => {
  const { updateScript } = useProject(projectId);
  const { selectedModel, isConfigured } = useModel();
  const { estimateScriptCost, formatCost } = useModelCost();

  const [form] = Form.useForm<ScriptFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedScript, setGeneratedScript] = useState<ScriptData | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // 估算成本
  const estimatedCost = useCallback(() => {
    const length = form.getFieldValue('length') || 'medium';
    const wordCount = LENGTH_OPTIONS.find(l => l.value === length)?.words || '500-800字';
    const avgWords = parseInt(wordCount.split('-')[0]) + 200;
    return formatCost(estimateScriptCost(avgWords));
  }, [form, estimateScriptCost, formatCost]);

  // 生成脚本
  const handleGenerate = useCallback(async (values: ScriptFormValues) => {
    if (!selectedModel) {
      notify.warning('请先选择 AI 模型');
      setShowModelSelector(true);
      return;
    }

    if (!isConfigured) {
      notify.warning('请先配置 API 密钥');
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // 动态导入 AI 服务
      const { aiService } = await import('@/core/services');
      
      // 获取模型设置
      const modelSettings = selectedModel || {
        id: 'gpt-4o',
        name: 'GPT-4o',
        type: 'openai' as const,
        enabled: true,
      };

      // 调用 AI 服务生成脚本
      setProgress(10);
      setProgress(10); // AI 服务调用中

      const result = await aiService.generateScript(
        modelSettings,
        {},
        {
          topic: form.getFieldValue('topic') || '通用主题',
          style: form.getFieldValue('style') || 'professional',
          tone: form.getFieldValue('tone') || 'friendly',
          length: form.getFieldValue('length') || 'medium',
          audience: form.getFieldValue('audience') || 'general',
          language: 'zh-CN',
          requirements: form.getFieldValue('requirements'),
        }
      );

      setProgress(70);
      setProgress(70); // 处理结果

      // 更新脚本
      setGeneratedScript({
        id: result.id,
        title: result.title,
        content: result.content,
        segments: result.segments,
        metadata: result.metadata,
      } as ScriptData);

      setProgress(100);
      notify.success('脚本生成成功');

    } catch (error) {
      logger.error('脚本生成失败:', { error });
      notify.error(String(error), '脚本生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedModel, isConfigured, onGenerate, form]);

  // 保存脚本
  const handleSave = useCallback(() => {
    if (generatedScript) {
      updateScript(generatedScript);
      onSave?.(generatedScript);
      notify.success('脚本已保存');
    }
  }, [generatedScript, updateScript, onSave]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    form.submit();
  }, [form]);

  return (
    <div className={styles.container}>
      <Title level={4} className={styles.title}>
        <EditOutlined /> AI 脚本生成器
      </Title>

      {/* 模型选择 */}
      <Card className={styles.modelCard} size="small">
        <div className={styles.modelHeader}>
          <Space>
            <Text strong>当前模型:</Text>
            {selectedModel ? (
              <Badge
                status={isConfigured ? 'success' : 'warning'}
                text={
                  <Space>
                    <Text>{selectedModel.name}</Text>
                        <Tag color={isConfigured ? 'success' : 'warning'}>
                          {isConfigured ? '已配置' : '未配置'}
                        </Tag>
                  </Space>
                }
              />
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
              <ModelSelector
                taskType="script"
                compact
                onSelect={() => setShowModelSelector(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 生成表单 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleGenerate}
        initialValues={{
          style: 'professional',
          tone: 'friendly',
          length: 'medium',
          audience: 'general',
          language: 'zh'
        }}
        className={styles.form}
      >
        <Card title="脚本设置" className={styles.settingsCard}>
          <Form.Item
            name="topic"
            label="脚本主题"
            rules={[{ required: true, message: '请输入脚本主题' }]}
          >
            <Input
              placeholder="例如：如何制作一杯完美的拿铁咖啡"
              prefix={<FileTextOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="keywords"
            label="关键词（可选）"
          >
            <Select
              mode="tags"
              placeholder="输入关键词，按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="style"
            label="脚本风格"
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              {STYLE_OPTIONS.map(opt => (
                <Radio.Button key={opt.value} value={opt.value}>
                  <Tooltip title={opt.desc}>
                    {opt.label}
                  </Tooltip>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="tone"
            label="语气语调"
          >
            <Radio.Group optionType="button">
              {TONE_OPTIONS.map(opt => (
                <Radio.Button key={opt.value} value={opt.value}>
                  {opt.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="length"
            label="脚本长度"
          >
            <Radio.Group optionType="button">
              {LENGTH_OPTIONS.map(opt => (
                <Radio.Button key={opt.value} value={opt.value}>
                  <Tooltip title={`${opt.desc}，约${opt.words}`}>
                    {opt.label}
                  </Tooltip>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="audience"
            label="目标受众"
          >
            <Select placeholder="选择目标受众">
              {AUDIENCE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="requirements"
            label="特殊要求（可选）"
          >
            <TextArea
              rows={3}
              placeholder="例如：需要包含产品介绍、使用步骤、注意事项等"
            />
          </Form.Item>
        </Card>

        {/* 生成按钮 */}
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

            {isGenerating && (
              <Progress percent={progress} status="active" />
            )}

            <Alert
              message={
                <Space>
                  <DollarOutlined />
                  <Text>预估成本: {estimatedCost()}</Text>
                </Space>
              }
              type="info"
              showIcon={false}
            />
          </Space>
        </div>
      </Form>

      {/* 生成结果 */}
      <AnimatePresence>
        {generatedScript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>生成结果</span>
                </Space>
              }
              className={styles.resultCard}
              extra={
                <Space>
                  <Button onClick={handleRegenerate} icon={<ThunderboltOutlined />}>
                    重新生成
                  </Button>
                  <Button type="primary" onClick={handleSave} icon={<CheckCircleOutlined />}>
                    保存脚本
                  </Button>
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
                  <Tag icon={<FileTextOutlined />}>
                    {generatedScript.metadata.wordCount} 字
                  </Tag>
                  <Tag icon={<ClockCircleOutlined />}>
                    约 {generatedScript.metadata.estimatedDuration} 分钟
                  </Tag>
                  <Tag icon={<UserOutlined />}>
                    {AUDIENCE_OPTIONS.find(a => a.value === generatedScript.metadata.targetAudience)?.label}
                  </Tag>
                  <Tag icon={<GlobalOutlined />}>
                    中文
                  </Tag>
                </Space>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 辅助函数
function estimateWordCount(length: string): number {
  const map: Record<string, number> = { short: 400, medium: 650, long: 1150 };
  return map[length] || 650;
}

function estimateDuration(length: string): number {
  const map: Record<string, number> = { short: 2, medium: 4, long: 7 };
  return map[length] || 4;
}

export default ScriptGenerator;
