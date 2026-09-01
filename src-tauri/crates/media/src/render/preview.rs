//! Preview generation — quick low-quality preview from a video segment.
//!
//! Extracted from render.rs (original lines 561-637).

use crate::utils::chrono_like_timestamp;
use super::ffmpeg_builder::{new_cmd, h264_encoder};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratePreviewInput {
    pub input_path: String,
    pub segment: PreviewSegment,
    #[serde(default)]
    pub transition: Option<String>,
    #[serde(default)]
    pub transition_duration: Option<f64>,
    #[serde(default)]
    pub volume: Option<f64>,
    #[serde(default)]
    pub add_subtitles: Option<bool>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewSegment {
    pub start: f64,
    pub end: f64,
    #[serde(default)]
    pub seg_type: Option<String>,
}


pub async fn generate_preview(input: GeneratePreviewInput) -> Result<String, String> {
    if input.input_path.trim().is_empty() {
        return Err("输入路径不能为空".to_string());
    }

    let output_path = std::env::temp_dir().join(format!(
        "fablr_preview_{}_{}.mp4",
        std::process::id(),
        chrono_like_timestamp()
    ));
    let output_path_str = output_path.to_string_lossy().to_string();

    let duration = (input.segment.end - input.segment.start).max(0.1);

    let mut cmd = new_cmd();
    cmd.arg("-ss").arg(input.segment.start.to_string());
    cmd.arg("-t").arg(duration.to_string());
    cmd.arg("-i").arg(&input.input_path);
    cmd.arg("-c:v").arg(h264_encoder());
    cmd.arg("-preset").arg("ultrafast");
    cmd.arg("-crf").arg("28");
    cmd.arg("-c:a").arg("aac");
    cmd.arg("-b:a").arg("128k");
    cmd.arg("-movflags").arg("+faststart");

    if let Some(vol) = input.volume {
        if (0.0..=2.0).contains(&vol) {
            cmd.arg("-af").arg(format!("volume={}", vol));
        }
    }

    if input.add_subtitles.unwrap_or(false) {
        tracing::warn!("Subtitle burn-in not implemented for preview");
    }

    cmd.arg(&output_path_str);

    let output = cmd.output()
        .await
        .map_err(|e| format!("生成预览失败: {e}"))?;

    if !output.status.success() {
        return Err(crate::utils::cmd_err("预览生成失败", &output));
    }

    Ok(output_path_str)
}
