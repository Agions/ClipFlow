//! ffprobe commands — Tauri IPC 桥接层，委托至 fablr_media::video::ffprobe

use fablr_domain::{FFmpegCheckResult, VideoMetadataResult};

#[tauri::command]
pub async fn check_ffmpeg() -> Result<FFmpegCheckResult, String> {
    fablr_media::video::check_ffmpeg().await
}

#[tauri::command]
pub async fn analyze_video(path: String) -> Result<VideoMetadataResult, String> {
    fablr_media::video::analyze_video(path).await
}

#[tauri::command]
pub async fn run_ffprobe(args: Vec<String>) -> Result<String, String> {
    fablr_media::video::run_ffprobe(args).await
}
