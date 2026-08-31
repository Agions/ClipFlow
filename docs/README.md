# 剧工 (Fablr) — 官方技术与使用文档中心

欢迎查阅 **剧工 (Fablr)** 官方技术文档体系。

---

## 🧭 文档目录与 Sitemap

```
docs/
├── README.md                          # 官方文档总索引 (当前文件)
├── architecture/                      # 架构设计与底层机制
│   ├── 01-system-overview.md          # 目标架构设计 (Local-First, Tauri 2, FFmpeg)
│   └── 02-rust-backend-ddd.md         # Rust 领域驱动设计 (DDD) 与持久化仓储
├── features/                          # 4 大核心创作工坊详解
│   ├── 01-asset-hub.md                # 素材拆条工坊与 AI 高光/台词检索
│   ├── 02-script-studio.md            # 剧本研磨工坊与结构化骨架卡片
│   ├── 03-workspace-editing.md        # 专业剪辑台与“以文剪片”双视图
│   └── 04-export-dedup.md             # 消重发布中心、5级指纹滤镜与剪映协议
├── guides/                            # 使用教程与最佳实践
│   ├── 01-quick-start.md              # 30秒快速上手与工程流程
│   └── 02-workflow-sop.md             # 影视解说博主标准创作 SOP
└── developer/                         # 开发者专区
    ├── 01-getting-started.md          # 开发者环境准备与 Tauri 2 编译
    ├── 02-testing-and-verify.md       # 测试套件、规范扫描与代码质量约定
    └── 03-naming-convention.md        # 前端命名规范与模块化约束
```

---

## 📖 板块快速入口

### 🏛️ 1. 架构设计 (`architecture/`)
- **[01. 系统目标架构设计](./architecture/01-system-overview.md)**：前端分层、Tauri 2 IPC 机制、FFmpeg 音视频流水线及本地状态机。
- **[02. Rust DDD 仓储层设计](./architecture/02-rust-backend-ddd.md)**：Rust 后端 6 大领域仓储模块（`project`, `job`, `artifact`, `settings`, `tts`, `assembly`）。

### 🛠️ 2. 核心工坊指南 (`features/`)
- **[01. 素材拆条工坊](./features/01-asset-hub.md)**：智能场景分切、台词检索与 AI 情感高光打标。
- **[02. 剧本研磨工坊](./features/02-script-studio.md)**：Hook 卡 / 主线卡 / 高潮卡 / 结尾卡 结构化设计与 TTS 时长预估。
- **[03. 剪辑合成工作台](./features/03-workspace-editing.md)**：以文剪片双联视图、5轨视听编辑与剪映协议导出。
- **[04. 消重发布中心](./features/04-export-dedup.md)**：5 级智能指纹消重、发布前合规体检报告与矩阵分发。

### 📚 3. 使用指南 (`guides/`)
- **[01. 30秒快速上手](./guides/01-quick-start.md)**：创建第一个解说工程与工坊流转操作指南。
- **[02. 影视解说博主 SOP](./guides/02-workflow-sop.md)**：短剧与影视解说行业的最佳创作实践 SOP。

### 💻 4. 开发者专区 (`developer/`)
- **[01. 开发者上手指南](./developer/01-getting-started.md)**：开发环境准备、依赖安装与 Tauri 2 编译打包。
- **[02. 测试与质量验证](./developer/02-testing-and-verify.md)**：单元测试、集成测试与工程规范扫描命令。
- **[03. 前端命名与模块化规范](./developer/03-naming-convention.md)**：kebab-case 命名规则与角色后缀拍平契约。
