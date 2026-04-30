/**
 * 系统设置页面
 * 管理应用配置、API密钥及系统设置
 *
 * @author Agions
 * @version 1.2.0
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Key,
  Bot,
  Settings as SettingsIcon,
  Info,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import useTranslation from '../../utils/i18n';
import useLocalStorage from '../../hooks/useLocalStorage';
import ApiKeysPanel from '../../components/Settings/ApiKeysPanel';
import ModelSettingsPanel from '../../components/Settings/ModelSettingsPanel';
import GeneralSettingsPanel from '../../components/Settings/GeneralSettingsPanel';
import { ModelProvider } from '../../constants/models';
import { AI_MODELS as CORE_MODELS, DEFAULT_MODEL_ID } from '../../core/config/models.config';
import {
  getAvailableModelsFromApiKeys,
  resolveDefaultModelId,
} from '../../core/utils/model-availability';
import { useModelStore } from '../../store';
import { notify } from '../../shared';
import { PROJECT_SAVE_BEHAVIOR_KEY, type ProjectSaveBehavior } from '../../shared/constants/settings';
import packageJson from '../../../package.json';
import styles from './index.module.less';

interface ApiKeyConfig {
  key: string;
  isValid?: boolean;
}

const Settings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('models');
  const [isLoading, setIsLoading] = useState(true);
  const updateAIModelSettings = useModelStore(state => state.updateAIModelSettings);

  // 设置状态
  const [defaultModel, setDefaultModel] = useLocalStorage<string>(
    'default_model',
    DEFAULT_MODEL_ID
  );
  const [apiKeys, setApiKeys] = useLocalStorage<Partial<Record<ModelProvider, ApiKeyConfig>>>(
    'api_keys',
    {}
  );
  const [autoSave, setAutoSave] = useLocalStorage<boolean>('auto_save', true);
  const [compactMode, setCompactMode] = useLocalStorage<boolean>('compact_mode', false);
  const [theme, setTheme] = useLocalStorage<string>('theme', 'auto');
  const [projectSaveBehavior, setProjectSaveBehavior] = useLocalStorage<ProjectSaveBehavior>(
    PROJECT_SAVE_BEHAVIOR_KEY,
    'stay'
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const availableModels = getAvailableModelsFromApiKeys(apiKeys, CORE_MODELS);
    const nextDefaultModel = resolveDefaultModelId(defaultModel, availableModels);
    if (nextDefaultModel !== defaultModel) {
      setDefaultModel(nextDefaultModel);
    }
  }, [apiKeys, defaultModel, setDefaultModel]);

  const availableModels = getAvailableModelsFromApiKeys(apiKeys, CORE_MODELS);

  // API 密钥管理
  const handleUpdateApiKey = (provider: ModelProvider, key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: { key, isValid: undefined },
    }));
    updateAIModelSettings(provider, {
      enabled: Boolean(key.trim()),
      apiKey: key.trim() || undefined,
    });
  };

  const handleDeleteApiKey = (provider: ModelProvider) => {
    setApiKeys(prev => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
    updateAIModelSettings(provider, {
      enabled: false,
      apiKey: undefined,
    });
    notify.success('API 密钥已删除');
  };

  // 模型设置
  const handleModelChange = (model: string) => {
    setDefaultModel(model);
    notify.success('默认模型已更新');
  };

  // 通用设置
  const handleReset = () => {
    setAutoSave(true);
    setCompactMode(false);
    setTheme('auto');
    setProjectSaveBehavior('stay');
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (themeContext?.toggleTheme) {
      if (newTheme === 'dark') {
        themeContext.toggleTheme();
      } else if (newTheme === 'light' && isDarkMode) {
        themeContext.toggleTheme();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className="text-2xl font-bold mb-1">{t('settings.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('settings.subtitle')}</p>
      </div>

      <Card className={`${styles.settingsCard} ${isDarkMode ? styles.darkCard : ''}`}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className={styles.tabs}
        >
          <TabsList>
            <TabsTrigger value="models">
              <Bot size={14} /> {t('settings.models')}
            </TabsTrigger>
            <TabsTrigger value="api">
              <Key size={14} /> API 密钥
            </TabsTrigger>
            <TabsTrigger value="general">
              <SettingsIcon size={14} /> {t('settings.general')}
            </TabsTrigger>
            <TabsTrigger value="about">
              <Info size={14} /> {t('settings.about')}
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Lock size={14} /> 隐私
            </TabsTrigger>
          </TabsList>
          <TabsContent value="models">
            <ModelSettingsPanel
              defaultModel={defaultModel}
              availableModels={availableModels}
              onModelChange={handleModelChange}
            />
          </TabsContent>
          <TabsContent value="api">
            <ApiKeysPanel
              apiKeys={apiKeys}
              onUpdateKey={handleUpdateApiKey}
              onDeleteKey={handleDeleteApiKey}
            />
          </TabsContent>
          <TabsContent value="general">
            <GeneralSettingsPanel
              autoSave={autoSave}
              compactMode={compactMode}
              theme={theme}
              projectSaveBehavior={projectSaveBehavior}
              onAutoSaveChange={setAutoSave}
              onCompactModeChange={setCompactMode}
              onThemeChange={handleThemeChange}
              onProjectSaveBehaviorChange={setProjectSaveBehavior}
              onReset={handleReset}
            />
          </TabsContent>
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>{t('app.name')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">
                  {t('app.name')}{' '}
                  是一款专业的短视频剪辑工具，集成了AI技术，帮助创作者更高效地创建优质内容。
                </p>
                <p>版本: {packageJson.version} | 作者: Agions</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>隐私与数据</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  CutDeck
                  高度重视您的隐私。所有API密钥和个人设置仅存储在您的本地设备上，没有任何数据会传输到我们的服务器。
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Settings;
