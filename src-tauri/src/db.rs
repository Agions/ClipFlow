//! db — SQLite 持久化层（Stage 12.3）
//!
//! 设计原则：
//! - 单文件 `storyfab.db`（应用数据目录），零运维
//! - WAL 模式提升并发读性能
//! - 5 张表：projects / pipeline_jobs / artifacts / script_variants / app_settings
//! - 同步 rusqlite（Connection 非 Sync），用 `std::sync::Mutex` 串行化访问
//! - migrations 通过 schema_version 表管理，向前兼容
//!
//! 持久化策略：
//! - 大体积产物（音频/字幕/成片）以文件落盘 + 数据库存路径引用
//! - 项目元数据 + 任务状态走 SQLite

use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use std::sync::Mutex;

// ─── 错误 ──────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("mutex poisoned")]
    Mutex,
    #[error("project not found: {0}")]
    NotFound(String),
    #[error("invalid data: {0}")]
    InvalidData(String),
}

pub type DbResult<T> = Result<T, DbError>;

// ─── DB 句柄 ──────────────────────────────────────────────────

/// SQLite 数据库句柄（线程安全，内部 Mutex 串行化）
pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    /// 打开或创建数据库（自动迁移）
    pub fn open(path: &Path) -> DbResult<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                DbError::InvalidData(format!("create db parent dir: {}", e))
            })?;
        }
        let conn = Connection::open(path)?;
        // WAL 模式提升并发读
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self { conn: Mutex::new(conn) };
        db.migrate()?;
        Ok(db)
    }

    /// 应用所有待执行的迁移
    fn migrate(&self) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        // schema_version 表（首迁移）
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            );",
        )?;
        let current: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |row| row.get(0),
            )?;
        drop(conn);

        // 迁移 001：v3 完整 schema
        if current < 1 {
            self.migrate_001()?;
            self.record_migration(1)?;
        }

        // 迁移 002：TTS 音频缓存（Stage 14.5）
        if current < 2 {
            self.migrate_002()?;
            self.record_migration(2)?;
        }

        // 迁移 003：AssemblyKit 持久化（Stage 16.3）
        if current < 3 {
            self.migrate_003()?;
            self.record_migration(3)?;
        }

        Ok(())
    }

    fn migrate_001(&self) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute_batch(MIGRATION_001)?;
        Ok(())
    }

    fn migrate_002(&self) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute_batch(MIGRATION_002)?;
        Ok(())
    }

    fn migrate_003(&self) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute_batch(MIGRATION_003)?;
        Ok(())
    }

    fn record_migration(&self, version: i32) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let now = now_unix();
        conn.execute(
            "INSERT INTO schema_version (version, applied_at) VALUES (?1, ?2)",
            params![version, now],
        )?;
        Ok(())
    }

    /// 获取数据库当前 schema 版本
    pub fn schema_version(&self) -> DbResult<i32> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let v: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |row| row.get(0),
            )?;
        Ok(v)
    }

    // ─── 项目 CRUD ──────────────────────────────────────────

    /// 插入或替换项目元数据
    pub fn upsert_project(&self, p: &ProjectRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO projects (id, name, intent_json, video_path, subtitle_path, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                intent_json=excluded.intent_json,
                video_path=excluded.video_path,
                subtitle_path=excluded.subtitle_path,
                updated_at=excluded.updated_at",
            params![
                p.id,
                p.name,
                p.intent_json,
                p.video_path,
                p.subtitle_path,
                p.created_at,
                p.updated_at,
            ],
        )?;
        Ok(())
    }

    /// 按 ID 查项目
    pub fn get_project(&self, id: &str) -> DbResult<ProjectRow> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.query_row(
            "SELECT id, name, intent_json, video_path, subtitle_path, created_at, updated_at
             FROM projects WHERE id = ?1",
            params![id],
            |row| {
                Ok(ProjectRow {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    intent_json: row.get(2)?,
                    video_path: row.get(3)?,
                    subtitle_path: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => DbError::NotFound(id.to_string()),
            other => DbError::Sqlite(other),
        })
    }

    /// 列出所有项目（按 updated_at 降序）
    pub fn list_projects(&self) -> DbResult<Vec<ProjectRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, intent_json, video_path, subtitle_path, created_at, updated_at
             FROM projects ORDER BY updated_at DESC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(ProjectRow {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    intent_json: row.get(2)?,
                    video_path: row.get(3)?,
                    subtitle_path: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    /// 删除项目（级联删任务和产物引用）
    pub fn delete_project(&self, id: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        // 显式事务
        conn.execute_batch("BEGIN")?;
        let r = (|| -> DbResult<()> {
            conn.execute("DELETE FROM artifacts WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE project_id = ?1)", params![id])?;
            conn.execute("DELETE FROM script_variants WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE project_id = ?1)", params![id])?;
            conn.execute("DELETE FROM pipeline_jobs WHERE project_id = ?1", params![id])?;
            conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
            Ok(())
        })();
        match r {
            Ok(()) => {
                conn.execute_batch("COMMIT")?;
                Ok(())
            }
            Err(e) => {
                let _ = conn.execute_batch("ROLLBACK");
                Err(e)
            }
        }
    }

    // ─── 任务状态 ──────────────────────────────────────────

    /// 插入或替换任务状态
    pub fn upsert_job(&self, j: &JobRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO pipeline_jobs (id, project_id, phase, phase_status_json, progress_pct, error_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                phase=excluded.phase,
                phase_status_json=excluded.phase_status_json,
                progress_pct=excluded.progress_pct,
                error_json=excluded.error_json,
                updated_at=excluded.updated_at",
            params![
                j.id,
                j.project_id,
                j.phase,
                j.phase_status_json,
                j.progress_pct,
                j.error_json,
                j.created_at,
                j.updated_at,
            ],
        )?;
        Ok(())
    }

    /// 查项目的最新任务
    pub fn latest_job(&self, project_id: &str) -> DbResult<Option<JobRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let row = conn
            .query_row(
                "SELECT id, project_id, phase, phase_status_json, progress_pct, error_json, created_at, updated_at
                 FROM pipeline_jobs WHERE project_id = ?1
                 ORDER BY updated_at DESC LIMIT 1",
                params![project_id],
                |row| {
                    Ok(JobRow {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        phase: row.get(2)?,
                        phase_status_json: row.get(3)?,
                        progress_pct: row.get(4)?,
                        error_json: row.get(5)?,
                        created_at: row.get(6)?,
                        updated_at: row.get(7)?,
                    })
                },
            )
            .optional()?;
        Ok(row)
    }

    // ─── 产物引用 ──────────────────────────────────────────

    pub fn upsert_artifact(&self, a: &ArtifactRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO artifacts (job_id, phase, artifact_type, path, metadata_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(job_id, phase, artifact_type) DO UPDATE SET
                path=excluded.path,
                metadata_json=excluded.metadata_json",
            params![
                a.job_id,
                a.phase,
                a.artifact_type,
                a.path,
                a.metadata_json,
                a.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn list_artifacts(&self, job_id: &str) -> DbResult<Vec<ArtifactRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let mut stmt = conn.prepare(
            "SELECT id, job_id, phase, artifact_type, path, metadata_json, created_at
             FROM artifacts WHERE job_id = ?1 ORDER BY id ASC",
        )?;
        let rows = stmt
            .query_map(params![job_id], |row| {
                Ok(ArtifactRow {
                    id: row.get(0)?,
                    job_id: row.get(1)?,
                    phase: row.get(2)?,
                    artifact_type: row.get(3)?,
                    path: row.get(4)?,
                    metadata_json: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    // ─── 设置 ─────────────────────────────────────────────

    pub fn get_setting(&self, key: &str) -> DbResult<Option<String>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let v: Option<String> = conn
            .query_row(
                "SELECT value_json FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?;
        Ok(v)
    }

    pub fn set_setting(&self, key: &str, value_json: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO app_settings (key, value_json) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json",
            params![key, value_json],
        )?;
        Ok(())
    }

    // ─── TTS 缓存（Stage 14.5） ────────────────────────────

    /// 查询 TTS 缓存；命中返回 Some(row)，未命中返回 None
    pub fn lookup_tts_cache(&self, cache_key: &str) -> DbResult<Option<TtsCacheRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let row: Option<TtsCacheRow> = conn
            .query_row(
                "SELECT cache_key, audio_path, duration_secs, text_preview, created_at, accessed_at, access_count
                 FROM tts_cache WHERE cache_key = ?1",
                params![cache_key],
                |row| {
                    Ok(TtsCacheRow {
                        cache_key: row.get(0)?,
                        audio_path: row.get(1)?,
                        duration_secs: row.get(2)?,
                        text_preview: row.get(3)?,
                        created_at: row.get(4)?,
                        accessed_at: row.get(5)?,
                        access_count: row.get(6)?,
                    })
                },
            )
            .optional()?;
        Ok(row)
    }

    /// 写入/更新 TTS 缓存（命中后 also bump access_count + accessed_at）
    pub fn upsert_tts_cache(&self, c: &TtsCacheRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO tts_cache (cache_key, audio_path, duration_secs, text_preview, created_at, accessed_at, access_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(cache_key) DO UPDATE SET
                audio_path=excluded.audio_path,
                duration_secs=excluded.duration_secs,
                text_preview=excluded.text_preview,
                accessed_at=excluded.accessed_at,
                access_count=access_count + 1",
            params![
                c.cache_key,
                c.audio_path,
                c.duration_secs,
                c.text_preview,
                c.created_at,
                c.accessed_at,
                c.access_count,
            ],
        )?;
        Ok(())
    }

    /// 批量记录缓存命中（更新 accessed_at + 累加 access_count）
    pub fn touch_tts_cache(&self, cache_keys: &[String]) -> DbResult<usize> {
        if cache_keys.is_empty() {
            return Ok(0);
        }
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let now = now_unix();
        let mut updated = 0;
        // 单条更新，简单可靠（批量 key 数量通常是几十）
        for key in cache_keys {
            updated += conn.execute(
                "UPDATE tts_cache SET accessed_at = ?1, access_count = access_count + 1
                 WHERE cache_key = ?2",
                params![now, key],
            )?;
        }
        Ok(updated)
    }

    /// 清理过期 TTS 缓存（created_at < cutoff_unix）
    /// 返回删除的行数
    pub fn clear_expired_tts_cache(&self, cutoff_unix: i64) -> DbResult<usize> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let n = conn.execute(
            "DELETE FROM tts_cache WHERE created_at < ?1",
            params![cutoff_unix],
        )?;
        Ok(n)
    }

    /// TTS 缓存总数（用于 UI 展示 / 健康检查）
    pub fn tts_cache_count(&self) -> DbResult<i64> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM tts_cache", [], |row| row.get(0))?;
        Ok(n)
    }

    // ─── AssemblyKit 持久化（Stage 16.3） ──────────────────

    /// 保存/更新 AssemblyKit（按 project_id 主键）
    pub fn upsert_assembly_kit(&self, kit: &AssemblyKitRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "INSERT INTO assembly_kits (project_id, assembly_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(project_id) DO UPDATE SET
                assembly_json=excluded.assembly_json,
                updated_at=excluded.updated_at",
            params![kit.project_id, kit.assembly_json, kit.created_at, kit.updated_at],
        )?;
        Ok(())
    }

    /// 加载 AssemblyKit（按 project_id）
    pub fn get_assembly_kit(&self, project_id: &str) -> DbResult<Option<AssemblyKitRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let row: Option<AssemblyKitRow> = conn
            .query_row(
                "SELECT project_id, assembly_json, created_at, updated_at
                 FROM assembly_kits WHERE project_id = ?1",
                params![project_id],
                |row| {
                    Ok(AssemblyKitRow {
                        project_id: row.get(0)?,
                        assembly_json: row.get(1)?,
                        created_at: row.get(2)?,
                        updated_at: row.get(3)?,
                    })
                },
            )
            .optional()?;
        Ok(row)
    }

    /// 删除 AssemblyKit（项目删除时级联）
    pub fn delete_assembly_kit(&self, project_id: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        conn.execute(
            "DELETE FROM assembly_kits WHERE project_id = ?1",
            params![project_id],
        )?;
        Ok(())
    }
}

// ─── 行模型（DB row → Rust struct） ────────────────────────────

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

// ─── 工具 ──────────────────────────────────────────────────────

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ─── 迁移 001：v3 完整 schema ──────────────────────────────────

const MIGRATION_001: &str = r#"
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

const MIGRATION_002: &str = r#"
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

const MIGRATION_003: &str = r#"
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

// ─── 单元测试 ──────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn fresh_db() -> Db {
        let dir = tempdir().expect("create temp dir");
        let path = dir.path().join("test.db");
        Db::open(&path).expect("open db")
    }

    #[test]
    fn open_runs_all_migrations() {
        let db = fresh_db();
        // 001 (v3 完整 schema) + 002 (TTS 缓存) + 003 (AssemblyKit)
        assert_eq!(db.schema_version().unwrap(), 3);
    }

    #[test]
    fn project_crud_round_trip() {
        let db = fresh_db();
        let p = ProjectRow {
            id: "p1".to_string(),
            name: "测试项目".to_string(),
            intent_json: r#"{"intent":"short-drama"}"#.to_string(),
            video_path: "/tmp/v.mp4".to_string(),
            subtitle_path: Some("/tmp/s.srt".to_string()),
            created_at: 1700000000,
            updated_at: 1700000000,
        };
        db.upsert_project(&p).unwrap();

        let got = db.get_project("p1").unwrap();
        assert_eq!(got.name, "测试项目");
        assert_eq!(got.video_path, "/tmp/v.mp4");

        let list = db.list_projects().unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn upsert_updates_existing_project() {
        let db = fresh_db();
        let mut p = ProjectRow {
            id: "p2".to_string(),
            name: "old".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 100,
            updated_at: 100,
        };
        db.upsert_project(&p).unwrap();

        p.name = "new".to_string();
        p.updated_at = 200;
        db.upsert_project(&p).unwrap();

        let got = db.get_project("p2").unwrap();
        assert_eq!(got.name, "new");
        assert_eq!(got.created_at, 100); // 不变
        assert_eq!(got.updated_at, 200); // 更新
    }

    #[test]
    fn delete_project_cascades() {
        let db = fresh_db();
        let p = ProjectRow {
            id: "p3".to_string(),
            name: "x".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 0,
            updated_at: 0,
        };
        db.upsert_project(&p).unwrap();

        let j = JobRow {
            id: "j1".to_string(),
            project_id: "p3".to_string(),
            phase: "understanding".to_string(),
            phase_status_json: "{}".to_string(),
            progress_pct: 0.0,
            error_json: None,
            created_at: 0,
            updated_at: 0,
        };
        db.upsert_job(&j).unwrap();

        let a = ArtifactRow {
            id: 0,
            job_id: "j1".to_string(),
            phase: "understanding".to_string(),
            artifact_type: "storyline".to_string(),
            path: "/tmp/s.json".to_string(),
            metadata_json: None,
            created_at: 0,
        };
        db.upsert_artifact(&a).unwrap();

        db.delete_project("p3").unwrap();

        assert!(matches!(db.get_project("p3"), Err(DbError::NotFound(_))));
        assert!(db.latest_job("p3").unwrap().is_none());
        assert!(db.list_artifacts("j1").unwrap().is_empty());
    }

    #[test]
    fn settings_round_trip() {
        let db = fresh_db();
        assert!(db.get_setting("missing").unwrap().is_none());

        db.set_setting("theme", r#""dark""#).unwrap();
        assert_eq!(db.get_setting("theme").unwrap().as_deref(), Some(r#""dark""#));

        // 覆盖
        db.set_setting("theme", r#""light""#).unwrap();
        assert_eq!(db.get_setting("theme").unwrap().as_deref(), Some(r#""light""#));
    }

    // ─── TTS 缓存（Stage 14.5） ────────────────────────────

    fn cache_row(key: &str, path: &str, created_at: i64) -> TtsCacheRow {
        TtsCacheRow {
            cache_key: key.to_string(),
            audio_path: path.to_string(),
            duration_secs: 1.5,
            text_preview: "你好".to_string(),
            created_at,
            accessed_at: created_at,
            access_count: 0,
        }
    }

    #[test]
    fn tts_cache_lookup_miss_returns_none() {
        let db = fresh_db();
        assert!(db.lookup_tts_cache("missing").unwrap().is_none());
    }

    #[test]
    fn tts_cache_upsert_then_lookup_round_trip() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();

        let got = db.lookup_tts_cache("k1").unwrap().unwrap();
        assert_eq!(got.audio_path, "/tmp/a.mp3");
        assert_eq!(got.duration_secs, 1.5);
        assert_eq!(got.access_count, 0);
    }

    #[test]
    fn tts_cache_upsert_existing_bumps_access_count() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/b.mp3", 2000)).unwrap();

        let got = db.lookup_tts_cache("k1").unwrap().unwrap();
        assert_eq!(got.audio_path, "/tmp/b.mp3"); // 路径已更新
        assert_eq!(got.access_count, 1); // 累加 1
    }

    #[test]
    fn tts_cache_touch_updates_access_metadata() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();
        let updated = db.touch_tts_cache(&["k1".to_string(), "missing".to_string()]).unwrap();
        assert_eq!(updated, 1); // 只有一个 key 存在
    }

    #[test]
    fn tts_cache_clear_expired_removes_old_entries() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("old", "/tmp/o.mp3", 100)).unwrap();
        db.upsert_tts_cache(&cache_row("new", "/tmp/n.mp3", 5000)).unwrap();

        // 清理 created_at < 1000
        let removed = db.clear_expired_tts_cache(1000).unwrap();
        assert_eq!(removed, 1);
        assert!(db.lookup_tts_cache("old").unwrap().is_none());
        assert!(db.lookup_tts_cache("new").unwrap().is_some());
    }

    #[test]
    fn tts_cache_count_reflects_total() {
        let db = fresh_db();
        assert_eq!(db.tts_cache_count().unwrap(), 0);
        db.upsert_tts_cache(&cache_row("a", "/a.mp3", 1)).unwrap();
        db.upsert_tts_cache(&cache_row("b", "/b.mp3", 2)).unwrap();
        db.upsert_tts_cache(&cache_row("c", "/c.mp3", 3)).unwrap();
        assert_eq!(db.tts_cache_count().unwrap(), 3);
    }

    // ─── AssemblyKit 持久化（Stage 16.3） ──────────────────

    fn assembly_row(project_id: &str, json: &str) -> AssemblyKitRow {
        AssemblyKitRow {
            project_id: project_id.to_string(),
            assembly_json: json.to_string(),
            created_at: 1000,
            updated_at: 2000,
        }
    }

    fn ensure_project(db: &Db, id: &str) {
        let p = ProjectRow {
            id: id.to_string(),
            name: "test".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 1,
            updated_at: 1,
        };
        db.upsert_project(&p).unwrap();
    }

    #[test]
    fn assembly_kit_upsert_then_get_round_trip() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        let row = assembly_row("p1", r#"{"id":"a1","videoTracks":[]}"#);
        db.upsert_assembly_kit(&row).unwrap();

        let got = db.get_assembly_kit("p1").unwrap().unwrap();
        assert_eq!(got.project_id, "p1");
        assert_eq!(got.assembly_json, r#"{"id":"a1","videoTracks":[]}"#);
        assert_eq!(got.created_at, 1000);
        assert_eq!(got.updated_at, 2000);
    }

    #[test]
    fn assembly_kit_upsert_updates_json_and_timestamp() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "v1")).unwrap();
        db.upsert_assembly_kit(&assembly_row("p1", "v2")).unwrap();

        let got = db.get_assembly_kit("p1").unwrap().unwrap();
        assert_eq!(got.assembly_json, "v2");
        assert_eq!(got.created_at, 1000); // 不变
        assert_eq!(got.updated_at, 2000);
    }

    #[test]
    fn assembly_kit_get_missing_returns_none() {
        let db = fresh_db();
        assert!(db.get_assembly_kit("nonexistent").unwrap().is_none());
    }

    #[test]
    fn assembly_kit_delete_removes_row() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "x")).unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_some());
        db.delete_assembly_kit("p1").unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_none());
    }

    #[test]
    fn assembly_kit_cascades_on_project_delete() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "x")).unwrap();

        // 删 project → 应该级联删 assembly_kit
        db.delete_project("p1").unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_none());
    }
}
