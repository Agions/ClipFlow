//! understanding — L0 内容理解层（后端侧）
//!
//! 职责：编排 元数据提取 → 场景切分 → 字幕转录 → 高光检测 四步，
//! 产出统一的 Storyline（剧情时间线）产物并落盘到
//! `appData/Fablr/productions/{id}/artifacts/storyline.json`。
//!
//! 与前端 `core/services/understanding` 对齐：事件通道
//! `understanding-progress` 的 payload 结构保持同步。

pub mod storyline_builder;
pub mod types;

pub use storyline_builder::analyze_production;
pub use types::{AnalyzeProductionInput, AnalyzeProductionOutput, UnderstandingStage};
