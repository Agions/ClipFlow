//! OpenAI API 调用（OpenAI 官方 + OpenAI 兼容接口）

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub async fn call_openai_compatible(
    client: &Client,
    base_url: &str,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    #[derive(Serialize)]
    struct Message {
        role: &'static str,
        content: String,
    }

    #[derive(Serialize)]
    struct Request {
        model: String,
        messages: [Message; 2],
        temperature: f32,
        max_tokens: usize,
    }

    let request = Request {
        model: model.to_string(),
        messages: [
            Message { role: "system", content: system_prompt.to_string() },
            Message { role: "user", content: user_prompt.to_string() },
        ],
        temperature: 0.7,
        max_tokens: 8000,
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API 错误 [{}]: {}", status, body));
    }

    #[derive(Deserialize)]
    struct Response { choices: Vec<Choice> }
    #[derive(Deserialize)]
    struct Choice { message: ResponseMessage }
    #[derive(Deserialize)]
    struct ResponseMessage { content: String }

    let resp: Response = response.json().await.map_err(|e| format!("解析响应失败: {}", e))?;

    resp.choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| "响应为空".to_string())
}
