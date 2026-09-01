//! Export cancellation state tracker.
//! Shared across all render commands so users can cancel long-running exports.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

static ACTIVE_EXPORT: Mutex<Option<String>> = Mutex::new(None);
static CANCEL_REQUESTED: AtomicBool = AtomicBool::new(false);

/// Record that an export has started; resets cancellation flag.
pub fn enter_export(export_id: &str) {
    let mut guard = ACTIVE_EXPORT.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    *guard = Some(export_id.to_string());
    CANCEL_REQUESTED.store(false, Ordering::SeqCst);
}

/// Clear the active export slot (called when export finishes or is cancelled).
pub fn exit_export() {
    let mut guard = ACTIVE_EXPORT.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    *guard = None;
}

/// Check whether the user has requested cancellation.
pub fn is_cancelled() -> bool {
    CANCEL_REQUESTED.load(Ordering::SeqCst)
}

/// Returns a copy of the currently active export_id, if any.
pub fn get_active_export_id() -> Option<String> {
    ACTIVE_EXPORT.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).clone()
}


pub fn cancel_export(export_id: String) -> Result<(), String> {
    let active = ACTIVE_EXPORT.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    if *active == Some(export_id.clone()) {
        CANCEL_REQUESTED.store(true, Ordering::SeqCst);
        tracing::info!("取消导出已标记: {}", export_id);
        Ok(())
    } else {
        tracing::warn!(
            "取消导出失败: export_id {} 不匹配当前活动导出",
            export_id
        );
        Err("导出不存在或已完成".to_string())
    }
}
