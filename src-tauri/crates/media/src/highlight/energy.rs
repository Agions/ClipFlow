//! Audio energy analysis for highlight detection

use crate::highlight::types::HighlightOptions;
use crate::highlight::audio_analysis::HighlightDetector;
use std::process::Command;

/// Compute energy profile and detect audio-based highlights
pub fn compute_energy_highlights(
    _detector: &HighlightDetector,
    _pcm_data: &[i16],
    _sample_rate: u32,
    energies: &[f32],
    timestamps: &[u64],
    options: &HighlightOptions,
) -> Vec<crate::highlight::types::HighlightSegment> {
    let threshold_mult = options.threshold.unwrap_or(1.5);
    let min_duration_ms = options.min_duration_ms.unwrap_or(500) as f32;

    if energies.is_empty() {
        return Vec::new();
    }

    let mean_energy = energies.iter().sum::<f32>() / energies.len() as f32;
    let variance = energies
        .iter()
        .map(|&e| (e - mean_energy).powi(2))
        .sum::<f32>()
        / energies.len() as f32;
    let std_energy = variance.sqrt();
    let threshold = mean_energy + threshold_mult * std_energy;

    let mut segments: Vec<(usize, usize)> = Vec::new();
    let mut in_highlight = false;
    let mut highlight_start = 0usize;

    for (i, &energy) in energies.iter().enumerate() {
        if energy > threshold {
            if !in_highlight {
                in_highlight = true;
                highlight_start = i;
            }
        } else if in_highlight {
            segments.push((highlight_start, i));
            in_highlight = false;
        }
    }
    if in_highlight {
        segments.push((highlight_start, energies.len() - 1));
    }

    segments
        .into_iter()
        .filter_map(|(start_idx, end_idx)| {
            let start_ms = *timestamps.get(start_idx)?;
            let end_ms = *timestamps.get(end_idx)?;
            let duration_ms = end_ms.saturating_sub(start_ms);
            if duration_ms < min_duration_ms as u64 {
                return None;
            }
            let peak_energy =
                energies[start_idx..=end_idx].iter().fold(0.0f32, |max, &e| max.max(e));
            let score = ((peak_energy - mean_energy) / (std_energy.max(0.001)))
                .clamp(0.0, 1.0)
                * 0.8
                + 0.2;
            Some(crate::highlight::types::HighlightSegment::audio(start_ms, end_ms, score))
        })
        .collect()
}

/// Extract PCM samples from audio file using ffmpeg
pub fn extract_pcm(
    ffmpeg_path: &str,
    audio_path: &str,
) -> Result<Vec<i16>, String> {
    use crate::utils::chrono_like_timestamp;
    let temp_wav =
        std::env::temp_dir().join(format!("fablr_pcm_{}.wav", chrono_like_timestamp()));

    let output = Command::new(ffmpeg_path)
        .args(&[
            "-y", "-i", audio_path, "-ac", "1", "-ar", "44100", "-f", "s16le",
            "-acodec", "pcm_s16le",
            &temp_wav.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("FFmpeg failed to extract audio from '{}': {}", audio_path, e))?;

    if !output.status.success() {
        let _ = std::fs::remove_file(&temp_wav);
        return Err(crate::utils::cmd_err("FFmpeg failed", &output));
    }

    let pcm_data = match std::fs::read(&temp_wav) {
        Ok(d) => d,
        Err(e) => {
            let _ = std::fs::remove_file(&temp_wav);
            return Err(format!("Failed to read PCM from '{}': {}", temp_wav.display(), e));
        }
    };
    let _ = std::fs::remove_file(&temp_wav);

    // Convert raw little-endian PCM s16le bytes to Vec<i16> samples.
    if pcm_data.len() % 2 != 0 {
        return Err("PCM byte count is not 2-byte aligned".to_string());
    }
    let pcm_i16: Vec<i16> = pcm_data
        .chunks_exact(2)
        .map(|c| i16::from_le_bytes([c[0], c[1]]))
        .collect();
    Ok(pcm_i16)
}

/// Compute energy profile over audio windows
pub fn compute_energy_profile(
    pcm_data: &[i16],
    window_ms: f32,
    sample_rate: u32,
) -> (Vec<f32>, Vec<u64>) {
    let window_samples = (window_ms * sample_rate as f32 / 1000.0) as usize;
    let hop_size = window_samples / 2;
    let mut energies: Vec<f32> = Vec::new();
    let mut timestamps: Vec<u64> = Vec::new();

    for i in (0..pcm_data.len().saturating_sub(window_samples)).step_by(hop_size) {
        let window = &pcm_data[i..i + window_samples];
        let energy: f32 = window.iter().map(|&s| (s as f32) * (s as f32)).sum::<f32>() / window_samples as f32;
        let time_ms = (i as f32 * 1000.0 / sample_rate as f32) as u64;
        energies.push(energy);
        timestamps.push(time_ms);
    }
    (energies, timestamps)
}
