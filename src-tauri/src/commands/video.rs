//! Video commands — Tauri IPC 桥接层，委托至 fablr_media::video

use fablr_domain::CutSegment;
use fablr_media::video::MixAudioInput;

#[tauri::command]
pub async fn cut_video(
    source_path: String,
    output_path: String,
    segments: Vec<CutSegment>,
    use_hw_accel: Option<bool>,
) -> Result<String, String> {
    fablr_media::video::cut_video(source_path, output_path, segments, use_hw_accel).await
}

#[tauri::command]
pub async fn mix_audio(input: MixAudioInput) -> Result<String, String> {
    fablr_media::video::mix_audio(input).await
}

#[tauri::command]
pub async fn get_audio_duration(path: String) -> Result<f64, String> {
    fablr_media::video::get_audio_duration(path).await
}
