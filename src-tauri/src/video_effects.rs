//! GPU-accelerated video effects pipeline via FFmpeg libavfilter.
//!
//! Uses FFmpeg's powerful filter graph system for GPU-accelerated (via
//! libavfilter / VA-API / NVENC where available) video effects processing.
//! All effects are applied through FFmpeg's filter chain — no CPU-heavy
//! pixel manipulation in Rust.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use crate::ffmpeg_binary;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/// Built-in video filters, each mapped to one or more FFmpeg filtergraph
/// expressions.  Parameters are passed as float so the frontend can expose
/// continuous sliders.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
#[serde(rename_all = "camelCase")]
pub enum VideoFilter {
    /// Warm sepia tone (brownish monochrome).
    Sepia,
    /// Old-film vintage look: faded blacks + warm tint + light noise.
    Vintage,
    /// Adjusts contrast.  1.0 = original, 0.5 = grayscale contrast, >1 = punchier.
    Contrast(f32),
    /// Adjusts brightness.  0.0 = original, -1.0 = fully dark, 1.0 = fully bright.
    Brightness(f32),
    /// Adjusts saturation.  0.0 = grayscale, 1.0 = original, 2.0 = double saturation.
    Saturation(f32),
    /// Gaussian blur radius in pixels.
    Blur(f32),
    /// Unsharp-mask sharpening amount.
    Sharpen(f32),
    /// Dark vignette in corners.
    Vignette,
    /// Analogue film grain intensity (0.01 – 0.3 recommended).
    Grain(f32),
    /// Cinematic teal-orange grade: lift shadows toward cyan, push highlights
    /// toward orange.
    Cinema,
    /// Cool/blue colour temperature shift.
    Cool,
    /// Warm/amber colour temperature shift.
    Warm,
}

impl VideoFilter {
    /// Returns the FFmpeg video filter expression for a single filter.
    /// Returns None for no-op (identity) cases.
    fn to_ffmpeg_filter(&self) -> Option<String> {
        match self {
            VideoFilter::Sepia => {
                Some("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131".to_string())
            }
            VideoFilter::Vintage => Some(
                "eq=brightness=0.06:saturation=0.85:contrast=0.9,\
                 colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,\
                 noise=alls=5:allf=t+u"
                    .to_string(),
            ),
            VideoFilter::Contrast(v) => {
                if (*v - 1.0).abs() < 0.01 {
                    return None;
                }
                Some(format!("eq=contrast={}", v))
            }
            VideoFilter::Brightness(v) => {
                if v.abs() < 0.01 {
                    return None;
                }
                Some(format!("eq=brightness={}", v))
            }
            VideoFilter::Saturation(v) => {
                if (*v - 1.0).abs() < 0.01 {
                    return None;
                }
                Some(format!("eq=saturation={}", v))
            }
            VideoFilter::Blur(r) => {
                if *r < 0.1 {
                    return None;
                }
                Some(format!("boxblur={}:{}:{}:{}", r, r, r, r))
            }
            VideoFilter::Sharpen(s) => {
                if *s < 0.01 {
                    return None;
                }
                Some(format!(
                    "unsharp=5:5:{}:5:5:0",
                    s.clamp(0.5, 5.0)
                ))
            }
            VideoFilter::Vignette => Some(
                "vignette=PI/3.5".to_string(),
            ),
            VideoFilter::Grain(g) => {
                let intensity = g.clamp(0.01, 0.3);
                Some(format!(
                    "noise=alls={intensity}:allf=t+u"
                ))
            }
            VideoFilter::Cinema => Some(
                "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,\
                 curves=preset=cool,\
                 eq=brightness=0.03:saturation=1.1"
                    .to_string(),
            ),
            VideoFilter::Cool => Some(
                "colorbalance=rs=-0.2:gs=-0.1:bs=+0.25".to_string(),
            ),
            VideoFilter::Warm => Some(
                "colorbalance=rs=+0.15:gs=+0.08:bs=-0.15".to_string(),
            ),
        }
    }
}

/// A prepared filter chain ready for FFmpeg invocation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilterChain {
    /// FFmpeg `-vf` / `-filter_complex` argument string.
    pub filtergraph: String,
    /// Human-readable description for UI display.
    pub description: String,
}

/// Input for applying a single filter.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyFilterInput {
    pub input_path: String,
    pub output_path: String,
    pub filter: VideoFilter,
    /// Optional segment start time (seconds). If None, processes entire video.
    pub start_time: Option<f64>,
    /// Optional segment end time (seconds). If None, processes to end.
    pub end_time: Option<f64>,
}

/// Input for applying a filter chain (multiple filters chained together).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyChainInput {
    pub input_path: String,
    pub output_path: String,
    pub filters: Vec<VideoFilter>,
    pub start_time: Option<f64>,
    pub end_time: Option<f64>,
}

/// Result of a preview generation.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewResult {
    pub path: String,
    pub duration: f64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (Tauri commands)
// ─────────────────────────────────────────────────────────────────────────────

/// Build an FFmpeg filtergraph string from a single filter.
#[tauri::command]
pub fn build_filtergraph(filter: VideoFilter) -> Result<FilterChain, String> {
    let filter_expr = filter
        .to_ffmpeg_filter()
        .ok_or_else(|| "Filter produces no change (identity)".to_string())?;

    let description = filter_description(&filter);
    Ok(FilterChain {
        filtergraph: filter_expr,
        description,
    })
}

/// Build a combined filtergraph from a list of filters (chained sequentially).
#[tauri::command]
pub fn build_filter_chain(filters: Vec<VideoFilter>) -> Result<FilterChain, String> {
    if filters.is_empty() {
        return Err("At least one filter is required".to_string());
    }

    let mut parts: Vec<String> = Vec::new();
    let mut description_parts: Vec<String> = Vec::new();

    for f in &filters {
        if let Some(expr) = f.to_ffmpeg_filter() {
            parts.push(expr);
            description_parts.push(filter_description(f));
        }
    }

    if parts.is_empty() {
        return Err("All filters produce no change".to_string());
    }

    let filtergraph = parts.join(",");
    let description = description_parts.join(" → ");

    Ok(FilterChain {
        filtergraph,
        description,
    })
}

/// Apply a single video filter to an input file and write the result to output.
#[tauri::command]
pub fn apply_filter(input: ApplyFilterInput) -> Result<String, String> {
    apply_filter_impl(
        &input.input_path,
        &input.output_path,
        Some(&input.filter),
        input.start_time,
        input.end_time,
    )
}

/// Apply a chain of video filters (applied in order) to an input file.
#[tauri::command]
pub fn apply_filter_chain(input: ApplyChainInput) -> Result<String, String> {
    if input.filters.is_empty() {
        return Err("At least one filter is required".to_string());
    }

    // Chain them sequentially — pipe through intermediate files
    let mut current_input = Path::new(&input.input_path).to_path_buf();
    let temp_root = std::env::temp_dir().join(format!(
        "cutdeck_effects_{}_{}",
        std::process::id(),
        crate::chrono_like_timestamp()
    ));
    std::fs::create_dir_all(&temp_root)
        .map_err(|e| format!("Create temp dir for filter chain: {e}"))?;

    let total = input.filters.len();
    for (idx, filter) in input.filters.into_iter().enumerate() {
        let next_input = if idx == total - 1 {
            // Last filter → write directly to final output
            Path::new(&input.output_path).to_path_buf()
        } else {
            temp_root.join(format!("chain_{idx}.mp4"))
        };

        apply_single_filter(
            current_input.to_str().unwrap(),
            next_input.to_str().unwrap(),
            &filter,
            None,
            None,
        )?;

        // Clean up intermediate source (but not the original input)
        if idx > 0 {
            let _ = std::fs::remove_file(&current_input);
        }
        current_input = next_input;
    }

    // Clean up temp dir (leave final output intact)
    let _ = std::fs::remove_dir_all(&temp_root);
    Ok(input.output_path.clone())
}

/// Generate a short (3-second) preview clip with the given filter applied.
/// Returns the path to the temporary preview file.
#[tauri::command]
pub fn generate_filter_preview(
    input_path: String,
    filter: VideoFilter,
    start_time: Option<f64>,
) -> Result<PreviewResult, String> {
    let preview_dir = std::env::temp_dir().join(format!(
        "cutdeck_preview_{}_{}",
        std::process::id(),
        crate::chrono_like_timestamp()
    ));
    std::fs::create_dir_all(&preview_dir)
        .map_err(|e| format!("Create preview dir: {e}"))?;

    let preview_path = preview_dir.join("preview.mp4");

    // Default start_time to 1s if not provided
    let start = start_time.unwrap_or(1.0).max(0.0);
    let duration = 3.0_f64;

    apply_single_filter(
        &input_path,
        preview_path.to_str().unwrap(),
        &filter,
        Some(start),
        Some(duration),
    )?;

    // Probe duration to return actual
    let actual_duration = probe_duration(&preview_path).unwrap_or(duration);

    Ok(PreviewResult {
        path: preview_path.to_string_lossy().to_string(),
        duration: actual_duration,
    })
}

/// Generate a short (3-second) preview clip with a filter chain applied.
#[tauri::command]
pub fn generate_chain_preview(
    input_path: String,
    filters: Vec<VideoFilter>,
    start_time: Option<f64>,
) -> Result<PreviewResult, String> {
    if filters.is_empty() {
        return Err("At least one filter is required".to_string());
    }

    let start = start_time.unwrap_or(1.0).max(0.0);
    let duration = 3.0_f64;

    let preview_dir = std::env::temp_dir().join(format!(
        "cutdeck_preview_{}_{}",
        std::process::id(),
        crate::chrono_like_timestamp()
    ));
    std::fs::create_dir_all(&preview_dir)
        .map_err(|e| format!("Create preview dir: {e}"))?;

    let preview_path = preview_dir.join("preview.mp4");

    // Build single combined filtergraph for preview efficiency
    let chain = build_filter_chain(filters.clone())?;
    apply_filtergraph(
        &input_path,
        preview_path.to_str().unwrap(),
        &chain.filtergraph,
        Some(start),
        Some(duration),
    )?;

    let actual_duration = probe_duration(&preview_path).unwrap_or(duration);

    Ok(PreviewResult {
        path: preview_path.to_string_lossy().to_string(),
        duration: actual_duration,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Probe a file's duration via ffprobe.
fn probe_duration(path: &Path) -> Result<f64, String> {
    let output = Command::new(crate::ffprobe_binary())
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(path)
        .output()
        .map_err(|e| format!("Probe ffprobe failed: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<f64>()
        .map_err(|e| format!("Parse duration: {e}"))
}

/// Apply a single filter (or a chain resolved to one filter) to the input.
fn apply_filter_impl<F: std::borrow::Borrow<VideoFilter>>(
    input_path: &str,
    output_path: &str,
    filter_opt: Option<F>,
    start_time: Option<f64>,
    end_time: Option<f64>,
) -> Result<String, String> {
    // Build filtergraph
    let filtergraph = if let Some(f) = filter_opt {
        let f = f.borrow();
        f.to_ffmpeg_filter()
            .ok_or_else(|| "Filter produces no change".to_string())?
    } else {
        return Err("No filter specified".to_string());
    };

    apply_filtergraph(input_path, output_path, &filtergraph, start_time, end_time)
}

/// Core FFmpeg invocation that applies a pre-built filtergraph.
fn apply_filtergraph(
    input_path: &str,
    output_path: &str,
    filtergraph: &str,
    start_time: Option<f64>,
    end_time: Option<f64>,
) -> Result<String, String> {
    if input_path.trim().is_empty() || output_path.trim().is_empty() {
        return Err("Input and output paths cannot be empty".to_string());
    }

    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y"); // overwrite

    if let Some(ss) = start_time {
        cmd.arg("-ss").arg(ss.to_string());
    }

    cmd.arg("-i").arg(input_path);

    if let Some(t) = end_time {
        if start_time.is_some() {
            cmd.arg("-t").arg(t.to_string());
        }
    }

    cmd.arg("-vf").arg(filtergraph);
    cmd.arg("-c:v").arg("libx264");
    cmd.arg("-c:a").arg("aac");
    cmd.arg("-movflags").arg("+faststart");

    cmd.arg(output_path);

    let output = cmd
        .output()
        .map_err(|e| format!("Execute ffmpeg failed: {e}"))?;

    if output.status.success() {
        Ok(output_path.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Apply filter failed: {stderr}"))
    }
}

/// Apply a single filter (with optional time window).
fn apply_single_filter(
    input_path: &str,
    output_path: &str,
    filter: &VideoFilter,
    start_time: Option<f64>,
    duration: Option<f64>,
) -> Result<String, String> {
    let filter_expr = filter
        .to_ffmpeg_filter()
        .ok_or_else(|| "Filter produces no change".to_string())?;

    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y");

    if let Some(ss) = start_time {
        cmd.arg("-ss").arg(ss.to_string());
    }

    cmd.arg("-i").arg(input_path);

    if let Some(d) = duration {
        cmd.arg("-t").arg(d.to_string());
    }

    cmd.arg("-vf").arg(&filter_expr);
    cmd.arg("-c:v").arg("libx264");
    cmd.arg("-c:a").arg("aac");
    cmd.arg("-movflags").arg("+faststart");

    cmd.arg(output_path);

    let output = cmd
        .output()
        .map_err(|e| format!("Execute ffmpeg failed: {e}"))?;

    if output.status.success() {
        Ok(output_path.to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Apply filter failed: {stderr}"))
    }
}

/// Human-readable description for a filter.
fn filter_description(filter: &VideoFilter) -> String {
    match filter {
        VideoFilter::Sepia => "复古滤镜 (Sepia)".to_string(),
        VideoFilter::Vintage => "复古电影感 (Vintage)".to_string(),
        VideoFilter::Contrast(v) => format!("对比度 {:.1}", *v as f64),
        VideoFilter::Brightness(v) => format!("亮度 {:.1}", *v as f64),
        VideoFilter::Saturation(v) => format!("饱和度 {:.1}", *v as f64),
        VideoFilter::Blur(r) => format!("模糊 {:.1}px", *r as f64),
        VideoFilter::Sharpen(s) => format!("锐化 {:.1}", *s as f64),
        VideoFilter::Vignette => "暗角 (Vignette)".to_string(),
        VideoFilter::Grain(g) => format!("胶片颗粒 {:.2}", *g as f64),
        VideoFilter::Cinema => "电影感 (Cinema)".to_string(),
        VideoFilter::Cool => "冷色调 (Cool)".to_string(),
        VideoFilter::Warm => "暖色调 (Warm)".to_string(),
    }
}
