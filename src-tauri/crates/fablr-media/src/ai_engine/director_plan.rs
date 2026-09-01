//! AI Director Plan computation — 导演计划算法

use super::types::{DirectorPlanInput, DirectorPlanOutput};

/// 计算平均值
fn mean_f64<I: IntoIterator<Item = f64>>(iter: I) -> f64 {
    let iter = iter.into_iter();
    let (sum, count) = iter.fold((0.0, 0usize), |(s, c), v| (s + v, c + 1));
    if count == 0 { 0.0 } else { sum / count as f64 }
}


pub fn run_ai_director_plan(input: DirectorPlanInput) -> DirectorPlanOutput {
    let n = input.segments.len().max(1);
    let scene_density = if input.segments.is_empty() {
        1.0
    } else {
        input.scenes.len() as f64 / n as f64
    };
    let speech_density = mean_f64(input.segments.iter().map(|s| s.content.chars().count() as f64)) / input.target_duration.max(1.0);
    let segment_id_stability = mean_f64(input.segments.iter().map(|s| s.id.len() as f64));
    let avg_scene_duration = mean_f64(input.scenes.iter().map(|scene| (scene.end_time - scene.start_time).max(0.0)));
    let scene_id_signal = mean_f64(input.scenes.iter().map(|scene| scene.id.len() as f64));

    let pacing_base = match input.mode.as_str() {
        "ai-mixclip" => 1.08,
        "ai-first-person" => 0.95,
        _ => 1.0,
    };
    let pacing_factor = (pacing_base + (scene_density - 1.0) * 0.06).clamp(0.85, 1.2);
    let preferred_transition: &'static str = if scene_density > 1.2 {
        "cut"
    } else if input.auto_original_overlay {
        "dissolve"
    } else {
        "fade"
    };
    let beat_count = (input.target_duration / 4.0).round().clamp(6.0, 24.0) as u32;
    let confidence = (0.6
        + scene_density * 0.08
        - speech_density * 0.0008
        + (avg_scene_duration.min(8.0) / 8.0) * 0.04
        + (segment_id_stability.min(24.0) / 24.0) * 0.02
        + (scene_id_signal.min(24.0) / 24.0) * 0.02)
        .clamp(0.45, 0.92);

    DirectorPlanOutput { pacing_factor, beat_count, preferred_transition: preferred_transition.to_string(), confidence }
}