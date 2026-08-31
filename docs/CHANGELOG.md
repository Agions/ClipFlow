# Fablr (剧工) 版本发布日志

## v2.3.0 (2026-08) — 现代工业级架构与 Monorepo 拆分升级

### 🚀 架构重大重构
- **Monorepo Packages 架构拆分**：
  - `@fablr/types`：系统全域强类型定义与契约层；
  - `@fablr/utils`：通用字符串、格式化与平台辅助工具库；
  - `@fablr/core`：核心业务逻辑、`AtomicProjectFileDriver` 防竞态文件写入驱动、智能更新服务；
  - `@fablr/ui`：基于 Canvas + RAF 硬件加速的 `VirtualTimelineCanvas` 虚拟化时间轴及工业级组件。
- **原子防竞态写入保障**：`AtomicProjectFileDriver` 基于 Promise 队列与热内存快照，彻底杜绝并发写入冲突与数据损坏。
- **客户端智能版本检测**：集成国内镜像加速、SemVer 比对与 macOS/Windows/Linux 专属安装包自动匹配。

### 🎨 工坊工作流体验升级
- **4 大工坊闭环工作流**：素材拆条 (Asset Hub) → 剧本研磨 (Script Studio) → 5 轨剪辑 (Workspace) → 消重发布 (Export Hub)。
- **黑曜石工业风 UI**：全面采用 CSS Modules 与统一 Design Token，符合影视后期工业软件视觉规范。

---

## v2.2.0 (2026-07) — 剪映草稿逆向与消重矩阵

- 支持 5 级消重矩阵（镜像、微变速、动态噪点、画中画光影、智能抽帧）。
- 支持逆向直接导出原生剪映草稿工程 (`draft_content.json`)。
- 引入 faster-whisper 本地语音离线转写引擎。

---

## v2.0.0 (2026-06) — 桌面框架迁移至 Tauri 2 + Rust

- 废弃 Electron，全面迁移至 Tauri 2 + Rust + React 18。
- 安装包由 150MB 骤降至 15MB，运行时内存由 200MB 降至 60MB。
