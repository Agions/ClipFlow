# 系统整体架构与分层设计

## 1. 架构总览与 Monorepo 分层

Fablr (剧工) 采用现代化的 **Monorepo (Turborepo + pnpm workspaces)** 架构体系，将通用契约、基础工具、领域服务与高性能渲染组件严格分层解耦：

```mermaid
graph TD
    classDef typePkg fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff;
    classDef utilPkg fill:#083344,stroke:#06b6d4,stroke-width:2px,color:#fff;
    classDef corePkg fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef uiPkg fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef appPkg fill:#18192a,stroke:#e2e8f0,stroke-width:2px,color:#fff;

    TYPES["@fablr/types<br/>(全域强类型契约 / DTO)"]:::typePkg
    UTILS["@fablr/utils<br/>(通用工具 / 格式化 / 平台感知)"]:::utilPkg
    CORE["@fablr/core<br/>(原子文件驱动 / 多Agent / 剪映逆向 / 自动更新)"]:::corePkg
    UI["@fablr/ui<br/>(Canvas虚拟化时间轴 / 基础原子组件)"]:::uiPkg
    APP["fablr 桌面端应用<br/>(React 18 + Zustand + Tauri 2 + Rust)"]:::appPkg

    TYPES --> UTILS
    TYPES --> CORE
    TYPES --> UI
    UTILS --> CORE
    UTILS --> UI
    CORE --> APP
    UI --> APP
    TYPES --> APP
    UTILS --> APP
```

---

## 2. 各 Package 职责边界与规范

| Package | 职责范围 | 典型模块 / 导出品 | 依赖约束 |
| :--- | :--- | :--- | :--- |
| **`@fablr/types`** | 系统全域类型契约、领域模型 DTO、IPC 接口规范 | `Project`, `ScriptBlock`, `AssetClip`, `AppUpdateInfo` | **零依赖**（禁止依赖任何其他包） |
| **`@fablr/utils`** | 纯函数工具、文件大小/时间格式化、平台感知、防抖节流 | `formatFileSize`, `formatDuration`, `detectHostPlatform` | 仅允许依赖 `@fablr/types` |
| **`@fablr/core`** | 领域核心服务、防竞态文件驱动、多 Agent 状态机、更新检测 | `AtomicProjectFileDriver`, `UpdaterService`, `DramaAgents` | 依赖 `types` 与 `utils` |
| **`@fablr/ui`** | 硬件加速时间轴 Canvas 组件、工业级交互图元 | `VirtualTimelineCanvas`, `WaveformRenderer` | 依赖 `types` 与 `utils` |
| **主应用 (`src/`)** | 路由、页面装配、Zustand 全局状态机、Tauri IPC 接入 | `AssetHubPage`, `ScriptStudioPage`, `WorkspacePage` | 聚合调用上方 Packages |

---

## 3. 全链路数据流转模型

```mermaid
sequenceDiagram
    autonumber
    participant UI as React 页面与工坊
    participant Store as Zustand 全局状态
    participant Core as @fablr/core (Atomic Driver)
    participant Rust as Tauri 2 / Rust 引擎
    participant Disk as 本地文件系统 (SQLite/JSON)

    UI->>Store: 用户操作 (如编辑剧本/调整时间轴)
    Store->>Core: 派发变更 (saveProject)
    Core->>Core: 队列排队 + 热内存缓存合并 (防竞态)
    Core->>Rust: 调用 invoke("project_save_atomic")
    Rust->>Disk: 原子写入临时文件并原子重命名 (Atomic Rename)
    Disk-->>Rust: 写入完成通知
    Rust-->>Core: 返回最新项目指纹
    Core-->>Store: 状态持久化成功
```

---

## 4. 技术栈选型原则

1. **本地优先与绝对隐私**：所有媒体资产与草稿工程均存储于用户磁盘，零强制上传；
2. **轻量极致与秒级启动**：基于 Tauri 2 + Rust，杜绝传统 Chromium 庞大臃肿的内存占用；
3. **架构防腐与单向数据流**：强类型约束与严格的 Monorepo 分包，禁止跨层循环引用。
