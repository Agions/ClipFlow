# 剧工 (Fablr) — 系统架构与核心设计

## 1. 整体分层架构

```mermaid
graph TD
    subgraph UI[前端表现层 (React 18 + Tailwind CSS)]
        A1[控制台大盘 /] --> A2[创作项目中心 /projects]
        A2 --> A3[智能素材拆条 /asset-hub]
        A3 --> A4[多 Agent 剧本工坊 /script-studio]
        A4 --> A5[5 轨剪辑合成台 /workspace]
        A5 --> A6[消重发布矩阵 /export-hub]
    end

    subgraph Service[核心服务与领域层 (TypeScript)]
        B1[多 Agent 剧本研磨引擎]
        B2[剪映草稿导出器 JianYing Exporter]
        B3[5 级反爬指纹消重管线]
        B4[Zustand 响应式状态中心]
    end

    subgraph Backend[系统与算力底层 (Rust Tauri 2)]
        C1[SQLite DDD 领域驱动仓储]
        C2[本地 Whisper 离线语音识别]
        C3[FFmpeg 硬件加速转码渲染]
        C4[Edge / Azure 高清 TTS 引擎]
    end

    UI --> Service
    Service --> Backend
```

## 2. 核心技术选型

| 模块 | 核心技术 | 选型优势 |
| :--- | :--- | :--- |
| **桌面基座** | Tauri 2.0 + Rust | 极小安装包体积、极高内存运行效率、原生文件与硬件调度 |
| **持久化存储** | SQLite 3 + 事务级联 | 100% 本地离线持久化、数据主权归属创作者、秒级读写 |
| **前端基座** | React 18 + Vite 6 | 毫秒级热重载、组件按需异步拆分加载 |
| **样式与设计系统** | Tailwind CSS + LESS Modules | 纯 CSS 变量驱动 Design Token、Dark Studio 专业影视工业质感 |
| **AI 算力适配器** | 通义千问 / GLM / DeepSeek / Kimi / OpenAI | 多模型供应商自适应切换、密钥本地硬件隔离 |
| **视听音画处理** | FFmpeg 6.0 + 本地 Whisper + Web Audio | 微秒级音画微调对齐、ASS/SRT 智能字幕渲染 |
