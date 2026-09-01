//! Render commands — Tauri IPC 桥接层，委托至 fablr_media::render

use fablr_domain::{AutonomousRenderInput, ExportVideoInput, ExportVideoResult, TranscodeCropInput};
use fablr_media::render::preview::GeneratePreviewInput;

#[tauri::command]
pub async fn export_video(
    limiter: tauri::State<'_, fablr_media::utils::ResourceLimiter>,
    input: ExportVideoInput,
) -> Result<ExportVideoResult, String> {
    fablr_media::render::export_video(limiter, input).await
}

#[tauri::command]
pub async fn transcode_with_crop(
    app: tauri::AppHandle,
    limiter: tauri::State<'_, fablr_media::utils::ResourceLimiter>,
    input: TranscodeCropInput,
) -> Result<String, String> {
    fablr_media::render::transcode_with_crop(app, limiter, input).await
}

#[tauri::command]
pub async fn render_autonomous_cut(
    limiter: tauri::State<'_, fablr_media::utils::ResourceLimiter>,
    input: AutonomousRenderInput,
) -> Result<String, String> {
    fablr_media::render::render_autonomous_cut(limiter, input).await
}

#[tauri::command]
pub async fn generate_preview(input: GeneratePreviewInput) -> Result<String, String> {
    fablr_media::render::generate_preview(input).await
}
