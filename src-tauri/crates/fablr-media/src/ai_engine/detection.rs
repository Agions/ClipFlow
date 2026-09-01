//! Highlight & Segment Detection — 高光检测 + 智能切段

use tauri::{AppHandle, Emitter};

use crate::highlight::HighlightDetector;
use crate::segment::SmartSegmenter;
use fablr_domain::{DetectHighlightsInput, DetectSmartSegmentsInput};

use super::types::{DetectZCRBurstsInput, ZCRBurstResult};

/// Tauri event channel for ZCR burst detection progress.
/// Emits `{ stage, percent }` payloads as the audio pipeline runs.
const ZCR_PROGRESS_EVENT: &str = "detect-zcr-progress";


pub async fn detect_highlights(input: DetectHighlightsInput) -> Result<Vec<crate::highlight::HighlightSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }
    let _detector = HighlightDetector::new();
    let options = crate::highlight::HighlightOptions {
        threshold: input.threshold.map(|v| v as f32),
        min_duration_ms: input.min_duration_ms,
        top_n: input.top_n,
        window_ms: input.window_ms,
        detect_scene: input.detect_scene,
        scene_threshold: input.scene_threshold.map(|v| v as f32),
    };
    let highlights = crate::highlight::combiner::get_highlights(&input.video_path, &options).await;
    Ok(highlights)
}


pub async fn detect_zcr_bursts(
    app: AppHandle,
    input: DetectZCRBurstsInput,
) -> Result<Vec<ZCRBurstResult>, String> {
    if input.audio_path.trim().is_empty() {
        return Err("音频路径不能为空".to_string());
    }
    let window_ms = input.window_ms.unwrap_or(50.0);
    let threshold = input.zcr_threshold_mult.unwrap_or(2.5);

    // Run the ffmpeg + ZCR CPU pipeline on a dedicated blocking thread so the
    // Tauri main thread (and the Tokio worker pool) stay responsive while
    // the 100-500MB PCM decode + zero-crossing scan runs. See Tauri #10329.
    let app_for_emit = app.clone();
    let bursts = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<ZCRBurstResult>, String> {
        let _ = app_for_emit.emit(ZCR_PROGRESS_EVENT, serde_json::json!({ "stage": "extract", "percent": 0 }));

        let detector = HighlightDetector::new();

        let _ = app_for_emit.emit(ZCR_PROGRESS_EVENT, serde_json::json!({ "stage": "analyze", "percent": 50 }));
        let bursts = detector.detect_zcr_bursts(&input.audio_path, window_ms, threshold);

        let _ = app_for_emit.emit(ZCR_PROGRESS_EVENT, serde_json::json!({ "stage": "done", "percent": 100 }));
        Ok(bursts
            .into_iter()
            .map(|(start_ms, end_ms, score)| ZCRBurstResult { start_ms, end_ms, score })
            .collect())
    })
    .await
    .map_err(|e| format!("ZCR task join error: {e}"))??;

    Ok(bursts)
}


pub async fn detect_smart_segments(
    input: DetectSmartSegmentsInput,
) -> Result<Vec<crate::segment::VideoSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }
    let segmenter = SmartSegmenter::new();
    let options = crate::segment::SegmentOptions {
        min_duration_ms: input.min_duration_ms,
        max_duration_ms: input.max_duration_ms,
        scene_threshold: input.scene_threshold.map(|v| v as f32),
        silence_threshold_db: input.silence_threshold_db,
        detect_dialogue: input.detect_dialogue,
        detect_transitions: input.detect_transitions,
    };
    let segments = segmenter.smart_segment(&input.video_path, &options).await;
    Ok(segments)
}