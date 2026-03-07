# ClipFlow

> AI 自主剪辑桌面客户端（Tauri）

<p align="center">
  <img src="./public/logo.svg" alt="ClipFlow" width="88" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/version-1.0.0--beta-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tauri-2.x-FFC107?logo=tauri" alt="Tauri" />
</p>

## 项目定位

ClipFlow 不是传统时间线剪辑器，而是面向精品内容生产的 **AI 自主剪辑系统**。  
系统围绕“理解画面 -> 规划叙事 -> 生成解说 -> 自动混剪 -> 导出成片”构建，强调流程完整性与可维护工程化落地。

## 核心能力

- `AI 解说`：基于画面语义自动生成解说文本
- `AI 混剪`：按节奏和场景组织片段并生成旁白建议
- `第一人称视角解说`：POV 叙事风格生成
- `自动添加原画`：三种 AI 模式均支持原画辅助叠加
- `多模型接入`：模型配置与 API Key 管理联动

## 技术架构

- 前端：`React 18` + `TypeScript` + `Ant Design 5` + `Zustand`
- 客户端：`Tauri 2.x`（Rust 命令负责文件与系统能力）
- 构建：`Vite 6`
- 文档：`Docsify + GitHub Pages`

## 快速开始

## 1. 环境要求

- Node.js `>= 20`
- npm `>= 10`
- Rust（Tauri 打包需要）

## 2. 安装依赖

```bash
npm install
```

## 3. 本地开发

```bash
npm run tauri dev
```

## 4. 生产构建

```bash
npm run tauri build
```

## 5. macOS DMG（稳定构建）

```bash
npm run tauri:build:dmg
```

该命令会在官方 DMG 脚本失败时自动兜底转换，输出最终可安装 `.dmg`。

## 常用命令

```bash
# 类型检查
npm run type-check

# 前端构建
npm run build

# 文档本地预览
npm run docs:dev
```

## 目录结构

```text
.
├── src/                     # 前端业务代码
├── src-tauri/               # Tauri/Rust 代码与打包配置
├── docs/                    # 在线文档站点
├── scripts/                 # 工具脚本（含 build-dmg.sh）
└── .github/workflows/       # CI/CD（含 docs pages 发布）
```

## 在线文档

- 文档入口：`docs/README.md`
- 推荐阅读顺序：
1. `docs/getting-started/installation.md`
2. `docs/getting-started/quick-start.md`
3. `docs/guides/core-workflow.md`
4. `docs/guides/model-config.md`

## 开发原则

- 模块清晰：服务层与页面层职责分离
- 单一来源：项目文件读写以 Tauri 命令为主
- 渐进重构：优先保证可运行、可验证、可回滚
- 文档先行：关键流程和发布命令文档化

## License

MIT
