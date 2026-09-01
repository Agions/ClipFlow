//! SmartSegmenter entry point — coordinates all segment analysis
//! Split from smart_segmenter.rs (original 502-line file)

use crate::binary::resolve_binary_path;
use crate::segment::types::VideoSegment;
use crate::segment::types::SegmentOptions as Opt;
use crate::segment::energy::SmartSegmenter as EnergySeg;
use crate::segment::scene::SceneSegmenter;
use crate::segment::classifier::SegmentClassifier;
use crate::utils::{cmd_err, chrono_like_timestamp, parse_scdet_output};
use std::process::Command;

/// Smart video segmenter — orchestrates scene + audio energy analysis
#[derive(Clone)]
pub struct SmartSegmenter {
    ffmpeg_path: String,
    ffprobe_path: String,
}

impl SmartSegmenter {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
            ffprobe_path: resolve_binary_path("ffprobe"),
        }
    }

    pub async fn smart_segment(&self, video_path: &str, options: &Opt) -> Vec<VideoSegment> {
        let opts = options.clone();
        let min_duration_ms = opts.min_ms();
        let max_duration_ms = opts.max_ms();

        let duration_ms = match self.probe_duration_ms(video_path) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("Failed to probe duration: {}", e);
                return Vec::new();
            }
        };

        let audio_path = match self.extract_audio(video_path) {
            Ok(p) => p,
            Err(e) => {
                log::warn!("Failed to extract audio: {}", e);
                let seg = SceneSegmenter::new();
                return seg.scene_based_segmentation(video_path, duration_ms, &opts);
            }
        };

        let opts = options.clone();
        let audio_path_for_energy = audio_path.clone();
        let video_path_for_scene = video_path.to_string();
        let segmenter_clone = self.clone();

        let energy_seg = EnergySeg::new();

        let energy_handle = tauri::async_runtime::spawn_blocking(move || {
            EnergySeg::new().compute_energy_profile(&audio_path_for_energy, 500)
        });
        let scene_opts = opts.clone();
        let scene_handle = tauri::async_runtime::spawn_blocking(move || {
            segmenter_clone.detect_scene_changes(&video_path_for_scene, scene_opts.scene_thresh())
        });

        let (energy_result, scene_result) = tokio::join!(energy_handle, scene_handle);

        let energy_data = match energy_result {
            Ok(Ok(d)) => d,
            _ => {
                log::warn!("Failed to compute energy profile");
                let _ = std::fs::remove_file(&audio_path);
                let seg = SceneSegmenter::new();
                return seg.scene_based_segmentation(video_path, duration_ms, &opts);
            }
        };

        let scene_changes = if opts.detect_transitions.unwrap_or(true) {
            scene_result.unwrap_or_default()
        } else {
            Vec::new()
        };

        let segments = energy_seg.segment_by_energy(energy_data.clone(), min_duration_ms, max_duration_ms);

        let energies: Vec<f32> = energy_data.iter().map(|(_, e)| *e).collect();
        let mean_energy = if energies.is_empty() {
            0.0
        } else {
            energies.iter().sum::<f32>() / energies.len() as f32
        };

        let classified_segments: Vec<VideoSegment> = segments
            .into_iter()
            .map(|seg| {
                let seg_type = SegmentClassifier::classify_segment(&seg, &scene_changes, &energy_data, mean_energy);
                let suggested_speed = SegmentClassifier::derive_suggested_speed(&seg, &energy_data, mean_energy);
                VideoSegment {
                    start_ms: seg.0,
                    end_ms: seg.1,
                    duration_ms: seg.1.saturating_sub(seg.0),
                    segment_type: seg_type.0,
                    confidence: seg_type.1,
                    is_scene_change: Some(SegmentClassifier::is_scene_at(&scene_changes, seg.0)),
                    peak_energy: None,
                    silence_ratio: None,
                    suggested_speed: Some(suggested_speed),
                }
            })
            .filter(|s| s.duration_ms >= min_duration_ms)
            .collect();

        let _ = std::fs::remove_file(&audio_path);
        classified_segments
    }

    pub fn probe_duration_ms(&self, video_path: &str) -> Result<u64, String> {
        let output = Command::new(&self.ffprobe_path)
            .args(&[
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path,
            ])
            .output()
            .map_err(|e| format!("Probe failed: {}", e))?;

        if !output.status.success() {
            return Err(cmd_err("FFmpeg failed", &output));
        }

        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let secs: f64 = text
            .parse()
            .map_err(|_| "Failed to parse duration".to_string())?;

        Ok((secs * 1000.0) as u64)
    }

    pub fn detect_scene_changes(&self, video_path: &str, threshold: f32) -> Vec<u64> {
        let stderr = Command::new(&self.ffmpeg_path)
            .args(&[
                "-hide_banner",
                "-i", video_path,
                "-vf", &format!("scdet=threshold={:.2}", threshold),
                "-f", "null", "-",
            ])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_default();

        parse_scdet_output(&stderr)
            .into_iter()
            .map(|(ms, _)| ms)
            .collect()
    }

    fn extract_audio(&self, video_path: &str) -> Result<String, String> {
        let temp_audio = std::env::temp_dir()
            .join(format!("fablr_seg_audio_{}.wav", chrono_like_timestamp()));

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-y", "-i", video_path,
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                &temp_audio.to_string_lossy(),
            ])
            .output()
            .map_err(|e| format!("Audio extraction failed: {}", e))?;

        if !output.status.success() {
            return Err(cmd_err("FFmpeg failed", &output));
        }

        Ok(temp_audio.display().to_string())
    }
}
