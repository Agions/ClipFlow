use crate::binary::{ffmpeg_binary, ffprobe_binary};
use crate::types::{FFmpegCheckResult, VideoMetadataResult};
use crate::utils::parse_fraction;

#[tauri::command]
pub async fn check_ffmpeg() -> FFmpegCheckResult {
    let ffmpeg = ffmpeg_binary();
    let output = tokio::process::Command::new(&ffmpeg)
        .arg("-version")
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let line = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()
            .map(|s| s.trim().to_string())
            .or_else(|| {
                String::from_utf8_lossy(&output.stderr)
                    .lines()
                    .next()
                    .map(|s| s.trim().to_string())
            });
        FFmpegCheckResult { installed: true, version: line }
    } else {
        FFmpegCheckResult { installed: false, version: None }
    }
}

#[tauri::command]
pub async fn analyze_video(path: String) -> Result<VideoMetadataResult, String> {
    if path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let output = tokio::process::Command::new(ffprobe_binary())
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
        .await
        .map_err(|e| format!("运行ffprobe失败: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ffprobe命令执行失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let payload: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("解析JSON失败: {e}"))?;

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

    Ok(VideoMetadataResult { duration, width, height, fps, codec, bitrate })
}
