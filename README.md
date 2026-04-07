<div align="center">

<!-- Hero -->
<p align="center">
  <img src="./docs/public/logo.svg" alt="CutDeck" width="140" />
</p>

<h1 style="
  font-family: 'Syne', 'Inter', system-ui, sans-serif;
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #f8fafc 0%, #fcd34d 50%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0.5rem 0;
">CutDeck</h1>

<p style="
  font-size: 1.1rem;
  color: #94a3b8;
  margin: 0.5rem 0 1.5rem;
">AI-Powered Professional Video Editing Tool · AI 驱动的专业智能视频剪辑工具</p>

<!-- Badges -->
<p align="center">

[![Stars](https://img.shields.io/github/stars/Agions/CutDeck?style=for-the-badge&logo=github&color=f59e0b)](https://github.com/Agions/CutDeck)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge&logo=opensourceinitiative)](LICENSE)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

</p>

</div>

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

```bash
# 克隆项目
git clone https://github.com/Agions/CutDeck.git
cd CutDeck

# 安装依赖
npm install

# 配置 AI（复制并编辑 .env）
cp .env.example .env
# 编辑 .env 填入你的 API Key（推荐 DeepSeek）

# 启动开发服务器
npm run dev
# 访问 http://localhost:1430
```

> 首次启动需要配置 AI API 密钥，参考 [AI 模型配置](docs/ai-config.md)。

**构建生产版本：** `npm run build`

---

## 🤖 支持的 AI 模型

| 提供商 | 推荐模型 | 场景 |
|--------|----------|------|
| OpenAI | GPT-5.4 | 剧情分析、脚本生成 |
| Anthropic | Claude Sonnet 4.6 | 长文本分析、内容理解 |
| Google | Gemini 3.1 Pro | 多模态理解 |
| DeepSeek | V3.2 | 🏆 性价比最高 |
| 阿里云 | Qwen 2.5-Max | 中文内容创作 |
| 智谱 | GLM-5 | 中文内容创作 |
| Kimi | K2.5 | 长文本分析 |

> 💡 **只需配置一个 API Key 即可使用全部 AI 功能。** 详细配置请参考 [AI 模型配置](docs/ai-config.md)。

---

## 🏗️ 项目架构

```
CutDeck/
├── src/
│   ├── components/          # React 组件
│   │   ├── AIPanel/         # AI 功能面板
│   │   ├── editor/           # 视频编辑器
│   │   ├── VideoTimeline/   # 时间轴
│   │   ├── ScriptGenerator/  # 脚本生成
│   │   └── common/          # 通用组件
│   ├── core/
│   │   ├── services/        # 核心服务（AI、视频、剪辑、字幕等）
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── store/           # Zustand 状态管理
│   │   └── types/           # TypeScript 类型定义
│   ├── pages/               # 页面（Dashboard/Editor/Workflow 等）
│   ├── providers/            # React Context
│   ├── styles/              # 全局样式
│   └── utils/               # 工具函数
├── src-tauri/               # Tauri 桌面应用
├── docs/                    # VitePress 文档
│   ├── guide/               # 使用指南
│   └── public/              # 静态资源
└── public/                  # Web 静态资源
```

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

## 📖 文档导航

| 文档 | 说明 |
|------|------|
| [快速开始](docs/guide/quick-start.md) | 5 分钟上手 CutDeck |
| [功能介绍](docs/features.md) | 全部核心功能详解 |
| [AI 配置](docs/ai-config.md) | 多厂商 AI API 配置指南 |
| [安装配置](docs/installation.md) | 详细安装与故障排查 |
| [常见问题](docs/faq.md) | FAQ 常见问题解答 |

完整文档站点：https://agions.github.io/CutDeck

---

## 🤝 参与贡献

欢迎所有形式的贡献：

| 贡献方式 | 说明 |
|----------|------|
| 🐛 报告 Bug | [GitHub Issues](https://github.com/Agions/CutDeck/issues) |
| 📝 完善文档 | 直接提交 PR |
| 💡 功能建议 | [GitHub Issues](https://github.com/Agions/CutDeck/issues)（Discussions 需在仓库 Settings → Features 中开启） |
| 🔧 提交代码 | 提交 Pull Request |

参考 [贡献指南](docs/contributing.md) 了解更多。

---

## 📄 许可证

[MIT License](LICENSE) · Copyright © 2025-2026 [Agions](https://github.com/Agions)

---

<div align="center">

⭐ 如果对你有帮助，请给一个 Star

</div>
