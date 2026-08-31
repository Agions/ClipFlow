//! 应用设置数据访问仓库

use rusqlite::{params, Connection, OptionalExtension};
use crate::db::models::DbResult;

pub struct SettingsRepo;

impl SettingsRepo {
    pub fn get(conn: &Connection, key: &str) -> DbResult<Option<String>> {
        let v: Option<String> = conn
            .query_row(
                "SELECT value_json FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?;
        Ok(v)
    }

    pub fn set(conn: &Connection, key: &str, value_json: &str) -> DbResult<()> {
        conn.execute(
            "INSERT INTO app_settings (key, value_json) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json",
            params![key, value_json],
        )?;
        Ok(())
    }
}
