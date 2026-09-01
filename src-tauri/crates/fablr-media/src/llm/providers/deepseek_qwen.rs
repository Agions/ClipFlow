//! DeepSeek 和 Qwen API 调用（均使用 OpenAI 兼容接口）

use crate::llm::providers::openai::call_openai_compatible;
use reqwest::Client;

/// DeepSeek API — https://api.deepseek.com
pub async fn call_deepseek(
    client: &Client,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    call_openai_compatible(
        client,
        "https://api.deepseek.com",
        model,
        api_key,
        system_prompt,
        user_prompt,
    )
    .await
}

/// Qwen (阿里通义) API — https://dashscope.aliyuncs.com/compatible-mode/v1
pub async fn call_qwen(
    client: &Client,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    call_openai_compatible(
        client,
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model,
        api_key,
        system_prompt,
        user_prompt,
    )
    .await
}
