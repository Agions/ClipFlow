//! LLM 类型定义
//! Provider, ScriptStyle, Input/Output 结构体

use serde::{Deserialize, Serialize};

/// AI 提供商
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LLMProvider {
    OpenAi,
    Google,
    DeepSeek,
    Qwen,
    Anthropic,
}

impl std::fmt::Display for LLMProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LLMProvider::OpenAi => write!(f, "openai"),
            LLMProvider::Google => write!(f, "google"),
            LLMProvider::DeepSeek => write!(f, "deepseek"),
            LLMProvider::Qwen => write!(f, "qwen"),
            LLMProvider::Anthropic => write!(f, "anthropic"),
        }
    }
}

/// 脚本风格
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ScriptStyle {
    Humorous,   // 搞笑吐槽
    Emotional,  // 煽情动人
    Suspense,   // 悬疑紧张
    Informative, // 干货分享
    Casual,     // 轻松随意
}

impl Default for ScriptStyle {
    fn default() -> Self {
        ScriptStyle::Casual
    }
}

/// 脚本生成输入
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateScriptInput {
    /// 视频字幕/SRT 内容
    pub subtitles: String,
    /// 视频时长（秒）
    pub duration_secs: Option<f64>,
    /// 目标解说时长（秒），None 则自动估算
    pub target_duration_secs: Option<f64>,
    /// 脚本风格
    pub style: Option<ScriptStyle>,
    /// AI 提供商：openai | google | deepseek | qwen
    pub provider: Option<String>,
    /// 模型名称，如 gpt-5.5-pro、gemini-3.1-pro
    pub model: Option<String>,
    /// API Key
    pub api_key: Option<String>,
    /// Base URL（兼容代理）
    pub base_url: Option<String>,
}

/// 单个脚本片段
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptSegment {
    /// 片段序号（从 1 开始）
    pub index: i32,
    /// 开始时间（秒）
    pub start: f64,
    /// 结束时间（秒）
    pub end: f64,
    /// 脚本内容
    pub text: String,
}

/// 脚本生成输出
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateScriptOutput {
    /// 完整脚本
    pub script: String,
    /// 估算时长（秒）
    pub estimated_duration_secs: f64,
    /// 脚本片段（带时间轴）
    pub segments: Vec<ScriptSegment>,
}

/// 视频分析输入（用于脚本生成前的视频理解）
#[derive(Debug, Clone, Deserialize)]
pub struct AnalyzeVideoForScriptInput {
    pub video_path: String,
    pub analysis_type: Option<String>,
}

/// 视频分析输出
#[derive(Debug, Clone, Serialize)]
pub struct AnalyzeVideoForScriptOutput {
    /// 视频类型标签：电影/纪录片/综艺/短视频
    pub video_type: String,
    /// 内容摘要
    pub summary: String,
    /// 关键场景时间轴（秒）
    pub key_scenes: Vec<f64>,
}