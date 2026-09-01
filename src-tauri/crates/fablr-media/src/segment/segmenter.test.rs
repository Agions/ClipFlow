//! Segmenter tests

use crate::segment::{SegmentOptions, SmartSegmenter, VideoSegment};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_segment_options_default() {
        let opts = SegmentOptions::default();
        assert_eq!(opts.min_duration_ms, Some(1000));
        assert_eq!(opts.max_duration_ms, Some(30000));
    }

    #[test]
    fn test_segment_options_min_ms() {
        let opts = SegmentOptions {
            min_duration_ms: Some(500),
            ..Default::default()
        };
        assert_eq!(opts.min_ms(), 500);
    }

    #[test]
    fn test_segment_options_max_ms() {
        let opts = SegmentOptions {
            max_duration_ms: Some(60000),
            ..Default::default()
        };
        assert_eq!(opts.max_ms(), 60000);
    }

    #[test]
    fn test_segment_options_scene_thresh() {
        let opts = SegmentOptions {
            scene_threshold: Some(0.5),
            ..Default::default()
        };
        assert_eq!(opts.scene_thresh(), 0.5);
    }

    #[test]
    fn test_smart_segmenter_constructor() {
        let _seg = SmartSegmenter::new();
    }

    #[test]
    fn test_video_segment_creation() {
        let seg = VideoSegment {
            start_ms: 0,
            end_ms: 5000,
            segment_type: "action".to_string(),
            duration_ms: 5000,
            confidence: 0.9,
            is_scene_change: Some(true),
            peak_energy: Some(0.8),
            silence_ratio: Some(0.1),
            suggested_speed: Some(1.0),
        };
        assert_eq!(seg.start_ms, 0);
        assert_eq!(seg.end_ms, 5000);
        assert_eq!(seg.duration_ms, 5000);
    }
}
