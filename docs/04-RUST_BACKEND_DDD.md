# Rust Tauri 2 后端与 DDD 领域驱动仓储架构

## 1. 架构概览

剧工的持久化底层位于 `src-tauri/src/db/`，采用领域驱动设计（DDD）模块化解耦：

```
src-tauri/src/db/
├── mod.rs               # 线程安全句柄 DatabaseHandle 与对外委托
├── models.rs            # Row 实体模型与 DbError / DbResult
├── migrations.rs        # SQLite Schema 001/002/003 版本自动化迁移
├── repositories/        # 6 大领域仓储
│   ├── mod.rs
│   ├── project_repo.rs  # 创作项目 CRUD 与事务级联物理删除
│   ├── job_repo.rs      # AI 流水线任务生命周期与进度上报
│   ├── artifact_repo.rs # 分步产物（音频/切片/草稿）持久化
│   ├── settings_repo.rs # 全局用户偏好与模型配置
│   ├── tts_cache_repo.rs# 音频合成哈希去重缓存与淘汰策略
│   └── assembly_repo.rs # 多轨装配图 (AssemblyKit) 序列化
└── tests.rs             # 单元与集成测试套件
```

## 2. 数据库迁移系统 (Migrations)

- `001_initial_schema`：初始化项目主表、流水线任务表、产物表与设置表；
- `002_add_tts_cache`：建立发音人与文本内容 MD5 联合索引的 TTS 缓存表；
- `003_add_assembly_kit`：增加多轨道视听装配图数据结构表。
