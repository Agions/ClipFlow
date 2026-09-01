//! Resilience — backward-compatible re-export module.
//!
//! The original `resilience.rs` has been split into:
//! - `panic_hook.rs` — panic hook installation
//! - `semaphore.rs` — ResourceLimiter and ResourceError
//! - `commands/crash_recovery.rs` — crash report management (Tauri commands)
//!
//! This module preserves the public API so existing `crate::utils::resilience::*`
//! imports continue to work without changes.

pub use crate::utils::panic_hook::install_panic_hook;
pub use crate::utils::semaphore::{
    resource_error_to_user_message, ResourceError, ResourceLimiter,
};

use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Resolve the crashes directory for the given Tauri app.
pub fn crash_dir_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let dir = base.join("crashes");
    Ok(dir)
}
