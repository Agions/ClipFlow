//! Highlight detection module — split from highlight_detector.rs.
//!
//! Internal analysis stages (types, audio_analysis, scene_detect, energy, zcr)
//! feed the public [`get_highlights`] combiner.
mod types;
mod audio_analysis;
mod scene_detect;
mod energy;
mod zcr;

pub mod combiner;

pub use types::{HighlightOptions, HighlightReason, HighlightSegment};
pub use audio_analysis::HighlightDetector;
pub use scene_detect::SceneDetector;
pub use combiner::get_highlights;