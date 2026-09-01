//! Post-processing helpers for autonomous cut — subtitle burn-in, watermark, overlay

use crate::binary::ffmpeg_binary;
use models::AutonomousOverlayMarker;
use crate::utils::cmd_err;
use std::path::PathBuf;
use std::process::Command;

/// Normalize SRT timestamps for burn-in (shift to absolute start)
pub fn normalize_srt_for_burnin(srt: &str, _duration: f64) -> String {
    // Simple pass-through for now
    srt.to_string()
}

/// Burn SRT subtitle into video using FFmpeg
pub fn burn_subtitle_ffmpeg(input: &PathBuf, output: &str, srt_path: &PathBuf) -> Result<(), String> {
    let ffmpeg_bin = ffmpeg_binary();
    let mut cmd = Command::new(&ffmpeg_bin);
    cmd.arg("-y").arg("-i").arg(input).arg("-vf")
        .arg(format!("subtitles='{}'", srt_path.to_string_lossy()))
        .arg("-c:a").arg("copy").arg(output);
    let out = cmd.output().map_err(|e| format!("烧录字幕失败: {e}"))?;
    if !out.status.success() {
        return Err(cmd_err("烧录字幕失败", &out));
    }
    Ok(())
}

/// Escape path for FFmpeg filter graphs
pub fn escape_ffmpeg_path(path: &str) -> String {
    path.replace('\\', "\\\\").replace(':', "\\:")
}

/// Build filter_complex enable expression for overlay markers
pub fn build_overlay_enable_expr(markers: &[AutonomousOverlayMarker]) -> String {
    if markers.is_empty() {
        return String::new();
    }
    let exprs: Vec<String> = markers.iter().map(|m| {
        let enable = format!("between(t,{},{})", m.start, m.end);
        if !m.label.is_empty() {
            format!("'{enable}'*if(n\\,{}\\,1)", m.label)
        } else {
            format!("'{enable}'")
        }
    }).collect();
    format!("enable='{}':alpha=0.8", exprs.join("+"))
}

#[derive(Clone, Debug)]
pub enum OverlayLayout { TopLeft, TopRight, BottomLeft, BottomRight, Center }

pub fn pick_overlay_layout_for_marker(_marker: &AutonomousOverlayMarker) -> OverlayLayout {
    OverlayLayout::BottomRight // default
}

/// Probe video duration via ffprobe (cached).
///
/// Routed through [`crate::utils::media_cache::probe_duration_cached`]; the
/// cached `duration` comes from the same `format=duration` field as the
/// legacy raw-ffprobe probe, so the returned value is identical.
pub fn probe_duration(input_path: &str) -> Result<f64, String> {
    crate::utils::probe_duration_cached(std::path::Path::new(input_path))
}

/// Render a single time segment synchronously (used for single-segment case)
pub fn render_single_cut_sync(
    input_path: &str,
    output: &str,
    start: Option<f64>,
    end: Option<f64>,
) -> Result<(), String> {
    let ffmpeg_bin = ffmpeg_binary();
    let mut cmd = Command::new(&ffmpeg_bin);
    cmd.arg("-y");
    if let Some(s) = start { cmd.arg("-ss").arg(s.to_string()); }
    if let Some(_s) = start { cmd.arg("-i").arg(input_path); }
    if let (Some(s), Some(e)) = (start, end) { cmd.arg("-t").arg((e - s).max(0.1).to_string()); }
    cmd.arg("-c").arg("copy").arg(output);
    let out = cmd.output().map_err(|e| format!("单段切 clip 失败: {e}"))?;
    if !out.status.success() { return Err(cmd_err("单段切 clip 失败", &out)); }
    Ok(())
}

/// Apply -ss / -t time-segment args to a mutable Command
pub fn apply_time_segment(cmd: &mut Command, start: Option<f64>, end: Option<f64>) {
    if let Some(s) = start { cmd.arg("-ss").arg(s.to_string()); }
    if let (Some(s), Some(e)) = (start, end) { cmd.arg("-t").arg((e - s).max(0.1).to_string()); }
}
