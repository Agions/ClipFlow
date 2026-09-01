//! AI Commands — Tauri IPC 桥接层，委托至 media::ai_engine

use tauri::State;
pub use media::ai_engine::types::TtsBackendInfo;
use db::ProjectService;
use models::{DetectHighlightsInput, DetectSmartSegmentsInput};
use models::ssml::SsmlDocument;
use media::ai_engine::types::{
    DetectZCRBurstsInput, DirectorPlanInput, DirectorPlanOutput, SynthesizeSpeechInput,
    SynthesizeSpeechOutput, TtsBatchInput, TtsBatchOutput, ZCRBurstResult,
};

#[tauri::command]
pub async fn detect_highlights(input: DetectHighlightsInput) -> Result<Vec<media::highlight::HighlightSegment>, String> {
    media::ai_engine::detection::detect_highlights(input).await
}

#[tauri::command]
pub async fn detect_zcr_bursts(app: tauri::AppHandle, input: DetectZCRBurstsInput) -> Result<Vec<ZCRBurstResult>, String> {
    media::ai_engine::detection::detect_zcr_bursts(app, input).await
}

#[tauri::command]
pub async fn detect_smart_segments(input: DetectSmartSegmentsInput) -> Result<Vec<media::segment::VideoSegment>, String> {
    media::ai_engine::detection::detect_smart_segments(input).await
}

#[tauri::command]
pub fn run_ai_director_plan(input: DirectorPlanInput) -> DirectorPlanOutput {
    media::ai_engine::director_plan::run_ai_director_plan(input)
}

#[tauri::command]
pub async fn synthesize_speech(input: SynthesizeSpeechInput) -> Result<SynthesizeSpeechOutput, String> {
    media::ai_engine::tts::synthesize_speech(input).await
}

#[tauri::command]
pub async fn synthesize_speech_ssml(
    doc: SsmlDocument,
    voice: String,
    speed: f32,
    format: String,
    backend: String,
) -> Result<SynthesizeSpeechOutput, String> {
    media::ai_engine::tts::synthesize_speech_ssml(doc, voice, speed, format, backend).await
}

#[tauri::command]
pub async fn synthesize_speech_batch(
    service: State<'_, ProjectService>,
    input: TtsBatchInput,
) -> Result<TtsBatchOutput, String> {
    media::ai_engine::tts::synthesize_speech_batch(service, input).await
}

#[tauri::command]
pub async fn list_tts_backends() -> Result<Vec<TtsBackendInfo>, String> {
    media::ai_engine::tts::list_tts_backends().await
}

#[tauri::command]
pub async fn check_tts_available() -> Result<bool, String> {
    media::ai_engine::tts::check_tts_available().await
}

#[tauri::command]
pub async fn translate_text(text: String, from_lang: String, to_lang: String) -> Result<String, String> {
    media::ai_engine::tts::translate_text(text, from_lang, to_lang).await
}

/// 获取导出目录
#[tauri::command]
pub fn get_export_dir() -> String {
    if let Some(download_dir) = dirs::download_dir() {
        let export_dir = download_dir.join("Fablr");
        return export_dir.display().to_string();
    }
    let temp_dir = std::env::temp_dir().join("Fablr");
    temp_dir.display().to_string()
}
