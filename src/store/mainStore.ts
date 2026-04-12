import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIModelType, AIModelSettings } from '@/types';

interface AppState {
  // AI 模型相关状态
  selectedAIModel: AIModelType;
  aiModelsSettings: Record<AIModelType, AIModelSettings>;

  // AI 模型相关操作
  setSelectedAIModel: (model: AIModelType) => void;
  updateAIModelSettings: (model: AIModelType, settings: Partial<AIModelSettings>) => void;
}

// 创建 store
export const useModelStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始 AI 模型为 OpenAI GPT-5.3
      selectedAIModel: 'openai',

      // 初始化各个 AI 模型的设置 - 2026年3月最新
      aiModelsSettings: {
        openai: { enabled: false },
        anthropic: { enabled: false },
        google: { enabled: false },
        alibaba: { enabled: false },
        zhipu: { enabled: false },
        iflytek: { enabled: false },
        deepseek: { enabled: false },
        moonshot: { enabled: false },
        azure: { enabled: false },
        local: { enabled: false },
        custom: { enabled: false },
      } as Record<AIModelType, AIModelSettings>,

      // 设置选中的 AI 模型
      setSelectedAIModel: (model: AIModelType) => set({ selectedAIModel: model }),

      // 更新 AI 模型设置
      updateAIModelSettings: (model: AIModelType, settings: Partial<AIModelSettings>) =>
        set((state) => ({
          aiModelsSettings: {
            ...state.aiModelsSettings,
            [model]: {
              ...state.aiModelsSettings[model],
              ...settings
            }
          }
        })),
    }),
    {
      name: 'cutdeck-app-settings',
      partialize: (state) => ({
        selectedAIModel: state.selectedAIModel,
        aiModelsSettings: state.aiModelsSettings,
      })
    }
  )
);

// 导出类型，方便使用
export type AIModelStore = ReturnType<typeof useModelStore>; 