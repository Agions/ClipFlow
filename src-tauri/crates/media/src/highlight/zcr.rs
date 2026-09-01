//! Zero-Crossing Rate (ZCR) analysis for audio burst detection

/// Detect ZCR-based audio bursts in the given PCM data
pub fn detect_zcr_bursts_impl(
    pcm_data: &[i16],
    window_ms: f32,
    threshold_mult: f32,
    sample_rate: f32,
) -> Vec<(u64, u64, f32)> {
    let window_samples = (window_ms * sample_rate / 1000.0) as usize;
    let hop = window_samples / 2;

    let mut zcr_values: Vec<f32> = Vec::new();
    let mut timestamps: Vec<u64> = Vec::new();

    for i in (0..pcm_data.len().saturating_sub(window_samples)).step_by(hop) {
        let window = &pcm_data[i..i + window_samples];
        let mut crossings = 0u32;
        let mut prev = window[0];
        for cur in &window[1..] {
            if (cur >= &0 && prev < 0) || (cur < &0 && prev >= 0) {
                crossings += 1;
            }
            prev = *cur;
        }
        let zcr = crossings as f32 / (window_samples - 1) as f32;
        zcr_values.push(zcr);
        timestamps.push((i as f32 * 1000.0 / sample_rate) as u64);
    }

    if zcr_values.is_empty() {
        return Vec::new();
    }

    let mean_zcr = zcr_values.iter().sum::<f32>() / zcr_values.len() as f32;
    let zcr_threshold = mean_zcr * threshold_mult;

    let mut bursts: Vec<(u64, u64, f32)> = Vec::new();
    let mut in_burst = false;
    let mut start_idx = 0usize;

    for (i, &zcr) in zcr_values.iter().enumerate() {
        if zcr > zcr_threshold {
            if !in_burst {
                in_burst = true;
                start_idx = i;
            }
        } else if in_burst {
            in_burst = false;
            let start_ms = timestamps[start_idx];
            let end_ms = timestamps[i];
            bursts.push((start_ms, end_ms, zcr));
        }
    }
    bursts
}
