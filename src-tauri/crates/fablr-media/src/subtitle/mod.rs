//! Whisper subtitle transcription module — split from subtitle.rs
//! Files: types.rs, whisper.rs, transcribe.rs, mod.rs

pub mod types;
pub mod whisper;
pub mod transcribe;

pub use types::{SubtitleResult, SubtitleSegment, TranscribeProgress, WhisperWord};
pub use whisper::whisper_python_code;
pub use transcribe::transcribe_audio;

