//! domain — StoryFab v3 领域模型（后端侧）
//!
//! 与前端 `src/core/domain` 对齐的 Rust 类型定义。
//! Stage 12.2 落地 v3 完整领域模型：Intent / Production / Storyline /
//! Assembly / Platform + Job。
//!
//! 序列化约定：字段 snake_case + `serde(rename_all = "camelCase")`。

pub mod assembly;
pub mod intent;
pub mod job;
pub mod platform;
pub mod production;
pub mod ssml;
pub mod storyline;

pub use assembly::{create_assembly, is_assembly_renderable, AssemblyKit, AudioSegment, AudioTrack, AudioTrackType, SubtitleCue, SubtitleTrack, VideoClip, VideoTrack};
pub use intent::{default_duration_by_intent, intent_default_config, intensity_to_style, is_valid_intent, ContentIntent, IntentAudience, IntentConfig, IntentLanguage, ScriptStyle, DEFAULT_INTENT_CONFIG};
pub use job::{JobPhase, PhaseRunState, PipelineJob};
pub use platform::{get_platform, list_platforms, require_platform, AspectRatio, AudioCodec, Container, PlatformId, PlatformPreset, SubtitleStyle as PlatformSubtitleStyle, VideoCodec};
pub use production::{Production, ProductionSource, ProductionStatus};
pub use storyline::Storyline;
