import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from "@/lib/utils";

// Simple grid replacement for Row/Col
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio';
import { CheckCircle, Bot, HelpCircle, Code, Video, Edit, Flame, Star, Zap } from 'lucide-react';
import { motion } from '@/components/common/motion-shim';
import { AI_MODELS as CORE_AI_MODELS, DEFAULT_MODEL_ID, MODEL_PROVIDERS } from '@/core/config/models.config';
import type { AIModel as CoreAIModel, ModelProvider } from '@/core/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { getAvailableModelsFromApiKeys, resolveDefaultModelId } from '@/core/utils/model-availability';
import styles from './AIModelSelector.module.less';

export type ModelCategory = 'text' | 'code' | 'image' | 'video' | 'all';

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
  provider: model.provider ?? 'openai',
  category: (Array.isArray(model.category) ? model.category : [model.category]).filter((item): item is Exclude<ModelCategory, 'all'> => item !== 'audio'),
  description: model.description ?? '',
  features: model.features ?? [],
  tokenLimit: model.tokenLimit ?? 4096,
  isPro: model.isPro,
  isAvailable: model.isAvailable !== false,
  avatar: MODEL_PROVIDERS[model.provider ?? 'openai']?.icon,
});

const getCategoryIcon = (cat: ModelCategory) => {
  switch (cat) {
    case 'text': return <Edit />;
    case 'code': return <Code />;
    case 'image': return <Bot />;
    case 'video': return <Video />;
    default: return <HelpCircle />;
  }
};

const getFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase();
  if (lowerFeature.includes('视觉') || lowerFeature.includes('图像')) return <Bot />;
  if (lowerFeature.includes('代码')) return <Code />;
  if (lowerFeature.includes('高级') || lowerFeature.includes('强大')) return <Zap />;
  if (lowerFeature.includes('创意')) return <Star />;
  return <Flame />;
};

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
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const allModels = useMemo(() => CORE_AI_MODELS.map(toDisplayModel), []);

  const candidateModels = useMemo(() => {
    if (!respectApiKeyConfig) return allModels.filter((model) => model.isAvailable !== false);
    return getAvailableModelsFromApiKeys(apiKeys, allModels);
  }, [allModels, apiKeys, respectApiKeyConfig]);

  useEffect(() => {
    const nextSelectedModelId = resolveDefaultModelId(selectedModel, candidateModels);
    if (nextSelectedModelId !== selectedModelId) {
      setSelectedModelId(nextSelectedModelId);
      onChange?.(nextSelectedModelId);
    }
  }, [candidateModels, onChange, selectedModel, selectedModelId]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && viewMode === 'card') setViewMode('list');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const getProviderName = useCallback((provider: ModelProvider): string => {
    return MODEL_PROVIDERS[provider]?.name || provider;
  }, []);

  const filteredModels = useMemo(() => {
    return candidateModels.filter(model => {
      if (activeCategory !== 'all' && !model.category.includes(activeCategory)) return false;
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

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    if (onChange) onChange(modelId);
  }, [onChange]);

  const loadingRef = useRef<boolean>(false);
  const simulateLoading = useCallback(() => {
    loadingRef.current = true;
    setTimeout(() => { loadingRef.current = false; }, 500);
  }, []);

  const categoryOptions = [
    { label: '全部', value: 'all' as ModelCategory, icon: <Bot /> },
    { label: '文本', value: 'text' as ModelCategory, icon: <Edit /> },
    { label: '代码', value: 'code' as ModelCategory, icon: <Code /> },
    { label: '图像', value: 'image' as ModelCategory, icon: <Bot /> },
    { label: '视频', value: 'video' as ModelCategory, icon: <Video /> },
  ];

  return (
    <motion.div className={`${styles.container} ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.div className={styles.header} initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2 mb-2">
          <h4 className={`${styles.title} ${compact ? 'text-base' : 'text-lg'} font-semibold`}>选择AI模型</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><HelpCircle className={styles.helpIcon} /></TooltipTrigger>
              <TooltipContent>选择不同的AI模型以适应您的任务需求</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={styles.controls}>
          {!compact && (
            <Input
              placeholder="搜索模型..."
              onChange={(e) => { setSearchQuery(e.target.value); simulateLoading(); }}
              className={styles.searchInput}
            />
          )}
          {!isMobile && !compact && (
            <div className="flex rounded-md overflow-hidden border">
              <button
                className={`px-3 py-1.5 text-sm ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
                onClick={() => setViewMode('card')}
              >卡片</button>
              <button
                className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}
                onClick={() => setViewMode('list')}
              >列表</button>
            </div>
          )}
        </div>
      </motion.div>

      {!compact && (
        <motion.div className={styles.categorySelector} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex gap-2 flex-wrap">
            {categoryOptions.map(opt => (
              <button
                key={opt.value}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${activeCategory === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                onClick={() => setActiveCategory(opt.value)}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className={styles.content}>
        {loadingRef.current ? (
          <div className={styles.loadingContainer}>加载中...</div>
        ) : viewMode === 'card' ? (
          <div className={`${styles.modelGrid} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`}>
            {filteredModels.map((model, index) => (
              <div key={model.id}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                  <Card
                    className={`${styles.modelCard} ${selectedModelId === model.id ? styles.selectedModel : ''}`}
                    onClick={() => handleModelSelect(model.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {typeof model.avatar === 'string' ? (
                          <Avatar size="lg"><AvatarImage src={model.avatar} /><AvatarFallback>{model.name[0]}</AvatarFallback></Avatar>
                        ) : (
                          <Avatar size="lg"><AvatarFallback style={{ backgroundColor: '#1E88E5' }}>{model.name[0]}</AvatarFallback></Avatar>
                        )}
                        <div>
                          <div className="font-medium">{model.name}</div>
                          {model.isPro && (
                            <Badge variant="secondary" className="text-xs mt-0.5">
                              <Star className={styles.checkIcon} /> 专业版
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedModelId === model.id && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
                          <CheckCircle className={styles.checkIcon} />
                        </motion.div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{getProviderName(model.provider)}</Badge>
                      <div className="flex gap-1">
                        {model.category.map(cat => (
                          <TooltipProvider key={cat}>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="text-xs">{getCategoryIcon(cat)}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {cat === 'text' ? '文本' : cat === 'code' ? '代码' : cat === 'image' ? '图像' : '视频'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{model.description}</p>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {model.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {getFeatureIcon(feature)}{feature}
                        </Badge>
                      ))}
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-xs text-muted-foreground">
                          <Zap /> {(model.tokenLimit / 1000).toFixed(0)}K tokens
                        </TooltipTrigger>
                        <TooltipContent>模型可处理的最大上下文长度</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Card>
                </motion.div>
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup value={selectedModelId} onValueChange={handleModelSelect} className={styles.modelList}>
            {filteredModels.map((model, index) => (
              <motion.div
                key={model.id}
                className={`${styles.modelListItem} flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedModelId === model.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => handleModelSelect(model.id)}
              >
                <RadioGroupItem value={model.id} />
                <div className="flex items-center gap-2">
                  {typeof model.avatar === 'string' ? (
                    <Avatar size="sm"><AvatarImage src={model.avatar} /><AvatarFallback>{model.name[0]}</AvatarFallback></Avatar>
                  ) : (
                    <Avatar size="sm"><AvatarFallback style={{ backgroundColor: '#1E88E5' }}>{model.name[0]}</AvatarFallback></Avatar>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{model.name}</span>
                      {model.isPro && <Badge variant="secondary" className="text-xs"><Star className="size-3" /> Pro</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getProviderName(model.provider)}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-0.5">
                            <Zap /> {(model.tokenLimit / 1000).toFixed(0)}K
                          </TooltipTrigger>
                          <TooltipContent>模型可处理的最大上下文长度</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </RadioGroup>
        )}
      </div>

      {onConfigureAPI && (
        <motion.div className={styles.footer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <Button variant="link" onClick={() => onConfigureAPI(allModels.find(m => m.id === selectedModelId)?.provider || 'openai')}>
            <Zap className="mr-1" />
            配置API密钥
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default React.memo(AIModelSelector);
