import { logger } from '@/utils/logger';
/**
 * 步骤1: 创建项目
 * 
 * 数据输出: project (ProjectData)
 * 流转到: VideoUpload
 */
import React, { useMemo, useState } from 'react';
import { Form, Input, Select, Button, Card, Typography, Divider, Tag } from 'antd';
import { PlusOutlined, ArrowRightOutlined, CheckCircleOutlined, VideoCameraOutlined, BookOutlined, CustomerServiceOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { useStoryForge } from '../AIEditorContext';
import type { ProjectData } from '@/core/types';
import { saveProjectToFile } from '@/services/tauri';
import { notify } from '@/shared';
import { useSettings } from '@/context/SettingsContext';
import styles from './StoryForge.module.less';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectCreateProps {
  onNext?: () => void;
}

// 项目模板配置
const PROJECT_TEMPLATES = [
  {
    id: 'marketing',
    name: '营销推广',
    icon: <VideoCameraOutlined />,
    desc: '产品宣传、活动推广',
    color: '#1890ff',
    settings: {
      videoQuality: 'high' as const,
      outputFormat: 'mp4' as const,
      resolution: '1080p' as const,
      frameRate: 30 as 24 | 30 | 60,
      subtitleEnabled: true,
    },
  },
  {
    id: 'education',
    name: '教育培训',
    icon: <BookOutlined />,
    desc: '课程讲解、技能培训',
    color: '#52c41a',
    settings: {
      videoQuality: 'high' as const,
      outputFormat: 'mp4' as const,
      resolution: '1080p' as const,
      frameRate: 30 as 24 | 30 | 60,
      subtitleEnabled: true,
    },
  },
  {
    id: 'entertainment',
    name: '娱乐内容',
    icon: <CustomerServiceOutlined />,
    desc: '搞笑集锦、影视解说',
    color: '#fa8c16',
    settings: {
      videoQuality: 'medium' as const,
      outputFormat: 'mp4' as const,
      resolution: '1080p' as const,
      frameRate: 30 as 24 | 30 | 60,
      subtitleEnabled: true,
    },
  },
  {
    id: 'news',
    name: '新闻资讯',
    icon: <FileTextOutlined />,
    desc: '热点解读、时事评论',
    color: '#eb2f96',
    settings: {
      videoQuality: 'high' as const,
      outputFormat: 'mp4' as const,
      resolution: '1080p' as const,
      frameRate: 30 as 24 | 30 | 60,
      subtitleEnabled: true,
    },
  },
  {
    id: 'custom',
    name: '自定义',
    icon: <SettingOutlined />,
    desc: '自定义设置',
    color: '#722ed1',
    settings: {
      videoQuality: 'high' as const,
      outputFormat: 'mp4' as const,
      resolution: '1080p' as const,
      frameRate: 30 as 24 | 30 | 60,
      subtitleEnabled: true,
    },
  },
];

const getTemplateById = (templateId?: string) => {
  return PROJECT_TEMPLATES.find((template) => template.id === templateId) || PROJECT_TEMPLATES[4];
};

const normalizeText = (value?: string) => value?.trim().replace(/\s+/g, ' ') || '';

const createDefaultProjectName = () => {
  const now = new Date();
  const pad = (num: number) => String(num).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `未命名项目-${timestamp}`;
};

const ProjectCreate: React.FC<ProjectCreateProps> = ({ onNext }) => {
  const { state, setProject, goToNextStep } = useStoryForge();
  const { addRecentProject } = useSettings();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('marketing');
  const [defaultProjectName] = useState<string>(() => createDefaultProjectName());

  const currentTemplate = useMemo(() => {
    if (!state.project) {
      return PROJECT_TEMPLATES[0];
    }
    if (state.project.templateId) {
      return getTemplateById(state.project.templateId);
    }
    const templateByName = PROJECT_TEMPLATES.find((template) => template.name === state.project?.templateName);
    if (templateByName) {
      return templateByName;
    }
    return PROJECT_TEMPLATES.find((template) => (
      template.settings.videoQuality === state.project?.settings?.videoQuality &&
      template.settings.outputFormat === state.project?.settings?.outputFormat &&
      template.settings.resolution === state.project?.settings?.resolution &&
      template.settings.frameRate === state.project?.settings?.frameRate
    )) || PROJECT_TEMPLATES[4];
  }, [state.project]);

  // 处理创建项目
  const handleCreateProject = async (values: {
    name: string;
    type: string;
    description?: string;
  }) => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      // 获取选中的模板设置
      const template = getTemplateById(values.type || selectedTemplate);
      const normalizedName = normalizeText(values.name) || createDefaultProjectName();
      const normalizedDescription = normalizeText(values.description);
      const now = new Date().toISOString();
      
      // 创建项目数据
      const newProject: ProjectData = {
        id: `project_${Date.now()}`,
        name: normalizedName,
        templateId: template.id,
        templateName: template.name,
        description: normalizedDescription || undefined,
        videoPath: '',
        videoUrl: undefined,
        status: 'draft',
        videos: [],
        scripts: [],
        createdAt: now,
        updatedAt: now,
        settings: {
          ...template.settings,
          audioCodec: 'aac',
          videoCodec: 'h264',
          subtitleStyle: {
            fontFamily: '思源黑体',
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            outline: true,
            outlineColor: '#000000',
            position: 'bottom',
            alignment: 'center',
          },
        },
      };

      await saveProjectToFile(newProject.id, newProject);
      addRecentProject(newProject.id);
      setProject(newProject);
      form.setFieldValue('name', normalizedName);
      notify.success('项目创建成功');
      
      // 跳转到下一步
      if (onNext) {
        onNext();
      } else {
        goToNextStep();
      }
    } catch (error) {
      logger.error('项目创建失败:', { error });
      notify.error(error, '项目创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果已有项目，显示项目信息
  if (state.project) {
    return (
      <div className={styles.stepContent}>
        <div className={styles.stepTitle}>
          <Title level={4}>当前项目</Title>
          <Paragraph>
            项目已创建，您可以继续下一步或重新创建
          </Paragraph>
        </div>

        <Card className={styles.projectInfoCard}>
          <div className={styles.projectHeader}>
            <div className={styles.projectIcon}>
              {currentTemplate.icon || <VideoCameraOutlined />}
            </div>
            <div className={styles.projectMeta}>
              <div className={styles.projectName}>{state.project.name}</div>
              {state.project.description && (
                <div className={styles.projectDesc}>{state.project.description}</div>
              )}
            </div>
          </div>
          
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>项目类型</span>
              <span className={styles.infoValue}>
                <Tag color="blue">{currentTemplate.name || '自定义'}</Tag>
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>创建时间</span>
              <span className={styles.infoValue}>
                {new Date(state.project.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>输出格式</span>
              <span className={styles.infoValue}>
                {state.project.settings?.outputFormat?.toUpperCase() || 'MP4'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>分辨率</span>
              <span className={styles.infoValue}>
                {state.project.settings?.resolution || '1080p'}
              </span>
            </div>
          </div>
          
          <Divider />
          
          <Button 
            type="primary" 
            icon={<ArrowRightOutlined />}
            onClick={goToNextStep}
            block
            size="large"
          >
            下一步：上传视频
          </Button>
        </Card>
      </div>
    );
  }

  // 创建项目表单
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepTitle}>
        <Title level={4}>创建新项目</Title>
        <Paragraph>
          选择项目模板，快速创建您的视频剪辑项目
        </Paragraph>
      </div>

      {/* 项目模板选择 */}
      <div className={styles.templateGrid}>
        {PROJECT_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`${styles.templateCard} ${selectedTemplate === template.id ? styles.active : ''}`}
            onClick={() => {
              setSelectedTemplate(template.id);
              form.setFieldValue('type', template.id);
            }}
          >
            <span 
              className={styles.templateIcon}
              style={{ color: template.color }}
            >
              {template.icon}
            </span>
            <div className={styles.templateName}>{template.name}</div>
            <div className={styles.templateDesc}>{template.desc}</div>
            {selectedTemplate === template.id && (
              <CheckCircleOutlined style={{ color: template.color, marginTop: 8 }} />
            )}
          </div>
        ))}
      </div>

      <Card className={styles.formCard}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProject}
          initialValues={{
            type: 'marketing',
            name: defaultProjectName,
          }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              {
                validator: (_, value: string) => {
                  const normalizedValue = normalizeText(value);
                  if (normalizedValue && normalizedValue.length < 2) {
                    return Promise.reject(new Error('项目名称至少2个字符'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input 
              placeholder="例如：产品宣传视频" 
              maxLength={50}
              showCount
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="项目类型"
            rules={[{ required: true, message: '请选择项目类型' }]}
            hidden
          >
            <Select />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目描述（可选）"
          >
            <TextArea 
              placeholder="简要描述项目的目标和内容..." 
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<PlusOutlined />}
              block
              size="large"
            >
              创建项目
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProjectCreate;
