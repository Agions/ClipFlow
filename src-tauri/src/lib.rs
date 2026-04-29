//! CutDeck — AI-driven professional video editing desktop app
//! Tauri 2.x backend entry point

use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod binary;
pub mod commands;
mod types;
mod utils;
pub mod video_effects;
pub mod subtitle;
pub mod highlight_detector;
pub mod smart_segmenter;

pub use commands::{ai, ffprobe, project, render};
pub use types::*;

// Re-export all commands so generate_handler! can find them at crate root
pub use commands::ffprobe::{analyze_video, check_ffmpeg};
pub use commands::ai::{
    detect_highlights, detect_zcr_bursts, detect_smart_segments, extract_key_frames, generate_thumbnail,
    get_export_dir, run_ai_director_plan,
};
pub use commands::project::{
    check_app_data_directory, delete_file, delete_project_file, get_file_size,
    list_app_data_files, list_project_files, load_project_file, read_text_file, save_project_file,
};
pub use commands::render::{render_autonomous_cut, transcode_with_crop};

// Video effects re-exports (from existing modules)
pub use video_effects::{
    apply_filter, apply_filter_chain, build_filter_chain, build_filtergraph, generate_chain_preview,
    generate_filter_preview,
};
// Subtitle re-exports
pub use subtitle::{
    check_faster_whisper, download_whisper_model, get_whisper_supported_languages,
    list_whisper_models, transcribe_audio,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "cutdeck=info,warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("CutDeck 启动中...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            run_ai_director_plan,
            check_app_data_directory,
            save_project_file,
            load_project_file,
            delete_project_file,
            list_project_files,
            list_app_data_files,
            delete_file,
            read_text_file,
            get_file_size,
            render_autonomous_cut,
            transcode_with_crop,
            check_ffmpeg,
            analyze_video,
            generate_thumbnail,
            extract_key_frames,
            // Video effects
            build_filtergraph,
            build_filter_chain,
            apply_filter,
            apply_filter_chain,
            generate_filter_preview,
            generate_chain_preview,
            // Whisper subtitle transcription
            subtitle::transcribe_audio,
            subtitle::check_faster_whisper,
            subtitle::list_whisper_models,
            subtitle::download_whisper_model,
            subtitle::get_whisper_supported_languages,
            // Highlight detection & smart segmentation
            detect_highlights,
            detect_zcr_bursts,
            detect_smart_segments,
        ])
        .setup(|app| {
            tracing::info!("[CutDeck] 应用初始化中...");

            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            tracing::info!("[CutDeck] App数据目录: {:?}", app_data_dir);

            // macOS / Windows / Linux 平台日志路径
            if let Ok(log_dir) = app_data_dir.join("logs").canonicalize() {
                tracing::info!("[CutDeck] 日志目录: {:?}", log_dir);
            }

            if let Some(window) = app.get_webview_window("main") {
                tracing::info!("[CutDeck] 主窗口已获取");

                // 确保窗口标题正确
                let _ = window.set_title("CutDeck - AI 视频创作平台");
            }

            tracing::info!("[CutDeck] 启动完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
