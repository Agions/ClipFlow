//! Scene-based segmentation — split from smart_segmenter.rs

use crate::binary::resolve_binary_path;
use crate::segment::types::{SegmentOptions, VideoSegment};
use crate::utils::parse_scdet_output;
use std::process::Command;

pub struct SceneSegmenter {
    ffmpeg_path: String,
}

impl SceneSegmenter {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
        }
    }

    pub fn scene_based_segmentation(
        &self,
        video_path: &str,
        duration_ms: u64,
        opts: &SegmentOptions,
    ) -> Vec<VideoSegment> {
        let min_duration_ms = opts.min_ms();
        let scene_threshold = opts.scene_thresh();
        let scene_changes = self.detect_scene_changes(video_path, scene_threshold);

        let mut segments: Vec<VideoSegment> = Vec::new();
        let mut current_start: u64 = 0;

        for &sc in &scene_changes {
            if sc - current_start >= min_duration_ms {
                segments.push(VideoSegment::new(
                    current_start,
                    sc,
                    "content",
                    0.7,
                    Some(true),
                    1.0,
                ));
            }
            current_start = sc;
        }

        let remaining = duration_ms.saturating_sub(current_start);
        if remaining >= min_duration_ms {
            segments.push(VideoSegment::new(
                current_start,
                duration_ms,
                "content",
                0.6,
                Some(false),
                1.0,
            ));
        }

        segments
    }

    pub fn detect_scene_changes(&self, video_path: &str, threshold: f32) -> Vec<u64> {
        let stderr = Command::new(&self.ffmpeg_path)
            .args(&[
                "-hide_banner",
                "-i",
                video_path,
                "-vf",
                &format!("scdet=threshold={:.2}", threshold),
                "-f",
                "null",
                "-",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_default();

        parse_scdet_output(&stderr)
            .into_iter()
            .map(|(ms, _)| ms)
            .collect()
    }
}
