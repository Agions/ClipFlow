//! AssemblyKit 持久化数据访问仓库

use rusqlite::{params, Connection, OptionalExtension};
use crate::models::{AssemblyKitRow, DbResult};

pub struct AssemblyRepo;

impl AssemblyRepo {
    pub fn upsert(conn: &Connection, kit: &AssemblyKitRow) -> DbResult<()> {
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

    pub fn get_by_project_id(conn: &Connection, project_id: &str) -> DbResult<Option<AssemblyKitRow>> {
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

    pub fn delete(conn: &Connection, project_id: &str) -> DbResult<()> {
        conn.execute(
            "DELETE FROM assembly_kits WHERE project_id = ?1",
            params![project_id],
        )?;
        Ok(())
    }
}
