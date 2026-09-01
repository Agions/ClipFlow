//! Understanding commands — Tauri IPC 桥接层，委托至 fablr_media::understanding

use fablr_media::understanding::storyline_builder::{AnalyzeProductionInput, AnalyzeProductionOutput};

#[tauri::command]
pub async fn analyze_production(
    app: tauri::AppHandle,
    input: AnalyzeProductionInput,
) -> Result<AnalyzeProductionOutput, String> {
    fablr_media::understanding::storyline_builder::analyze_production(app, input).await
}
