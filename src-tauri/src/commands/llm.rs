//! LLM 命令模块 — 主入口
//! 整合所有子模块，提供 Tauri 命令
//!
//! 子模块 (`constants` / `helpers` / `parsing` / `providers` / `types`)
//! 定义在 crate 根的 `src/llm/` 目录里，不再在本目录下重复声明。
//! 调用方请使用 `media::llm::...` 路径。

// Reusable HTTP client with connection pooling
use std::sync::OnceLock;
use std::time::Duration;
use reqwest::Client;

use media::highlight::HighlightOptions;
use media::highlight::SceneDetector;
use media::llm::constants::{get_default_model, normalize_provider};
use media::llm::helpers::{build_system_prompt, build_user_prompt};
use media::llm::parsing::parse_script_output;
use media::llm::providers::call_llm_provider;
use media::llm::types::{
    AnalyzeVideoForScriptInput, AnalyzeVideoForScriptOutput,
    GenerateScriptInput, GenerateScriptOutput, ScriptStyle,
};

use media::llm::{get_model_catalog, ModelInfo};

static HTTP_CLIENT: OnceLock<Client> = OnceLock::new();

fn get_http_client() -> &'static Client {
    HTTP_CLIENT.get_or_init(|| {
        Client::builder()
            .pool_max_idle_per_host(16)
            .tcp_keepalive(std::time::Duration::from_secs(60))
            .timeout(Duration::from_secs(180))
            .build()
            .expect("Failed to create HTTP client")
    })
}

// ─── Tauri 命令实现 ─────────────────────────────────────────────────────────

/// 生成解说脚本
#[tauri::command]
pub async fn generate_narration_script(
    input: GenerateScriptInput,
) -> Result<GenerateScriptOutput, String> {
    let client = get_http_client();

    let provider = input.provider.as_deref().unwrap_or("openai");
    let api_key = input.api_key.as_deref().unwrap_or_default();
    let base_url = input.base_url.as_deref();
    let style = input.style.as_ref().unwrap_or(&ScriptStyle::Casual);

    let system_prompt = build_system_prompt(style, input.target_duration_secs);
    let user_prompt = build_user_prompt(&input.subtitles, input.duration_secs, input.target_duration_secs);

    let normalized = normalize_provider(provider);
    let model = input.model.as_deref().unwrap_or_else(|| get_default_model(normalized));

    let raw = call_llm_provider(
        normalized, Some(model), api_key, base_url,
        &system_prompt, &user_prompt, client,
    ).await?;

    Ok(parse_script_output(&raw, input.duration_secs, None))
}

/// 分析视频内容（为脚本生成做准备）
#[tauri::command]
pub async fn analyze_video_for_narration(
    input: AnalyzeVideoForScriptInput,
) -> Result<AnalyzeVideoForScriptOutput, String> {
    let detector = SceneDetector::new();
    let options = HighlightOptions {
        scene_threshold: Some(0.35),
        min_duration_ms: Some(500),
        top_n: Some(12),
        detect_scene: Some(true),
        ..Default::default()
    };

    let scenes = detector.detect_scene_changes(&input.video_path, &options);
    let key_scenes: Vec<f64> = scenes
        .iter()
        .map(|s| s.start_ms as f64 / 1000.0)
        .collect();

    let scene_count = key_scenes.len();
    let video_type = match scene_count {
        0..=2 => "短视频",
        3..=8 => "中视频",
        _ => "长视频",
    }
    .to_string();

    let summary = if scene_count == 0 {
        format!("视频路径: {}（未检测到明显场景切换）", input.video_path)
    } else {
        format!(
            "视频路径: {}，检测到 {} 个关键场景",
            input.video_path, scene_count
        )
    };

    Ok(AnalyzeVideoForScriptOutput {
        video_type,
        summary,
        key_scenes,
    })
}

/// 列出可用模型
#[tauri::command]
pub fn list_available_models() -> Vec<ModelInfo> {
    get_model_catalog().clone()
}

// Re-export types for external consumers (re-exported via llm/mod.rs
// `pub use types::*;` so consumers should reach them as
// `media::llm::types::GenerateScriptInput` etc.). Commands/llm.rs only
// needs the #[tauri::command] function names; types are re-exported
// from `llm` at the crate root.