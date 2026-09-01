//! Crash recovery — list and clear panic-hook crash reports.
//!
//! The panic hook installed by [`media::utils::resilience::install_panic_hook`]
//! writes a JSON file to `<app_data_dir>/fablr/crashes/crash-<ts>.json`
//! for every uncaught panic. This module exposes Tauri commands so the
//! frontend can surface those reports to the user ("here's what crashed
//! last time, please send the log").
//!
//! Commands
//! - `list_crashes`        — returns crash files sorted newest-first
//! - `read_crash`          — returns the parsed JSON body for one file
//! - `delete_crash`        — removes a single crash file
//! - `clear_crashes`       — removes all crash files (irreversible)
//!
//! File format (written by `utils::resilience`):
//! ```json
//! {
//!   "timestamp": 1700000000,
//!   "payload":   "panicked at 'x'",
//!   "location":  "src/foo.rs:12:5",
//!   "backtrace": "stack frames...",
//!   "version":   "2.1.0"
//! }
//! ```

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tokio::fs as tokio_fs;

use media::utils::resilience::crash_dir_path;

/// Lightweight summary returned by `list_crashes`. The full body is
/// fetched on-demand by `read_crash` so the list stays cheap.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashSummary {
    /// File name, e.g. `crash-1700000000.json`. Use this as the `id`
    /// when calling `read_crash` or `delete_crash`.
    pub filename: String,
    /// Unix timestamp (seconds) parsed from the filename.
    pub timestamp: u64,
    /// File size in bytes — used by the UI to decide whether to inline
    /// the content or show a "open externally" hint.
    pub size_bytes: u64,
    /// Best-effort short description of the panic (first line of payload
    /// plus the location). Optional because the file may be malformed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
}

/// Full crash record, returned by `read_crash`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashRecord {
    pub filename: String,
    pub timestamp: u64,
    pub payload: String,
    pub location: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backtrace: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/// Strip the `crash-<ts>.json` prefix and parse the timestamp. Returns
/// `None` if the filename does not match the panic-hook convention.
fn parse_crash_timestamp(filename: &str) -> Option<u64> {
    let stem = filename.strip_prefix("crash-")?.strip_suffix(".json")?;
    stem.parse::<u64>().ok()
}

// ─── Commands ───────────────────────────────────────────────────────────────

/// List crash reports sorted newest-first. Returns an empty Vec when the
/// crashes directory does not exist yet (normal at first launch).
#[tauri::command]
pub async fn list_crashes(app: AppHandle) -> Result<Vec<CrashSummary>, String> {
    let dir = crash_dir_path(&app).map_err(|e| format!("无法获取崩溃目录: {e}"))?;
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = tokio_fs::read_dir(&dir)
        .await
        .map_err(|e| format!("读取崩溃目录失败: {e}"))?;

    let mut summaries: Vec<CrashSummary> = Vec::new();
    let mut next = entries
        .next_entry()
        .await
        .map_err(|e| format!("读取目录项失败: {e}"))?;
    while let Some(entry) = next {
        let path = entry.path();
        let filename = match path.file_name().and_then(|n| n.to_str()) {
            Some(s) => s.to_string(),
            None => {
                next = entries
                    .next_entry()
                    .await
                    .map_err(|e| format!("读取目录项失败: {e}"))?;
                continue;
            }
        };
        let timestamp = match parse_crash_timestamp(&filename) {
            Some(t) => t,
            None => {
                // Not a panic-hook file — skip silently. Foreign files
                // (e.g. user-dropped JSON) should not appear in the list.
                next = entries
                    .next_entry()
                    .await
                    .map_err(|e| format!("读取目录项失败: {e}"))?;
                continue;
            }
        };

        let metadata = match tokio_fs::metadata(&path).await {
            Ok(m) => m,
            Err(_) => {
                next = entries
                    .next_entry()
                    .await
                    .map_err(|e| format!("读取目录项失败: {e}"))?;
                continue;
            }
        };
        let size_bytes = metadata.len();

        // Best-effort preview — first 200 chars of payload + location.
        // Failures here are non-fatal; the UI can still show the file by name.
        let mut preview: Option<String> = None;
        if let Ok(body) = std::fs::read_to_string(&path) {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&body) {
                let payload = value
                    .get("payload")
                    .and_then(|p| p.as_str())
                    .unwrap_or("<no payload>");
                let location = value
                    .get("location")
                    .and_then(|l| l.as_str())
                    .unwrap_or("<unknown>");
                let first_line = payload.lines().next().unwrap_or("");
                let truncated = if first_line.chars().count() > 120 {
                    let cut: String = first_line.chars().take(120).collect();
                    format!("{cut}…")
                } else {
                    first_line.to_string()
                };
                preview = Some(format!("{truncated} @ {location}"));
            }
        }

        summaries.push(CrashSummary {
            filename,
            timestamp,
            size_bytes,
            preview,
        });

        next = entries
            .next_entry()
            .await
            .map_err(|e| format!("读取目录项失败: {e}"))?;
    }

    // Newest first.
    summaries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(summaries)
}

/// Read and parse one crash report. Returns a structured [`CrashRecord`]
/// so the frontend can render the fields without re-parsing JSON.
#[tauri::command]
pub async fn read_crash(app: AppHandle, filename: String) -> Result<CrashRecord, String> {
    let dir = crash_dir_path(&app).map_err(|e| format!("无法获取崩溃目录: {e}"))?;
    let path = dir.join(&filename);

    // Reject path traversal: only allow plain `crash-<digits>.json` names.
    if parse_crash_timestamp(&filename).is_none() {
        return Err(format!("非法文件名: {filename}"));
    }

    let body = tokio_fs::read_to_string(&path)
        .await
        .map_err(|e| format!("读取崩溃文件失败: {e}"))?;

    // The panic hook writes well-formed JSON, but be defensive: a
    // partial write (power loss during a panic) may be malformed.
    let value: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("解析崩溃文件失败: {e}"))?;

    Ok(CrashRecord {
        filename,
        timestamp: value
            .get("timestamp")
            .and_then(|t| t.as_u64())
            .unwrap_or(0),
        payload: value
            .get("payload")
            .and_then(|p| p.as_str())
            .unwrap_or("<no payload>")
            .to_string(),
        location: value
            .get("location")
            .and_then(|l| l.as_str())
            .unwrap_or("<unknown>")
            .to_string(),
        backtrace: value
            .get("backtrace")
            .and_then(|b| b.as_str())
            .map(|s| s.to_string()),
        version: value
            .get("version")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

/// Delete a single crash report. Returns `Ok(())` even if the file does
/// not exist (idempotent — UI calls this on "dismiss" without first
/// checking existence).
#[tauri::command]
pub async fn delete_crash(app: AppHandle, filename: String) -> Result<(), String> {
    if parse_crash_timestamp(&filename).is_none() {
        return Err(format!("非法文件名: {filename}"));
    }
    let dir = crash_dir_path(&app).map_err(|e| format!("无法获取崩溃目录: {e}"))?;
    let path = dir.join(&filename);

    match tokio_fs::remove_file(&path).await {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("删除崩溃文件失败: {e}")),
    }
}

/// Remove every crash report. Used by the "clear all" button in the UI.
#[tauri::command]
pub async fn clear_crashes(app: AppHandle) -> Result<usize, String> {
    let dir = crash_dir_path(&app).map_err(|e| format!("无法获取崩溃目录: {e}"))?;
    if !dir.exists() {
        return Ok(0);
    }

    let mut entries = tokio_fs::read_dir(&dir)
        .await
        .map_err(|e| format!("读取崩溃目录失败: {e}"))?;

    let mut removed = 0usize;
    let mut next = entries
        .next_entry()
        .await
        .map_err(|e| format!("读取目录项失败: {e}"))?;
    while let Some(entry) = next {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if parse_crash_timestamp(name).is_some() {
                if tokio_fs::remove_file(&path).await.is_ok() {
                    removed += 1;
                }
            }
        }
        next = entries
            .next_entry()
            .await
            .map_err(|e| format!("读取目录项失败: {e}"))?;
    }

    tracing::info!("[crash_recovery] cleared {} crash reports", removed);
    Ok(removed)
}

// ─── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_crash_timestamp_accepts_valid_names() {
        assert_eq!(parse_crash_timestamp("crash-1700000000.json"), Some(1_700_000_000));
        assert_eq!(parse_crash_timestamp("crash-0.json"), Some(0));
    }

    #[test]
    fn parse_crash_timestamp_rejects_invalid_names() {
        assert_eq!(parse_crash_timestamp("crash.json"), None);
        assert_eq!(parse_crash_timestamp("crash-abc.json"), None);
        assert_eq!(parse_crash_timestamp("crash-1700000000.txt"), None);
        assert_eq!(parse_crash_timestamp("1700000000.json"), None);
        assert_eq!(parse_crash_timestamp("../crash-1.json"), None);
        assert_eq!(parse_crash_timestamp(""), None);
    }

    #[test]
    fn parse_crash_timestamp_rejects_negative_or_overflow() {
        // No minus sign in u64::from_str, so any "-X" will already fail
        // at the digit parser, but make sure we don't accidentally
        // accept signed numbers via weird inputs.
        assert_eq!(parse_crash_timestamp("crash--1.json"), None);
    }
}
