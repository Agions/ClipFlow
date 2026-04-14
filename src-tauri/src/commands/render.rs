use crate::binary::{ffmpeg_binary, ffprobe_binary};
use crate::types::{AutonomousRenderInput, TranscodeCropInput};
use crate::utils::{chrono_like_timestamp, format_srt_time};
use std::path::PathBuf;
use std::process::Command;

// ─── Transcode ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn transcode_with_crop(input: TranscodeCropInput) -> Result<String, String> {
    if input.input_path.trim().is_empty() || input.output_path.trim().is_empty() {
        return Err("输入或输出路径不能为空".to_string());
    }
    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y");
    if let Some(start) = input.start_time {
        cmd.arg("-ss").arg(start.to_string());
    }
    cmd.arg("-i").arg(&input.input_path);
    if let (Some(start), Some(end)) = (input.start_time, input.end_time) {
        let dur = (end - start).max(0.1);
        cmd.arg("-t").arg(dur.to_string());
    }
    let vf_filter: String = match input.aspect.as_str() {
        "9:16" => {
            "scale=1080:1920:force_original_aspect_ratio=decrease,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1".to_string()
        }
        "1:1" => {
            "scale='min(iw\\,ih):min(iw\\,ih)',crop='min(iw\\,ih):min(iw\\,ih)',setsar=1".to_string()
        }
        "16:9" => {
            "scale=1920:1080:force_original_aspect_ratio=decrease,crop=1920:1080:(iw-1920)/2:(ih-1080)/2,setsar=1".to_string()
        }
        _ => return Err("不支持的宽高比，仅支持 9:16、1:1、16:9".to_string()),
    };
    cmd.arg("-vf").arg(vf_filter);
    let (crf, preset) = match input.quality.as_deref() {
        Some("low") => (28, "veryfast"),
        Some("medium") => (23, "fast"),
        _ => (20, "medium"),
    };
    cmd.args(["-c:v", "libx264", "-crf", &crf.to_string(), "-preset", preset]);
    cmd.args(["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]);
    cmd.arg(&input.output_path);
    let output = cmd.output().map_err(|e| format!("FFmpeg 执行失败: {e}"))?;
    if output.status.success() {
        Ok(input.output_path)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("裁切导出失败: {stderr}"))
    }
}

// ─── Autonomous Cut ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn render_autonomous_cut(input: AutonomousRenderInput) -> Result<String, String> {
    let segments = input
        .segments
        .clone()
        .unwrap_or_default()
        .into_iter()
        .filter(|segment| segment.end > segment.start)
        .collect::<Vec<_>>();

    let transition = input.transition.clone().unwrap_or_else(|| "cut".to_string());
    let transition_duration = input.transition_duration.unwrap_or(0.35).clamp(0.0, 1.5);

    let temp_root = std::env::temp_dir().join(format!(
        "cutdeck_autocut_{}_{}",
        std::process::id(),
        chrono_like_timestamp()
    ));
    std::fs::create_dir_all(&temp_root).map_err(|e| format!("创建临时目录失败: {e}"))?;
    let merged_output = temp_root.join("merged_output.mp4");

    if segments.len() <= 1 {
        let mut fallback = input.clone();
        fallback.output_path = merged_output.to_string_lossy().to_string();
        render_single_cut(&fallback)?;
        let post =
            apply_post_processing(&merged_output, &input, &temp_root, &input.output_path);
        let _ = std::fs::remove_file(&merged_output);
        let _ = std::fs::remove_dir(&temp_root);
        return post.map(|_| input.output_path);
    }

    let mut temp_files: Vec<PathBuf> = Vec::new();
    for (index, segment) in segments.iter().enumerate() {
        let temp_file = temp_root.join(format!("seg_{index}.mp4"));
        let duration = (segment.end - segment.start).max(0.1);
        let output = Command::new(ffmpeg_binary())
            .arg("-y")
            .arg("-ss")
            .arg(segment.start.to_string())
            .arg("-t")
            .arg(duration.to_string())
            .arg("-i")
            .arg(&input.input_path)
            .arg("-c:v")
            .arg("libx264")
            .arg("-c:a")
            .arg("aac")
            .arg("-preset")
            .arg("veryfast")
            .arg("-movflags")
            .arg("+faststart")
            .arg(&temp_file)
            .output()
            .map_err(|e| format!("执行 ffmpeg 切段失败: {e}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("切段失败: {stderr}"));
        }
        temp_files.push(temp_file);
    }

    let merge_result = if transition == "cut" || transition_duration <= 0.0 {
        merge_by_concat(&temp_root, &temp_files, &merged_output.to_string_lossy())
    } else {
        merge_with_transitions(
            &temp_root,
            &temp_files,
            &merged_output.to_string_lossy(),
            &transition,
            transition_duration,
        )
        .or_else(|_| merge_by_concat(&temp_root, &temp_files, &merged_output.to_string_lossy()))
    };

    if let Err(e) = merge_result {
        return Err(format!("自动出片合并失败: {e}"));
    }

    let post_result =
        apply_post_processing(&merged_output, &input, &temp_root, &input.output_path);

    for file in temp_files {
        let _ = std::fs::remove_file(file);
    }
    let _ = std::fs::remove_file(&merged_output);
    let _ = std::fs::remove_dir(temp_root);

    post_result.map(|_| input.output_path)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn render_single_cut(input: &AutonomousRenderInput) -> Result<String, String> {
    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y");
    if let Some(start) = input.start_time {
        cmd.arg("-ss").arg(start.to_string());
    }
    if let Some(end) = input.end_time {
        if let Some(start) = input.start_time {
            let duration = (end - start).max(0.1);
            cmd.arg("-t").arg(duration.to_string());
        }
    }
    cmd.arg("-i")
        .arg(&input.input_path)
        .arg("-c:v")
        .arg("libx264")
        .arg("-c:a")
        .arg("aac")
        .arg("-movflags")
        .arg("+faststart")
        .arg(&input.output_path);
    let output = cmd
        .output()
        .map_err(|e| format!("执行 ffmpeg 失败（请确认已安装 ffmpeg）: {e}"))?;
    if output.status.success() {
        Ok(input.output_path.clone())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("自动出片失败: {stderr}"))
    }
}

fn apply_post_processing(
    merged_input: &PathBuf,
    input: &AutonomousRenderInput,
    temp_root: &PathBuf,
    final_output_path: &str,
) -> Result<(), String> {
    let burn_subtitles = input.burn_subtitles.unwrap_or(false);
    let apply_overlay = input.apply_overlay_markers.unwrap_or(false);
    let overlay_mix_mode = input
        .overlay_mix_mode
        .clone()
        .unwrap_or_else(|| "pip".to_string());
    let overlay_opacity = input.overlay_opacity.unwrap_or(0.72).clamp(0.05, 1.0);
    let subtitles = input.subtitles.clone().unwrap_or_default();
    let overlays = input.overlay_markers.clone().unwrap_or_default();

    if (!burn_subtitles || subtitles.is_empty()) && (!apply_overlay || overlays.is_empty()) {
        std::fs::copy(merged_input, final_output_path)
            .map_err(|e| format!("写入最终文件失败: {e}"))?;
        return Ok(());
    }

    let subtitle_filter = if burn_subtitles && !subtitles.is_empty() {
        let srt_path = temp_root.join("autocut_subtitles.srt");
        let srt = subtitles
            .iter()
            .enumerate()
            .map(|(index, subtitle)| {
                format!(
                    "{}\n{} --> {}\n{}\n\n",
                    index + 1,
                    format_srt_time(subtitle.start),
                    format_srt_time(subtitle.end),
                    subtitle.text.replace('\n', " ")
                )
            })
            .collect::<String>();
        std::fs::write(&srt_path, srt).map_err(|e| format!("写入字幕文件失败: {e}"))?;
        Some(format!("subtitles={}", escape_ffmpeg_path(&srt_path)))
    } else {
        None
    };

    if apply_overlay && !overlays.is_empty() {
        let base_chain = if let Some(sf) = &subtitle_filter {
            format!("[0:v]{}[base];", sf)
        } else {
            "[0:v]null[base];".to_string()
        };

        if overlay_mix_mode == "full" {
            let enable_expr = build_overlay_enable_expr(&overlays);
            let filter_complex = format!(
                "{}[1:v]format=rgba,colorchannelmixer=aa={:.3}[ov];[base][ov]overlay=0:0:enable='{}'[v]",
                base_chain, overlay_opacity, enable_expr
            );
            let output = Command::new(ffmpeg_binary())
                .arg("-y")
                .arg("-i")
                .arg(merged_input)
                .arg("-i")
                .arg(merged_input)
                .arg("-filter_complex")
                .arg(filter_complex)
                .arg("-map")
                .arg("[v]")
                .arg("-map")
                .arg("0:a?")
                .arg("-c:v")
                .arg("libx264")
                .arg("-c:a")
                .arg("copy")
                .arg("-movflags")
                .arg("+faststart")
                .arg(final_output_path)
                .output()
                .map_err(|e| format!("原画全屏混合失败: {e}"))?;
            if output.status.success() {
                return Ok(());
            }
        } else {
            let overlay_inputs = overlays
                .iter()
                .enumerate()
                .map(|(idx, marker)| {
                    let layout = pick_overlay_layout_for_marker(marker, idx);
                    format!(
                        "[1:v]scale=iw*{:.3}:-1,format=rgba,colorchannelmixer=aa={:.3}[ov{}];",
                        layout.scale, overlay_opacity, idx
                    )
                })
                .collect::<String>();
            let mut chain = String::new();
            let mut prev = "base".to_string();
            for (idx, marker) in overlays.iter().enumerate() {
                let layout = pick_overlay_layout_for_marker(marker, idx);
                let end = marker.end.max(marker.start + 0.05);
                let out = format!("v{idx}");
                chain.push_str(&format!(
                    "[{}][ov{}]overlay=x={}:y={}:enable='between(t,{:.3},{:.3})'[{}];",
                    prev, idx, layout.x, layout.y, marker.start, end, out
                ));
                prev = out;
            }
            let final_video_label = format!("[{}]", prev);
            let filter_complex = format!("{base_chain}{overlay_inputs}{chain}");

            let output = Command::new(ffmpeg_binary())
                .arg("-y")
                .arg("-i")
                .arg(merged_input)
                .arg("-i")
                .arg(&input.input_path)
                .arg("-filter_complex")
                .arg(filter_complex)
                .arg("-map")
                .arg(final_video_label)
                .arg("-map")
                .arg("0:a?")
                .arg("-c:v")
                .arg("libx264")
                .arg("-c:a")
                .arg("copy")
                .arg("-movflags")
                .arg("+faststart")
                .arg(final_output_path)
                .output()
                .map_err(|e| format!("原画画中画混合失败: {e}"))?;
            if output.status.success() {
                return Ok(());
            }
        }
    }

    if subtitle_filter.is_none() {
        std::fs::copy(merged_input, final_output_path)
            .map_err(|e| format!("写入最终文件失败: {e}"))?;
        return Ok(());
    }

    let filter_chain = subtitle_filter.unwrap_or_default();
    let output = Command::new(ffmpeg_binary())
        .arg("-y")
        .arg("-i")
        .arg(merged_input)
        .arg("-vf")
        .arg(filter_chain)
        .arg("-c:v")
        .arg("libx264")
        .arg("-c:a")
        .arg("copy")
        .arg("-movflags")
        .arg("+faststart")
        .arg(final_output_path)
        .output()
        .map_err(|e| format!("后处理失败: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("后处理失败: {stderr}"))
    }
}

fn merge_by_concat(
    temp_root: &PathBuf,
    temp_files: &[PathBuf],
    output_path: &str,
) -> Result<(), String> {
    let concat_list_path = temp_root.join("concat.txt");
    let concat_body = temp_files
        .iter()
        .map(|path| {
            format!(
                "file '{}'\n",
                path.to_string_lossy().replace('\'', "'\\''")
            )
        })
        .collect::<String>();
    std::fs::write(&concat_list_path, concat_body)
        .map_err(|e| format!("写入 concat 列表失败: {e}"))?;

    let merge_output = Command::new(ffmpeg_binary())
        .arg("-y")
        .arg("-f")
        .arg("concat")
        .arg("-safe")
        .arg("0")
        .arg("-i")
        .arg(&concat_list_path)
        .arg("-c:v")
        .arg("libx264")
        .arg("-c:a")
        .arg("aac")
        .arg("-movflags")
        .arg("+faststart")
        .arg(output_path)
        .output()
        .map_err(|e| format!("执行 ffmpeg concat 失败: {e}"))?;

    let _ = std::fs::remove_file(concat_list_path);

    if merge_output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&merge_output.stderr).to_string())
    }
}

fn merge_with_transitions(
    temp_root: &PathBuf,
    temp_files: &[PathBuf],
    output_path: &str,
    transition: &str,
    transition_duration: f64,
) -> Result<(), String> {
    if temp_files.len() < 2 {
        return merge_by_concat(temp_root, temp_files, output_path);
    }

    let mut current = temp_files[0].clone();
    let transition_name = if transition == "dissolve" { "fade" } else { transition };

    for (index, next) in temp_files.iter().enumerate().skip(1) {
        let merged = temp_root.join(format!("xfade_{index}.mp4"));
        let current_duration = probe_duration(&current).unwrap_or(2.0);
        let offset = (current_duration - transition_duration).max(0.1);

        let filter = format!(
            "[0:v][1:v]xfade=transition={}:duration={}:offset={}[v];[0:a][1:a]acrossfade=d={}[a]",
            transition_name, transition_duration, offset, transition_duration
        );

        let output = Command::new(ffmpeg_binary())
            .arg("-y")
            .arg("-i")
            .arg(&current)
            .arg("-i")
            .arg(next)
            .arg("-filter_complex")
            .arg(filter)
            .arg("-map")
            .arg("[v]")
            .arg("-map")
            .arg("[a]")
            .arg("-c:v")
            .arg("libx264")
            .arg("-c:a")
            .arg("aac")
            .arg("-movflags")
            .arg("+faststart")
            .arg(&merged)
            .output()
            .map_err(|e| format!("执行 ffmpeg xfade 失败: {e}"))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        if current != temp_files[0] {
            let _ = std::fs::remove_file(&current);
        }
        current = merged;
    }

    std::fs::copy(&current, output_path).map_err(|e| format!("写入最终文件失败: {e}"))?;
    if current != temp_files[0] {
        let _ = std::fs::remove_file(current);
    }
    Ok(())
}

fn probe_duration(path: &PathBuf) -> Result<f64, String> {
    let output = Command::new(ffprobe_binary())
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(path)
        .output()
        .map_err(|e| format!("执行 ffprobe 失败: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    text.parse::<f64>()
        .map_err(|e| format!("解析时长失败: {e}"))
}

fn escape_ffmpeg_path(path: &PathBuf) -> String {
    path.to_string_lossy()
        .replace('\\', "\\\\")
        .replace(':', "\\:")
        .replace('\'', "\\'")
}

fn build_overlay_enable_expr(overlays: &[crate::types::AutonomousOverlayMarker]) -> String {
    overlays
        .iter()
        .map(|marker| {
            let extra = if marker.label == "anchor" { 0.12 } else { 0.0 };
            let end = marker.end.max(marker.start + 0.05);
            format!("between(t,{:.3},{:.3})", marker.start, end + extra)
        })
        .collect::<Vec<_>>()
        .join("+")
}

struct OverlayLayout {
    x: String,
    y: String,
    scale: f64,
}

fn pick_overlay_layout_for_marker(
    marker: &crate::types::AutonomousOverlayMarker,
    index: usize,
) -> OverlayLayout {
    match marker.label.as_str() {
        "corner-tr" => OverlayLayout { x: "W-w-16".to_string(), y: "16".to_string(), scale: 0.20 },
        "corner-tl" => OverlayLayout { x: "16".to_string(), y: "16".to_string(), scale: 0.20 },
        "corner-br" => OverlayLayout { x: "W-w-16".to_string(), y: "H-h-16".to_string(), scale: 0.20 },
        "anchor" => {
            let positions = ["H*0.7", "H*0.5", "H*0.3", "H*0.65", "H*0.35"];
            OverlayLayout {
                x: "W*0.82".to_string(),
                y: positions[index % positions.len()].to_string(),
                scale: 0.26,
            }
        }
        _ => {
            let x_positions = ["W*0.05", "W*0.78", "W*0.05", "W*0.78"];
            OverlayLayout {
                x: x_positions[index % x_positions.len()].to_string(),
                y: "H*0.72".to_string(),
                scale: 0.22,
            }
        }
    }
}
