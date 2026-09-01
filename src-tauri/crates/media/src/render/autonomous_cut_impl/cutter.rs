//! AutonomousCut 并行切段逻辑
//! 从 autonomous_cut.rs 的 render_autonomous_cut_impl 提取

use crate::binary::{ffmpeg_binary, hw_accel, HwAccel};
use models::AutonomousRenderSegment;
use crate::utils::cmd_err;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::Command as TokioCommand;
use tokio::sync::Semaphore;

/// 并行切段（bounded concurrency）
pub async fn cut_segments_parallel(
    input_path: &str,
    segments: &[AutonomousRenderSegment],
    temp_root: &PathBuf,
) -> Result<Vec<PathBuf>, String> {
    let ffmpeg_bin = ffmpeg_binary();
    let sem = Arc::new(Semaphore::new(8)); // MAX_CONCURRENT_SEGMENTS

    let tasks: Vec<_> = segments
        .iter()
        .enumerate()
        .map(|(index, segment)| {
            let ffmpeg_bin = ffmpeg_bin.clone();
            let input_path = input_path.to_string();
            let temp_root = temp_root.clone();
            let sem = Arc::clone(&sem);
            async move {
                let _permit = sem.acquire_owned().await.expect("semaphore closed");
                let temp_file = temp_root.join(format!("seg_{index}.mp4"));
                let duration = (segment.end - segment.start).max(0.1);
                let hw = hw_accel();
                let preset = if hw == HwAccel::Cpu { "veryfast" } else { "fast" };

                let output = TokioCommand::new(&ffmpeg_bin)
                    .arg("-y")
                    .arg("-ss").arg(segment.start.to_string())
                    .arg("-t").arg(duration.to_string())
                    .arg("-i").arg(&input_path)
                    .arg("-c:v").arg(hw.h264_encoder())
                    .arg("-preset").arg(preset)
                    .arg("-c:a").arg("aac")
                    .arg("-movflags").arg("+faststart")
                    .arg(temp_file.to_string_lossy().as_ref())
                    .output()
                    .await
                    .map_err(|e| format!("执行 ffmpeg 切段失败: {e}"))?;

                if !output.status.success() {
                    return Err(cmd_err("切段失败", &output));
                }
                Ok::<PathBuf, String>(temp_file)
            }
        })
        .collect();

    let results = futures_util::future::join_all(tasks).await;
    let mut temp_files = Vec::new();
    for result in results {
        temp_files.push(result?);
    }
    Ok(temp_files)
}

/// 从时间点推测输出文件名
pub fn probe_duration(input_path: &str) -> Result<f64, String> {
    // Routed through the in-process metadata cache so repeated probes of the
    // same (unmodified) segment skip the ffprobe process. The cached `duration`
    // is parsed from the same `format=duration` field, so the value is
    // identical to the legacy raw-ffprobe probe.
    crate::utils::probe_duration_cached(std::path::Path::new(input_path))
}

/// 追加 -ss / -t 时间参数
pub fn apply_time_segment(cmd: &mut std::process::Command, start: Option<f64>, end: Option<f64>) {
    if let Some(s) = start {
        cmd.arg("-ss").arg(s.to_string());
    }
    if let (Some(s), Some(e)) = (start, end) {
        cmd.arg("-t").arg((e - s).max(0.1).to_string());
    }
}