//! AI Commands — AI 高光检测 / 智能切段 / TTS / 翻译模块
//!
//! 子模块:
//!   types.rs        — 类型定义
//!   director_plan.rs — AI 导演计划算法
//!   tts.rs          — Edge TTS 语音合成 + 翻译
//!   detection.rs    — 高光检测 + 智能切段

mod detection;
mod director_plan;
pub mod tts_core;
pub mod types;
mod tts;

pub use detection::{detect_highlights, detect_zcr_bursts, detect_smart_segments};
pub use director_plan::run_ai_director_plan;
pub use tts::{check_tts_available, list_tts_backends, synthesize_speech, synthesize_speech_batch, synthesize_speech_ssml, translate_text};
pub use types::TtsBackendInfo;

// ─── Render Commands ─────────────────────────────────────────────────────────


/// 获取导出目录
#[tauri::command]
pub fn get_export_dir() -> String {
    if let Some(download_dir) = dirs::download_dir() {
        let export_dir = download_dir.join("StoryFab");
        return export_dir.display().to_string();
    }
    let temp_dir = std::env::temp_dir().join("StoryFab");
    temp_dir.display().to_string()
}