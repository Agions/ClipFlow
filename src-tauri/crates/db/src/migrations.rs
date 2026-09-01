//! SQLite 数据库迁移管理

use rusqlite::Connection;
use crate::models::{now_unix, DbResult};

// ─── 迁移 001：v3 完整 schema ──────────────────────────────────

pub const MIGRATION_001: &str = r#"
-- 项目元数据
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    intent_json TEXT NOT NULL,
    video_path TEXT,
    subtitle_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- 任务状态
CREATE TABLE pipeline_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    phase_status_json TEXT NOT NULL,
    progress_pct REAL NOT NULL DEFAULT 0,
    error_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_pipeline_jobs_project_id ON pipeline_jobs(project_id);
CREATE INDEX idx_pipeline_jobs_updated_at ON pipeline_jobs(updated_at DESC);

-- 阶段产物引用
CREATE TABLE artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    path TEXT NOT NULL,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (job_id) REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    UNIQUE (job_id, phase, artifact_type)
);

CREATE INDEX idx_artifacts_job_id ON artifacts(job_id);

-- 脚本版本（多风格生成时使用）
CREATE TABLE script_variants (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    style TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (job_id) REFERENCES pipeline_jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_script_variants_job_id ON script_variants(job_id);

-- 应用设置（非敏感项）
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
);
"#;

// ─── 迁移 002：TTS 音频缓存（Stage 14.5） ─────────────────────

pub const MIGRATION_002: &str = r#"
-- TTS 合成结果缓存：text+voice+speed+format+backend hash → 音频文件
CREATE TABLE tts_cache (
    cache_key TEXT PRIMARY KEY,
    audio_path TEXT NOT NULL,
    duration_secs REAL NOT NULL,
    text_preview TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    accessed_at INTEGER NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tts_cache_accessed_at ON tts_cache(accessed_at DESC);
CREATE INDEX idx_tts_cache_created_at ON tts_cache(created_at);
"#;

// ─── 迁移 003：AssemblyKit 持久化（Stage 16.3） ───────────────

pub const MIGRATION_003: &str = r#"
-- 装配图：每个项目最多 1 个 AssemblyKit，存整段 JSON（结构可能演进）
CREATE TABLE assembly_kits (
    project_id TEXT PRIMARY KEY,
    assembly_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_assembly_kits_updated_at ON assembly_kits(updated_at DESC);
"#;

pub fn run_migrations(conn: &Connection) -> DbResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );",
    )?;

    let current: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )?;

    if current < 1 {
        conn.execute_batch(MIGRATION_001)?;
        record_version(conn, 1)?;
    }

    if current < 2 {
        conn.execute_batch(MIGRATION_002)?;
        record_version(conn, 2)?;
    }

    if current < 3 {
        conn.execute_batch(MIGRATION_003)?;
        record_version(conn, 3)?;
    }

    Ok(())
}

fn record_version(conn: &Connection, version: i32) -> DbResult<()> {
    let now = now_unix();
    conn.execute(
        "INSERT INTO schema_version (version, applied_at) VALUES (?1, ?2)",
        rusqlite::params![version, now],
    )?;
    Ok(())
}
