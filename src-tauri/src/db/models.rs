//! Database models and error types

use rusqlite::Error as SqliteError;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] SqliteError),
    #[error("mutex poisoned")]
    Mutex,
    #[error("project not found: {0}")]
    NotFound(String),
    #[error("invalid data: {0}")]
    InvalidData(String),
}

pub type DbResult<T> = Result<T, DbError>;

#[derive(Debug, Clone)]
pub struct ProjectRow {
    pub id: String,
    pub name: String,
    /// IntentConfig JSON 序列化（camelCase）
    pub intent_json: String,
    pub video_path: String,
    pub subtitle_path: Option<String>,
    /// Unix 时间戳（秒）
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone)]
pub struct JobRow {
    pub id: String,
    pub project_id: String,
    /// JobPhase（camelCase）
    pub phase: String,
    /// phaseStatus Record JSON
    pub phase_status_json: String,
    pub progress_pct: f32,
    /// 错误信息 JSON（无错 = null）
    pub error_json: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone)]
pub struct ArtifactRow {
    pub id: i64,
    pub job_id: String,
    pub phase: String,
    /// storyline | plan | script | audio | output
    pub artifact_type: String,
    pub path: String,
    pub metadata_json: Option<String>,
    pub created_at: i64,
}

/// TTS 音频缓存行（Stage 14.5）
#[derive(Debug, Clone)]
pub struct TtsCacheRow {
    pub cache_key: String,
    pub audio_path: String,
    pub duration_secs: f64,
    pub text_preview: String,
    pub created_at: i64,
    pub accessed_at: i64,
    pub access_count: i32,
}

/// AssemblyKit 持久化行（Stage 16.3）
#[derive(Debug, Clone)]
pub struct AssemblyKitRow {
    pub project_id: String,
    /// 完整 AssemblyKit JSON（避免拆列；AssemblyKit 结构可能演进）
    pub assembly_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub(crate) fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}
