//! Platform — 平台预设（与前端 `src/core/domain/platform.ts` 对齐）
//!
//! 8 个主流短视频平台：抖音/快手/小红书/视频号/TikTok/B站/YouTube/YouTube Shorts。
//! 数据驱动：新增平台只改 PLATFORM_PRESETS 字典，不用改 render 代码。

use serde::{Deserialize, Serialize};

// ─── 枚举 ──────────────────────────────────────────────────────

/// 平台 ID
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PlatformId {
    Douyin,
    Kuaishou,
    Xiaohongshu,
    Wechat,
    Tiktok,
    Bilibili,
    Youtube,
    #[serde(rename = "youtube-shorts")]
    YoutubeShorts,
}

/// 宽高比
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AspectRatio {
    #[serde(rename = "9:16")]
    R9x16,
    #[serde(rename = "1:1")]
    R1x1,
    #[serde(rename = "16:9")]
    R16x9,
    #[serde(rename = "4:5")]
    R4x5,
    #[serde(rename = "21:9")]
    R21x9,
    #[serde(rename = "3:4")]
    R3x4,
}

/// 视频编码
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VideoCodec {
    H264,
    H265,
    Av1,
}

/// 音频编码
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioCodec {
    Aac,
    Mp3,
    Opus,
}

/// 容器格式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Container {
    Mp4,
    Mov,
    Webm,
}

// ─── 字幕样式（与 AssemblyKit 的 SubtitleStyle 对齐） ─────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleStyle {
    pub id: String,
    pub font_family: String,
    pub font_size: u32,
    pub color: String,
    pub stroke_color: String,
    pub stroke_width: u32,
    /// 'top' | 'middle' | 'bottom'
    pub position: String,
    /// 0.0-1.0
    pub opacity: f32,
}

// ─── 平台预设 ──────────────────────────────────────────────────

/// 平台预设
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformPreset {
    pub id: PlatformId,
    pub name: String,
    pub domain: String,
    pub aspect_ratio: AspectRatio,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    /// 视频码率（kbps）
    pub video_bitrate: u32,
    /// 音频码率（kbps）
    pub audio_bitrate: u32,
    pub video_codec: VideoCodec,
    pub audio_codec: AudioCodec,
    pub container: Container,
    pub default_subtitle_style: SubtitleStyle,
    pub burn_subtitle_by_default: bool,
}

// ─── 主流平台预设（数据驱动） ─────────────────────────────────

/// 所有平台预设的注册表（哈希映射 · O(1) 查找）
pub static PLATFORM_PRESETS: std::sync::LazyLock<std::collections::HashMap<PlatformId, PlatformPreset>> =
    std::sync::LazyLock::new(|| {
        let mut m = std::collections::HashMap::new();
        m.insert(PlatformId::Douyin, PlatformPreset {
            id: PlatformId::Douyin,
            name: "抖音".to_string(),
            domain: "douyin.com".to_string(),
            aspect_ratio: AspectRatio::R9x16,
            width: 1080,
            height: 1920,
            fps: 30,
            video_bitrate: 3500,
            audio_bitrate: 128,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "douyin-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 24,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 3,
                position: "middle".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: true,
        });
        m.insert(PlatformId::Kuaishou, PlatformPreset {
            id: PlatformId::Kuaishou,
            name: "快手".to_string(),
            domain: "kuaishou.com".to_string(),
            aspect_ratio: AspectRatio::R9x16,
            width: 1080,
            height: 1920,
            fps: 30,
            video_bitrate: 3500,
            audio_bitrate: 128,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "kuaishou-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 24,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 3,
                position: "middle".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: true,
        });
        m.insert(PlatformId::Xiaohongshu, PlatformPreset {
            id: PlatformId::Xiaohongshu,
            name: "小红书".to_string(),
            domain: "xiaohongshu.com".to_string(),
            aspect_ratio: AspectRatio::R3x4,
            width: 1080,
            height: 1440,
            fps: 30,
            video_bitrate: 3000,
            audio_bitrate: 128,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "xhs-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 20,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 2,
                position: "top".to_string(),
                opacity: 0.9,
            },
            burn_subtitle_by_default: true,
        });
        m.insert(PlatformId::Wechat, PlatformPreset {
            id: PlatformId::Wechat,
            name: "视频号".to_string(),
            domain: "channels.weixin.qq.com".to_string(),
            aspect_ratio: AspectRatio::R9x16,
            width: 1080,
            height: 1920,
            fps: 30,
            video_bitrate: 3000,
            audio_bitrate: 128,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "wechat-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 22,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 2,
                position: "bottom".to_string(),
                opacity: 0.85,
            },
            burn_subtitle_by_default: true,
        });
        m.insert(PlatformId::Tiktok, PlatformPreset {
            id: PlatformId::Tiktok,
            name: "TikTok".to_string(),
            domain: "tiktok.com".to_string(),
            aspect_ratio: AspectRatio::R9x16,
            width: 1080,
            height: 1920,
            fps: 30,
            video_bitrate: 3500,
            audio_bitrate: 128,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "tiktok-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 24,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 3,
                position: "middle".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: true,
        });
        m.insert(PlatformId::Bilibili, PlatformPreset {
            id: PlatformId::Bilibili,
            name: "B 站".to_string(),
            domain: "bilibili.com".to_string(),
            aspect_ratio: AspectRatio::R16x9,
            width: 1920,
            height: 1080,
            fps: 30,
            video_bitrate: 6000,
            audio_bitrate: 192,
            video_codec: VideoCodec::H265,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "bili-default".to_string(),
                font_family: "Source Han Sans".to_string(),
                font_size: 22,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 2,
                position: "bottom".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: false,
        });
        m.insert(PlatformId::Youtube, PlatformPreset {
            id: PlatformId::Youtube,
            name: "YouTube".to_string(),
            domain: "youtube.com".to_string(),
            aspect_ratio: AspectRatio::R16x9,
            width: 1920,
            height: 1080,
            fps: 30,
            video_bitrate: 8000,
            audio_bitrate: 192,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "yt-default".to_string(),
                font_family: "Roboto".to_string(),
                font_size: 20,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 1,
                position: "bottom".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: false,
        });
        m.insert(PlatformId::YoutubeShorts, PlatformPreset {
            id: PlatformId::YoutubeShorts,
            name: "YouTube Shorts".to_string(),
            domain: "youtube.com/shorts".to_string(),
            aspect_ratio: AspectRatio::R9x16,
            width: 1080,
            height: 1920,
            fps: 30,
            video_bitrate: 5000,
            audio_bitrate: 192,
            video_codec: VideoCodec::H264,
            audio_codec: AudioCodec::Aac,
            container: Container::Mp4,
            default_subtitle_style: SubtitleStyle {
                id: "yt-shorts-default".to_string(),
                font_family: "Roboto".to_string(),
                font_size: 24,
                color: "#FFFFFF".to_string(),
                stroke_color: "#000000".to_string(),
                stroke_width: 2,
                position: "middle".to_string(),
                opacity: 1.0,
            },
            burn_subtitle_by_default: true,
        });
        m
    });

// ─── 纯函数 ──────────────────────────────────────────────────

/// 列出所有平台预设
pub fn list_platforms() -> Vec<PlatformPreset> {
    PLATFORM_PRESETS.values().cloned().collect()
}

/// 按 ID 查预设（找不到返回 None）
pub fn get_platform(id: PlatformId) -> Option<PlatformPreset> {
    PLATFORM_PRESETS.get(&id).cloned()
}

/// 按 ID 查预设，找不到时回退到抖音
pub fn require_platform(id: PlatformId) -> PlatformPreset {
    PLATFORM_PRESETS
        .get(&id)
        .cloned()
        .unwrap_or_else(|| get_platform(PlatformId::Douyin).expect("douyin preset always exists"))
}
