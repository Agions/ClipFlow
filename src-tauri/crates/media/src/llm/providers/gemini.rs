//! Gemini API 调用

use reqwest::Client;
use serde::{Deserialize, Serialize};

pub async fn call_gemini(
    client: &Client,
    model: &str,
    api_key: &str,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );

    #[derive(Serialize, Deserialize)]
    struct Content { parts: Vec<Part> }
    #[derive(Serialize, Deserialize)]
    struct Part { text: String }
    #[derive(Serialize)]
    struct Request {
        contents: Vec<Content>,
        system_instruction: Option<Content>,
        generation_config: GenerationConfig,
    }
    #[derive(Serialize)]
    struct GenerationConfig { temperature: f32, max_output_tokens: usize }

    let request = Request {
        contents: vec![Content { parts: vec![Part { text: user_prompt.to_string() }] }],
        system_instruction: Some(Content { parts: vec![Part { text: system_prompt.to_string() }] }),
        generation_config: GenerationConfig { temperature: 0.7, max_output_tokens: 8192 },
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Gemini 请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API 错误 [{}]: {}", status, body));
    }

    #[derive(Deserialize)]
    struct Response { candidates: Option<Vec<Candidate>> }
    #[derive(Deserialize)]
    struct Candidate { content: Option<Content> }

    let resp: Response = response.json().await.map_err(|e| format!("解析 Gemini 响应失败: {}", e))?;

    resp.candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content)
        .map(|content| {
            content.parts.into_iter().map(|p| p.text).collect::<Vec<_>>().join("")
        })
        .ok_or_else(|| "Gemini 响应为空".to_string())
}
