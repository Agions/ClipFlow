//! Scene change detection — split from highlight module

use crate::binary::resolve_binary_path;
use crate::highlight::types::{HighlightOptions, HighlightSegment};
use crate::utils::parse_scdet_output;
use std::process::Command;

pub struct SceneDetector {
    ffmpeg_path: String,
}

impl SceneDetector {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
        }
    }

    /// Detect scene changes using FFmpeg's scdet filter
    pub fn detect_scene_changes(
        &self,
        video_path: &str,
        options: &HighlightOptions,
    ) -> Vec<HighlightSegment> {
        let threshold = options.scene_threshold.unwrap_or(0.3);
        let min_duration_ms = options.min_duration_ms.unwrap_or(500);
        let top_n = options.top_n.unwrap_or(10);

        let stderr = Command::new(&self.ffmpeg_path)
            .args(&[
                "-hide_banner",
                "-i",
                video_path,
                "-vf",
                &format!("scdet=threshold={:.2}:sc_pass=1:debug=0", threshold),
                "-f",
                "null",
                "-",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stderr).into_owned())
            .unwrap_or_default();

        let scene_changes = parse_scdet_output(&stderr);

        let mut segments: Vec<HighlightSegment> = Vec::new();
        let mut current_start: Option<u64> = None;
        let mut current_end: Option<u64> = None;
        let mut current_max_score: f32 = 0.0;

        for (time_ms, score) in scene_changes {
            if current_start.is_none() {
                current_start = Some(time_ms);
                current_end = Some(time_ms);
                current_max_score = score;
            } else if time_ms - current_end.unwrap_or(0) < min_duration_ms {
                current_end = Some(time_ms);
                current_max_score = current_max_score.max(score);
            } else {
                if let (Some(start), Some(end)) = (current_start, current_end) {
                    let duration = end.saturating_sub(start);
                    if duration >= min_duration_ms {
                        segments.push(HighlightSegment::scene(start, end, current_max_score.min(1.0)));
                    }
                }
                current_start = Some(time_ms);
                current_end = Some(time_ms);
                current_max_score = score;
            }
        }
        if let (Some(start), Some(end)) = (current_start, current_end) {
            let duration = end.saturating_sub(start);
            if duration >= min_duration_ms {
                segments.push(HighlightSegment::scene(start, end, current_max_score.min(1.0)));
            }
        }

        segments.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        segments.into_iter().take(top_n).collect()
    }
}

impl Default for SceneDetector {
    fn default() -> Self {
        Self::new()
    }
}