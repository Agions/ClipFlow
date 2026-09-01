//! Conservative error-string helpers.
//!
//! Fablr commands overwhelmingly return `Result<T, String>`. This module
//! provides tiny, dependency-free constructors so error strings stay
//! consistent across the codebase. It deliberately introduces **no** new error
//! types (no `thiserror` enums, no `anyhow`) — doing so would change command
//! return signatures and the `InvokeError` serialization contract, which is
//! explicitly out of scope for this stage.
//!
//! The pre-existing unused `anyhow` dependency was already removed in Stage 4;
//! this module replaces any informal, ad-hoc error formatting with one shared
//! helper while remaining 100% contract-safe.

/// Build a contextual error message of the form `"{context}: {source}"`.
///
/// Use this to wrap a lower-level error (already rendered as a string) with a
/// short description of what operation failed, e.g.
/// `err_msg("运行 ffprobe 失败", e)`. The output is byte-identical to a manual
/// `format!("运行 ffprobe 失败: {e}")`, so swapping existing sites over is
/// transparent.
pub fn err_msg(context: &str, source: impl ToString) -> String {
    format!("{}: {}", context, source.to_string())
}

/// Alias for `Result<T, String>` to make command signatures more readable.
///
/// This does **not** change any command's public return type — `Result<T,
/// String>` and `AppResult<T>` are the exact same type, so adopting it is a
/// pure readability refactor with no behavioral or contract impact.
pub type AppResult<T> = Result<T, String>;
