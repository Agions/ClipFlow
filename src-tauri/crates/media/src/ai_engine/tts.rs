use tauri::State;

use super::tts_core::{check_tts_available_impl, list_tts_backends_impl, synthesize_speech_batch_impl, synthesize_speech_impl, synthesize_speech_ssml_impl};
use super::types::{SynthesizeSpeechInput, SynthesizeSpeechOutput, TtsBackendInfo, TtsBatchInput, TtsBatchOutput};
use db::ProjectService;
use models::ssml::SsmlDocument;


pub async fn synthesize_speech(input: SynthesizeSpeechInput) -> Result<SynthesizeSpeechOutput, String> {
    synthesize_speech_impl(&input).await
}

/// 接受结构化 SSML 的合成入口（Stage 14.1）

pub async fn synthesize_speech_ssml(
    doc: SsmlDocument,
    voice: String,
    speed: f32,
    format: String,
    backend: String,
) -> Result<SynthesizeSpeechOutput, String> {
    synthesize_speech_ssml_impl(&doc, &voice, speed, &format, &backend).await
}

/// 批量并发合成（Stage 14.2 + 14.5 缓存）
/// - max_concurrency 默认 3，max_retries 默认 2
/// - 自动启用 TTS 缓存：相同 (text/ssml + voice + speed + format + backend) 命中直接返回

pub async fn synthesize_speech_batch(
    service: State<'_, ProjectService>,
    input: TtsBatchInput,
) -> Result<TtsBatchOutput, String> {
    synthesize_speech_batch_impl(&input, Some(service.db())).await
}


pub async fn list_tts_backends() -> Result<Vec<TtsBackendInfo>, String> {
    list_tts_backends_impl().await
}


pub async fn check_tts_available() -> Result<bool, String> {
    check_tts_available_impl().await
}

// ─── Translation ────────────────────────────────────────────────────────────

use crate::utils::cmd_err;
use tokio::process::Command;


pub async fn translate_text(text: String, from_lang: String, to_lang: String) -> Result<String, String> {
    if text.trim().is_empty() {
        return Err("Text cannot be empty".to_string());
    }

    let langpair = format!("{}|{}", from_lang, to_lang);

    let output = Command::new("curl")
        .arg("-s")
        .arg("-G")
        .arg("--data-urlencode")
        .arg(format!("q={}", text))
        .arg("--data-urlencode")
        .arg(format!("langpair={}", langpair))
        .arg("https://api.mymemory.translated.net/get")
        .output()
        .await
        .map_err(|e| format!("Failed to spawn curl: {e}"))?;

    if !output.status.success() {
        return Err(cmd_err("curl failed", &output));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    #[derive(serde::Deserialize)]
    struct MyMemoryResponse {
        response_data: Option<ResponseData>,
        response_status: Option<i32>,
    }
    #[derive(serde::Deserialize)]
    struct ResponseData { translated_text: Option<String> }

    let resp: MyMemoryResponse =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse translation response: {e}"))?;

    if resp.response_status != Some(200) {
        return Err(format!("Translation API error: status {:?}", resp.response_status));
    }

    resp.response_data
        .and_then(|d| d.translated_text)
        .ok_or_else(|| "No translation returned".to_string())
}
