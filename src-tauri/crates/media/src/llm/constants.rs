//! LLM 常量定义
//! 默认模型映射、上下文限制

/// 默认模型映射
const DEFAULT_MODELS: &[(&str, &str)] = &[
    ("openai", "gpt-5.5-pro"),
    ("google", "gemini-3.1-pro"),
    ("deepseek", "deepseek-v4-pro"),
    ("qwen", "qwen3.5-plus"),
    ("anthropic", "claude-opus-4-7"),
];

/// 模型最大上下文
pub const CONTEXT_LIMITS: &[(&str, usize)] = &[
    ("gpt-5.5-pro", 128_000),
    ("gpt-5.5-instant", 128_000),
    ("gemini-3.1-pro", 1_000_000),
    ("gemini-3-flash-preview", 1_000_000),
    ("deepseek-v4-pro", 1_000_000),
    ("deepseek-v4-flash", 1_000_000),
    ("qwen3.5-plus", 32_000),
    ("qwen3-max", 32_000),
    ("claude-opus-4-7", 200_000),
    ("claude-sonnet-4-6", 200_000),
];

/// Provider 别名映射（前端 provider 名称 → Rust 内部 provider 名称）
pub fn normalize_provider(provider: &str) -> &str {
    match provider {
        "alibaba" => "qwen", // 前端 alibaba (Qwen系列) → Rust qwen
        "openai" | "google" | "deepseek" | "anthropic" | "qwen" => provider,
        _ => provider,
    }
}

pub fn get_default_model(provider: &str) -> &'static str {
    let normalized = normalize_provider(provider);
    DEFAULT_MODELS
        .iter()
        .find(|(p, _)| *p == normalized)
        .map(|(_, m)| *m)
        .unwrap_or("gpt-5.5-pro")
}

pub fn get_context_limit(model: &str) -> usize {
    CONTEXT_LIMITS
        .iter()
        .find(|(m, _)| *m == model)
        .map(|(_, limit)| *limit)
        .unwrap_or(128_000)
}