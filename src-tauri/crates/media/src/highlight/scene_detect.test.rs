//! Scene detection tests

use crate::highlight::scene_detect::SceneDetector;
use crate::highlight::types::HighlightOptions;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scene_detector_constructor() {
        let _detector = SceneDetector::new();
    }

    #[test]
    fn test_scene_detector_default() {
        let _detector = SceneDetector::default();
    }

    #[test]
    fn test_highlight_options_default() {
        let opts = HighlightOptions::default();
        assert_eq!(opts.scene_threshold, Some(0.3));
        assert_eq!(opts.min_duration_ms, Some(500));
        assert_eq!(opts.top_n, Some(10));
    }
}
