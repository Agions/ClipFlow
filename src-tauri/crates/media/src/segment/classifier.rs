//! Segment classification and speed derivation — split from smart_segmenter.rs.

/// Classifies video segments and derives suggested playback speeds.
pub struct SegmentClassifier;

impl SegmentClassifier {
    /// Classify a segment as action/dialogue/transition/content.
    /// Returns `(label, confidence)`.
    pub fn classify_segment(
        seg: &(u64, u64),
        scene_changes: &[u64],
        _energy_data: &[(u64, f32)],
        _mean_energy: f32,
    ) -> (String, f32) {
        let duration = seg.1.saturating_sub(seg.0);

        let at_scene_change = scene_changes.iter().any(|&sc| {
            (sc >= seg.0 && sc <= seg.1) || (sc.saturating_sub(500) <= seg.0 && sc + 500 >= seg.0)
        });

        if at_scene_change && duration < 2000 {
            return ("transition".to_string(), 0.85);
        }

        if duration < 3000 {
            if at_scene_change {
                return ("transition".to_string(), 0.8);
            }
            return ("action".to_string(), 0.6);
        }

        if duration > 15000 {
            return ("content".to_string(), 0.7);
        }

        ("content".to_string(), 0.65)
    }

    /// Derive suggested playback speed (1.0–6.0x) based on segment energy profile.
    pub fn derive_suggested_speed(
        seg: &(u64, u64),
        energy_data: &[(u64, f32)],
        mean_energy: f32,
    ) -> f32 {
        if mean_energy <= 0.0 || energy_data.is_empty() {
            return 1.0;
        }

        let seg_energies: Vec<f32> = energy_data
            .iter()
            .filter(|(t, _)| *t >= seg.0 && *t <= seg.1)
            .map(|(_, e)| *e)
            .collect();

        if seg_energies.is_empty() {
            return 1.0;
        }

        let seg_mean = seg_energies.iter().sum::<f32>() / seg_energies.len() as f32;
        let ratio = seg_mean / mean_energy;

        if ratio > 0.8 {
            1.0
        } else if ratio > 0.4 {
            2.0
        } else if ratio > 0.15 {
            4.0
        } else {
            6.0
        }
    }

    /// Returns `true` if a scene change occurs within ±500 ms of `time_ms`.
    pub fn is_scene_at(scene_changes: &[u64], time_ms: u64) -> bool {
        scene_changes.iter().any(|&sc| {
            (sc >= time_ms && sc <= time_ms) || (sc.saturating_sub(500) <= time_ms && sc + 500 >= time_ms)
        })
    }
}
