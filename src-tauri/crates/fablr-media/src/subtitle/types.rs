use serde::{Deserialize, Serialize};

pub use fablr_domain::{SubtitleResult, SubtitleSegment, WhisperWord};

/// Progress update emitted during a transcription job.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeProgress {
    pub stage: String,
    pub progress: f32,
    pub current_segment: Option<u32>,
    pub total_segments: Option<u32>,
}
