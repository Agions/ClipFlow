//! Anthropic Claude API 调用

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub async fn call_anthropic(
    client: &Client,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let url = "https://api.anthropic.com/v1/messages";

    #[derive(Serialize)]
    struct Request {
        model: String,
        max_tokens: usize,
        system: String,
        messages: Vec<Message>,
    }
    #[derive(Serialize)]
    struct Message { role: String, content: String }

    let request = Request {
        model: model.to_string(),
        max_tokens: 8000,
        system: system_prompt.to_string(),
        messages: vec![Message { role: "user".to_string(), content: user_prompt.to_string() }],
    };

    let response = client
        .post(url)
        .header("x-api-key", api_key.to_string())
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Anthropic 请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API 错误 [{}]: {}", status, body));
    }

    #[derive(Deserialize)]
    struct Response { content: Vec<ContentBlock> }
    #[derive(Deserialize)]
    struct ContentBlock { text: String }

    let resp: Response = response.json().await.map_err(|e| format!("解析 Anthropic 响应失败: {}", e))?;

    resp.content
        .into_iter()
        .next()
        .map(|c| c.text)
        .ok_or_else(|| "Anthropic 响应为空".to_string())
}
