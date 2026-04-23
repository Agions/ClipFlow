/**
 * AI 剪辑助手组件
 * 提供智能剪辑点检测、自动剪辑建议、批量处理界面
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Eye,
  Bot,
  PlayCircle,
} from 'lucide-react';
import { useAIClipAssistant } from './hooks/useAIClipAssistant';
import { ConfigStep, AnalyzeStep, SuggestionsStep, PreviewStep } from './components';
import type { AIClipAssistantProps } from './types';
import styles from './index.module.less';

const CLIP_STEPS = [
  { title: '配置', icon: <Settings size={14} /> },
  { title: '分析', icon: <Eye size={14} /> },
  { title: '建议', icon: <Bot size={14} /> },
  { title: '预览', icon: <PlayCircle size={14} /> }
];

export const AIClipAssistant: React.FC<AIClipAssistantProps> = ({
  videoInfo,
  onAnalysisComplete,
  onApplySuggestions
}) => {
  const {
    currentStep,
    setCurrentStep,
    analyzing,
    analysisProgress,
    analysisResult,
    error,
    selectedSuggestions,
    previewSegments,
    config,
    updateConfig,
    handleAnalyze,
    handleSmartClip,
    handleApplySuggestions,
    toggleSuggestion,
    selectAllSuggestions,
    deselectAllSuggestions
  } = useAIClipAssistant(videoInfo, onAnalysisComplete, onApplySuggestions);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <ConfigStep
            videoInfo={videoInfo}
            config={config}
            analyzing={analyzing}
            onConfigChange={updateConfig}
            onAnalyze={handleAnalyze}
            onSmartClip={handleSmartClip}
          />
        );
      case 1:
        return (
          <AnalyzeStep
            analyzing={analyzing}
            analysisProgress={analysisProgress}
            analysisResult={analysisResult}
          />
        );
      case 2:
        return (
          <SuggestionsStep
            analysisResult={analysisResult}
            selectedSuggestions={selectedSuggestions}
            onToggleSuggestion={toggleSuggestion}
            onSelectAll={selectAllSuggestions}
            onDeselectAll={deselectAllSuggestions}
            onApply={handleApplySuggestions}
          />
        );
      case 3:
        return (
          <PreviewStep
            videoInfo={videoInfo}
            previewSegments={previewSegments}
            onReset={() => setCurrentStep(0)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.aiClipAssistant}>
      <Card className={styles.headerCard}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot size={20} />
            AI 智能剪辑助手
          </CardTitle>
          <CardDescription>
            自动检测剪辑点、识别静音片段、提取关键帧，并生成智能剪辑建议
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className={styles.errorAlert}>
          <AlertDescription>
            <strong>错误</strong>: {error}
          </AlertDescription>
        </Alert>
      )}

      <div className={styles.stepIndicators}>
        {CLIP_STEPS.map((step, index) => (
          <button
            key={index}
            className={`${styles.stepIndicator} ${index === currentStep ? styles.active : ''} ${index > currentStep ? styles.disabled : ''}`}
            onClick={() => index <= currentStep + 1 && setCurrentStep(index)}
            disabled={index > currentStep + 1}
          >
            <div className={styles.stepIcon}>{step.icon}</div>
            <span className={styles.stepTitle}>{step.title}</span>
          </button>
        ))}
      </div>

      <div className={styles.stepContent}>{renderStepContent()}</div>
    </div>
  );
};

export default AIClipAssistant;
