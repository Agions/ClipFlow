//! Smart segmenter types — split from smart_segmenter.rs

use serde::{Deserialize, Serialize};

/// Type of video segment
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SegmentType {
    Dialogue,
    Action,
    Transition,
    Silence,
    Content,
}

impl std::fmt::Display for SegmentType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SegmentType::Dialogue => write!(f, "dialogue"),
            SegmentType::Action => write!(f, "action"),
            SegmentType::Transition => write!(f, "transition"),
            SegmentType::Silence => write!(f, "silence"),
            SegmentType::Content => write!(f, "content"),
        }
    }
}

/// A segmented portion of the video
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSegment {
    pub start_ms: u64,
    pub end_ms: u64,
    pub segment_type: String,
    pub duration_ms: u64,
    pub confidence: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_scene_change: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peak_energy: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub silence_ratio: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_speed: Option<f32>,
}

impl VideoSegment {
    pub(crate) fn new(
        start_ms: u64,
        end_ms: u64,
        segment_type: impl Into<String>,
        confidence: f32,
        is_scene_change: Option<bool>,
        suggested_speed: f32,
    ) -> Self {
        Self {
            start_ms,
            end_ms,
            duration_ms: end_ms.saturating_sub(start_ms),
            segment_type: segment_type.into(),
            confidence,
            is_scene_change,
            peak_energy: None,
            silence_ratio: None,
            suggested_speed: Some(suggested_speed),
        }
    }
}

/// Parameters for smart segmentation
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SegmentOptions {
    pub min_duration_ms: Option<u64>,
    pub max_duration_ms: Option<u64>,
    pub scene_threshold: Option<f32>,
    pub silence_threshold_db: Option<f32>,
    pub detect_dialogue: Option<bool>,
    pub detect_transitions: Option<bool>,
}

impl Default for SegmentOptions {
    fn default() -> Self {
        Self {
            min_duration_ms: Some(1000),
            max_duration_ms: Some(30000),
            scene_threshold: Some(0.3),
            silence_threshold_db: Some(-40.0),
            detect_dialogue: Some(true),
            detect_transitions: Some(true),
        }
    }
}

impl SegmentOptions {
    pub fn min_ms(&self) -> u64 {
        self.min_duration_ms.unwrap_or(1000)
    }
    pub fn max_ms(&self) -> u64 {
        self.max_duration_ms.unwrap_or(30000)
    }
    pub fn scene_thresh(&self) -> f32 {
        self.scene_threshold.unwrap_or(0.3)
    }
}
