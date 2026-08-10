//! commands/pipeline — 5 阶段流水线 IPC 命令（Stage 13）
//!
//! 5 个 command 替代 v2 一键黑盒 `run_commentary_pipeline`：
//! - pipeline_start_phase   启动某个阶段（状态机 → running）
//! - pipeline_approve_phase 审批阶段产物（推进到下一阶段）
//! - pipeline_retry_phase   重试失败阶段
//! - pipeline_skip_phase    跳过阶段（如用户已有脚本）
//! - pipeline_run_auto      自动跑完无 gate 阶段
//!
//! 事件总线（通过 `app.emit` 发送）：
//! - pipeline://phase-started
//! - pipeline://phase-progress
//! - pipeline://phase-complete
//! - pipeline://phase-failed
//! - pipeline://phase-needs-review
//!
//! 阶段执行（understand/plan/write/voice/render）的真实业务逻辑在
//! `commands/pipeline/steps/` 落地（Stage 13.1+ 增量），v3 启动时仅做
//! 状态机推进 + 事件发送。

pub mod commands;
pub mod orchestrator;
pub mod types;

#[cfg(test)]
mod commands_test;

pub use commands::{
    pipeline_approve_phase, pipeline_retry_phase, pipeline_run_auto, pipeline_skip_phase,
    pipeline_start_phase,
};
pub use orchestrator::run_auto;
pub use types::{PhaseParams, PhaseResult};
