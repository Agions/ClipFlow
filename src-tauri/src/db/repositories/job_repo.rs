//! 任务状态数据访问仓库

use rusqlite::{params, Connection, OptionalExtension};
use crate::db::models::{DbResult, JobRow};

pub struct JobRepo;

impl JobRepo {
    pub fn upsert(conn: &Connection, j: &JobRow) -> DbResult<()> {
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

    pub fn latest_by_project_id(conn: &Connection, project_id: &str) -> DbResult<Option<JobRow>> {
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
}
