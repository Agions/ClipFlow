// Video metadata extraction via ffprobe

use crate::utils::{cmd_err, err_msg, parse_fraction};
use std::process::Command;

/// Extract full metadata (streams, format, duration, etc.) from a video file
pub fn probe_metadata(path: &str, ffprobe_path: &str) -> Result<serde_json::Value, String> {
    let output = Command::new(ffprobe_path)
        .args(&[
            "-v", "error",
            "-show_format", "-show_streams",
            "-of", "json",
            path,
        ])
        .output()
        .map_err(|e| err_msg("运行 ffprobe 失败", e))?;

    if !output.status.success() {
        return Err(cmd_err("ffprobe 失败", &output));
    }

    let data: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("解析 JSON 失败: {}", e))?;

    let video_stream = data["streams"]
        .as_array()
        .and_then(|arr| arr.iter().find(|s| s["codec_type"] == "video"))
        .ok_or("未找到视频流")?;

    let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    let codec = video_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
    let fps = parse_fraction(video_stream["r_frame_rate"].as_str().unwrap_or("0/1"));

    let audio_stream = data["streams"]
        .as_array()
        .and_then(|arr| arr.iter().find(|s| s["codec_type"] == "audio"));

    let duration = data["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let bitrate = data["format"]["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .or(video_stream["bit_rate"].as_str().and_then(|s| s.parse::<u64>().ok()))
        .unwrap_or(0);

    let file_size = data["format"]["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "codec": codec,
        "bitrate": bitrate,
        "fileSize": file_size,
        "audioChannels": audio_stream.and_then(|s| s["channels"].as_u64()).map(|v| v as u32),
        "audioSampleRate": audio_stream.and_then(|s| s["sample_rate"].as_str()).and_then(|s| s.parse::<u32>().ok()),
    }))
}
