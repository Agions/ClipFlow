use crate::binary::{ffmpeg_binary, ffprobe_binary};
use crate::types::{
    AutonomousRenderInput, DetectHighlightsInput, DetectSmartSegmentsInput, DirectorPlanInput,
    DirectorPlanOutput, TranscodeCropInput,
};
use crate::utils::{chrono_like_timestamp, format_srt_time, parse_fraction};
use crate::highlight_detector::HighlightDetector;
use crate::smart_segmenter::SmartSegmenter;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tokio::fs as tokio_fs;

// ─── Video / FFprobe Commands ────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_thumbnail(path: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }
    let output_path = std::env::temp_dir().join(format!(
        "cutdeck_thumb_{}_{}.jpg",
        std::process::id(),
        chrono_like_timestamp()
    ));
    let output = tokio::process::Command::new(ffmpeg_binary())
        .arg("-y")
        .arg("-ss")
        .arg("00:00:01")
        .arg("-i")
        .arg(&path)
        .arg("-frames:v")
        .arg("1")
        .arg("-q:v")
        .arg("2")
        .arg(&output_path)
        .output()
        .await
        .map_err(|e| format!("执行 ffmpeg 生成缩略图失败: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "生成缩略图失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn extract_key_frames(
    path: String,
    count: Option<u32>,
) -> Result<Vec<String>, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }
    let frame_count = count.unwrap_or(10).clamp(1, 60);
    let output_dir = std::env::temp_dir().join(format!(
        "cutdeck_frames_{}_{}",
        std::process::id(),
        chrono_like_timestamp()
    ));
    tokio_fs::create_dir_all(&output_dir)
        .await
        .map_err(|e| format!("创建关键帧目录失败: {e}"))?;
    let pattern = output_dir.join("frame_%03d.jpg");
    let output = tokio::process::Command::new(ffmpeg_binary())
        .arg("-y")
        .arg("-i")
        .arg(&path)
        .arg("-vf")
        .arg("fps=1")
        .arg("-frames:v")
        .arg(frame_count.to_string())
        .arg("-q:v")
        .arg("2")
        .arg(&pattern)
        .output()
        .await
        .map_err(|e| format!("执行 ffmpeg 提取关键帧失败: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "提取关键帧失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let mut frames = tokio_fs::read_dir(&output_dir)
        .await
        .map_err(|e| format!("读取关键帧目录失败: {e}"))?;
    let mut all_frames = Vec::new();
    let mut dir_entry = frames
        .next_entry()
        .await
        .map_err(|e| format!("读取关键帧目录失败: {e}"))?;
    while let Some(entry) = dir_entry {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("jpg") {
            all_frames.push(path);
        }
        dir_entry = frames
            .next_entry()
            .await
            .map_err(|e| format!("读取关键帧目录失败: {e}"))?;
    }
    all_frames.sort();
    Ok(all_frames
        .into_iter()
        .take(frame_count as usize)
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

// ─── AI Director ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn run_ai_director_plan(input: DirectorPlanInput) -> DirectorPlanOutput {
    let scene_density = if input.segments.is_empty() {
        1.0
    } else {
        input.scenes.len() as f64 / input.segments.len() as f64
    };
    let speech_density = input.segments.iter()
        .map(|s| s.content.chars().count() as f64)
        .sum::<f64>() / input.target_duration.max(1.0);
    let segment_id_stability = input.segments.iter()
        .map(|s| s.id.len() as f64)
        .sum::<f64>() / input.segments.len().max(1) as f64;
    let avg_scene_duration = input.scenes.iter()
        .map(|scene| (scene.end_time - scene.start_time).max(0.0))
        .sum::<f64>() / input.scenes.len().max(1) as f64;
    let scene_id_signal = input.scenes.iter()
        .map(|scene| scene.id.len() as f64)
        .sum::<f64>() / input.scenes.len().max(1) as f64;

    let pacing_base = match input.mode.as_str() {
        "ai-mixclip" => 1.08,
        "ai-first-person" => 0.95,
        _ => 1.0,
    };
    let pacing_factor = (pacing_base + (scene_density - 1.0) * 0.06).clamp(0.85, 1.2);
    let preferred_transition = if scene_density > 1.2 {
        "cut".to_string()
    } else if input.auto_original_overlay {
        "dissolve".to_string()
    } else {
        "fade".to_string()
    };
    let beat_count = (input.target_duration / 4.0).round().clamp(6.0, 24.0) as u32;
    let confidence = (0.6
        + scene_density * 0.08
        - speech_density * 0.0008
        + (avg_scene_duration.min(8.0) / 8.0) * 0.04
        + (segment_id_stability.min(24.0) / 24.0) * 0.02
        + (scene_id_signal.min(24.0) / 24.0) * 0.02)
        .clamp(0.45, 0.92);

    DirectorPlanOutput { pacing_factor, beat_count, preferred_transition, confidence }
}

// ─── Render Commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_export_dir() -> String {
    if let Some(download_dir) = dirs::download_dir() {
        let export_dir = download_dir.join("CutDeck");
        return export_dir.to_string_lossy().to_string();
    }
    let temp_dir = std::env::temp_dir().join("CutDeck");
    temp_dir.to_string_lossy().to_string()
}

/// Parameters for detect_zcr_bursts command
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectZCRBurstsInput {
    pub audio_path: String,
    pub window_ms: Option<f32>,
    /// ZCR threshold multiplier over mean (default 2.5)
    pub zcr_threshold_mult: Option<f32>,
}

/// Response for ZCR burst detection
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZCRBurstResult {
    pub start_ms: u64,
    pub end_ms: u64,
    /// Ratio of peak ZCR to threshold (score > 1 = burst)
    pub score: f32,
}

#[tauri::command]
pub fn detect_zcr_bursts(input: DetectZCRBurstsInput) -> Result<Vec<ZCRBurstResult>, String> {
    if input.audio_path.trim().is_empty() {
        return Err("音频路径不能为空".to_string());
    }
    let detector = HighlightDetector::new();
    let window_ms = input.window_ms.unwrap_or(50.0);
    let threshold = input.zcr_threshold_mult.unwrap_or(2.5);
    let bursts = detector.detect_zcr_bursts(&input.audio_path, window_ms, threshold);
    Ok(bursts
        .into_iter()
        .map(|(start_ms, end_ms, score)| ZCRBurstResult { start_ms, end_ms, score })
        .collect())
}

#[tauri::command]
pub fn detect_highlights(input: DetectHighlightsInput) -> Result<Vec<crate::highlight_detector::HighlightSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }
    let detector = HighlightDetector::new();
    let options = crate::highlight_detector::HighlightOptions {
        threshold: input.threshold.map(|v| v as f32),
        min_duration_ms: input.min_duration_ms,
        top_n: input.top_n,
        window_ms: input.window_ms,
        detect_scene: input.detect_scene,
        scene_threshold: input.scene_threshold.map(|v| v as f32),
    };
    let highlights = detector.get_highlights(&input.video_path, &options);
    Ok(highlights)
}

#[tauri::command]
pub fn detect_smart_segments(
    input: DetectSmartSegmentsInput,
) -> Result<Vec<crate::smart_segmenter::VideoSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }
    let segmenter = SmartSegmenter::new();
    let options = crate::smart_segmenter::SegmentOptions {
        min_duration_ms: input.min_duration_ms,
        max_duration_ms: input.max_duration_ms,
        scene_threshold: input.scene_threshold.map(|v| v as f32),
        silence_threshold_db: input.silence_threshold_db,
        detect_dialogue: input.detect_dialogue,
        detect_transitions: input.detect_transitions,
    };
    let segments = segmenter.smart_segment(&input.video_path, &options);
    Ok(segments)
}
