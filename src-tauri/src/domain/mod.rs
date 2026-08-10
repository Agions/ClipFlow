//! domain — StoryFab v3 领域模型（后端侧）
//!
//! 与前端 `src/core/domain` 对齐的 Rust 类型定义。
//! M0 阶段仅落地类型骨架（不注册任何 IPC 命令，不影响现有功能），
//! M1-M4 阶段按层迁移时逐步接入实际业务逻辑。
//!
//! 序列化约定：字段 snake_case + `serde(rename_all = "camelCase")`。

pub mod job;
pub mod production;
pub mod storyline;

pub use job::{JobPhase, PhaseRunState, PipelineJob};
pub use production::{Production, ProductionSource, ProductionStatus};
pub use storyline::Storyline;
