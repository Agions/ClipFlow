//! Audio energy analysis for smart segmentation — split from smart_segmenter.rs

use crate::binary::resolve_binary_path;
use crate::utils::{cmd_err, chrono_like_timestamp};
use std::process::Command;

pub struct SmartSegmenter {
    ffmpeg_path: String,
}

impl SmartSegmenter {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
        }
    }

    pub fn compute_energy_profile(
        &self,
        audio_path: &str,
        window_ms: u64,
    ) -> Result<Vec<(u64, f32)>, String> {
        let pcm_data = self.extract_audio_for_energy(audio_path)?;
        if pcm_data.is_empty() {
            return Ok(Vec::new());
        }

        let sample_rate = 16000u32;
        let window_samples = (window_ms * sample_rate as u64 / 1000) as usize;
        let hop_size = window_samples / 2;

        let mut energies: Vec<(u64, f32)> = Vec::new();
        for i in (0..pcm_data.len().saturating_sub(window_samples)).step_by(hop_size) {
            let window = &pcm_data[i..i + window_samples];
            let energy: f32 = window.iter().map(|&s| s * s).sum::<f32>() / window_samples as f32;
            let time_ms = (i as f64 * 1000.0 / sample_rate as f64) as u64;
            energies.push((time_ms, energy));
        }
        Ok(energies)
    }

    pub fn segment_by_energy(
        &self,
        energy_data: Vec<(u64, f32)>,
        min_duration_ms: u64,
        max_duration_ms: u64,
    ) -> Vec<(u64, u64)> {
        if energy_data.is_empty() {
            return Vec::new();
        }

        let energies: Vec<f32> = energy_data.iter().map(|(_, e)| *e).collect();
        let mean_energy = energies.iter().sum::<f32>() / energies.len() as f32;
        let silence_threshold = mean_energy * 0.1;

        let mut segments = Vec::new();
        let mut segment_start: Option<u64> = None;
        for i in 0..energy_data.len() {
            let (time_ms, energy) = energy_data[i];

            if segment_start.is_none() {
                segment_start = Some(time_ms);
            }

            let duration = time_ms.saturating_sub(segment_start.unwrap_or(0));
            let next_time = energy_data.get(i + 1).map(|(t, _)| *t);

            let should_end = duration >= min_duration_ms
                && (duration >= max_duration_ms
                    || next_time
                        .map(|nt| {
                            energy < silence_threshold
                                || (nt.saturating_sub(time_ms) + duration) > max_duration_ms
                        })
                        .unwrap_or(false));

            if should_end {
                segments.push((segment_start.unwrap_or(0), time_ms));
                segment_start = None;
            }
        }

        if let Some(start) = segment_start {
            if let Some((last_time, _)) = energy_data.last() {
                let duration = *last_time - start;
                if duration >= min_duration_ms {
                    segments.push((start, *last_time));
                }
            }
        }

        segments
    }

    fn extract_audio_for_energy(&self, audio_path: &str) -> Result<Vec<f32>, String> {
        let temp_audio = std::env::temp_dir()
            .join(format!("fablr_seg_audio_{}.wav", chrono_like_timestamp()));

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-y", "-i", audio_path,
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

        let pcm_data = match std::fs::read(&temp_audio) {
            Ok(d) => d,
            Err(e) => {
                let _ = std::fs::remove_file(&temp_audio);
                return Err(format!("Failed to read audio: {}", e));
            }
        };
        let _ = std::fs::remove_file(&temp_audio);

        // Convert s16le to f32
        let samples: Vec<f32> = pcm_data
            .chunks_exact(2)
            .map(|chunk| {
                let s = i16::from_le_bytes([chunk[0], chunk[1]]);
                s as f32 / 32768.0
            })
            .collect();
        Ok(samples)
    }
}
