//! Export cancellation state tracker — Tauri IPC 桥接层

#[tauri::command]
pub fn cancel_export(export_id: String) -> Result<(), String> {
    media::render::cancel_export(export_id)
}
