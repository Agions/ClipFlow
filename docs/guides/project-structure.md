# 项目结构

## 目录结构

```
StoryForge/
├── public/                 # 静态资源
│   ├── logo.svg          # Logo
│   └── fonts/            # 字体文件
├── src/
│   ├── components/        # React 组件
│   │   ├── AIPanel/      # AI 功能面板
│   │   │   ├── StoryForge/   # AI 剪辑组件
│   │   │   ├── AIEditorContext.tsx  # 编辑器上下文
│   │   │   └── functionModeMap.ts    # 功能映射
│   │   ├── Editor/       # 视频编辑器
│   │   │   ├── Timeline/    # 时间线组件
│   │   │   ├── Preview/     # 预览组件
│   │   │   └── Player/      # 播放器
│   │   ├── Home/         # 首页组件
│   │   └── Layout/       # 布局组件
│   ├── core/             # 核心模块
│   │   ├── constants/    # 常量定义
│   │   ├── services/     # 核心服务
│   │   │   ├── ai.service.ts      # AI 服务
│   │   │   ├── asr.service.ts     # 语音识别
│   │   │   ├── plotAnalysis.service.ts  # 剧情分析
│   │   │   └── video.service.ts    # 视频处理
│   │   ├── store/        # 状态管理
│   │   └── types/        # 类型定义
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useSettings.ts    # 设置管理
│   │   ├── useTimeline.ts   # 时间线操作
│   │   └── useAI.ts         # AI 功能
│   ├── pages/             # 页面组件
│   │   ├── Home/         # 首页
│   │   ├── Projects/      # 项目管理
│   │   ├── VideoEditor/  # 视频编辑器
│   │   ├── AIVideoEditor/ # AI 视频创作
│   │   └── Settings/      # 设置页面
│   ├── services/          # API 服务
│   │   ├── api.ts         # API 封装
│   │   ├── tauri.ts       # Tauri 集成
│   │   └── aiService.ts   # AI 接口
│   ├── store/             # Zustand Store
│   │   ├── appStore.ts    # 应用状态
│   │   ├── editorStore.ts  # 编辑器状态
│   │   ├── projectStore.ts  # 项目状态
│   │   └── mainStore.ts    # 主状态
│   ├── styles/            # 样式文件
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具函数
├── docs/                  # 文档
├── scripts/               # 构建脚本
└── package.json
```

## 核心模块

### components/

UI 组件目录，按功能模块划分。

### core/services/

核心业务服务，包括 AI 服务、视频处理等。

### store/

Zustand 状态管理，采用分散管理、按需导入的模式。

### hooks/

自定义 React Hooks，封装通用逻辑。

## 命名规范

详见 [命名规范](../naming-convention.md)。
