//! LLM Provider 调度器 — call_llm_provider

use reqwest::Client;

use super::openai::call_openai_compatible;
use super::deepseek_qwen::{call_deepseek, call_qwen};
use super::gemini::call_gemini;
use super::anthropic::call_anthropic;
use crate::llm::constants::{get_default_model, normalize_provider};

pub async fn call_llm_provider(
    provider: &str,
    model: Option<&str>,
    api_key: &str,
    base_url: Option<&str>,
    system_prompt: &str,
    user_prompt: &str,
    client: &Client,
) -> Result<String, String> {
    let normalized = normalize_provider(provider);
    let model = model.unwrap_or_else(|| get_default_model(normalized));

    match normalized {
        "openai" => {
            let base = base_url.unwrap_or("https://api.openai.com/v1");
            call_openai_compatible(client, base, model, api_key, system_prompt, user_prompt).await
        }
        "google" => {
            call_gemini(client, model, api_key, system_prompt, user_prompt).await
        }
        "deepseek" => {
            call_deepseek(client, model, api_key, system_prompt, user_prompt).await
        }
        "qwen" => {
            call_qwen(client, model, api_key, system_prompt, user_prompt).await
        }
        "anthropic" => {
            call_anthropic(client, model, api_key, system_prompt, user_prompt).await
        }
        _ => Err(format!("不支持的 provider: {}", provider)),
    }
}
