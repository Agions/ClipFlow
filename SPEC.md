# CutDeck 架构文档

> 最后更新：2026-04-06 | v1.3.0

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand v5（持久化） |
| 样式 | Tailwind CSS + CSS Variables |
| 构建工具 | Vite |
| 桌面封装 | Tauri v2 |
| AI 服务 | 多 Provider（OpenAI/Anthropic/Google/DeepSeek/阿里/智谱/Kimi） |

---

## 目录结构

```
src/
├── core/                          # 核心业务模块（域驱动）
│   ├── types.ts                   # 全局类型定义（唯一类型出口）
│   ├── video/                     # 视频处理管道
│   │   ├── IVideoProcessor.ts    # 接口（后端无关）
│   │   ├── BaseVideoProcessor.ts # 基类（FFmpeg 缓存、错误归一化）
│   │   ├── TauriVideoProcessor.ts# Tauri invoke 实现
│   │   └── formatters.ts         # 纯格式化函数
│   ├── services/                  # 业务服务（类）
│   │   ├── editor/               # 编辑器服务
│   │   ├── workflow/             # 工作流引擎
│   │   │   ├── WorkflowEngine.ts  # 状态机引擎（订阅者模式）
│   │   │   ├── steps/            # 步骤执行器
│   │   │   │   ├── adapters.ts   # IStepExecutor 适配器（v1.2.0 新增）
│   │   │   │   └── steps/*.ts    # 各步骤实现
│   │   │   └── types.ts
│   │   ├── ai.service.ts         # AI 模型调用
│   │   └── vision.service.ts     # 场景/情绪/对象检测
│   ├── workflow/                  # 工作流定义
│   │   ├── featureBlueprint.ts   # 模式步骤定义
│   │   └── alignmentGate.ts      # 对齐门禁
│   ├── hooks/                    # React Hooks（CutDeck 专用）
│   │   ├── useWorkflowEngine.ts  # 新版工作流 hook（v1.2.0 新增）
│   │   └── useWorkflow.ts        # 旧版 hook（deprecated v1.2.0）
│   └── constants/                 # 常量定义
├── hooks/                         # 通用 Hooks（跨项目可用）
│   ├── use-timeline.ts
│   ├── useHistory.ts
│   ├── useLocalStorage.ts
│   └── useSettings.ts
├── store/                         # Zustand Stores（UI 状态）
│   ├── appStore.ts              # App 级（主题、侧边栏、通知）
│   ├── projectStore.ts           # 项目列表/筛选/排序
│   ├── editorStore.ts            # 编辑器状态（时间线、轨道）
│   └── mainStore.ts              # AI 模型设置 → useModelStore（v1.2.0 重命名）
└── services/                      # 兼容层 Facade
    ├── video.ts                   # → @/core/video
    └── export.ts                 # 导出服务
```

---

## 核心模块

### 视频处理管道

```
IVideoProcessor（接口）
    ↑
BaseVideoProcessor（基类） — FFmpeg 缓存、错误归一化、参数校验
    ↑
TauriVideoProcessor（实现） — 调用 Tauri invoke
```

**新增驱动方式**（WebCodecs 等）：
```typescript
class WebCodecsVideoProcessor extends BaseVideoProcessor {
  protected doAnalyze(path) { /* ... */ }
  protected doCut(input, output, segments, opts) { /* ... */ }
  // ...
}
```

### 工作流引擎

```
WorkflowEngine（状态机）
    ├── subscriber 模式（状态变更广播）
    ├── RetryRequest / SkipRequest 信号
    └── executeStep()（自动重试 + 步骤图执行）

步骤注册 → createWorkflowEngine() → engine.run()
React 连接 → useWorkflowEngine() hook
```

**已注册步骤**：`upload / analyze / template-select / script-generate / script-dedup / script-edit / subtitle / ai-clip / music / timeline-edit / preview / export`

---

## 状态管理

| Store | 用途 | 持久化 |
|-------|------|--------|
| `useAppStore` | 主题、侧边栏、通知 | ✅ |
| `useModelStore` | AI 模型选择/设置 | ✅ |
| `projectStore` | 项目列表、筛选、排序 | ✅ |
| `editorStore` | 时间线、轨道、片段 | ⚠️ 仅 video/zoom/volume |

---

## 类型定义规则

- **所有类型**定义在 `src/core/types.ts`
- Store 中 **不定义类型**（只引用）
- 枚举/常量定义在 `src/core/constants/`
- UI 组件使用 `interface`，Service 使用 `type`

---

## 废弃记录

| 项目 | 废弃版本 | 替代 |
|------|---------|------|
| `useWorkflow` | v1.2.0 | `useWorkflowEngine` |
| `WorkflowService` | v1.2.0 | `WorkflowEngine` + `createWorkflowEngine()` |
| `store/types.ts` | v1.2.0 | `@/core/types`（通用类型）+ `editorStore.ts` 内联（Store 私有类型） |
| `IVideoProcessor` 直接实现 | v1.2.0 | 继承 `BaseVideoProcessor` |
| `executeAIClipStep` 返回 void | <v1.3.0 | 返回 `ClipAnalysisResult | null`，结果写入 `WorkflowData.aiClipResult` |
| `musicStep` 未注册 | <v1.3.0 | `musicExecutor` 已注册，结果写入 `WorkflowData.musicStepOutput` |

---

## 开发命令

```bash
pnpm dev          # 开发服务器
pnpm build        # 生产构建
pnpm tauri dev    # Tauri 开发
pnpm tauri build  # Tauri 打包
```
