//! 产物引用数据访问仓库

use rusqlite::{params, Connection};
use crate::models::{ArtifactRow, DbResult};

pub struct ArtifactRepo;

impl ArtifactRepo {
    pub fn upsert(conn: &Connection, a: &ArtifactRow) -> DbResult<()> {
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

    pub fn list_by_job_id(conn: &Connection, job_id: &str) -> DbResult<Vec<ArtifactRow>> {
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
}
