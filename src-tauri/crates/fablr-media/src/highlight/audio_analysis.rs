//! Audio analysis for highlight detection — uses energy.rs and zcr.rs submodules

use crate::binary::resolve_binary_path;
use crate::highlight::types::HighlightOptions;
use crate::highlight::energy::{compute_energy_highlights, compute_energy_profile, extract_pcm};
use crate::highlight::zcr::detect_zcr_bursts_impl;

pub struct HighlightDetector {
    ffmpeg_path: String,
}

impl HighlightDetector {
    pub fn new() -> Self {
        Self {
            ffmpeg_path: resolve_binary_path("ffmpeg"),
        }
    }

    /// Detect highlights from audio energy analysis
    pub fn detect_audio_highlights(
        &self,
        audio_path: &str,
        options: &HighlightOptions,
    ) -> Vec<crate::highlight::types::HighlightSegment> {
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

        let window_ms = options.window_ms.unwrap_or(100) as f32;
        let sample_rate = 44100u32;
        let (energies, timestamps) = compute_energy_profile(&pcm_data, window_ms, sample_rate);

        compute_energy_highlights(self, &pcm_data, sample_rate, &energies, &timestamps, options)
    }

    /// Compute Zero-Crossing Rate (ZCR) for audio burst detection
    pub fn detect_zcr_bursts(
        &self,
        audio_path: &str,
        window_ms: f32,
        threshold: f32,
    ) -> Vec<(u64, u64, f32)> {
        let pcm_data = match self.extract_audio_pcm(audio_path) {
            Ok(d) => d,
            Err(_) => return Vec::new(),
        };
        if pcm_data.is_empty() {
            return Vec::new();
        }
        detect_zcr_bursts_impl(&pcm_data, window_ms, threshold, 44100.0)
    }

    fn extract_audio_pcm(&self, audio_path: &str) -> Result<Vec<i16>, String> {
        extract_pcm(&self.ffmpeg_path, audio_path)
    }
}

impl Default for HighlightDetector {
    fn default() -> Self {
        Self::new()
    }
}
