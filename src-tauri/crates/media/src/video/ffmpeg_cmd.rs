// FFmpeg command builders for video cutting

use crate::binary::ffmpeg_binary;
use crate::utils::{chrono_like_timestamp, format_time, cmd_err};
use crate::video::processor::VideoProcessor;
use serde::Deserialize;
use std::path::PathBuf;
use tokio::process::Command as TokioCommand;
use futures_util::future::join_all;

/// Typed segment for cut_video command
pub use models::CutSegment;


pub async fn cut_video(
    input_path: String,
    output_path: String,
    segments: Vec<CutSegment>,
    use_hw_accel: Option<bool>,
) -> Result<String, String> {
    let temp_dir = std::env::temp_dir()
        .join(format!("fablr_cut_{}", chrono_like_timestamp()));

    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(|e| format!("创建临时目录失败: {}", e))?;

    let ffmpeg_bin = ffmpeg_binary();
    let use_hw = use_hw_accel.unwrap_or(false);

    let tasks: Vec<_> = segments
        .iter()
        .enumerate()
        .map(|(i, seg)| {
            let ffmpeg_bin = ffmpeg_bin.clone();
            let input_path = input_path.clone();
            let temp_dir = temp_dir.clone();
            async move {
                let temp_file = temp_dir.join(format!("seg_{:03}.mp4", i));
                let duration = (seg.end - seg.start).max(0.1);
                let start_time = format_time(seg.start);
                let duration_str = format_time(duration);

                let mut args = vec![
                    "-y", "-ss", &start_time, "-t", &duration_str, "-i", &input_path,
                ];

                let enc = match use_hw {
                    true => crate::binary::hw_accel().h264_encoder(),
                    false => "libx264",
                };
                args.extend(&["-c:v", enc, "-preset", "fast"]);
                args.extend(&["-c:a", "aac", "-movflags", "+faststart"]);
                let temp_file_str = temp_file.to_string_lossy();
                args.push(temp_file_str.as_ref());

                let result = TokioCommand::new(&ffmpeg_bin)
                    .args(&args)
                    .output()
                    .await
                    .map_err(|e| format!("裁剪失败: {}", e))?;

                if !result.status.success() {
                    return Err(cmd_err("裁剪失败", &result));
                }
                Ok::<PathBuf, String>(temp_file)
            }
        })
        .collect();

    let results = join_all(tasks).await;
    let mut temp_files: Vec<PathBuf> = Vec::new();
    for result in results {
        temp_files.push(result?);
    }

    let processor = VideoProcessor::new();
    processor.concat_segments(&temp_files, &output_path)
        .await
        .map_err(|e| format!("合并失败: {}", e))?;

    for f in temp_files {
        let _ = tokio::fs::remove_file(&f).await;
    }
    let _ = tokio::fs::remove_dir_all(&temp_dir).await;

    Ok(output_path)
}
