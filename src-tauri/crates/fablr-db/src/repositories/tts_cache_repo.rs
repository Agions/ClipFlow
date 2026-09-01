//! TTS 音频缓存数据访问仓库

use rusqlite::{params, Connection, OptionalExtension};
use crate::models::{now_unix, DbResult, TtsCacheRow};

pub struct TtsCacheRepo;

impl TtsCacheRepo {
    pub fn lookup(conn: &Connection, cache_key: &str) -> DbResult<Option<TtsCacheRow>> {
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

    pub fn upsert(conn: &Connection, c: &TtsCacheRow) -> DbResult<()> {
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

    pub fn touch(conn: &Connection, cache_keys: &[String]) -> DbResult<usize> {
        if cache_keys.is_empty() {
            return Ok(0);
        }
        let now = now_unix();
        let mut updated = 0;
        for key in cache_keys {
            updated += conn.execute(
                "UPDATE tts_cache SET accessed_at = ?1, access_count = access_count + 1
                 WHERE cache_key = ?2",
                params![now, key],
            )?;
        }
        Ok(updated)
    }

    pub fn clear_expired(conn: &Connection, cutoff_unix: i64) -> DbResult<usize> {
        let n = conn.execute(
            "DELETE FROM tts_cache WHERE created_at < ?1",
            params![cutoff_unix],
        )?;
        Ok(n)
    }

    pub fn count(conn: &Connection) -> DbResult<i64> {
        let n: i64 = conn.query_row("SELECT COUNT(*) FROM tts_cache", [], |row| row.get(0))?;
        Ok(n)
    }
}
