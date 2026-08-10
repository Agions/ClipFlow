//! AI Commands Types — 类型定义

use serde::{Deserialize, Serialize};

/// AI Director Plan 输入
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectorPlanInput {
    pub segments: Vec<SegmentInput>,
    pub scenes: Vec<SceneInput>,
    pub target_duration: f64,
    pub mode: String,
    pub auto_original_overlay: bool,
}

/// 片段输入
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SegmentInput { pub id: String, pub content: String }

/// 场景输入
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SceneInput {
    pub id: String,
    pub start_time: f64,
    pub end_time: f64,
}

/// AI Director Plan 输出
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectorPlanOutput {
    pub pacing_factor: f64,
    pub beat_count: u32,
    pub preferred_transition: String,
    pub confidence: f64,
}

/// ZCR 突发检测输入
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectZCRBurstsInput {
    pub audio_path: String,
    pub window_ms: Option<f32>,
    pub zcr_threshold_mult: Option<f32>,
}

/// ZCR 突发检测结果
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZCRBurstResult {
    pub start_ms: u64,
    pub end_ms: u64,
    pub score: f32,
}

/// TTS 输入
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeSpeechInput {
    pub text: String,
    pub voice: String,
    pub speed: f32,
    pub format: String,
    pub backend: String,
}

/// TTS 输出
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynthesizeSpeechOutput {
    pub audio_path: String,
    pub duration_secs: f64,
}

// ─── TTS Batch（Stage 14.2） ──────────────────────────────────

/// TTS Batch 单段输入
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsBatchSegmentInput {
    /// 业务侧 ID（用于结果对齐）
    pub id: String,
    /// 朗读文本（与 ssml 二选一；都传时优先 ssml）
    pub text: Option<String>,
    /// 结构化 SSML（可选；提供时跳过 raw text 路径，直接 wrap 成标准 SSML）
    pub ssml: Option<crate::domain::ssml::SsmlDocument>,
    pub voice: String,
    pub speed: f32,
    pub format: String,
    pub backend: String,
}

/// TTS Batch 输入
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsBatchInput {
    pub segments: Vec<TtsBatchSegmentInput>,
    /// 最大并发数（默认 3，1-8 范围内合法）
    #[serde(default = "default_max_concurrency")]
    pub max_concurrency: u8,
    /// 失败重试次数（默认 2，0-3 范围内合法）
    #[serde(default = "default_max_retries")]
    pub max_retries: u8,
}

fn default_max_concurrency() -> u8 { 3 }
fn default_max_retries() -> u8 { 2 }

/// TTS Batch 单段结果
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsBatchResultItem {
    pub id: String,
    pub audio_path: Option<String>,
    pub duration_secs: f64,
    pub error: Option<String>,
    /// 重试次数（成功也是 0，失败 = 实际重试次数）
    pub retries: u8,
}

/// TTS Batch 输出
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtsBatchOutput {
    pub results: Vec<TtsBatchResultItem>,
    /// 总耗时（秒）
    pub total_secs: f64,
}

/// TTS 后端信息
#[derive(Debug, Serialize)]
pub struct TtsBackendInfo {
    pub name: String,
    pub label: String,
    pub description: String,
    #[serde(rename = "requiresNetwork")]
    pub requires_network: bool,
    #[serde(rename = "requiresModelDownload")]
    pub requires_model_download: bool,
    #[serde(rename = "modelPath")]
    pub model_path: Option<String>,
}