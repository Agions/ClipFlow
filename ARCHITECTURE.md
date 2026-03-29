# StoryForge 架构

## 技术栈

| 类别 | 技术 |
|------|------|
| UI | React 18 + TypeScript |
| 状态 | Zustand |
| 样式 | CSS Modules + Ant Design |
| 构建 | Vite + Tauri |
| AI | OpenAI SDK + 多厂商 API |

## 项目结构

```
src/
├── components/    # UI 组件
├── core/         # 核心服务
│   ├── services/ # AI、视频服务
│   └── store/    # 状态管理
├── hooks/        # 自定义 Hooks
├── pages/        # 页面
└── utils/       # 工具函数
```

## 核心模块

- **AI 服务**: GPT-4o、Claude、Gemini 等模型集成
- **视频处理**: FFmpeg、WebCodecs
- **状态管理**: Zustand stores
- **UI 组件**: React 组件库
