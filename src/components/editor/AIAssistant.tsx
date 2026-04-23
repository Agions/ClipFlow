import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Progress, ProgressIndicator } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Bot,
  Send,
  Scissors,
  Volume2,
  Lightbulb,
  Languages,
  Zap,
  FlaskConical as Flask,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID } from '@/core/config/models.config';
import type { ModelProvider, AIModel } from '@/core/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '@/core/utils/model-availability';
import styles from './AIAssistant.module.less';

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

  const progressIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const models = useMemo(() => {
    const configuredModels = getAvailableModelsFromApiKeys(apiKeys, CORE_AI_MODELS);
    return configuredModels.map((model: AIModel) => ({
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateSubtitles = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    throw new Error('Not implemented');
  }, []);

  const smartCut = useCallback(async () => {
    setProcessing(true);
    setProgress(0);
    throw new Error('Not implemented');
  }, []);

  const renderMessages = () => {
    return messages.map((msg, index) => (
      <div
        key={index}
        className={`${styles.message} ${msg.role === 'ai' ? styles.aiMessage : styles.userMessage}`}
      >
        <div className={styles.messageAvatar}>
          {msg.role === 'ai' ? (
            <Avatar className={styles.aiAvatar}>
              <AvatarFallback><Bot size={16} /></AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className={styles.userAvatar} style={{ backgroundColor: '#1890ff', color: '#fff' }}>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className={styles.messageContent}>
          <div className={styles.messageText}>{msg.content}</div>
          <div className={styles.messageTime}>
            {new Date(msg.time).toLocaleTimeString()}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className={styles.aiAssistantContainer}>
      <div className={styles.aiHeader}>
        <h4 className={styles.aiTitle}>
          <Bot size={18} className={styles.aiIcon} /> AI助手
        </h4>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.aiTabs}>
        <TabsList>
          <TabsTrigger value="chat">智能对话</TabsTrigger>
          <TabsTrigger value="subtitles">
            字幕生成 <Badge variant="secondary" style={{ marginLeft: 6, fontSize: 10 }}>即将推出</Badge>
          </TabsTrigger>
          <TabsTrigger value="smartcut">
            智能剪辑 <Badge variant="secondary" style={{ marginLeft: 6, fontSize: 10 }}>即将推出</Badge>
          </TabsTrigger>
          <TabsTrigger value="enhance">视频增强</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {renderMessages()}
            </div>

            <div className={styles.chatInput}>
              <div className={styles.modelSelector}>
                <Select value={resolveDefaultModelId(resolvedModelId, selectableModels)} onValueChange={setSelectedModelId as any}>
                  <SelectTrigger className="w-full">
                    <SelectContent>
                      {selectableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px]"
                placeholder="请描述您需要的帮助..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                disabled={processing}
              />
              <Button
                variant="default"
                onClick={sendMessage}
                disabled={!prompt.trim() || processing}
                className={styles.sendButton}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subtitles" className="mt-4">
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <CardHeader>
                <CardTitle>自动生成字幕</CardTitle>
                <CardDescription className={styles.toolDescription}>
                  使用AI识别视频中的语音内容，自动生成字幕并添加到时间轴
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className={styles.toolOptions}>
                  <div className={styles.optionItem}>
                    <span className="text-sm">识别语言</span>
                    <Input value="中文（固定）" disabled />
                  </div>

                  <div className={styles.optionItem}>
                    <span className="text-sm">字幕格式</span>
                    <Select defaultValue="srt">
                      <SelectTrigger><SelectContent>
                        <SelectItem value="srt">SRT</SelectItem>
                        <SelectItem value="vtt">VTT</SelectItem>
                        <SelectItem value="ass">ASS</SelectItem>
                      </SelectContent></SelectTrigger>
                    </Select>
                  </div>

                  <div className={styles.optionItem}>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm">自动分段</span>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle size={14} /></TooltipTrigger>
                        <TooltipContent>根据语义自动将字幕分成多个段落</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className={styles.optionItem}>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm">过滤语气词</span>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle size={14} /></TooltipTrigger>
                        <TooltipContent>移除'嗯'、'啊'等语气词，使字幕更加清晰</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <Button
                  variant="default"
                  onClick={generateSubtitles}
                  disabled={processing}
                  className="w-full"
                >
                  <Languages size={16} style={{ marginRight: 8 }} />
                  开始生成字幕
                </Button>

                {processing && (
                  <div className={styles.progressContainer}>
                    <Progress value={progress} className="w-full">
                      <ProgressIndicator />
                    </Progress>
                    <div className={styles.progressStatus}>
                      {progress < 30 && '正在分析音频...'}
                      {progress >= 30 && progress < 60 && '识别语音内容...'}
                      {progress >= 60 && progress < 90 && '生成字幕文件...'}
                      {progress >= 90 && '完成中...'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <details className={styles.extraOptions}>
              <summary className="cursor-pointer p-2 text-sm text-muted-foreground hover:text-foreground">
                高级选项
              </summary>
              <div className={styles.advancedOptions}>
                <div className={styles.optionItem}>
                  <span className="text-sm">识别精度</span>
                  <Slider
                    defaultValue={[80]}
                    min={40}
                    max={95}
                    step={1}
                  />
                </div>

                <div className={styles.optionItem}>
                  <span className="text-sm">翻译字幕</span>
                  <Select placeholder="当前版本固定中文" disabled>
                    <SelectTrigger><SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                    </SelectContent></SelectTrigger>
                  </Select>
                </div>
              </div>
            </details>
          </div>
        </TabsContent>

        <TabsContent value="smartcut" className="mt-4">
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <CardHeader>
                <CardTitle>智能剪辑</CardTitle>
                <CardDescription className={styles.toolDescription}>
                  AI分析视频内容，自动移除不需要的部分，保留精华片段
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className={styles.toolOptions}>
                  <div className={styles.optionItem}>
                    <span className="text-sm">剪辑模式</span>
                    <Select defaultValue="content">
                      <SelectTrigger><SelectContent>
                        <SelectItem value="content">内容优先</SelectItem>
                        <SelectItem value="pace">节奏优先</SelectItem>
                        <SelectItem value="compact">精简模式</SelectItem>
                        <SelectItem value="highlight">亮点提取</SelectItem>
                      </SelectContent></SelectTrigger>
                    </Select>
                  </div>

                  <div className={styles.optionItem}>
                    <span className="text-sm">目标时长</span>
                    <Select defaultValue="auto">
                      <SelectTrigger><SelectContent>
                        <SelectItem value="auto">自动优化</SelectItem>
                        <SelectItem value="30">30秒</SelectItem>
                        <SelectItem value="60">1分钟</SelectItem>
                        <SelectItem value="120">2分钟</SelectItem>
                        <SelectItem value="custom">自定义</SelectItem>
                      </SelectContent></SelectTrigger>
                    </Select>
                  </div>

                  <div className={styles.optionItem}>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm">移除沉默</span>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle size={14} /></TooltipTrigger>
                        <TooltipContent>自动检测并移除视频中的沉默部分</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className={styles.optionItem}>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-sm">优化转场</span>
                      <Tooltip>
                        <TooltipTrigger><HelpCircle size={14} /></TooltipTrigger>
                        <TooltipContent>在剪辑点添加平滑转场效果</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <Button
                  variant="default"
                  onClick={smartCut}
                  disabled={processing}
                  className="w-full"
                >
                  <Scissors size={16} style={{ marginRight: 8 }} />
                  开始智能剪辑
                </Button>

                {processing && (
                  <div className={styles.progressContainer}>
                    <Progress value={progress} className="w-full">
                      <ProgressIndicator />
                    </Progress>
                    <div className={styles.progressStatus}>
                      {progress < 30 && '分析视频内容...'}
                      {progress >= 30 && progress < 60 && '识别关键片段...'}
                      {progress >= 60 && progress < 90 && '优化剪辑点...'}
                      {progress >= 90 && '完成中...'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <details className={styles.extraOptions}>
              <summary className="cursor-pointer p-2 text-sm text-muted-foreground hover:text-foreground">
                高级选项
              </summary>
              <div className={styles.advancedOptions}>
                <div className={styles.optionItem}>
                  <span className="text-sm">关键内容优先级</span>
                  <Slider defaultValue={[70]} min={30} max={95} />
                </div>

                <div className={styles.optionItem}>
                  <span className="text-sm">场景检测灵敏度</span>
                  <Slider defaultValue={[50]} min={20} max={80} />
                </div>
              </div>
            </details>
          </div>
        </TabsContent>

        <TabsContent value="enhance" className="mt-4">
          <div className={styles.toolContainer}>
            <Card className={styles.toolCard}>
              <CardHeader>
                <CardTitle>视频增强</CardTitle>
                <CardDescription className={styles.toolDescription}>
                  AI提升视频质量，修复问题并应用智能效果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={styles.enhanceOptions}>
                  {[
                    { icon: <Zap size={20} />, title: '画质提升', desc: '提升清晰度和细节', key: 'quality' },
                    { icon: <Lightbulb size={20} />, title: '色彩优化', desc: '改善对比度和饱和度', key: 'color' },
                    { icon: <Volume2 size={20} />, title: '音频降噪', desc: '移除背景噪音', key: 'audio' },
                    { icon: <Flask size={20} />, title: '智能特效', desc: '应用AI生成的特效', key: 'effects' },
                  ].map(item => (
                    <div key={item.key} className={styles.enhanceOption}>
                      <Card className={styles.enhanceCard}>
                        <CardContent className="flex flex-col items-center gap-2 p-4">
                          <div className={styles.enhanceIcon}>{item.icon}</div>
                          <div className={styles.enhanceTitle}>{item.title}</div>
                          <div className={styles.enhanceDesc}>{item.desc}</div>
                          <Button size="sm" variant="outline">应用</Button>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAssistant;
