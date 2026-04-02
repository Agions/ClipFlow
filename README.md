# StoryForge

<div align="center">

<p align="center">
  <img src="./docs/public/logo.svg" alt="StoryForge" width="120" />
</p>

<h3 align="center">AI-Powered Professional Video Editing Tool</h3>
<h4 align="center">AI 驱动的专业智能视频剪辑工具</h4>

<p align="center">
  <a href="https://github.com/Agions/StoryForge/releases">
    <img src="https://img.shields.io/github/v/release/Agions/StoryForge?include_prereleases&label=latest" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tauri-2.x-FFC107?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/github/stars/Agions/StoryForge" alt="Stars" />
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </a>
</p>

</div>

---

## 🎯 一句话介绍

> **StoryForge** 是一款** AI 驱动的专业智能视频剪辑工具**，支持剧情分析、智能剪辑、多素材混剪、字幕生成等全链路 AI 剪辑能力，让专业视频制作变得简单。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🎬 **剧情分析** | AI 分析视频叙事结构、情感曲线，识别高光时刻 |
| ✂️ **智能剪辑** | 一键生成专业级剪辑方案，支持自动 / 半自动双模式 |
| 🎙️ **AI 配音** | 多音色配音，语速 / 音调 / 情感均可调节 |
| 🎵 **智能混剪** | 自动识别节奏卡点，多素材智能拼接 |
| 📝 **字幕生成** | ASR 语音转字幕 + OCR 画面文字识别，多样式可选 |
| 🎨 **自动包装** | 智能字幕样式、封面设计、片头片尾生成 |

---

## 🚀 快速开始

### 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |

### 安装 & 启动

```bash
git clone https://github.com/Agions/StoryForge.git
cd StoryForge
npm install
npm run dev
```

打开浏览器访问 <http://localhost:1430>

> 首次启动需要配置 AI API 密钥，参考 [AI 模型配置](docs/ai-config.md)。

### 构建生产版本

```bash
npm run build
```

---

## 🤖 AI 模型支持

StoryForge 支持多厂商 AI 模型接入，可根据场景灵活切换：

| 提供商 | 推荐模型 | 场景 |
|--------|----------|------|
| OpenAI | GPT-4o / o4-mini | 剧情分析、脚本生成 |
| Anthropic | Claude 3.5 / 3.7 | 长文本分析、内容理解 |
| Google | Gemini 2.0 Pro | 多模态理解 |
| DeepSeek | DeepSeek-V3 | 翻译、日常任务 |
| 阿里云 | Qwen-Max | 中文内容创作 |
| 智谱 | GLM-4 / GLM-4V | 中文内容创作 |
| Kimi | moonshot-v1 | 长文本分析 |

详细配置请参考 [AI 模型配置](docs/ai-config.md)。

---

## 📂 项目结构

```
StoryForge/
├── src/
│   ├── components/          # React 组件
│   │   ├── AIPanel/         # AI 功能面板
│   │   ├── editor/          # 视频编辑器
│   │   ├── VideoTimeline/   # 时间轴
│   │   ├── ScriptGenerator/ # 脚本生成
│   │   └── common/          # 通用组件
│   ├── core/
│   │   ├── services/        # 核心服务（AI、视频、剪辑、字幕等）
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── store/           # Zustand 状态管理
│   │   └── types/           # TypeScript 类型定义
│   ├── pages/               # 页面（Dashboard/Editor/Workflow 等）
│   ├── providers/           # React Context
│   ├── styles/              # 全局样式
│   └── utils/               # 工具函数
├── src-tauri/               # Tauri 桌面应用
├── docs/                    # VitePress 文档
│   ├── guide/               # 使用指南
│   └── public/              # 静态资源
└── public/                  # Web 静态资源
```

---

## 📖 文档导航

| 文档 | 说明 |
|------|------|
| [快速开始](docs/getting-started.md) | 5 分钟上手 StoryForge |
| [功能介绍](docs/features.md) | 全部核心功能详解 |
| [AI 配置](docs/ai-config.md) | 多厂商 AI API 配置指南 |
| [安装配置](docs/installation.md) | 详细安装与故障排查 |
| [常见问题](docs/faq.md) | FAQ 常见问题解答 |

完整文档站点：https://agions.github.io/StoryForge

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand |
| UI 组件库 | Ant Design 5 |
| 桌面应用 | Tauri 2.x |
| 构建工具 | Vite 6 |
| 国际化 | i18next |
| 路由 | React Router 6 |
| 测试 | Vitest + Testing Library |

---

## 🐛 反馈与贡献

- 问题反馈：[GitHub Issues](https://github.com/Agions/StoryForge/issues)
- 功能建议：欢迎提交 PR 或 Issue
- 贡献指南：[CONTRIBUTING](docs/contributing.md)

---

## 📄 许可证

[MIT License](LICENSE) · Copyright © 2025-2026 [Agions](https://github.com/Agions)

---

<div align="center">

⭐ 如果对你有帮助，请给一个 Star

</div>
