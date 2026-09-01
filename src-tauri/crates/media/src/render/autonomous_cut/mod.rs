//! Autonomous cut — AI-driven multi-segment video cutting and merging.
//!
//! ## Module structure
//! - `postprocess.rs` — subtitle burn-in, watermark, overlay helpers
//! - `autonomous_cut_impl/cutter.rs` — parallel segment cutting
//! - `autonomous_cut_impl/merger.rs` — concat/transition/overlay composition
//! - this file (`mod.rs`) — Tauri command entry point

use tauri::State;

use crate::render::export_state;
use models::AutonomousRenderInput;
use crate::utils::{
    chrono_like_timestamp, resource_error_to_user_message, ResourceLimiter,
};
use std::path::PathBuf;

pub mod postprocess;

use postprocess::{
    burn_subtitle_ffmpeg, normalize_srt_for_burnin, render_single_cut_sync,
};
use crate::render::autonomous_cut_impl::{cutter, merger};

// ─── Tuning Constants ─────────────────────────────────────────────────────────

const DEFAULT_TRANSITION_DURATION: f64 = 0.35;
const MAX_TRANSITION_DURATION: f64 = 1.5;

// ─── Public Command ─────────────────────────────────────────────────────────


pub async fn render_autonomous_cut(
    limiter: State<'_, ResourceLimiter>,
    input: AutonomousRenderInput,
) -> Result<String, String> {
    // P0-2: reserve a single permit for the entire render pipeline
    // (cut + merge + post-process). Released on success, error, or panic.
    let _permit = limiter
        .acquire()
        .await
        .map_err(resource_error_to_user_message)?;
    export_state::enter_export(&input.output_path);
    let result = render_autonomous_cut_impl(input).await;
    export_state::exit_export();
    result
}

// ─── Inner Implementation ─────────────────────────────────────────────────────

async fn render_autonomous_cut_impl(
    mut input: AutonomousRenderInput,
) -> Result<String, String> {
    let segments = input
        .segments
        .take()
        .unwrap_or_default()
        .into_iter()
        .filter(|segment| segment.end > segment.start)
        .collect::<Vec<_>>();

    let transition = input.transition.as_ref().map(String::as_str).unwrap_or("cut");
    let transition_duration = input.transition_duration.unwrap_or(DEFAULT_TRANSITION_DURATION)
        .clamp(0.0, MAX_TRANSITION_DURATION);

    let temp_root = std::env::temp_dir().join(format!(
        "fablr_autocut_{}_{}",
        std::process::id(),
        chrono_like_timestamp()
    ));
    tokio_fs::create_dir_all(&temp_root)
        .await
        .map_err(|e| format!("创建临时目录失败: {e}"))?;
    let merged_output = temp_root.join("merged_output.mp4");

    // ── Single segment: direct copy ─────────────────────────────────────────
    if segments.len() <= 1 {
        let output_path = input.output_path.clone();
        render_single_cut_sync(&input.input_path, &merged_output.to_string_lossy(),
            input.start_time, input.end_time)?;
        apply_post_processing(&merged_output, &mut input, &temp_root, &output_path)?;
        let _ = tokio_fs::remove_file(&merged_output).await;
        let _ = tokio_fs::remove_dir(&temp_root).await;
        return Ok(output_path);
    }

    // ── Parallel cutting ────────────────────────────────────────────────────
    let temp_files = cutter::cut_segments_parallel(
        &input.input_path, &segments, &temp_root,
    ).await?;

    // ── Merge ────────────────────────────────────────────────────────────────
    if transition == "none" || transition == "cut" {
        // pick first segment, copy/concat into merged_output
        if let Some(first) = temp_files.first() {
            merger::merge_by_concat(first, &merged_output)?;
        } else {
            return Err("no segments to merge".to_string());
        }
    } else {
        merger::merge_with_transitions(&temp_files, transition, transition_duration, &merged_output)?;
    }

    // ── Post-processing ─────────────────────────────────────────────────────
    let output_path = input.output_path.clone();
    apply_post_processing(&merged_output, &mut input, &temp_root, &output_path)?;
    let _ = tokio_fs::remove_file(&merged_output).await;
    let _ = tokio_fs::remove_dir(&temp_root).await;
    Ok(output_path)
}

// ─── Post-processing ─────────────────────────────────────────────────────────

fn apply_post_processing(
    merged_input: &PathBuf,
    input: &mut AutonomousRenderInput,
    temp_root: &PathBuf,
    final_output_path: &str,
) -> Result<(), String> {
    let use_overlay = input.overlay_markers.as_ref().map(Vec::is_empty).unwrap_or(true);

    if !use_overlay {
        let subtitle = input.subtitles.as_ref().and_then(|s| s.first()).map(|sub| sub.text.clone());
        if let (Some(srt_content), Some(start)) = (subtitle, input.start_time) {
            let srt_normalized = normalize_srt_for_burnin(&srt_content, input.end_time.unwrap_or(start + 60.0));
            let temp_srt = temp_root.join("temp.srt");
            std::fs::write(&temp_srt, srt_normalized).map_err(|e| format!("写SRT失败: {e}"))?;
            burn_subtitle_ffmpeg(merged_input, final_output_path, &temp_srt)?;
        }
    } else {
        std::fs::copy(merged_input, final_output_path)
            .map_err(|e| format!("复制最终文件失败: {e}"))?;
    }
    Ok(())
}

use tokio::fs as tokio_fs;
