# ClipFlow

<p align="center">
  <img src="./public/logo.svg" alt="ClipFlow" width="128" />
</p>

<h3 align="center">AI 驱动的智能视频剪辑桌面应用</h3>

<p align="center">
  <a href="https://github.com/agions/clipflow/releases">
    <img src="https://img.shields.io/github/v/release/agions/clipflow?include_prereleases&label=latest" alt="Release" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tauri-2.x-FFC107?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/github/stars/agions/clipflow" alt="Stars" />
</p>

---

## ⭐ 为什么选择 ClipFlow？

| 特性 | 说明 |
|------|------|
| 🤖 **AI 智能剪辑** | 自动识别精彩片段，一键生成精彩集锦 |
| 📝 **智能字幕** | 语音转文字 + 多语言翻译 + 风格化字幕 |
| 🎵 **自动配乐** | 根据视频情绪智能匹配背景音乐 |
| 🔒 **本地运行** | 所有数据本地处理，保护隐私安全 |
| 💻 **桌面应用** | Tauri 构建，轻量流畅 |

---

## 🚀 快速开始

### 环境要求

- Node.js `>= 20`
- npm `>= 10`
- Rust（Tauri 打包需要）

### 安装

```bash
# 克隆项目
git clone https://github.com/agions/clipflow.git
cd clipflow

# 安装依赖
npm install

# 启动开发
npm run tauri dev
```

### 构建

```bash
# 构建桌面应用
npm run tauri build
```

### 常用命令

```bash
# 类型检查
npm run type-check

# 前端构建
npm run build

# 运行文档
npm run docs:dev
```

---

## 📖 文档

- [📚 在线文档](https://agions.github.io/clipflow/)
- [🔥 快速开始](docs/getting-started/quick-start.md)
- [⚙️ 模型配置](docs/guides/model-config.md)
- [💡 核心工作流](docs/guides/core-workflow.md)

---

## 🎯 核心功能

### 1. AI 智能剪辑
- 场景切换检测
- 音频峰值识别（笑声、掌声）
- 运动强度分析
- 自动生成精彩集锦

### 2. 智能字幕
- 语音转字幕 (ASR)
- 多语言翻译
- 字幕风格化
- 导出 SRT/ASS/VTT

### 3. 自动配乐
- 情绪匹配音乐
- 本地音乐库
- 淡入淡出
- 音量调节

### 4. 多模型接入
- OpenAI
- Anthropic
- 本地模型
- 自定义 API

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design |
| 状态 | Zustand |
| 客户端 | Tauri 2.x (Rust) |
| 构建 | Vite 6 |
| AI | OpenAI + Claude API |

---

## 📂 项目结构

```
clipflow/
├── src/                     # 前端业务代码
│   ├── components/          # React 组件
│   ├── core/                # 核心服务
│   │   └── services/        # AI 服务、工作流服务
│   ├── pages/               # 页面组件
│   └── utils/               # 工具函数
├── src-tauri/               # Tauri/Rust 代码
├── docs/                    # 文档
└── scripts/                 # 构建脚本
```

---

## 🤝 贡献指南

欢迎贡献！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

```bash
# 克隆项目
git clone https://github.com/agions/clipflow.git

# 创建分支
git checkout -b feature/your-feature

# 提交更改
git commit -m 'feat: 添加新功能'

# 推送
git push origin feature/your-feature
```

---

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新。

---

## 💬 交流社区

- [GitHub Issues](https://github.com/agions/clipflow/issues) - 报告 Bug
- [GitHub Discussions](https://github.com/agions/clipflow/discussions) - 交流讨论

---

## 📄 License

MIT License - 自由使用，商用欢迎！

---

<p align="center">
  <strong>如果这个项目对你有帮助，欢迎点个 ⭐ Star！</strong>
</p>
