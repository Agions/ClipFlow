use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

mod video_effects;
mod subtitle;
mod highlight_detector;
mod smart_segmenter;

use video_effects::{
    apply_filter, apply_filter_chain, build_filter_chain, build_filtergraph,
    generate_chain_preview, generate_filter_preview,
};
use highlight_detector::{HighlightOptions, HighlightSegment};
use smart_segmenter::{SegmentOptions, VideoSegment};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectorSceneInput {
    id: String,
    start_time: f64,
    end_time: f64,
    #[allow(dead_code)]
    r#type: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectorSegmentInput {
    id: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectorPlanInput {
    mode: String,
    target_duration: f64,
    auto_original_overlay: bool,
    scenes: Vec<DirectorSceneInput>,
    segments: Vec<DirectorSegmentInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectorPlanOutput {
    pacing_factor: f64,
    beat_count: u32,
    preferred_transition: String,
    confidence: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutonomousRenderInput {
    input_path: String,
    output_path: String,
    start_time: Option<f64>,
    end_time: Option<f64>,
    transition: Option<String>,
    transition_duration: Option<f64>,
    burn_subtitles: Option<bool>,
    subtitles: Option<Vec<AutonomousSubtitle>>,
    apply_overlay_markers: Option<bool>,
    overlay_mix_mode: Option<String>,
    overlay_opacity: Option<f64>,
    overlay_markers: Option<Vec<AutonomousOverlayMarker>>,
    segments: Option<Vec<AutonomousRenderSegment>>,
}

/// 多格式裁切输入参数
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TranscodeCropInput {
    input_path: String,
    output_path: String,
    aspect: String,             // "9:16" | "1:1" | "16:9"
    start_time: Option<f64>,
    end_time: Option<f64>,
    quality: Option<String>,     // "low" | "medium" | "high"
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutonomousRenderSegment {
    start: f64,
    end: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutonomousSubtitle {
    start: f64,
    end: f64,
    text: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutonomousOverlayMarker {
    start: f64,
    end: f64,
    label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FFmpegCheckResult {
    installed: bool,
    version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct VideoMetadataResult {
    duration: f64,
    width: u32,
    height: u32,
    fps: f64,
    codec: String,
    bitrate: u64,
}

pub(crate) fn resolve_binary_path(binary_name: &str) -> String {
    let env_key = format!("CUTDECK_{}_PATH", binary_name.to_uppercase());
    if let Ok(path) = std::env::var(&env_key) {
        if !path.trim().is_empty() && Path::new(&path).exists() {
            return path;
        }
    }

    if binary_name == "ffprobe" {
        if let Ok(ffmpeg_path) = std::env::var("CUTDECK_FFMPEG_PATH") {
            let ffmpeg = PathBuf::from(ffmpeg_path);
            if let Some(parent) = ffmpeg.parent() {
                let probe = parent.join("ffprobe");
                if probe.exists() {
                    return probe.to_string_lossy().to_string();
                }
            }
        }
    }

    let common_dirs = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    for dir in common_dirs {
        let candidate = Path::new(dir).join(binary_name);
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }

    binary_name.to_string()
}

pub(crate) fn ffmpeg_binary() -> String {
    resolve_binary_path("ffmpeg")
}

pub(crate) fn ffprobe_binary() -> String {
    resolve_binary_path("ffprobe")
}

fn parse_fraction(value: &str) -> f64 {
    if let Some((num, den)) = value.split_once('/') {
        let n = num.parse::<f64>().unwrap_or(0.0);
        let d = den.parse::<f64>().unwrap_or(1.0);
        if d.abs() > f64::EPSILON {
            return n / d;
        }
        return 0.0;
    }
    value.parse::<f64>().unwrap_or(0.0)
}

#[tauri::command]
fn check_ffmpeg() -> FFmpegCheckResult {
    let ffmpeg = ffmpeg_binary();
    let output = Command::new(&ffmpeg).arg("-version").output();

    match output {
        Ok(result) if result.status.success() => {
            let line = String::from_utf8_lossy(&result.stdout)
                .lines()
                .next()
                .map(|s| s.trim().to_string())
                .or_else(|| {
                    String::from_utf8_lossy(&result.stderr)
                        .lines()
                        .next()
                        .map(|s| s.trim().to_string())
                });
            FFmpegCheckResult {
                installed: true,
                version: line,
            }
        }
        _ => FFmpegCheckResult {
            installed: false,
            version: None,
        },
    }
}

#[tauri::command]
fn analyze_video(path: String) -> Result<VideoMetadataResult, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let output = Command::new(ffprobe_binary())
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("v:0")
        .arg("-show_entries")
        .arg("stream=width,height,codec_name,r_frame_rate,bit_rate")
        .arg("-show_entries")
        .arg("format=duration,bit_rate")
        .arg("-of")
        .arg("json")
        .arg(&path)
        .output()
        .map_err(|e| format!("运行ffprobe失败: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ffprobe命令执行失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let payload: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("解析JSON失败: {e}"))?;

    let stream = payload
        .get("streams")
        .and_then(|s| s.as_array())
        .and_then(|arr| arr.first())
        .ok_or_else(|| "未找到视频流".to_string())?;

    let width = stream.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let height = stream.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let codec = stream
        .get("codec_name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();
    let fps = parse_fraction(
        stream
            .get("r_frame_rate")
            .and_then(|v| v.as_str())
            .unwrap_or("0/1"),
    );

    let format = payload.get("format").cloned().unwrap_or(serde_json::Value::Null);
    let duration = format
        .get("duration")
        .and_then(|v| v.as_str())
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(0.0);

    let stream_bitrate = stream
        .get("bit_rate")
        .and_then(|v| v.as_str())
        .and_then(|v| v.parse::<u64>().ok());
    let format_bitrate = format
        .get("bit_rate")
        .and_then(|v| v.as_str())
        .and_then(|v| v.parse::<u64>().ok());
    let bitrate = stream_bitrate.or(format_bitrate).unwrap_or(0);

    Ok(VideoMetadataResult {
        duration,
        width,
        height,
        fps,
        codec,
        bitrate,
    })
}

#[tauri::command]
fn generate_thumbnail(path: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let output_path = std::env::temp_dir().join(format!(
        "cutdeck_thumb_{}_{}.jpg",
        std::process::id(),
        chrono_like_timestamp()
    ));

    let output = Command::new(ffmpeg_binary())
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
fn extract_key_frames(path: String, count: Option<u32>) -> Result<Vec<String>, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let frame_count = count.unwrap_or(10).clamp(1, 60);
    let output_dir = std::env::temp_dir().join(format!(
        "cutdeck_frames_{}_{}",
        std::process::id(),
        chrono_like_timestamp()
    ));
    fs::create_dir_all(&output_dir).map_err(|e| format!("创建关键帧目录失败: {e}"))?;

    let pattern = output_dir.join("frame_%03d.jpg");
    let output = Command::new(ffmpeg_binary())
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
        .map_err(|e| format!("执行 ffmpeg 提取关键帧失败: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "提取关键帧失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let mut frames = fs::read_dir(&output_dir)
        .map_err(|e| format!("读取关键帧目录失败: {e}"))?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|p| p.extension().and_then(|e| e.to_str()) == Some("jpg"))
        .collect::<Vec<_>>();
    frames.sort();

    Ok(frames
        .into_iter()
        .take(frame_count as usize)
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
fn run_ai_director_plan(input: DirectorPlanInput) -> DirectorPlanOutput {
    let scene_density = if input.segments.is_empty() {
        1.0
    } else {
        input.scenes.len() as f64 / input.segments.len() as f64
    };

    let speech_density = input
        .segments
        .iter()
        .map(|s| s.content.chars().count() as f64)
        .sum::<f64>()
        / input.target_duration.max(1.0);
    let segment_id_stability = input
        .segments
        .iter()
        .map(|s| s.id.len() as f64)
        .sum::<f64>()
        / input.segments.len().max(1) as f64;
    let avg_scene_duration = input
        .scenes
        .iter()
        .map(|scene| (scene.end_time - scene.start_time).max(0.0))
        .sum::<f64>()
        / input.scenes.len().max(1) as f64;
    let scene_id_signal = input
        .scenes
        .iter()
        .map(|scene| scene.id.len() as f64)
        .sum::<f64>()
        / input.scenes.len().max(1) as f64;

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

    DirectorPlanOutput {
        pacing_factor,
        beat_count,
        preferred_transition,
        confidence,
    }
}

#[tauri::command]
fn check_app_data_directory(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    fs::create_dir_all(&cutdeck_dir).map_err(|e| format!("创建目录失败: {e}"))?;
    Ok(cutdeck_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn save_project_file(app: tauri::AppHandle, project_id: String, content: String) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    fs::create_dir_all(&cutdeck_dir).map_err(|e| format!("创建目录失败: {e}"))?;

    let mut target_path = PathBuf::from(&cutdeck_dir);
    target_path.push(format!("{project_id}.json"));
    fs::write(&target_path, content).map_err(|e| format!("写入项目文件失败: {e}"))?;
    Ok(())
}

#[tauri::command]
fn load_project_file(app: tauri::AppHandle, project_id: String) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    let target_path = cutdeck_dir.join(format!("{project_id}.json"));

    fs::read_to_string(&target_path).map_err(|e| format!("读取项目文件失败: {e}"))
}

#[tauri::command]
fn delete_project_file(app: tauri::AppHandle, project_id: String) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    let target_path = cutdeck_dir.join(format!("{project_id}.json"));

    if target_path.exists() {
        fs::remove_file(&target_path).map_err(|e| format!("删除项目文件失败: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
fn list_project_files(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    fs::create_dir_all(&cutdeck_dir).map_err(|e| format!("创建目录失败: {e}"))?;

    let mut result: Vec<serde_json::Value> = Vec::new();
    let entries = fs::read_dir(&cutdeck_dir).map_err(|e| format!("读取项目目录失败: {e}"))?;
    for entry in entries {
        let path = entry.map_err(|e| format!("读取目录项失败: {e}"))?.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            continue;
        }
        let file_stem = path
            .file_stem()
            .and_then(|name| name.to_str())
            .map(|value| value.to_string())
            .unwrap_or_default();
        match fs::read_to_string(&path) {
            Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(mut json) => {
                    // 兼容历史项目：如果 id 缺失则使用文件名补齐，避免前端列表因脏数据被整体过滤。
                    if let Some(object) = json.as_object_mut() {
                        let has_id = object
                            .get("id")
                            .and_then(|value| value.as_str())
                            .map(|value| !value.trim().is_empty())
                            .unwrap_or(false);
                        if !has_id && !file_stem.is_empty() {
                            object.insert("id".to_string(), serde_json::Value::String(file_stem.clone()));
                        }
                    }
                    result.push(json)
                }
                Err(_) => continue,
            },
            Err(_) => continue,
        }
    }

    Ok(result)
}

#[tauri::command]
fn list_app_data_files(app: tauri::AppHandle, directory: String) -> Result<Vec<String>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let target_dir = app_dir.join(directory);
    fs::create_dir_all(&target_dir).map_err(|e| format!("创建目录失败: {e}"))?;

    let mut files = Vec::new();
    let entries = fs::read_dir(&target_dir).map_err(|e| format!("读取目录失败: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {e}"))?;
        if entry.path().is_file() {
            files.push(entry.file_name().to_string_lossy().to_string());
        }
    }
    Ok(files)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    // 路径遍历防护：确保路径是安全的
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    // 禁止删除系统关键路径
    let forbidden = ["/", "/home", "/root", "/tmp", "/var", "/etc", "/usr", "/opt"];
    for dir in forbidden {
        if canonical.starts_with(dir) && canonical != PathBuf::from(dir) {
            // 允许在 /tmp 下删除，但不允许删除根目录等
            if !canonical.starts_with("/tmp/cutdeck") {
                return Err("禁止删除此路径".to_string());
            }
        }
    }

    if target.exists() {
        fs::remove_file(&target).map_err(|e| format!("删除文件失败: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    // 路径遍历防护
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    // 限制只能读取特定目录
    let allowed_dirs = ["/tmp/cutdeck", ".cutdeck"];
    let is_allowed = allowed_dirs.iter().any(|dir| canonical.starts_with(dir));
    if !is_allowed && !path.starts_with("/tmp/") && !path.starts_with(".") {
        return Err("禁止读取此路径".to_string());
    }

    fs::read_to_string(path).map_err(|e| format!("读取文件失败: {e}"))
}

#[tauri::command]
fn get_file_size(path: String) -> Result<u64, String> {
    // 路径遍历防护
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    // 限制只能获取特定目录下的文件大小
    let allowed_prefixes = ["/tmp/cutdeck", "/tmp/CutDeck"];
    let is_allowed = allowed_prefixes.iter().any(|prefix| canonical.starts_with(prefix));
    if !is_allowed && !path.starts_with("/tmp/") && !path.contains("cutdeck") {
        return Err("禁止获取此文件的信息".to_string());
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("读取文件信息失败: {e}"))?;
    Ok(metadata.len())
}

/// 多格式裁切导出命令
/// 支持 9:16（抖音竖屏）、1:1（小红书方屏）、16:9（横屏）
#[tauri::command]
fn transcode_with_crop(input: TranscodeCropInput) -> Result<String, String> {
    if input.input_path.trim().is_empty() || input.output_path.trim().is_empty() {
        return Err("输入或输出路径不能为空".to_string());
    }

    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y");

    // 起始时间
    if let Some(start) = input.start_time {
        cmd.arg("-ss").arg(start.to_string());
    }

    cmd.arg("-i").arg(&input.input_path);

    // 时长
    if let (Some(start), Some(end)) = (input.start_time, input.end_time) {
        let dur = (end - start).max(0.1);
        cmd.arg("-t").arg(dur.to_string());
    }

    // 构建 FFmpeg filter（16:9 不裁切，仅缩放；9:16/1:1 裁切居中）
    let vf_filter: String = match input.aspect.as_str() {
        "9:16" => format!(
            "scale=1080:1920:force_original_aspect_ratio=decrease,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1"
        ),
        "1:1"  => format!(
            "scale='min(iw\\,ih):min(iw\\,ih)',crop='min(iw\\,ih):min(iw\\,ih)',setsar=1"
        ),
        "16:9" => format!(
            "scale=1920:1080:force_original_aspect_ratio=decrease,crop=1920:1080:(iw-1920)/2:(ih-1080)/2,setsar=1"
        ),
        _       => return Err("不支持的宽高比，仅支持 9:16、1:1、16:9".to_string()),
    };
    cmd.arg("-vf").arg(vf_filter);

    // 编码质量
    let (crf, preset) = match input.quality.as_deref() {
        Some("low")    => (28, "veryfast"),
        Some("medium") => (23, "fast"),
        _               => (20, "medium"),
    };
    cmd.args(["-c:v", "libx264", "-crf", &crf.to_string(), "-preset", preset]);

    // 音频 + 封装
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

#[tauri::command]
fn render_autonomous_cut(input: AutonomousRenderInput) -> Result<String, String> {
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
    fs::create_dir_all(&temp_root).map_err(|e| format!("创建临时目录失败: {e}"))?;
    let merged_output = temp_root.join("merged_output.mp4");

    if segments.len() <= 1 {
        let mut fallback = input.clone();
        fallback.output_path = merged_output.to_string_lossy().to_string();
        render_single_cut(&fallback)?;
        let post = apply_post_processing(&merged_output, &input, &temp_root, &input.output_path);
        let _ = fs::remove_file(&merged_output);
        let _ = fs::remove_dir(&temp_root);
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

    let post_result = apply_post_processing(&merged_output, &input, &temp_root, &input.output_path);

    for file in temp_files {
        let _ = fs::remove_file(file);
    }
    let _ = fs::remove_file(&merged_output);
    let _ = fs::remove_dir(temp_root);

    post_result.map(|_| input.output_path)
}

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
        fs::copy(merged_input, final_output_path).map_err(|e| format!("写入最终文件失败: {e}"))?;
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
        fs::write(&srt_path, srt).map_err(|e| format!("写入字幕文件失败: {e}"))?;
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
        fs::copy(merged_input, final_output_path).map_err(|e| format!("写入最终文件失败: {e}"))?;
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

fn merge_by_concat(temp_root: &PathBuf, temp_files: &[PathBuf], output_path: &str) -> Result<(), String> {
    let concat_list_path = temp_root.join("concat.txt");
    let concat_body = temp_files
        .iter()
        .map(|path| format!("file '{}'\n", path.to_string_lossy().replace('\'', "'\\''")))
        .collect::<String>();
    fs::write(&concat_list_path, concat_body).map_err(|e| format!("写入 concat 列表失败: {e}"))?;

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

    let _ = fs::remove_file(concat_list_path);

    if merge_output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&merge_output.stderr);
        Err(stderr.to_string())
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
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(stderr.to_string());
        }

        if current != temp_files[0] {
            let _ = fs::remove_file(&current);
        }
        current = merged;
    }

    fs::copy(&current, output_path).map_err(|e| format!("写入最终文件失败: {e}"))?;
    if current != temp_files[0] {
        let _ = fs::remove_file(current);
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
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    text.parse::<f64>()
        .map_err(|e| format!("解析时长失败: {e}"))
}

pub(crate) fn chrono_like_timestamp() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn escape_ffmpeg_path(path: &PathBuf) -> String {
    path.to_string_lossy()
        .replace('\\', "\\\\")
        .replace(':', "\\:")
        .replace('\'', "\\'")
}

fn format_srt_time(seconds: f64) -> String {
    let safe = if seconds.is_finite() { seconds.max(0.0) } else { 0.0 };
    let total_ms = (safe * 1000.0).round() as u64;
    let h = total_ms / 3_600_000;
    let m = (total_ms % 3_600_000) / 60_000;
    let s = (total_ms % 60_000) / 1000;
    let ms = total_ms % 1000;
    format!("{:02}:{:02}:{:02},{:03}", h, m, s, ms)
}

fn build_overlay_enable_expr(overlays: &[AutonomousOverlayMarker]) -> String {
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

// ============== Highlight Detection Commands ==============

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DetectHighlightsInput {
    video_path: String,
    threshold: Option<f32>,
    min_duration_ms: Option<u64>,
    top_n: Option<usize>,
    window_ms: Option<u64>,
    detect_scene: Option<bool>,
    scene_threshold: Option<f32>,
}

#[tauri::command]
fn detect_highlights(input: DetectHighlightsInput) -> Result<Vec<HighlightSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }

    let detector = highlight_detector::HighlightDetector::new();
    let options = HighlightOptions {
        threshold: input.threshold,
        min_duration_ms: input.min_duration_ms,
        top_n: input.top_n,
        window_ms: input.window_ms,
        detect_scene: input.detect_scene,
        scene_threshold: input.scene_threshold,
    };

    let highlights = detector.get_highlights(&input.video_path, &options);
    Ok(highlights)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DetectSmartSegmentsInput {
    video_path: String,
    min_duration_ms: Option<u64>,
    max_duration_ms: Option<u64>,
    scene_threshold: Option<f32>,
    silence_threshold_db: Option<f32>,
    detect_dialogue: Option<bool>,
    detect_transitions: Option<bool>,
}

#[tauri::command]
fn detect_smart_segments(input: DetectSmartSegmentsInput) -> Result<Vec<VideoSegment>, String> {
    if input.video_path.trim().is_empty() {
        return Err("视频路径不能为空".to_string());
    }

    let segmenter = smart_segmenter::SmartSegmenter::new();
    let options = SegmentOptions {
        min_duration_ms: input.min_duration_ms,
        max_duration_ms: input.max_duration_ms,
        scene_threshold: input.scene_threshold,
        silence_threshold_db: input.silence_threshold_db,
        detect_dialogue: input.detect_dialogue,
        detect_transitions: input.detect_transitions,
    };

    let segments = segmenter.smart_segment(&input.video_path, &options);
    Ok(segments)
}

fn pick_overlay_layout_for_marker(marker: &AutonomousOverlayMarker, index: usize) -> OverlayLayout {
    match marker.label.as_str() {
        "motion" => OverlayLayout {
            x: if index % 2 == 0 { "24".to_string() } else { "W-w-24".to_string() },
            y: "24".to_string(),
            scale: 0.26,
        },
        "emotion" => OverlayLayout {
            x: "W-w-24".to_string(),
            y: "24".to_string(),
            scale: 0.30,
        },
        "anchor" => OverlayLayout {
            x: if index % 2 == 0 { "24".to_string() } else { "W-w-24".to_string() },
            y: "H-h-100".to_string(),
            scale: 0.24,
        },
        _ => OverlayLayout {
            x: "W-w-24".to_string(),
            y: "24".to_string(),
            scale: 0.28,
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            run_ai_director_plan,
            check_app_data_directory,
            save_project_file,
            load_project_file,
            delete_project_file,
            list_project_files,
            list_app_data_files,
            delete_file,
            read_text_file,
            get_file_size,
            render_autonomous_cut,
            transcode_with_crop,
            check_ffmpeg,
            analyze_video,
            generate_thumbnail,
            extract_key_frames,
            // Video effects
            build_filtergraph,
            build_filter_chain,
            apply_filter,
            apply_filter_chain,
            generate_filter_preview,
            generate_chain_preview,
            // Whisper subtitle transcription
            subtitle::transcribe_audio,
            subtitle::check_faster_whisper,
            subtitle::list_whisper_models,
            subtitle::download_whisper_model,
            subtitle::get_whisper_supported_languages,
            // Highlight detection & smart segmentation
            detect_highlights,
            detect_smart_segments,
        ])
        .setup(|app| {
            println!("[CutDeck] 启动应用...");

            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            println!("[CutDeck] App数据目录: {:?}", app_data_dir);

            if let Ok(resource_path) = app.path().resource_dir() {
                println!("[CutDeck] 资源目录: {:?}", resource_path);
            }

            if let Some(window) = app.get_webview_window("main") {
                println!("[CutDeck] 获取到主窗口");

                if let Err(e) = window.set_title("CutDeck - AI 自主剪辑工作台") {
                    println!("[CutDeck] 设置窗口标题失败: {:?}", e);
                } else {
                    println!("[CutDeck] 窗口标题设置成功");
                }

                if let Ok(url) = window.url() {
                    println!("[CutDeck] 当前URL: {:?}", url);
                }
            } else {
                println!("[CutDeck] 无法获取主窗口!");
            }

            println!("[CutDeck] 应用启动完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
