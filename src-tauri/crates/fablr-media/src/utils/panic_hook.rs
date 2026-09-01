//! Panic hook — installs a process-wide panic handler that logs to tracing
//! and writes a JSON crash report to the app data directory.
//!
//! Extracted from `utils/resilience.rs` to keep each module under 300 lines.

use std::path::PathBuf;
use std::sync::Once;
use std::time::{SystemTime, UNIX_EPOCH};

/// Install the process-wide panic hook. **Idempotent** — calling this
/// twice (e.g. from test harnesses) is safe; only the first call wins.
///
/// What it does, in order:
/// 1. Logs the panic location, message, and (best-effort) backtrace via
///    `tracing::error!`.
/// 2. Writes a minimal JSON crash report (`crash-<timestamp>.json`) into
///    `app_data_dir/crashes/`.
/// 3. Restores the **previous** panic hook before returning.
pub fn install_panic_hook() {
    static INSTALLED: Once = Once::new();
    INSTALLED.call_once(|| {
        let previous = std::panic::take_hook();
        std::panic::set_hook(Box::new(move |info| {
            let payload = panic_payload_to_string(info.payload());
            let location = info
                .location()
                .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
                .unwrap_or_else(|| "<unknown>".to_string());

            let backtrace = std::backtrace::Backtrace::force_capture();
            let backtrace_str = format!("{backtrace}");

            tracing::error!(
                panic.payload = %payload,
                panic.location = %location,
                "PANIC: backend task aborted — see crash report"
            );
            tracing::error!("panic.backtrace:\n{backtrace_str}");

            if let Some(dir) = crash_dir() {
                let _ = std::fs::create_dir_all(&dir);
                let ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let path = dir.join(format!("crash-{ts}.json"));
                let body = serde_json::json!({
                    "timestamp": ts,
                    "payload": payload,
                    "location": location,
                    "backtrace": backtrace_str,
                    "version": env!("CARGO_PKG_VERSION"),
                });
                if let Ok(text) = serde_json::to_string_pretty(&body) {
                    let _ = std::fs::write(&path, text);
                }
            }

            previous(info);
        }));

        tracing::info!("[resilience] panic hook installed");
    });
}

fn panic_payload_to_string(payload: &dyn std::any::Any) -> String {
    if let Some(s) = payload.downcast_ref::<&'static str>() {
        s.to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "<non-string panic payload>".to_string()
    }
}

fn crash_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|base| base.join("fablr").join("crashes"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panic_payload_str() {
        let s = panic_payload_to_string(&"hello");
        assert_eq!(s, "hello");
    }

    #[test]
    fn panic_payload_string() {
        let owned: String = "owned".to_string();
        let s = panic_payload_to_string(&owned);
        assert_eq!(s, "owned");
    }

    #[test]
    fn panic_payload_unknown() {
        let n: i32 = 42;
        let s = panic_payload_to_string(&n);
        assert_eq!(s, "<non-string panic payload>");
    }

    #[test]
    fn install_panic_hook_is_idempotent() {
        install_panic_hook();
        install_panic_hook();
    }
}
