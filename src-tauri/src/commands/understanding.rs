//! Understanding commands — Tauri IPC 桥接层，委托至 media::understanding

use media::understanding::storyline_builder::{AnalyzeProductionInput, AnalyzeProductionOutput};

#[tauri::command]
pub async fn analyze_production(
    app: tauri::AppHandle,
    input: AnalyzeProductionInput,
) -> Result<AnalyzeProductionOutput, String> {
    media::understanding::storyline_builder::analyze_production(app, input).await
}
