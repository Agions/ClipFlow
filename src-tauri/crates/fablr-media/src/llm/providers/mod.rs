//! LLM Providers — per-provider API implementations
//!
//! Sub-modules (each provider is isolated):
//!   openai.rs        — OpenAI / DeepSeek / Qwen (shared REST pattern)
//!   gemini.rs        — Google Gemini API
//!   anthropic.rs     — Anthropic Claude API
//!   router.rs        — dispatcher, routes to the right provider

pub mod anthropic;
pub mod deepseek_qwen;
pub mod gemini;
pub mod openai;
pub mod router;

pub use openai::call_openai_compatible;
pub use deepseek_qwen::{call_deepseek, call_qwen};
pub use gemini::call_gemini;
pub use anthropic::call_anthropic;
pub use router::call_llm_provider;
