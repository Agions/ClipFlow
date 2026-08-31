//! 项目数据访问仓库

use rusqlite::{params, Connection};
use crate::db::models::{DbError, DbResult, ProjectRow};

pub struct ProjectRepo;

impl ProjectRepo {
    pub fn upsert(conn: &Connection, p: &ProjectRow) -> DbResult<()> {
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

    pub fn get_by_id(conn: &Connection, id: &str) -> DbResult<ProjectRow> {
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

    pub fn list(conn: &Connection) -> DbResult<Vec<ProjectRow>> {
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

    pub fn delete_cascade(conn: &Connection, id: &str) -> DbResult<()> {
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
}
