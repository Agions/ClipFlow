//! Highlight Detector - Local AI-free highlight detection via audio energy analysis
//!
//! Uses FFmpeg to extract audio waveform data, then computes Short-Time Energy (STE)
//! to identify highlight moments without any external AI service.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

/// Reason why a segment was identified as a highlight
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HighlightReason {
    /// High audio energy (louder than surroundings)
    AudioEnergy,
    /// Scene change detected
    SceneChange,
    /// Burst of motion detected
    MotionBurst,
    /// Combined score from multiple signals
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
    /// Start time in milliseconds
    pub start_ms: u64,
    /// End time in milliseconds
    pub end_ms: u64,
    /// Highlight score from 0.0 to 1.0
    pub score: f32,
    /// Reason for highlight detection
    pub reason: String,
    /// Optional sub-score breakdown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene_score: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion_score: Option<f32>,
}

/// Parameters for highlight detection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HighlightOptions {
    /// Energy threshold multiplier (default 1.5 = 50% above mean)
    pub threshold: Option<f32>,
    /// Minimum segment duration in ms (default 500)
    pub min_duration_ms: Option<u64>,
    /// Maximum number of highlights to return (default 10)
    pub top_n: Option<usize>,
    /// Window size for energy computation in ms (default 100)
    pub window_ms: Option<u64>,
    /// Enable scene change detection (default true)
    pub detect_scene: Option<bool>,
    /// Scene change threshold 0.0-1.0 (default 0.3)
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

/// State kept between detection calls
pub struct HighlightDetector {
    ffmpeg_path: String,
    ffprobe_path: String,
}

impl HighlightDetector {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
            ffprobe_path: resolve_binary_path("ffprobe"),
        }
    }

    /// Detect highlights from audio energy analysis
    pub fn detect_audio_highlights(&self, audio_path: &str, options: &HighlightOptions) -> Vec<HighlightSegment> {
        let opts = options;
        let threshold_mult = opts.threshold.unwrap_or(1.5);
        let min_duration_ms = opts.min_duration_ms.unwrap_or(500) as f32;
        let window_ms = opts.window_ms.unwrap_or(100) as f32;

        // Extract audio as raw PCM for energy analysis
        let pcm_data = match self.extract_audio_pcm(audio_path) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("Failed to extract audio PCM: {}", e);
                return Vec::new();
            }
        };

        if pcm_data.is_empty() {
            return Vec::new();
        }

        // Compute Short-Time Energy (STE)
        let sample_rate = 44100u32;
        let window_samples = (window_ms * sample_rate as f32 / 1000.0) as usize;
        let hop_size = window_samples / 2; // 50% overlap

        let mut energies: Vec<f32> = Vec::new();
        let mut timestamps: Vec<u64> = Vec::new();

        for i in (0..pcm_data.len().saturating_sub(window_samples)).step_by(hop_size) {
            let window = &pcm_data[i..i + window_samples];
            let energy: f32 = window.iter().map(|&s| s * s).sum::<f32>() / window_samples as f32;
            let time_ms = (i as f32 * 1000.0 / sample_rate as f32) as u64;
            energies.push(energy);
            timestamps.push(time_ms);
        }

        if energies.is_empty() {
            return Vec::new();
        }

        // Compute mean and std of energies
        let mean_energy = energies.iter().sum::<f32>() / energies.len() as f32;
        let variance = energies.iter().map(|&e| (e - mean_energy).powi(2)).sum::<f32>() / energies.len() as f32;
        let std_energy = variance.sqrt();

        let threshold = mean_energy + threshold_mult * std_energy;

        // Find segments above threshold
        let mut segments: Vec<(usize, usize)> = Vec::new();
        let mut in_highlight = false;
        let mut highlight_start = 0usize;

        for (i, &energy) in energies.iter().enumerate() {
            if energy > threshold {
                if !in_highlight {
                    in_highlight = true;
                    highlight_start = i;
                }
            } else {
                if in_highlight {
                    segments.push((highlight_start, i));
                    in_highlight = false;
                }
            }
        }
        if in_highlight {
            segments.push((highlight_start, energies.len() - 1));
        }

        // Convert to HighlightSegments with scores
        let mut results: Vec<HighlightSegment> = segments
            .into_iter()
            .filter_map(|(start_idx, end_idx)| {
                let start_ms = timestamps.get(start_idx).copied().unwrap_or(0);
                let end_ms = timestamps.get(end_idx).copied().unwrap_or(start_ms);
                let duration_ms = end_ms.saturating_sub(start_ms);

                if duration_ms < min_duration_ms as u64 {
                    return None;
                }

                // Compute score relative to threshold
                let peak_energy = energies[start_idx..=end_idx]
                    .iter()
                    .fold(0.0f32, |max, &e| max.max(e));
                let score = ((peak_energy - mean_energy) / (std_energy.max(0.001))).clamp(0.0, 1.0) * 0.8 + 0.2;

                Some(HighlightSegment {
                    start_ms,
                    end_ms,
                    score,
                    reason: "audio_energy".to_string(),
                    audio_score: Some(score),
                    scene_score: None,
                    motion_score: None,
                })
            })
            .collect();

        // Sort by score descending
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results
    }

    /// Detect scene changes using FFmpeg's scdet filter
    pub fn detect_scene_changes(&self, video_path: &str, options: &HighlightOptions) -> Vec<HighlightSegment> {
        let opts = options;
        let threshold = opts.scene_threshold.unwrap_or(0.3);
        let min_duration_ms = opts.min_duration_ms.unwrap_or(500);

        let temp_dir = std::env::temp_dir().join(format!("cutdeck_scdet_{}", chrono_like_timestamp()));
        let output_file = temp_dir.join("scdet.txt");

        // Run FFmpeg with scene detection filter
        // Using freiware's scene detection (free, no license issues)
        let filter = format!(
            "scdet=threshold={:.2}:sc_pass=1:debug=0",
            threshold
        );

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-hide_banner",
                "-i", video_path,
                "-vf", &filter,
                "-f", "null",
                "-"
            ])
            .output();

        let stderr = output
            .as_ref()
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_default();

        // Parse scene change timestamps from FFmpeg output
        // FFmpeg scdet outputs: [scdet] <time> <score> <type>
        let mut scene_changes: Vec<(u64, f32)> = Vec::new();

        for line in stderr.lines() {
            if line.contains("[scdet]") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    // Try to parse time and score
                    for (i, part) in parts.iter().enumerate() {
                        if *part == "[scdet]" && i + 2 < parts.len() {
                            if let Ok(time_secs) = parts[i + 1].parse::<f64>() {
                                if let Ok(score) = parts[i + 2].parse::<f32>() {
                                    let time_ms = (time_secs * 1000.0) as u64;
                                    scene_changes.push((time_ms, score));
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        // Merge nearby scene changes into segments
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
                        segments.push(HighlightSegment {
                            start_ms: start,
                            end_ms: end,
                            score: current_max_score.min(1.0),
                            reason: "scene_change".to_string(),
                            audio_score: None,
                            scene_score: Some(current_max_score.min(1.0)),
                            motion_score: None,
                        });
                    }
                }
                current_start = Some(time_ms);
                current_end = Some(time_ms);
                current_max_score = score;
            }
        }

        // Don't forget the last segment
        if let (Some(start), Some(end)) = (current_start, current_end) {
            let duration = end.saturating_sub(start);
            if duration >= min_duration_ms {
                segments.push(HighlightSegment {
                    start_ms: start,
                    end_ms: end,
                    score: current_max_score.min(1.0),
                    reason: "scene_change".to_string(),
                    audio_score: None,
                    scene_score: Some(current_max_score.min(1.0)),
                    motion_score: None,
                });
            }
        }

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);

        segments.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        segments
    }

    /// Get combined highlights from both audio and scene analysis
    pub fn get_highlights(&self, video_path: &str, options: &HighlightOptions) -> Vec<HighlightSegment> {
        let opts = options.clone();
        let top_n = opts.top_n.unwrap_or(10);
        let min_duration_ms = opts.min_duration_ms.unwrap_or(500);

        let mut all_segments: Vec<HighlightSegment> = Vec::new();

        // 1. Audio-based highlights
        if let Ok(audio_path) = self.extract_audio_path(video_path) {
            let audio_segments = self.detect_audio_highlights(&audio_path, &opts);
            all_segments.extend(audio_segments);
        }

        // 2. Scene change highlights
        if opts.detect_scene.unwrap_or(true) {
            let scene_segments = self.detect_scene_changes(video_path, &opts);
            all_segments.extend(scene_segments);
        }

        // 3. Merge overlapping segments (union)
        if all_segments.is_empty() {
            return Vec::new();
        }

        // Sort by start_ms
        all_segments.sort_by_key(|s| s.start_ms);

        // Merge overlapping segments
        let mut merged: Vec<HighlightSegment> = Vec::new();
        for seg in all_segments {
            if let Some(last) = merged.last_mut() {
                // Overlap if seg.start is within last segment's range
                if seg.start_ms <= last.end_ms {
                    // Extend the end if needed
                    last.end_ms = last.end_ms.max(seg.end_ms);
                    // Combine scores (weighted average)
                    last.score = (last.score + seg.score) / 2.0;
                    last.reason = "combined".to_string();
                    last.audio_score = Some(
                        last.audio_score.unwrap_or(seg.score) + seg.audio_score.unwrap_or(0.0) / 2.0
                    );
                    last.scene_score = Some(
                        last.scene_score.unwrap_or(seg.score) + seg.scene_score.unwrap_or(0.0) / 2.0
                    );
                    continue;
                }
            }
            merged.push(seg);
        }

        // Filter out short segments and re-score
        let merged: Vec<HighlightSegment> = merged
            .into_iter()
            .filter(|s| s.end_ms.saturating_sub(s.start_ms) >= min_duration_ms as u64)
            .map(|mut s| {
                // Finalize score to 0.0-1.0 range
                s.score = s.score.clamp(0.0, 1.0);
                s
            })
            .collect();

        // Sort by score and take top N
        merged
            .into_iter()
            .sorted_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal))
            .take(top_n)
            .collect()
    }

    fn extract_audio_pcm(&self, audio_path: &str) -> Result<Vec<f32>, String> {
        let temp_wav = std::env::temp_dir()
            .join(format!("cutdeck_pcm_{}.wav", chrono_like_timestamp()));

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-y",
                "-i", audio_path,
                "-ac", "1",           // Mono
                "-ar", "44100",       // 44.1kHz
                "-f", "s16le",        // Signed 16-bit little-endian PCM
                "-acodec", "pcm_s16le",
                &temp_wav.to_string_lossy(),
            ])
            .output()
            .map_err(|e| format!("FFmpeg failed: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        // Read PCM data
        let pcm_data = std::fs::read(&temp_wav)
            .map_err(|e| format!("Read PCM failed: {}", e))?;

        let _ = std::fs::remove_file(&temp_wav);

        // Convert s16le to f32 normalized
        let samples: Vec<f32> = pcm_data
            .chunks_exact(2)
            .map(|chunk| {
                let s16 = i16::from_le_bytes([chunk[0], chunk[1]]);
                s16 as f32 / 32768.0
            })
            .collect();

        Ok(samples)
    }

    fn extract_audio_path(&self, video_path: &str) -> Result<String, String> {
        let temp_audio = std::env::temp_dir()
            .join(format!("cutdeck_audio_{}.wav", chrono_like_timestamp()));

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-y",
                "-i", video_path,
                "-vn",              // No video
                "-acodec", "pcm_s16le",
                "-ar", "44100",
                "-ac", "1",
                &temp_audio.to_string_lossy(),
            ])
            .output()
            .map_err(|e| format!("FFmpeg audio extraction failed: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Ok(temp_audio.to_string_lossy().to_string())
    }
}

impl Default for HighlightDetector {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_binary_path(binary_name: &str) -> String {
    let env_key = format!("CUTDECK_{}_PATH", binary_name.to_uppercase());
    if let Ok(path) = std::env::var(&env_key) {
        if !path.trim().is_empty() && PathBuf::from(&path).exists() {
            return path;
        }
    }

    if binary_name == "ffprobe" {
        if let Ok(ffmpeg_path) = std::env::var("CUTDECK_FFMPEG_PATH") {
            let ffmpeg = PathBuf::from(ffmpeg_path);
            if let Some(parent) = ffmpeg.parent() {
                let probe = parent.join("ffprobe");
                if probe.exists() {
                    return probe.to_string_lossy().to_string();
                }
            }
        }
    }

    let common_dirs = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    for dir in common_dirs {
        let candidate = PathBuf::from(dir).join(binary_name);
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }

    binary_name.to_string()
}

fn chrono_like_timestamp() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

// Extension trait for sorting
trait Sorted {
    fn sorted_by<F>(self, cmp: F) -> Self
    where
        F: FnMut(&Self::Item, &Self::Item) -> std::cmp::Ordering;
}

impl<T: Iterator> Sorted for T {
    fn sorted_by<F>(mut self, cmp: F) -> Self
    where
        F: FnMut(&T::Item, &T::Item) -> std::cmp::Ordering
    {
        let mut v: Vec<_> = self.collect();
        v.sort_by(cmp);
        v.into_iter()
    }
}
}
