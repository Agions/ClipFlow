//! StoryFab — AI-driven professional video editing desktop app
//! Tauri 2.x backend entry point

use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub mod binary;
pub mod commands;
pub mod db;
pub mod domain;
pub mod understanding;
pub mod video;
pub mod types;
pub mod utils;
pub mod subtitle;
pub mod highlight;
pub mod segment;
pub mod llm;

pub use commands::{
    ai, auto_save, ffprobe, pipeline, project, render, export_state, file_ops,
};
pub use types::*;

pub use commands::ffprobe::{analyze_video, check_ffmpeg, run_ffprobe};
pub use commands::ai::{
    detect_highlights, detect_zcr_bursts, detect_smart_segments,
    get_export_dir, run_ai_director_plan, synthesize_speech, synthesize_speech_batch, synthesize_speech_ssml, check_tts_available, list_tts_backends, TtsBackendInfo, translate_text,
};
pub use commands::project::{
    project_create, project_list, project_load, project_save, project_delete, ProjectService,
};
pub use commands::pipeline::{
    pipeline_approve_phase, pipeline_retry_phase, pipeline_run_auto, pipeline_skip_phase,
    pipeline_start_phase,
};
pub use commands::render::{
    export_video, render_autonomous_cut, transcode_with_crop, generate_preview,
};
pub use commands::export_state::cancel_export;
pub use commands::file_ops::{clean_temp_file, open_file, voice_discovery};
pub use video::processor::VideoProcessor;
pub use video::ffmpeg_cmd::cut_video;
pub use video::mix_audio::{mix_audio, MixAudioInput};
pub use video::audio_duration::get_audio_duration;

// Subtitle re-exports
pub use subtitle::transcribe_audio;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "story-fab=info,warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 安装 panic hook (P0-1)：捕捉未处理 panic，写崩溃报告 + 透传 default 行为
    // 必须在 Tauri::Builder 构造之前完成，否则 panic 时拿不到 app handle
    crate::utils::install_panic_hook();

    tracing::info!("StoryFab 启动中...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        // 注册资源限流器 (P0-2)：render/transcribe/whisper 等重活必须先 acquire()
        // 默认 (cpus-1) 个 permit，可通过 STORYFAB_RESOURCE_PERMITS 覆盖
        .manage(crate::utils::ResourceLimiter::shared())
        .invoke_handler(tauri::generate_handler![
            // Project CRUD (v3 · SQLite)
            project_create,
            project_list,
            project_load,
            project_save,
            project_delete,
            // Pipeline 5 phase (v3 · 替代 v2 run_commentary_pipeline)
            pipeline_start_phase,
            pipeline_approve_phase,
            pipeline_retry_phase,
            pipeline_skip_phase,
            pipeline_run_auto,
            run_ai_director_plan,
            render_autonomous_cut,
            transcode_with_crop,
            generate_preview,
            export_video,
            cancel_export,
            clean_temp_file,
            open_file,
            voice_discovery,
            cut_video,
            mix_audio,
            get_audio_duration,
            check_ffmpeg,
            analyze_video,
            run_ffprobe,
            // Whisper subtitle transcription (transcribe_audio lives in
            // subtitle/transcribe.rs; check_faster_whisper /
            // list_whisper_models / download_whisper_model /
            // get_whisper_supported_languages are Python helper snippets
            // in subtitle/whisper.rs and are NOT Tauri commands — they
            // are called from transcribe.rs internally. Skipped here.)
            subtitle::transcribe::transcribe_audio,
            // Highlight detection & smart segmentation
            detect_highlights,
            detect_zcr_bursts,
            detect_smart_segments,
            // TTS / AI
            synthesize_speech,
            synthesize_speech_ssml,
            synthesize_speech_batch,
            check_tts_available,
            list_tts_backends,
            translate_text,
            get_export_dir,
            // Auto-save / crash recovery
            auto_save::auto_save_project,
            auto_save::clear_autosave,
            auto_save::list_recoverable_projects,
            auto_save::recover_autosave,
            auto_save::preview_autosave,
            // L0 Understanding layer (v3) — storyline 编排
            // 直接引用子模块，避免 re-export 导致 Tauri 宏无法解析
            understanding::storyline_builder::analyze_production,
            // LLM / AI 脚本生成
            commands::llm::generate_narration_script,
            commands::llm::analyze_video_for_narration,
            commands::llm::list_available_models,
            // Crash recovery (P0-3 companion): surface panic-hook crash
            // reports to the frontend so users can see / share them.
            commands::crash_recovery::list_crashes,
            commands::crash_recovery::read_crash,
            commands::crash_recovery::delete_crash,
            commands::crash_recovery::clear_crashes,
        ])
        .setup(|app| {
            tracing::info!("[StoryFab] 应用初始化中...");

            let app_data_dir = app.path().app_data_dir().unwrap_or_default();
            tracing::info!("[StoryFab] App数据目录: {:?}", app_data_dir);

            // 初始化 SQLite 数据库（自动迁移）
            let db_path = app_data_dir.join("storyfab.db");
            match crate::db::Db::open(&db_path) {
                Ok(db) => {
                    let schema_v = db.schema_version().unwrap_or(0);
                    tracing::info!(
                        "[StoryFab] SQLite 已就绪: {} (schema v{})",
                        db_path.display(),
                        schema_v
                    );
                    let db = std::sync::Arc::new(db);
                    app.manage(crate::commands::project::ProjectService::new(db));
                }
                Err(e) => {
                    tracing::error!("[StoryFab] SQLite 初始化失败: {}", e);
                }
            }

            // macOS / Windows / Linux 平台日志路径
            if let Ok(log_dir) = app_data_dir.join("logs").canonicalize() {
                tracing::info!("[StoryFab] 日志目录: {:?}", log_dir);
            }

            if let Some(window) = app.get_webview_window("main") {
                tracing::info!("[StoryFab] 主窗口已获取");

                // 确保窗口标题正确
                let _ = window.set_title("StoryFab - AI 视频创作平台");
            }

            tracing::info!("[StoryFab] 启动完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
