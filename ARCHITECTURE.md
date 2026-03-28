# StoryForge 技术架构

## 概述

StoryForge 是一款基于 Tauri v2 的桌面应用，采用 React + TypeScript 构建前端，Rust 处理底层音视频操作。核心设计理念是将 AI 能力与视频创作流程深度融合。

---

## 目录结构

```
storyforge/
├── src/                          # 前端源码 (React)
│   ├── components/               # UI 组件
│   │   ├── AIPanel/             # AI 功能面板
│   │   ├── editor/              # 编辑器组件
│   │   └── common/              # 通用组件
│   ├── core/                    # 核心逻辑
│   │   ├── services/            # 业务服务层
│   │   │   ├── ai.service.ts           # AI 模型适配
│   │   │   ├── plotAnalysis.service.ts # 剧情分析 ✨NEW
│   │   │   ├── aiClip.service.ts       # 智能剪辑
│   │   │   ├── vision.service.ts       # 视觉分析
│   │   │   ├── asr.service.ts          # 语音转写
│   │   │   ├── subtitle.service.ts     # 字幕生成
│   │   │   ├── auto-music.service.ts   # 自动配乐
│   │   │   ├── export.service.ts       # 导出服务
│   │   │   └── workflow.service.ts    # 工作流
│   │   └── types/              # 领域模型 (TypeScript)
│   ├── pages/                  # 页面组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── store/                  # Zustand 状态管理
│   └── utils/                  # 工具函数
├── src-tauri/                  # Tauri/Rust 后端
│   └── src/
│       ├── lib.rs             # 库入口
│       └── main.rs            # 应用入口
├── docs/                       # 文档
└── scripts/                    # 构建脚本
```

---

## 核心模块

### 1. 剧情分析服务 (PlotAnalysisService) ✨NEW

**路径**: `src/core/services/plotAnalysis.service.ts`

```typescript
// 核心功能
class PlotAnalysisService {
  analyzePlot(videoInfo, config)     // 分析视频剧情结构
  generateEditTimeline(timeline, version)  // 生成剪辑时间线
}
```

**数据流**:

```
视频输入 → 场景检测 → 音频转写 → 情感分析 → LLM剧情理解 → 剧情图谱 → 剪辑建议
```

**关键类型**:

| 类型 | 说明 |
|------|------|
| `PlotTimeline` | 剧情图谱，包含所有节点 |
| `PlotNode` | 单个剧情节点（时间戳、类型、重要性等）|
| `PlotClipSuggestion` | 剪辑建议 |

### 2. 智能剪辑服务 (AIClipService)

**路径**: `src/core/services/aiClip.service.ts`

```typescript
class AIClipService {
  analyzeVideo(videoInfo, config)   // 分析视频
  smartClip(videoInfo, target, style)  // 智能剪辑
  batchProcess(projectId, videos, config)  // 批量处理
}
```

### 3. 视觉分析服务 (VisionService)

**路径**: `src/core/services/vision.service.ts`

```typescript
class VisionService {
  detectScenesAdvanced(video, options)  // 高级场景检测
  detectEmotions(video)               // 情感识别
  extractKeyframes(video, options)    // 关键帧提取
  detectObjects(video)                 // 物体检测
}
```

### 4. AI 模型适配器 (AIService)

**路径**: `src/core/services/ai.service.ts`

统一封装多种 AI 模型 API:

| 厂商 | 模型 | 用途 |
|------|------|------|
| OpenAI | GPT-5.3 | 脚本生成、剧情理解 |
| Anthropic | Claude 4.6 | 对话、叙事分析 |
| Google | Gemini 3.1 | 多模态理解 |
| 阿里通义 | Qwen-Max | 中文理解 |
| 智谱 | GLM-5 | 中文任务 |
| DeepSeek | DeepSeek-R1 | 推理任务 |
| 月之暗面 | Kimi-k2 | 长文本处理 |

---

## 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│              (React Components + Ant Design)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ PlotAnalysis│  │  AIClip     │  │  Vision     │               │
│  │ Service     │  │  Service    │  │  Service    │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  ASR       │  │  Subtitle   │  │  Export     │               │
│  │  Service   │  │  Service    │  │  Service    │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Model Adapter                              │
│         (Unified interface for multiple AI providers)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ OpenAI   │       │Anthropic │       │  Google  │
    │   API    │       │   API    │       │   API    │
    └──────────┘       └──────────┘       └──────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri Backend (Rust)                          │
│    FFmpeg Integration │ File System │ Native Dialogs            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 工作流架构

### 标准剪辑工作流

```
1. Upload    →  2. Analyze   →  3. Template   →  4. Script    →  5. AIClip
   (上传视频)     (AI分析)       (选择模板)       (生成脚本)       (智能剪辑)
                     │                                        │
                     ▼                                        ▼
6. Timeline  →  7. Preview   →  8. Export
   (时间线)       (预览)         (导出)
```

### 剧情分析工作流 ✨NEW

```
1. Upload    →  2. PlotAnalysis   →  3. PlotTimeline   →  4. User Selects
   (上传视频)       (剧情分析)          (生成图谱)            (选择节点)
                                                                        │
                                                                        ▼
                                                              5. Generate Edit
                                                                 (生成剪辑)
                                                                        │
                                                                        ▼
                                                              6. Timeline/Export
```

---

## 状态管理 (Zustand)

| Store | 职责 |
|-------|------|
| `appStore` | 全局应用状态 |
| `projectStore` | 项目列表、当前项目 |
| `editorStore` | 编辑器状态、时间线 |
| `mainStore` | 主要业务状态 |

---

## 插件系统设计

StoryForge 支持通过插件扩展 AI 模型：

```typescript
// 插件接口
interface AIModelPlugin {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  
  // 模型配置
  models: AIModel[];
  
  // API 调用
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  
  // 特定能力
  capabilities?: {
    vision?: boolean;
    audio?: boolean;
    text?: boolean;
  };
}
```

---

## 扩展点

### 1. 新增 AI 模型

在 `ai.service.ts` 的 `MODEL_CONFIGS` 中添加:

```typescript
const MODEL_CONFIGS: Record<AIModelType, ModelConfig> = {
  // ... existing models
  newmodel: {
    url: 'https://api.newmodel.com/v1/chat',
    model: 'newmodel-latest',
    headers: (apiKey) => ({...}),
    transformRequest: (prompt) => ({...}),
    transformResponse: (data) => {...}
  }
};
```

### 2. 新增剪辑模式

在 `workflow/steps/aiClipStep.ts` 后新增步骤文件:

```typescript
// src/core/services/workflow/steps/plotClipStep.ts
export async function executePlotClipStep(...) { ... }
```

### 3. 新增服务模块

在 `src/core/services/` 下创建新服务文件:

```typescript
// src/core/services/newService.service.ts
export class NewService {
  // service implementation
}
export const newService = new NewService();
```

---

## 技术选型理由

| 技术 | 理由 |
|------|------|
| **Tauri v2** | 比 Electron 更轻量，Rust 后端性能强 |
| **React 18** | 成熟的组件化生态 |
| **TypeScript** | 类型安全，开发体验好 |
| **Zustand** | 轻量级状态管理，比 Redux 简单 |
| **Ant Design 5** | 企业级 UI 组件库 |
| **Vite 6** | 快速热更新和构建 |

---

## 性能优化策略

1. **组件懒加载** — React.lazy + Suspense
2. **图片懒加载** — Intersection Observer
3. **FFmpeg WebAssembly** — 浏览器端视频处理 fallback
4. **服务 Worker** — 离线缓存
5. **Vitest** — 快速单元测试

---

## 未来架构演进

- [ ] **插件市场** — 用户可安装第三方 AI 模型插件
- [ ] **云端渲染** — 可选的高性能云端视频渲染
- [ ] **协作功能** — 多用户实时协作编辑
- [ ] **视频知识图谱** — 更深入的语义理解

---

*Last updated: 2026-03-28*
