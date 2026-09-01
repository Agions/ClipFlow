//! Subtitle commands — Tauri IPC 桥接层，委托至 media::subtitle

use models::SubtitleResult;

#[tauri::command]
pub async fn transcribe_audio(
    app: tauri::AppHandle,
    audio_path: String,
    model_size: Option<String>,
    language: Option<String>,
) -> Result<SubtitleResult, String> {
    media::subtitle::transcribe_audio(app, audio_path, model_size, language).await
}
