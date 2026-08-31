# Rust 后端领域驱动设计 (Rust DDD Backend)

> 🦀 剧工 (Fablr) 后端 6 大领域仓储模块与数据持久化规范

---

## 一、DDD 领域划分类图

Rust 后端采用标准的 **领域驱动设计 (Domain-Driven Design)** 划分，代码位于 `src-tauri/src/`：

```
src-tauri/src/
├── domain/                      # 领域核心实体与业务规则
│   ├── project/                 # 工程实体与元数据
│   ├── assembly/                # 视听轨道与 EDL 剪辑决策表
│   ├── job/                     # 渲染与分析后台任务队列
│   ├── artifact/                # 导出的切片、剧本与消重视频
│   └── tts/                     # 配音模型与语音参数
├── repository/                  # 持久化仓储 (SQLite / File Storage)
└── service/                     # 跨领域协调服务
```

---

## 二、6 大核心仓储职责

1. **Project Repository (工程仓储)**：管理解说工程的创建、读写、最近打开记录与本地快照备份。
2. **Assembly Repository (合成仓储)**：管理 5 轨视听时间轴的数据序列化（V1/V2/A1/A2/A3 轨道与 Clip 对应关系）。
3. **Job Repository (任务仓储)**：负责音视频转码、ASR 字幕提取、AI 拆条的并行队列调度与重试机制。
4. **Artifact Repository (资产仓储)**：维护项目提取的镜头切片、文本剧本与封面模板。
5. **TTS Repository (语音仓储)**：管理本地与云端 TTS 语音音色模型、语速及音高配置。
6. **Settings Repository (设置仓储)**：持久化用户 API Key、GPU 加速预设及默认输出目录。
