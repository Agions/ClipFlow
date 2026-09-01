//! Highlight detection types — split from highlight module

use serde::{Deserialize, Serialize};

/// Reason why a segment was identified as a highlight
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HighlightReason {
    AudioEnergy,
    SceneChange,
    MotionBurst,
    Combined,
}

impl std::fmt::Display for HighlightReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HighlightReason::AudioEnergy => write!(f, "audio_energy"),
            HighlightReason::SceneChange => write!(f, "scene_change"),
            HighlightReason::MotionBurst => write!(f, "motion_burst"),
            HighlightReason::Combined => write!(f, "combined"),
        }
    }
}

/// A detected highlight segment
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightSegment {
    pub start_ms: u64,
    pub end_ms: u64,
    pub score: f32,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion_score: Option<f32>,
}

impl HighlightSegment {
    /// Factory: audio energy based highlight
    pub(crate) fn audio(start_ms: u64, end_ms: u64, score: f32) -> Self {
        Self {
            start_ms,
            end_ms,
            score,
            reason: "audio_energy".into(),
            audio_score: Some(score),
            scene_score: None,
            motion_score: None,
        }
    }

    /// Factory: scene change based highlight
    pub(crate) fn scene(start_ms: u64, end_ms: u64, score: f32) -> Self {
        Self {
            start_ms,
            end_ms,
            score,
            reason: "scene_change".into(),
            audio_score: None,
            scene_score: Some(score),
            motion_score: None,
        }
    }

    /// Merge another segment into this one (averaged scores, extended end).
    pub(crate) fn combine_with(&mut self, other: &Self) {
        self.end_ms = self.end_ms.max(other.end_ms);
        self.score = (self.score + other.score) / 2.0;
        self.reason = "combined".into();
        self.audio_score = match (self.audio_score, other.audio_score) {
            (Some(a), Some(b)) => Some((a + b) / 2.0),
            (Some(a), None) | (None, Some(a)) => Some(a),
            (None, None) => None,
        };
        self.scene_score = match (self.scene_score, other.scene_score) {
            (Some(a), Some(b)) => Some((a + b) / 2.0),
            (Some(a), None) | (None, Some(a)) => Some(a),
            (None, None) => None,
        };
    }
}

/// Parameters for highlight detection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightOptions {
    pub threshold: Option<f32>,
    pub min_duration_ms: Option<u64>,
    pub top_n: Option<usize>,
    pub window_ms: Option<u64>,
    pub detect_scene: Option<bool>,
    pub scene_threshold: Option<f32>,
}

impl Default for HighlightOptions {
    fn default() -> Self {
        Self {
            threshold: Some(1.5),
            min_duration_ms: Some(500),
            top_n: Some(10),
            window_ms: Some(100),
            detect_scene: Some(true),
            scene_threshold: Some(0.3),
        }
    }
}