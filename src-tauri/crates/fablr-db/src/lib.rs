//! db — SQLite 持久化层（模块化仓储架构）
//!
//! 设计原则：
//! - 单文件 `fablr.db`（应用数据目录），零运维
//! - WAL 模式提升并发读性能
//! - 模块化 Repositories 分层（projects / pipeline_jobs / artifacts / app_settings / tts_cache / assembly_kits）
//! - 同步 rusqlite，用 `std::sync::Mutex` 串行化访问
//! - migrations 通过 schema_version 表管理，向前兼容

pub mod models;
pub mod migrations;
pub mod repositories;
pub mod service;
#[cfg(test)]
pub mod tests;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub use models::*;
pub use migrations::run_migrations;
pub use repositories::*;
pub use service::ProjectService;

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
        // WAL 模式提升并发读性能
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self { conn: Mutex::new(conn) };
        db.migrate()?;
        Ok(db)
    }

    /// 应用所有待执行的迁移
    fn migrate(&self) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        run_migrations(&conn)?;
        Ok(())
    }

    /// 获取数据库当前 schema 版本
    pub fn schema_version(&self) -> DbResult<i32> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        let v: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )?;
        Ok(v)
    }

    // ─── 项目 CRUD ──────────────────────────────────────────

    pub fn upsert_project(&self, p: &ProjectRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ProjectRepo::upsert(&conn, p)
    }

    pub fn get_project(&self, id: &str) -> DbResult<ProjectRow> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ProjectRepo::get_by_id(&conn, id)
    }

    pub fn list_projects(&self) -> DbResult<Vec<ProjectRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ProjectRepo::list(&conn)
    }

    pub fn delete_project(&self, id: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ProjectRepo::delete_cascade(&conn, id)
    }

    // ─── 任务状态 ──────────────────────────────────────────

    pub fn upsert_job(&self, j: &JobRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        JobRepo::upsert(&conn, j)
    }

    pub fn latest_job(&self, project_id: &str) -> DbResult<Option<JobRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        JobRepo::latest_by_project_id(&conn, project_id)
    }

    // ─── 产物引用 ──────────────────────────────────────────

    pub fn upsert_artifact(&self, a: &ArtifactRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ArtifactRepo::upsert(&conn, a)
    }

    pub fn list_artifacts(&self, job_id: &str) -> DbResult<Vec<ArtifactRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        ArtifactRepo::list_by_job_id(&conn, job_id)
    }

    // ─── 设置 ─────────────────────────────────────────────

    pub fn get_setting(&self, key: &str) -> DbResult<Option<String>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        SettingsRepo::get(&conn, key)
    }

    pub fn set_setting(&self, key: &str, value_json: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        SettingsRepo::set(&conn, key, value_json)
    }

    // ─── TTS 缓存（Stage 14.5） ────────────────────────────

    pub fn lookup_tts_cache(&self, cache_key: &str) -> DbResult<Option<TtsCacheRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        TtsCacheRepo::lookup(&conn, cache_key)
    }

    pub fn upsert_tts_cache(&self, c: &TtsCacheRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        TtsCacheRepo::upsert(&conn, c)
    }

    pub fn touch_tts_cache(&self, cache_keys: &[String]) -> DbResult<usize> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        TtsCacheRepo::touch(&conn, cache_keys)
    }

    pub fn clear_expired_tts_cache(&self, cutoff_unix: i64) -> DbResult<usize> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        TtsCacheRepo::clear_expired(&conn, cutoff_unix)
    }

    pub fn tts_cache_count(&self) -> DbResult<i64> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        TtsCacheRepo::count(&conn)
    }

    // ─── AssemblyKit 持久化（Stage 16.3） ──────────────────

    pub fn upsert_assembly_kit(&self, kit: &AssemblyKitRow) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        AssemblyRepo::upsert(&conn, kit)
    }

    pub fn get_assembly_kit(&self, project_id: &str) -> DbResult<Option<AssemblyKitRow>> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        AssemblyRepo::get_by_project_id(&conn, project_id)
    }

    pub fn delete_assembly_kit(&self, project_id: &str) -> DbResult<()> {
        let conn = self.conn.lock().map_err(|_| DbError::Mutex)?;
        AssemblyRepo::delete(&conn, project_id)
    }
}
