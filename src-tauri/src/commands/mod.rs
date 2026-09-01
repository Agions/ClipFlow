//! Tauri command modules — the backend command surface registered via
//! `generate_handler!` in `lib.rs`.
//!
//! Each submodule groups related `#[tauri::command]` handlers: `ai` (AI
//! director / detection), `project` (file I/O), `render` (export/transcode),
//! `subtitle` transcription, `auto_save`, `llm`, `crash_recovery`,
//! `export_state`, `ffprobe`, `file_ops`.
pub mod ai;
pub mod assembly;
pub mod auto_save;
pub mod crash_recovery;
pub mod export_state;
pub mod ffprobe;
pub mod file_ops;
pub mod llm;
pub mod pipeline;
pub mod platform;
pub mod project;
pub mod render;
pub mod subtitle;
pub mod understanding;
pub mod video;
