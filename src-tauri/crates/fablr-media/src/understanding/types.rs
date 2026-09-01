//! Understanding layer types — L0 内容理解层输入输出
//!
//! 与前端 `core/services/understanding/types.ts` 对齐（serde camelCase）。

use serde::{Deserialize, Serialize};

/// L0 分析进度阶段（`understanding-progress` 事件的 stage 值）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnderstandingStage {
    Metadata,
    Segment,
    Transcribe,
    Highlight,
    Build,
    Done,
}

impl UnderstandingStage {
    /// 事件 payload 中的 stage 字符串
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Metadata => "metadata",
            Self::Segment => "segment",
            Self::Transcribe => "transcribe",
            Self::Highlight => "highlight",
            Self::Build => "build",
            Self::Done => "done",
        }
    }
}

/// `analyze_production` 命令输入
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeProductionInput {
    /// 解说工程 ID（产物目录 `productions/{id}/artifacts` 的组成部分）
    pub production_id: String,
    /// 源视频绝对路径
    pub video_path: String,
    /// Whisper 模型大小（默认 base）
    #[serde(default)]
    pub whisper_model: Option<String>,
    /// 转录语言（默认 auto）
    #[serde(default)]
    pub language: Option<String>,
}

/// `analyze_production` 命令输出（storyline 产物落盘引用 + 统计）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeProductionOutput {
    /// storyline.json 落盘绝对路径
    pub storyline_path: String,
    /// 场景切分数量
    pub scenes_count: usize,
    /// 字幕条目数量
    pub subtitles_count: usize,
    /// 高光片段数量
    pub highlights_count: usize,
    /// 视频时长（秒）
    pub duration_secs: f64,
}
