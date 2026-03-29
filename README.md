<div align="center">

# StoryForge

<p align="center">
  <img src="./public/logo.svg" alt="StoryForge" width="128" />
</p>

<h3 align="center">AI-Powered Video Creation Studio</h3>
<h4 align="center">AI 驱动的智能视频创作平台</h4>

<p align="center">
  <a href="https://github.com/agions/storyforge/releases">
    <img src="https://img.shields.io/github/v/release/agions/storyforge?include_prereleases&label=latest" alt="Release" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tauri-2.x-FFC107?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/github/stars/agions/storyforge" alt="Stars" />
</p>

---

</div>

## 🎯 一句话介绍

> StoryForge 是一款**AI 驱动的视频创作平台**，支持剧情分析、智能剪辑、多素材混剪，让专业视频制作变得简单。

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🎬 **剧情分析** | AI 分析视频叙事结构、情感曲线 |
| 🎙️ **AI 解说** | 一键生成专业旁白配音 |
| 🎵 **智能混剪** | BPM 检测，自动卡点混剪 |
| 🎭 **情感独白** | 画面情感分析，电影级独白 |
| 📤 **多格式导出** | 剪映/PR/FCPXML/DaVinci |

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/Agions/StoryForge.git
cd StoryForge

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 开发环境构建
npm run build

# 生产环境构建
npm run build:prod
```

## 🤖 AI 模型支持

| 提供商 | 模型 | 文本 | 视觉 | 配音 |
|--------|------|:----:|:----:|:----:|
| OpenAI | GPT-4o / o3-mini | ✅ | ✅ | ✅ |
| Anthropic | Claude 4 Sonnet | ✅ | ✅ | — |
| Google | Gemini 2.0 Flash | ✅ | ✅ | — |
| DeepSeek | R1 / Chat | ✅ | — | — |
| 阿里云 | Qwen Plus | ✅ | ✅ | — |
| 智谱 | GLM-4 | ✅ | ✅ | — |
| Kimi | moonshot-v1 | ✅ | — | — |
| 腾讯 | Hunyuan | ✅ | ✅ | — |

## 📂 项目结构

```
StoryForge/
├── src/
│   ├── components/       # React 组件
│   │   ├── AIPanel/     # AI 功能面板
│   │   ├── Editor/      # 视频编辑器
│   │   ├── Home/        # 首页
│   │   └── Layout/      # 布局组件
│   ├── core/            # 核心服务
│   │   ├── services/    # AI 服务
│   │   ├── store/       # 状态管理
│   │   └── types/       # 类型定义
│   ├── pages/           # 页面
│   ├── hooks/           # 自定义 Hooks
│   └── utils/           # 工具函数
├── public/              # 静态资源
└── docs/                # 文档
```

## 📖 文档

| 文档 | 说明 |
|------|------|
| [快速开始](docs/getting-started.md) | 5 分钟上手 |
| [功能指南](docs/features.md) | 全部功能详解 |
| [常见问题](docs/faq.md) | FAQ 故障排查 |
| [工作流](docs/workflow.md) | AI 创作流程 |

完整文档：https://agions.github.io/StoryForge

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| UI 框架 | React 18 + TypeScript |
| 状态管理 | Zustand |
| 视频处理 | FFmpeg + WebCodecs |
| AI 接入 | OpenAI SDK + 各厂商 API |
| 构建工具 | Vite + Tauri |
| 样式 | CSS Modules + Ant Design |

## 📄 许可证

[MIT License](LICENSE) · Copyright (c) 2025-2026 [Agions](https://github.com/Agions)

---

<div align="center">
  <sub>如果你觉得这个项目有帮助，请给一个 ⭐</sub>
</div>
