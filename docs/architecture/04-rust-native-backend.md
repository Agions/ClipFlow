# Rust 原生引擎与领域驱动设计 (Rust Backend DDD)

## 1. Rust 架构定位与职责

在 Fablr 桌面体系中，Rust 充当系统的**高性能算力核心与原生系统网关**，负责所有 CPU/GPU 密集型任务与底层文件 I/O：

- **FFmpeg 原生编解码与流媒体处理**：无进程启动开销，提供极速视频帧提取与混音；
- **faster-whisper 本地 ASR 推理**：纯本地脱机语音识别；
- **SQLite 嵌入式持久化**：事务级别管理数万条切片与项目元数据；
- **高韧性资源池治理 (ResourceLimiter)**：限制并发解码线程，防止系统内存溢出。

---

## 2. 领域驱动设计 (DDD) 分层模型

```
src-tauri/src/
├── commands/             # 1. 接口表示层 (Tauri IPC Commands / DTO)
│   ├── project.rs        #    项目持久化与查询接口
│   ├── video.rs          #    视听解码与切片接口
│   └── subtitle.rs       #    ASR 与字幕处理接口
├── domain/               # 2. 核心领域层 (Domain Models & Logic)
│   ├── production.rs     #    作品聚合根与生命周期
│   └── intent.rs         #    创作意图与赛道配置模型
├── db/                   # 3. 基础设施数据层 (SQLite Repository & Migrations)
│   └── mod.rs            #    连接池与事务管理
└── utils/                # 4. 基础设施工具 (Resilience / Limiter / AudioMix)
    └── resilience.rs     #    全局 Panic Hook 捕获与信号量限流器
```

---

## 3. 高韧性保障体系 (Resilience Architecture)

为防止音视频处理过程中的原生崩溃导致应用退出，Rust 后端构建了完整的防崩溃与自愈体系：

```mermaid
graph TD
    A[外部 I/O 与并发请求] --> B[ResourceLimiter 信号量并发治理]
    B --> C[Tokio 异步任务运行时]
    C --> D[Panic Hook 拦截与上下文隔离]
    D --> |正常执行| E[安全返回 IPC JSON DTO]
    D --> |捕获异常| F[写入崩溃转储 crash_recovery 并返回优雅错误码]
```

- **Panic 拦截与防崩**：所有进入 Tauri Command 的闭包均受 `catch_unwind` 保护，单个切片解码失败不会拖垮主应用；
- **Crash Recovery 机制**：自动将崩溃前的未提交状态序列化至应用数据目录，重启时提示一键恢复。
