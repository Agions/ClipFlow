import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Row, Col, Typography, Tag, Avatar, Radio, Space, Tooltip, Button, Input, Segmented, Spin } from 'antd';
import { CheckCircleFilled, RobotOutlined, QuestionCircleOutlined, CodeOutlined, VideoCameraOutlined, EditOutlined, FireOutlined, StarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { motion } from '@/components/common/motion-shim';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID, MODEL_PROVIDERS } from '@/core/config/models.config';
import type { AIModel as CoreAIModel, ModelProvider } from '@/core/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '@/core/utils/model-availability';
import styles from './AIModelSelector.module.less';

const { Title, Text, Paragraph } = Typography;

// 模型类型定义
export type ModelCategory = 'text' | 'code' | 'image' | 'video' | 'all';

/** Display model shape used internally by AIModelSelector */
export interface DisplayAIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  category: ModelCategory[];
  description: string;
  features: string[];
  tokenLimit: number;
  isPro?: boolean;
  isAvailable?: boolean;
  apiConfigured?: boolean;
  avatar?: string | React.ReactNode;
}

// 定义组件属性
interface AIModelSelectorProps {
  selectedModel?: string;
  onChange?: (modelId: string) => void;
  onConfigureAPI?: (provider: ModelProvider) => void;
  category?: ModelCategory;
  compact?: boolean;
  className?: string;
  respectApiKeyConfig?: boolean;
}

const toDisplayModel = (model: CoreAIModel): DisplayAIModel => ({
  id: model.id,
  name: model.name,
  provider: model.provider,
  category: (Array.isArray(model.category) ? model.category : [model.category]).filter((item): item is Exclude<ModelCategory, 'all'> => item !== 'audio'),
  description: model.description,
  features: model.features,
  tokenLimit: model.tokenLimit,
  isPro: model.isPro,
  isAvailable: model.isAvailable !== false,
  avatar: MODEL_PROVIDERS[model.provider]?.icon,
});

const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  selectedModel = DEFAULT_MODEL_ID,
  onChange,
  onConfigureAPI,
  category = 'all',
  compact = false,
  className = '',
  respectApiKeyConfig = true,
}) => {
  const [apiKeys] = useLocalStorage<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>('api_keys', {});
  const [selectedModelId, setSelectedModelId] = useState<string>(selectedModel);
  const [activeCategory, setActiveCategory] = useState<ModelCategory>(category);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>(compact ? 'list' : 'card');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const allModels = useMemo(() => CORE_AI_MODELS.map(toDisplayModel), []);

  const candidateModels = useMemo(() => {
    if (!respectApiKeyConfig) {
      return allModels.filter((model) => model.isAvailable !== false);
    }
    return getAvailableModelsFromApiKeys(apiKeys, allModels);
  }, [allModels, apiKeys, respectApiKeyConfig]);

  useEffect(() => {
    const nextSelectedModelId = resolveDefaultModelId(selectedModel, candidateModels);
    if (nextSelectedModelId !== selectedModelId) {
      setSelectedModelId(nextSelectedModelId);
      onChange?.(nextSelectedModelId);
    }
  }, [candidateModels, onChange, selectedModel, selectedModelId]);

  // 响应式布局处理
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && viewMode === 'card') {
        setViewMode('list');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // 获取提供商显示名称
  const getProviderName = useCallback((provider: ModelProvider): string => {
    return MODEL_PROVIDERS[provider]?.name || provider;
  }, []);

  // 获取类别图标
  const getCategoryIcon = useCallback((cat: ModelCategory) => {
    switch (cat) {
      case 'text': return <EditOutlined />;
      case 'code': return <CodeOutlined />;
      case 'image': return <RobotOutlined />;
      case 'video': return <VideoCameraOutlined />;
      default: return <QuestionCircleOutlined />;
    }
  }, []);

  // 获取特性图标
  const getFeatureIcon = useCallback((feature: string) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('视觉') || lowerFeature.includes('图像')) return <RobotOutlined />;
    if (lowerFeature.includes('代码')) return <CodeOutlined />;
    if (lowerFeature.includes('高级') || lowerFeature.includes('强大')) return <ThunderboltOutlined />;
    if (lowerFeature.includes('创意')) return <StarOutlined />;
    return <FireOutlined />;
  }, []);

  // 过滤模型
  const filteredModels = useMemo(() => {
    return candidateModels.filter(model => {
      // 类别过滤
      if (activeCategory !== 'all' && !model.category.includes(activeCategory)) {
        return false;
      }
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          model.name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          model.description.toLowerCase().includes(query) ||
          model.features.some(f => f.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [activeCategory, candidateModels, searchQuery]);

  // 处理模型选择
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    if (onChange) {
      onChange(modelId);
    }
  }, [onChange]);

  // 渲染卡片模式UI
  const renderCardView = useCallback(() => (
    <Row gutter={[16, 16]} className={styles.modelGrid}>
      {filteredModels.map((model, index) => (
        <Col xs={24} sm={12} md={8} lg={6} key={model.id}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card 
              hoverable
              className={`${styles.modelCard} ${selectedModelId === model.id ? styles.selectedModel : ''}`}
              onClick={() => handleModelSelect(model.id)}
              bodyStyle={{ padding: '16px' }}
            >
              <div className={styles.modelHeader}>
                <Space align="center">
                  {typeof model.avatar === 'string' ? (
                    <Avatar src={model.avatar} size={40} className={styles.modelAvatar} />
                  ) : (
                    <Avatar icon={model.avatar || <RobotOutlined />} size={40} className={styles.modelAvatar} style={{ backgroundColor: '#1E88E5' }} />
                  )}
                  <div>
                    <Text strong className={styles.modelName}>{model.name}</Text>
                    {model.isPro && (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          duration: 0.5,
                          delay: 0
                        }}
                        style={{ display: 'inline-block' }}
                      >
                        <Tag color="gold" className={styles.proTag}>
                          <StarOutlined /> 专业版
                        </Tag>
                      </motion.div>
                    )}
                  </div>
                </Space>
                {selectedModelId === model.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <CheckCircleFilled className={styles.checkIcon} />
                  </motion.div>
                )}
              </div>
              
              <div className={styles.providerInfo}>
                <Tag color="processing" className={styles.providerTag}>{getProviderName(model.provider)}</Tag>
                <div className={styles.categories}>
                  {model.category.map(cat => (
                    <Tooltip key={cat} title={cat === 'text' ? '文本' : cat === 'code' ? '代码' : cat === 'image' ? '图像' : '视频'}>
                      <Tag icon={getCategoryIcon(cat)} className={styles.categoryTag}></Tag>
                    </Tooltip>
                  ))}
                </div>
              </div>
              
              <Paragraph className={styles.modelDescription} ellipsis={{ rows: 2 }}>{model.description}</Paragraph>
              
              <div className={styles.modelFeatures}>
                {model.features.slice(0, 3).map((feature, index) => (
                  <Tag 
                    key={index} 
                    className={styles.featureTag}
                    icon={getFeatureIcon(feature)}
                  >
                    {feature}
                  </Tag>
                ))}
              </div>
              
              <div className={styles.tokenLimit}>
                <Tooltip title="模型可处理的最大上下文长度">
                  <Text type="secondary" className={styles.tokenText}>
                    <ThunderboltOutlined /> {(model.tokenLimit / 1000).toFixed(0)}K tokens
                  </Text>
                </Tooltip>
              </div>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  ), [filteredModels, selectedModelId, handleModelSelect, getProviderName, getCategoryIcon, getFeatureIcon]);

  // 渲染列表模式UI
  const renderListView = useCallback(() => (
    <div className={styles.modelList}>
      <Radio.Group 
        value={selectedModelId} 
        onChange={(e) => handleModelSelect(e.target.value)}
        className={styles.modelRadioGroup}
      >
        {filteredModels.map((model, index) => (
          <motion.div 
            key={model.id} 
            className={styles.modelListItem}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            whileHover={{ x: 4 }}
          >
            <Radio value={model.id} className={styles.modelRadio}>
              <Space align="center">
                {typeof model.avatar === 'string' ? (
                  <Avatar src={model.avatar} size={28} className={styles.modelAvatarSmall} />
                ) : (
                  <Avatar icon={model.avatar || <RobotOutlined />} size={28} className={styles.modelAvatarSmall} style={{ backgroundColor: '#1E88E5' }} />
                )}
                <div>
                  <div className={styles.modelNameRow}>
                    <Text strong>{model.name}</Text>
                    {model.isPro && (
                      <Tag color="gold" className={styles.proTagSmall}>
                        <StarOutlined /> Pro
                      </Tag>
                    )}
                  </div>
                  <div className={styles.modelProviderRow}>
                    <Text type="secondary">{getProviderName(model.provider)}</Text>
                    <Tooltip title="模型可处理的最大上下文长度">
                      <span className={styles.tokenBadge}>
                        <ThunderboltOutlined /> {(model.tokenLimit / 1000).toFixed(0)}K
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </Space>
            </Radio>
          </motion.div>
        ))}
      </Radio.Group>
    </div>
  ), [filteredModels, selectedModelId, handleModelSelect, getProviderName]);

  // 渲染类别选择器
  const renderCategorySelector = useCallback(() => (
    <motion.div 
      className={styles.categorySelector}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Segmented
        value={activeCategory}
        onChange={(value) => {
          setActiveCategory(value as ModelCategory);
          // 添加简单的动画效果
          const container = document.querySelector(`.${styles.content}`);
          if (container) {
            container.classList.add(styles.fadeEffect);
            setTimeout(() => {
              container.classList.remove(styles.fadeEffect);
            }, 300);
          }
        }}
        options={[
          { label: '全部', value: 'all', icon: <RobotOutlined /> },
          { label: '文本', value: 'text', icon: <EditOutlined /> },
          { label: '代码', value: 'code', icon: <CodeOutlined /> },
          { label: '图像', value: 'image', icon: <RobotOutlined /> },
          { label: '视频', value: 'video', icon: <VideoCameraOutlined /> },
        ]}
      />
    </motion.div>
  ), [activeCategory]);

  // 加载状态引用
  const loadingRef = useRef<boolean>(false);
  
  // 模拟加载效果
  const simulateLoading = useCallback(() => {
    loadingRef.current = true;
    setTimeout(() => {
      loadingRef.current = false;
    }, 500);
  }, []);

  // 主渲染函数
  return (
    <motion.div 
      className={`${styles.container} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className={styles.header}
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Title level={compact ? 5 : 4} className={styles.title}>
          选择AI模型
          <Tooltip title="选择不同的AI模型以适应您的任务需求">
            <QuestionCircleOutlined className={styles.helpIcon} />
          </Tooltip>
        </Title>
        
        <div className={styles.controls}>
          {!compact && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Input.Search 
                placeholder="搜索模型..." 
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  simulateLoading();
                }}
                className={styles.searchInput}
                allowClear
              />
            </motion.div>
          )}
          
          {!isMobile && !compact && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Radio.Group 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                className={styles.viewToggle}
              >
                <Radio.Button value="card">卡片</Radio.Button>
                <Radio.Button value="list">列表</Radio.Button>
              </Radio.Group>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      {!compact && renderCategorySelector()}
      
      <div className={styles.content}>
        {loadingRef.current ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" tip="加载模型中..." />
          </div>
        ) : (
          viewMode === 'card' ? renderCardView() : renderListView()
        )}
      </div>

      {onConfigureAPI && (
        <motion.div 
          className={styles.footer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
            <Button 
            type="link" 
            onClick={() => onConfigureAPI(allModels.find(m => m.id === selectedModelId)?.provider || 'openai')}
            icon={<ThunderboltOutlined />}
          >
            配置API密钥
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default React.memo(AIModelSelector);
