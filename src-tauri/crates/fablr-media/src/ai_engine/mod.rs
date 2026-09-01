//! AI Commands & Engine — AI 高光检测 / 智能切段 / TTS / 翻译模块

pub mod detection;
pub mod director_plan;
pub mod tts;
pub mod tts_core;
pub mod types;

pub use detection::{detect_highlights, detect_zcr_bursts, detect_smart_segments};
pub use director_plan::run_ai_director_plan;
pub use tts::{check_tts_available, list_tts_backends, synthesize_speech, synthesize_speech_batch, synthesize_speech_ssml, translate_text};
pub use types::TtsBackendInfo;
