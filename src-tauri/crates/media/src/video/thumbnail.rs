// Thumbnail generation via ffmpeg

use crate::utils::{chrono_like_timestamp, cmd_err, format_time};
use std::fs;
use std::process::Command;

/// Generate a thumbnail image at a specific timestamp
pub fn generate_thumbnail_impl(
    path: &str,
    time: f64,
    ffmpeg_path: &str,
) -> Result<String, String> {
    let temp_dir = std::env::temp_dir()
        .join(format!("fablr_thumb_{}_{}", std::process::id(), chrono_like_timestamp()));

    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("创建临时目录失败: {}", e))?;

    let output = temp_dir.join("thumb.jpg");

    let result = Command::new(ffmpeg_path)
        .args(&[
            "-y", "-ss", &format_time(time.max(0.0)), "-i", path,
            "-frames:v", "1", "-q:v", "2", "-vf", "scale=320:-1",
            &output.to_string_lossy(),
        ])
        .output()
        .map_err(|e| format!("生成缩略图失败: {}", e))?;

    if !result.status.success() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err(cmd_err("生成失败", &result));
    }

    let final_path = std::env::temp_dir()
        .join(format!("fablr_thumb_{}.jpg", chrono_like_timestamp()));
    fs::copy(&output, &final_path)
        .map_err(|e| {
            let _ = fs::remove_dir_all(&temp_dir);
            format!("保存缩略图失败: {}", e)
        })?;

    let _ = fs::remove_dir_all(&temp_dir);
    Ok(final_path.display().to_string())
}
