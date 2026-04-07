## [1.7.0] - 2026-04-07

### 🎉 Phase 1 + Phase 2 功能升级

#### Phase 2 — 体验完善

- **快捷键体系**: 新增 `useKeyboardShortcuts` Hook（空格/K/J/L/I/O/Delete/⌘Z/⌘E等），接入 AIVideoEditor
- **导出进度细化**: VideoExport 接入 Rust `processing-progress` 事件监听，实时显示阶段名称（编码/渲染/合成/写入）+ ETA 剩余时间


- **多格式裁切导出**: Rust 层实现 `transcode_with_crop` 命令，支持 9:16（抖音竖屏）/ 1:1（小红书方屏）/ 16:9 三种格式，FFmpeg scale+crop filter 注入
- **ClipRepurposing Pipeline**: 新增完整 UI（ClipRepurpose.tsx），集成 6 维评分引擎（笑声/情感/完整度/静默比/节奏/关键词）+ SEO 元数据 + 多格式导出
- **AI 字幕生成**: SubtitleEditor 接入 Whisper ASR 服务，支持模型选择 + 语言设置 + 一键生成字幕
- **主流程串联**: AI 拆条步骤完整接入主流程（project-create → video-upload → ai-analyze → clip-repurpose → script-generate → video-synthesize → export）

---

## [1.6.5] - 2026-04-07

### 🐛 Bug 修复

- **package.json 版本同步**: 修复 v1.6.4 发布后 package.json 仍为 v1.6.0 的版本不一致问题
- **Rust 死代码清理**: 移除 `segment_by_energy` 中未使用变量 `next_duration`、`mid_point`、`segment_energy_sum/count`，消除编译警告

---

## [1.6.4] - 2026-04-06

### 📁 文件结构优化

- **Hooks 重复定义合并**: `src/shared/hooks/index.ts` + `src/core/utils/hooks.ts` → `src/hooks/index.ts`
- 统一为单一 hooks 导出入口，消除三处分散定义，净减少 350 行重复代码

---

## [1.6.3] - 2026-04-06

### 🏗️ 核心架构优化

- **VisionService 并行分析**: `detectObjects` + `analyzeEmotions` 并行执行（Promise.all），耗时减半
- **消除冗余调用**: `analyzeVideo` 已返回 scenes，`detectScenes` 调用消除
- **移除死代码**: 删除 `detectScenes` + `detectSilence` 私有方法（-36 行）
- **optimizeScenes Map 查表**: 嵌套 filter.find O(n²) → 预建 Map O(n)

---

## [1.6.2] - 2026-04-06

### ⚡ 性能优化

- **WaveformCanvas**: `segments.find` O(n) → Map 查表 O(1)，大量字幕时每帧减少数万次遍历
- **cacheManager**: `JSON.parse(JSON.stringify)` → `structuredClone`（引擎级优化）
- **exportCache**: 移除 pretty-print

---

## [1.6.1] - 2026-04-06

### ⚡ 性能优化

- **concurrentMap**: 首页/Dashboard 项目加载并发限流（≤8），降低文件系统压力
- **StorageService.export**: 移除多余 pretty-print（`null,2` → 无参数），减少大型项目序列化开销

---

## [1.4.0] - 2026-04-06

### 🏗️ 核心流程架构升级

- **aiClipExecutor**: `executeAIClipStep` 返回值现写入 `WorkflowData.aiClipResult`，AI 剪辑结果不再丢失
- **musicExecutor**: `music` 步骤已注册，配乐结果写入 `WorkflowData.musicStepOutput`
- **subtitleExecutor**: 改进 skip 消息为"ASR 服务未安装，跳过字幕识别"

### 🔧 类型安全强化

- `adapters.ts`: 移除 3 处 `as any`，`WorkflowConfig` 新增 `videoFile` + `whisperConfig` 字段
- `ai.service.ts`: `Promise.allSettled` 显式类型化，移除 map 回调 `s:any` / `k:any`

### 🐛 Bug 修复

- `VisionService.extractKeyframes`: **补全缺失方法**（此前调用恒返回 rejected，keyframes 永远为空）

### ✨ Lint 修复

- `FilterThumb` / `MultiTrackTimeline` / `WaveformCanvas`: 添加 `displayName`
- `Layout.tsx`: `Tooltip` 从 `antd` 而非 `@ant-design/icons` 导入
- `MultiTrackTimeline.tsx`: 修复 `clip={` 重复属性 JSX 语法错误

---

## [1.3.0] - 2026-04-05

### 🎨 UI 全面升级 — AI Cinema Studio

- **设计系统重构**：深炭底 #0C0D14 + 琥珀光 #FF9F43 + 电青色 #00D4FF
- **字体升级**：Outfit（标题）+ Figtree（正文）+ JetBrains Mono（时间码）
- **玻璃拟态**：所有卡片采用 rgba(20,21,32,0.8) + backdrop-filter blur(20px)
- **全局动画**：神经网络脉冲、扫描线纹理、自定义滚动条

### ✨ 组件重设计

- **Layout**：全新侧栏（琥珀光强调）+ 顶栏（用户信息）
- **Dashboard**：玻璃拟态卡片 + 状态 Badge（琥珀/电青/灰）
- **Landing**：Canvas 粒子 Hero + 3步骤流 + 4列特性网格
- **CutDeck 工作流**：垂直步骤列表 + 四态动画（完成/进行/等待）
- **VideoUpload**：拖拽脉冲动画 + 琥珀光进度条
- **AIAnalyze**：神经网络可视化（电青脉冲点阵）
- **ProjectCreate / ScriptGenerate / VideoSynthesize / VideoExport**：全组件重设计
- **EffectsPanel**：4×3 滤镜网格 + 琥珀滑块
- **HighlightPanel / SmartSegmentPanel**：JetBrains Mono 时间码 + 热度条
- **SubtitleEditor**：Canvas 波形 + 琥珀播放头

### 🛠️ antd Tooltip 深色主题覆盖

- 自定义深色 Tooltip + 四个方向箭头修正
- 带琥珀光晕的 accent 变体

### 🐛 修复

- Dashboard index.module.less 缺失 @radius-full 变量

---
# 更新日志

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-04-04

### 🏗️ 架构升级

- **Zustand Store 治理**：
  - `mainStore.ts`：移除 dead field `autoSave`/`isDarkMode`（与 `appStore` 重复，无任何引用点）
  - `appStore.ts`：`autoSave` 从嵌套 `userSettings` 提升到顶层字段 `autoSave`，并新增 `setAutoSave` action
  - `src/store/theme.ts`：删除（与 `ThemeContext.useTheme` 命名冲突，无调用点）
  - `src/hooks/useSettings.ts`：删除 `useAppSettings` 函数（dead function，无调用点）
  - 状态拓扑收束：`appStore`=UI+设置，`mainStore`=AI模型配置，各自职责清晰

- **视频处理管道接口抽象**：
  - 新建 `src/core/video/`：types.ts | IVideoProcessor.ts | TauriVideoProcessor.ts | formatters.ts | index.ts
  - `IVideoProcessor`：后端无关接口，定义 `analyze / extractKeyFrames / generateThumbnail / cut / preview`
  - `TauriVideoProcessor`：Tauri invoke 实现类，单例 `videoProcessor`，parseVideoError 收敛于此
  - `formatters`：纯函数（`formatDuration / formatResolution / formatBitrate / formatFileSize`），无副作用
  - `video.ts` 降级为 facade，代理所有导出，兼容已有调用点
  - 核心收益：可切换实现（Tauri → WebCodecs 或测试 mock）

- **Workflow 引擎状态机化**：
  - 新增 `WorkflowEngine.ts`：图执行器，基于 `WORKFLOW_MODE_DEFINITIONS` 构建实际执行序列
  - 新增 `IStepExecutor.ts`：步骤执行器接口，`execute(ctx)` 返回表示成功
  - 条件跳过：`config` 驱动（`autoAnalyze / autoGenerateScript / autoDedup / aiClipConfig`）
  - 重试机制：`ctx.retry()` 抛出 `RetryRequest`，引擎自动 `attempt++` 后重试
  - 跳过机制：`ctx.skip()` 抛出 `SkipRequest`，继续下一步骤
  - 进度广播：订阅者模式 + `STEP_WEIGHTS` 映射表，总进度 0-100
  - `pause / resume / abort` 支持
  - 原有 `workflowService.ts` 和 step executor 函数完全保留，向后兼容

- **Services 索引更新**：
  - `workflow/index.ts`：新增 `WorkflowEngine`、`IStepExecutor` 导出

## [1.1.1] - 2026-04-02

### 🔧 代码优化

- Editor 页面：移除未使用 import（Row/Col/Drawer）
- Editor 页面：修复 useEffect 依赖缺失问题
- Editor 页面：复制按钮添加完整处理逻辑
- Editor 页面：字幕文字截断逻辑优化（短文本不显示省略号）
- Editor 页面：效果面板添加占位提示
- Editor 编辑器：完整实现 copyClip 复制功能
  - 新增 `COPY_CLIP` action 类型
  - 新增 `copyClip` timeline 操作函数
  - 新增 `copyClip` hook 操作
- Timeline 组件：新增 clipMap（HashMap），片段查找从 O(n²) 降为 O(1)
- Timeline 组件：handlePasteClip bug 修复（精确匹配轨道 ID）
- TimelineRuler：window.innerWidth 改为常量，避免非响应式引用
- WorkflowMonitor：移除 eslint-disable，Timeline items 添加 key
- TimelineClip：移除未使用 Badge import，修复 handleDoubleClick 依赖
- ai.service：移除废弃的 generateMockScenes/generateMockKeyframes
- CutDeck.tsx / VideoExport.tsx：移除未使用 import

### 📖 文档更新

- README.md：优化文档结构，更新项目结构说明
- AI 模型配置：完善多厂商配置文档
- 文档精品化升级（VitePress 专业设计）

---

## [1.1.0] - 2026-03-28

### 🎭 新功能

#### 剧情分析模式 (Plot Analysis Mode) ✨NEW

**核心功能**:

- **剧情图谱 (Plot Timeline)**: 自动分析视频中的剧情结构，生成可视化的故事节点图谱
- **节点类型识别**: 
  - 背景铺垫 (Setup)
  - 上升情节 (Rising Action)
  - 高潮 (Climax)
  - 情感转折 (Emotional Beat)
  - 对话场景 (Dialogue)
  - 动作场景 (Action)
- **情感分析**: 识别视频中的情绪变化轨迹
- **多版本输出**:
  - 📼 剧情完整版 (Full Narrative)
  - ✂️ 精华版 (Highlights Reel)  
  - ⚡ 高能混剪版 (Intense Mix)

**技术实现**:

- 视频帧采样 + 场景检测
- 音频转文字 (ASR) + 对话分析
- 情绪识别 (兴奋/平静/紧张等)
- LLM 剧情理解 (时间戳 + 文字描述 → 剧情结构分析)
- 多模态融合剪辑决策

**新增模块**:

- `src/core/services/plotAnalysis.service.ts` - 剧情分析服务

#### 项目重命名

- **旧名称**: CutDeck (126+ 同名项目，侵权风险)
- **新名称**: CutDeck
- 体现"AI视频创作 + 故事叙事"的核心价值

### 📚 文档更新

- **README.md**: 全新专业化设计
  - Hero section + 技术栈徽章
  - 功能概览表格
  - 快速开始指南
  - 架构模块图
- **ARCHITECTURE.md**: 扩展架构文档
  - 新增剧情分析服务架构
  - 插件系统设计
  - 扩展点说明
- **DEVELOPER.md**: 新增开发者指南
  - 环境搭建
  - 调试技巧
  - 添加新功能指南
- **CONTRIBUTING.md**: 扩展贡献指南
  - Commit 格式规范
  - PR 流程
  - 分支管理

### 🏗️ 架构升级

- 领域模型清晰化
- Service 层模块化
- 准备 Plugin 系统支持不同 AI 模型

---

## [1.0.0-beta] - 2026-03-10

### 🚀 新功能

- **AI 智能剪辑**
  - 场景切换检测
  - 音频峰值识别 (笑声、掌声)
  - 运动强度分析
  - 自动生成精彩集锦

- **智能字幕**
  - 语音转字幕 (ASR)
  - 多语言翻译
  - 字幕风格化
  - 导出 SRT/ASS/VTT

- **自动配乐**
  - 情绪匹配音乐
  - 本地音乐库
  - 淡入淡出
  - 用户上传

- **多模型接入**
  - OpenAI API
  - Anthropic Claude
  - 本地模型支持
  - 自定义 API

### ⚡ 性能优化

- UI 无障碍优化 (aria-labels, keyboard navigation)
- 组件懒加载
- 图片懒加载

### 🔧 改进

- README 完善
- 统一日志系统
- 主题系统优化

### 📦 依赖更新

- React 18
- Tauri 2.x
- Ant Design 5
- TypeScript 5

---

## [0.9.0-alpha] - 2026-01

### 🚀 新功能 (初版)

- 项目管理系统
- 视频上传与管理
- 基础剪辑功能
- AI 解说生成
- AI 混剪
- POV 叙事

---

## 迁移指南

### 从 1.0.x 升级到 1.1.0

1. 更新依赖：`npm install`
2. 拉取最新代码：`git pull origin main`
3. 如使用旧剪辑模式，参考新的剧情分析模式

### 从 0.9.x 升级到 1.0

1. 更新依赖：`npm install`
2. 重新构建：`npm run tauri build`

---

## 旧版本

- 查看 [GitHub Releases](https://github.com/agions/cutdeck/releases)
