import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { 
  Tabs, 
  Button, 
  Input, 
  Select, 
  Space, 
  Card, 
  List, 
  Avatar,
  Typography,
  Tag,
  Tooltip,
  Slider,
  Progress,
  Collapse,
  Divider,
  Switch,
  message,
} from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  ScissorOutlined,
  AudioOutlined,
  BulbOutlined,
  TranslationOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID } from '@/core/config/models.config';
import type { ModelProvider, AIModel } from '@/core/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '@/core/utils/model-availability';
import styles from './AIAssistant.module.less';

const { TabPane } = Tabs;
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface AIAssistantProps {}

interface AssistantMessage {
  role: 'ai' | 'user';
  content: string;
  time: Date;
}

const AIAssistant: React.FC<AIAssistantProps> = () => {
  const [apiKeys] = useLocalStorage<Partial<Record<ModelProvider, { key: string; isValid?: boolean }>>>('api_keys', {});
  const [activeTab, setActiveTab] = useState('chat');
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  
  // Store interval IDs for cleanup
  const progressIntervalRef = useRef<number | null>(null);
  
  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // AI model options
  const models = useMemo(() => {
    const configuredModels = getAvailableModelsFromApiKeys(apiKeys, CORE_AI_MODELS as any);
    return (configuredModels as AIModel[]).map((model: AIModel) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
    }));
  }, [apiKeys]);

  const resolvedModelId = resolveDefaultModelId(selectedModelId, models);

  const allModels = CORE_AI_MODELS.filter((model) => model.isAvailable !== false).map((model) => ({
    id: model.id,
    name: model.name,
    provider: model.provider,
  }));
  const selectableModels = models.length > 0 ? models : allModels;
  
  // Send message
  const sendMessage = useCallback(async () => {
    if (!prompt.trim()) return;
    
    const userMessage: AssistantMessage = {
      role: 'user',
      content: prompt,
      time: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    const currentPrompt = prompt;
    setPrompt('');
    setProcessing(true);
    
    try {
      const { aiService } = await import('@/core/services/ai.service');
      
      const model = CORE_AI_MODELS.find(m => m.id === selectedModelId) || CORE_AI_MODELS[0];
      const providerKey = (apiKeys || {})[model.provider as ModelProvider];
      const settings = { enabled: true, apiKey: (providerKey?.key) || '', temperature: 0.7, maxTokens: 2000 };
      
      const response = await aiService.generateText(model, currentPrompt, settings);
      
      const aiMessage: AssistantMessage = {
        role: 'ai',
        content: response,
        time: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const aiMessage: AssistantMessage = {
        role: 'ai',
        content: '抱歉，AI 服务调用失败: ' + errorMsg,
        time: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setProcessing(false);
    }
  }, [prompt]);
  
  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Generate subtitles - calls actual subtitle service
  const generateSubtitles = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    throw new Error('Not implemented');
  }, []);
  
  // Smart cut - calls actual smart cut service
  const smartCut = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    throw new Error('Not implemented');
  }, []);
  
  // Render chat messages
  const renderMessages = () => {
    return messages.map((message, index) => (
      <div 
        key={index} 
        className={`${styles.message} ${message.role === 'ai' ? styles.aiMessage : styles.userMessage}`}
      >
        <div className={styles.messageAvatar}>
          {message.role === 'ai' ? (
            <Avatar icon={<RobotOutlined />} className={styles.aiAvatar} />
          ) : (
            <Avatar 
              className={styles.userAvatar}
              style={{ 
                backgroundColor: '#1890ff',
                color: '#fff'
              }}
            >
              U
            </Avatar>
          )}
        </div>
        <div className={styles.messageContent}>
          <div className={styles.messageText}>
            {message.content}
          </div>
          <div className={styles.messageTime}>
            {new Date(message.time).toLocaleTimeString()}
          </div>
        </div>
      </div>
    ));
  };
  
  return (
    <div className={styles.aiAssistantContainer}>
      <div className={styles.aiHeader}>
        <Title level={4} className={styles.aiTitle}>
          <RobotOutlined className={styles.aiIcon} /> AI助手
        </Title>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className={styles.aiTabs}
      >
        <TabPane tab="智能对话" key="chat" />
        <TabPane tab={<span>字幕生成 <Tag color="orange" style={{ marginLeft: 6, fontSize: 10 }}>即将推出</Tag></span>} key="subtitles" />
        <TabPane tab={<span>智能剪辑 <Tag color="orange" style={{ marginLeft: 6, fontSize: 10 }}>即将推出</Tag></span>} key="smartcut" />
        <TabPane tab="视频增强" key="enhance" />
      </Tabs>
      
      <div className={styles.aiContent}>
        {activeTab === 'chat' && (
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {renderMessages()}
            </div>
            
            <div className={styles.chatInput}>
              <div className={styles.modelSelector}>
                <Select
                  value={resolveDefaultModelId(resolvedModelId, selectableModels)}
                  style={{ width: '100%' }}
                  size="small"
                  onChange={setSelectedModelId}
                >
                  {selectableModels.map(model => (
                    <Option key={model.id} value={model.id}>
                      {model.name}
                    </Option>
                  ))}
                </Select>
              </div>
              <TextArea
                placeholder="请描述您需要的帮助..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                autoSize={{ minRows: 1, maxRows: 3 }}
                disabled={processing}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={sendMessage}
                disabled={!prompt.trim() || processing}
                className={styles.sendButton}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'subtitles' && (
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <Title level={5}>自动生成字幕</Title>
              <Paragraph className={styles.toolDescription}>
                使用AI识别视频中的语音内容，自动生成字幕并添加到时间轴
              </Paragraph>
              
              <div className={styles.toolOptions}>
                <div className={styles.optionItem}>
                  <Text>识别语言</Text>
                  <Input value="中文（固定）" disabled />
                </div>
                
                <div className={styles.optionItem}>
                  <Text>字幕格式</Text>
                  <Select
                    defaultValue="srt"
                    style={{ width: '100%' }}
                  >
                    <Option value="srt">SRT</Option>
                    <Option value="vtt">VTT</Option>
                    <Option value="ass">ASS</Option>
                  </Select>
                </div>
                
                <div className={styles.optionItem}>
                  <Space className={styles.switchOption}>
                    <Switch defaultChecked />
                    <Text>自动分段</Text>
                    <Tooltip title="根据语义自动将字幕分成多个段落">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                </div>
                
                <div className={styles.optionItem}>
                  <Space className={styles.switchOption}>
                    <Switch defaultChecked />
                    <Text>过滤语气词</Text>
                    <Tooltip title="移除'嗯'、'啊'等语气词，使字幕更加清晰">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                </div>
              </div>
              
              <Button
                type="primary"
                icon={<TranslationOutlined />}
                onClick={generateSubtitles}
                disabled={processing}
                loading={processing && activeTab === 'subtitles'}
                block
              >
                开始生成字幕
              </Button>
              
              {processing && activeTab === 'subtitles' && (
                <div className={styles.progressContainer}>
                  <Progress percent={progress} status="active" />
                  <div className={styles.progressStatus}>
                    {progress < 30 && '正在分析音频...'}
                    {progress >= 30 && progress < 60 && '识别语音内容...'}
                    {progress >= 60 && progress < 90 && '生成字幕文件...'}
                    {progress >= 90 && '完成中...'}
                  </div>
                </div>
              )}
            </Card>
            
            <Collapse ghost className={styles.extraOptions}>
              <Panel header="高级选项" key="1">
                <div className={styles.advancedOptions}>
                  <div className={styles.optionItem}>
                    <Text>识别精度</Text>
                    <Slider
                      defaultValue={80}
                      marks={{
                        40: '快速',
                        80: '标准',
                        95: '高精度'
                      }}
                    />
                  </div>
                  
                  <div className={styles.optionItem}>
                    <Text>翻译字幕</Text>
                    <Select
                      placeholder="当前版本固定中文"
                      style={{ width: '100%' }}
                      disabled
                    >
                      <Option value="zh-CN">简体中文</Option>
                    </Select>
                  </div>
                </div>
              </Panel>
            </Collapse>
          </div>
        )}
        
        {activeTab === 'smartcut' && (
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <Title level={5}>智能剪辑</Title>
              <Paragraph className={styles.toolDescription}>
                AI分析视频内容，自动移除不需要的部分，保留精华片段
              </Paragraph>
              
              <div className={styles.toolOptions}>
                <div className={styles.optionItem}>
                  <Text>剪辑模式</Text>
                  <Select
                    defaultValue="content"
                    style={{ width: '100%' }}
                  >
                    <Option value="content">内容优先</Option>
                    <Option value="pace">节奏优先</Option>
                    <Option value="compact">精简模式</Option>
                    <Option value="highlight">亮点提取</Option>
                  </Select>
                </div>
                
                <div className={styles.optionItem}>
                  <Text>目标时长</Text>
                  <Select
                    defaultValue="auto"
                    style={{ width: '100%' }}
                  >
                    <Option value="auto">自动优化</Option>
                    <Option value="30">30秒</Option>
                    <Option value="60">1分钟</Option>
                    <Option value="120">2分钟</Option>
                    <Option value="custom">自定义</Option>
                  </Select>
                </div>
                
                <div className={styles.optionItem}>
                  <Space className={styles.switchOption}>
                    <Switch defaultChecked />
                    <Text>移除沉默</Text>
                    <Tooltip title="自动检测并移除视频中的沉默部分">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                </div>
                
                <div className={styles.optionItem}>
                  <Space className={styles.switchOption}>
                    <Switch defaultChecked />
                    <Text>优化转场</Text>
                    <Tooltip title="在剪辑点添加平滑转场效果">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                </div>
              </div>
              
              <Button
                type="primary"
                icon={<ScissorOutlined />}
                onClick={smartCut}
                disabled={processing}
                loading={processing && activeTab === 'smartcut'}
                block
              >
                开始智能剪辑
              </Button>
              
              {processing && activeTab === 'smartcut' && (
                <div className={styles.progressContainer}>
                  <Progress percent={progress} status="active" />
                  <div className={styles.progressStatus}>
                    {progress < 30 && '分析视频内容...'}
                    {progress >= 30 && progress < 60 && '识别关键片段...'}
                    {progress >= 60 && progress < 90 && '优化剪辑点...'}
                    {progress >= 90 && '完成中...'}
                  </div>
                </div>
              )}
            </Card>
            
            <Collapse ghost className={styles.extraOptions}>
              <Panel header="高级选项" key="1">
                <div className={styles.advancedOptions}>
                  <div className={styles.optionItem}>
                    <Text>关键内容优先级</Text>
                    <Slider
                      defaultValue={70}
                      marks={{
                        30: '低',
                        70: '中',
                        95: '高'
                      }}
                    />
                  </div>
                  
                  <div className={styles.optionItem}>
                    <Text>场景检测灵敏度</Text>
                    <Slider
                      defaultValue={50}
                      marks={{
                        20: '低',
                        50: '中',
                        80: '高'
                      }}
                    />
                  </div>
                </div>
              </Panel>
            </Collapse>
          </div>
        )}
        
        {activeTab === 'enhance' && (
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <Title level={5}>视频增强</Title>
              <Paragraph className={styles.toolDescription}>
                AI提升视频质量，修复问题并应用智能效果
              </Paragraph>
              
              <div className={styles.enhanceOptions}>
                <div className={styles.enhanceOption}>
                  <Card className={styles.enhanceCard}>
                    <ThunderboltOutlined className={styles.enhanceIcon} />
                    <div className={styles.enhanceTitle}>画质提升</div>
                    <div className={styles.enhanceDesc}>提升清晰度和细节</div>
                    <Button size="small" className={styles.enhanceButton}>应用</Button>
                  </Card>
                </div>
                
                <div className={styles.enhanceOption}>
                  <Card className={styles.enhanceCard}>
                    <BulbOutlined className={styles.enhanceIcon} />
                    <div className={styles.enhanceTitle}>色彩优化</div>
                    <div className={styles.enhanceDesc}>改善对比度和饱和度</div>
                    <Button size="small" className={styles.enhanceButton}>应用</Button>
                  </Card>
                </div>
                
                <div className={styles.enhanceOption}>
                  <Card className={styles.enhanceCard}>
                    <AudioOutlined className={styles.enhanceIcon} />
                    <div className={styles.enhanceTitle}>音频降噪</div>
                    <div className={styles.enhanceDesc}>移除背景噪音</div>
                    <Button size="small" className={styles.enhanceButton}>应用</Button>
                  </Card>
                </div>
                
                <div className={styles.enhanceOption}>
                  <Card className={styles.enhanceCard}>
                    <ExperimentOutlined className={styles.enhanceIcon} />
                    <div className={styles.enhanceTitle}>智能特效</div>
                    <div className={styles.enhanceDesc}>应用AI生成的特效</div>
                    <Button size="small" className={styles.enhanceButton}>应用</Button>
                  </Card>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
