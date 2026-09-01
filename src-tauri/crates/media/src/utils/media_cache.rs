//! In-process cache for ffprobe / media metadata probing.
//!
//! Probing media metadata (via [`crate::video::probe_metadata`]) spawns an
//! external `ffprobe` process and is comparatively expensive. Many code paths
//! (e.g. `generate_preview`, the `render_autonomous_cut` pipeline, the
//! segmenter) probe the *same* media file within a single app session. This
//! module adds a transparent, process-local cache in front of
//! `probe_metadata`, keyed by the file path **plus its modification time**.
//! When the file (and its mtime) is unchanged the cached result is returned
//! without re-spawning ffprobe.
//!
//! The cache is invisible to callers: it never alters the returned data, it
//! only avoids redundant work. No command signature or JSON shape changes.
//! Only `std::sync` primitives are used (no new dependencies), matching the
//! crate's existing `OnceLock` concurrency style (see `binary::hw_accel`).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::SystemTime;

use crate::binary::ffprobe_binary;
use crate::video::probe_metadata;

/// Cache key: the canonical file path together with its last-modified
/// timestamp. The mtime invalidates the entry as soon as the file is
/// rewritten, so callers never observe stale metadata.
type CacheKey = (PathBuf, SystemTime);

/// Process-wide metadata cache, initialized lazily on first use.
static METADATA_CACHE: OnceLock<Mutex<HashMap<CacheKey, serde_json::Value>>> =
    OnceLock::new();

/// Return the shared metadata cache, creating it on first access.
fn cache() -> &'static Mutex<HashMap<CacheKey, serde_json::Value>> {
    METADATA_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Probe the media metadata for `path`, returning the cached result when the
/// file (and its mtime) is unchanged since the last probe.
///
/// This is a drop-in, transparent replacement for
/// [`crate::video::probe_metadata`]: the returned [`serde_json::Value`] is
/// identical to a fresh probe, so callers can adopt it without altering any
/// downstream logic. The underlying probe function is left intact — this
/// module only adds the cache layer in front of it.
pub fn probe_metadata_cached(path: &Path) -> Result<serde_json::Value, String> {
    let path_str = path
        .to_str()
        .ok_or_else(|| format!("路径不是有效 UTF-8: {:?}", path))?;

    // Resolve the modification time used as the cache-invalidation key.
    // Done before probing so a missing/inaccessible file fails fast without
    // ever spawning ffprobe.
    let mtime = std::fs::metadata(path)
        .map_err(|e| format!("读取文件元数据失败: {e}"))?
        .modified()
        .map_err(|e| format!("读取文件修改时间失败: {e}"))?;

    let key = (path.to_path_buf(), mtime);

    // Fast path: unchanged file -> return the stored probe (no ffprobe).
    if let Some(cached) = cache().lock().expect("metadata cache mutex poisoned").get(&key) {
        return Ok(cached.clone());
    }

    // Slow path: probe, store, return. The lock is released before probing
    // (the `if let` guard above is dropped) so we never hold the mutex across
    // the blocking ffprobe call.
    let value = probe_metadata(path_str, &ffprobe_binary())?;
    cache()
        .lock()
        .expect("metadata cache mutex poisoned")
        .insert(key, value.clone());
    Ok(value)
}

/// Convenience wrapper around [`probe_metadata_cached`] that returns only the
/// media duration (in seconds) parsed from the cached probe result.
///
/// Behavior matches the legacy raw-ffprobe duration probes (which read
/// `format=duration`): the value is identical, only the probe is cached.
pub fn probe_duration_cached(path: &Path) -> Result<f64, String> {
    let meta = probe_metadata_cached(path)?;
    Ok(meta
        .get("duration")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_missing_file_errors_without_spawning_ffprobe() {
        // A non-existent path must fail at the `fs::metadata` step, before
        // any ffprobe process is spawned. This keeps the test hermetic and
        // independent of whether ffprobe is installed in the environment.
        let missing = Path::new("/nonexistent/path/to/media_12345.mp4");
        let result = probe_metadata_cached(missing);
        assert!(result.is_err(), "expected Err for a missing file");
        assert!(
            result.unwrap_err().contains("读取文件元数据失败"),
            "error must originate from the metadata read step"
        );
    }
}
