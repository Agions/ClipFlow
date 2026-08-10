//! 流水线 IPC DTO（Stage 13）

use serde::{Deserialize, Serialize};

/// 阶段启动参数（pipeline_start_phase 入参）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseParams {
    /// 目标项目 ID
    pub project_id: String,
    /// 启动哪个阶段
    pub phase: String, // JobPhase as string (前端传入)
    /// 阶段额外参数（duration_secs / voice_id / 平台 ID 等）
    #[serde(default)]
    pub params: serde_json::Value,
}

/// 阶段执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseResult {
    pub phase: String,
    /// 是否成功
    pub ok: bool,
    /// 产物落盘路径（如有）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artifact_path: Option<String>,
    /// 错误信息（如失败）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// 阶段耗时（毫秒）
    pub duration_ms: u64,
}

// ─── 事件 payload（与前端 tauri.listen 配合使用） ──────────────

/// phase-started 事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseStartedEvent {
    pub project_id: String,
    pub phase: String,
    pub started_at: String, // ISO 8601
}

/// phase-progress 事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseProgressEvent {
    pub project_id: String,
    pub phase: String,
    pub progress: f32, // 0.0-1.0
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// phase-complete 事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseCompleteEvent {
    pub project_id: String,
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artifact_path: Option<String>,
    pub duration_ms: u64,
}

/// phase-failed 事件
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseFailedEvent {
    pub project_id: String,
    pub phase: String,
    pub error: String,
}

/// phase-needs-review 事件（触发 gate）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseNeedsReviewEvent {
    pub project_id: String,
    pub phase: String,
    pub gate: String, // 'plan-approval' | 'script-review' | 'voice-review'
}

// ─── 事件名常量 ──────────────────────────────────────────────

pub const EVT_PHASE_STARTED: &str = "pipeline://phase-started";
pub const EVT_PHASE_PROGRESS: &str = "pipeline://phase-progress";
pub const EVT_PHASE_COMPLETE: &str = "pipeline://phase-complete";
pub const EVT_PHASE_FAILED: &str = "pipeline://phase-failed";
pub const EVT_PHASE_NEEDS_REVIEW: &str = "pipeline://phase-needs-review";
