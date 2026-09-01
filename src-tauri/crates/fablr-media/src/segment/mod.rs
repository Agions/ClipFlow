//! Smart video segmentation module — split from smart_segmenter.rs

pub mod classifier;
pub mod energy;
pub mod scene;
pub mod segmenter;
pub mod types;

pub use classifier::SegmentClassifier;
pub use scene::SceneSegmenter;
pub use segmenter::SmartSegmenter;
pub use types::{SegmentOptions, SegmentType, VideoSegment};