//! ASS (Advanced SubStation Alpha) 字幕引擎（Stage 15.3）
//!
//! 与前端 `src/core/services/ass-engine.ts` 镜像：
//! - 同样的 to_ass_time / to_ass_color / serialize_ass_style / serialize_ass_dialogue
//! - 同样的 build_ass_file 完整 ASS 序列化
//!
//! 用途：把 SubtitleTrack + SubtitleStyle 序列化为标准 ASS 字幕文件，
//! 供 FFmpeg libass 滤镜烧录到视频帧上。
//!
//! ASS 文件结构：
//! - [Script Info]   元信息（分辨率、脚本类型、标题）
//! - [V4+ Styles]    样式表（字体/颜色/描边/对齐）
//! - [Events]        字幕事件（Dialogue 行）
//!
//! 详见 https://github.com/libass/libass/blob/master/doc/ASSspecs.txt

use models::assembly::{SubtitleCue, SubtitleTrack};
use models::platform::SubtitleStyle;

// ─── 颜色转换 ─────────────────────────────────────────────────

/// ASS 颜色格式：&HAABBGGRR（alpha + BGR，hex 大写）
pub fn to_ass_color(hex: &str, opacity: f32) -> String {
    let hex = hex.trim_start_matches('#');
    if hex.len() != 6 {
        return "&H00FFFFFF".to_string();
    }
    let r = &hex[0..2];
    let g = &hex[2..4];
    let b = &hex[4..6];
    let alpha = (255.0 * (1.0 - opacity.clamp(0.0, 1.0))).round() as u8;
    format!(
        "&H{:02X}{}{}{}",
        alpha,
        b.to_uppercase(),
        g.to_uppercase(),
        r.to_uppercase()
    )
}

// ─── 时间格式 ─────────────────────────────────────────────────

/// 秒数 → ASS 时间格式 H:MM:SS.CC（百分秒）
pub fn to_ass_time(secs: f64) -> String {
    let secs = if secs < 0.0 { 0.0 } else { secs };
    let total_cs = (secs * 100.0).round() as u64; // 厘秒（1/100 秒）
    let h = total_cs / 360_000;
    let m = (total_cs % 360_000) / 6_000;
    let s = (total_cs % 6_000) / 100;
    let cs = total_cs % 100;
    format!("{}:{:02}:{:02}.{:02}", h, m, s, cs)
}

/// 秒 → SRT 时间格式 HH:MM:SS,mmm
pub fn to_srt_time(secs: f64) -> String {
    let secs = if secs < 0.0 { 0.0 } else { secs };
    let total_ms = (secs * 1000.0).round() as u64;
    let h = total_ms / 3_600_000;
    let m = (total_ms % 3_600_000) / 60_000;
    let s = (total_ms % 60_000) / 1000;
    let ms = total_ms % 1000;
    format!("{:02}:{:02}:{:02},{:03}", h, m, s, ms)
}

// ─── Alignment 映射 ───────────────────────────────────────────

/// ASS 对齐码：1=bottom-left, 2=bottom-center, 3=bottom-right,
///            4=middle-left, 5=middle-center, 6=middle-right,
///            7=top-left, 8=top-center, 9=top-right
fn position_to_alignment(position: &str) -> u32 {
    match position {
        "top" => 8,
        "middle" => 5,
        "bottom" => 2,
        _ => 2, // fallback
    }
}

// ─── Style 序列化 ─────────────────────────────────────────────

/// 单个 SubtitleStyle → ASS V4+ Style 行
pub fn serialize_ass_style(style: &SubtitleStyle) -> String {
    let primary = to_ass_color(&style.color, style.opacity);
    let outline = to_ass_color(&style.stroke_color, 1.0);
    let back = "&H00000000";
    let alignment = position_to_alignment(&style.position);
    format!(
        "Style: {id},{font},{size},{primary},&H000000FF,{outline},{back},-1,0,0,0,100,100,0,0,1,{stroke_w},0,{align},10,10,10,1",
        id = style.id,
        font = style.font_family,
        size = style.font_size,
        primary = primary,
        outline = outline,
        back = back,
        stroke_w = style.stroke_width,
        align = alignment,
    )
}

// ─── Dialogue 序列化 ──────────────────────────────────────────

/// 单个 SubtitleCue → ASS Dialogue 行
pub fn serialize_ass_dialogue(cue: &SubtitleCue, default_style_id: &str) -> String {
    let style_id = if cue.style_id.is_empty() {
        default_style_id
    } else {
        &cue.style_id
    };
    // 替换 \n → \N（ASS 换行）
    let text = cue.text.replace('\n', "\\N").replace('\r', "");
    format!(
        "Dialogue: 0,{start},{end},{style},,0,0,0,,{text}",
        start = to_ass_time(cue.start_secs),
        end = to_ass_time(cue.end_secs),
        style = style_id,
        text = text,
    )
}

// ─── 完整 ASS 文件 ─────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AssBuildOptions {
    pub width: u32,
    pub height: u32,
    pub title: String,
    pub default_style_id: String,
}

impl Default for AssBuildOptions {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            title: "Fablr Export".to_string(),
            default_style_id: "Default".to_string(),
        }
    }
}

/// 完整 SubtitleTrack → 标准 ASS 字幕文件内容
pub fn build_ass_file(track: &SubtitleTrack, options: AssBuildOptions) -> String {
    let default_style_id = if options.default_style_id.is_empty() {
        track
            .styles
            .first()
            .map(|s| s.id.clone())
            .unwrap_or_else(|| "Default".to_string())
    } else {
        options.default_style_id
    };

    let mut lines: Vec<String> = Vec::new();

    // [Script Info]
    lines.push("[Script Info]".to_string());
    lines.push("ScriptType: V4.00+".to_string());
    lines.push("Collisions: Normal".to_string());
    lines.push(format!("Title: {}", options.title));
    lines.push(format!("PlayResX: {}", options.width));
    lines.push(format!("PlayResY: {}", options.height));
    lines.push("ScaledBorderAndShadow: yes".to_string());
    lines.push("WrapStyle: 0".to_string());
    lines.push(String::new());

    // [V4+ Styles]
    lines.push("[V4+ Styles]".to_string());
    lines.push("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding".to_string());
    for s in &track.styles {
        lines.push(serialize_ass_style(s));
    }
    lines.push(String::new());

    // [Events]
    lines.push("[Events]".to_string());
    lines.push("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text".to_string());
    for cue in &track.cues {
        lines.push(serialize_ass_dialogue(cue, &default_style_id));
    }
    lines.push(String::new());

    lines.join("\n")
}

/// 简化的 SRT 序列化（一些播放器/FFmpeg filter 偏好 SRT）
pub fn build_srt_file(track: &SubtitleTrack) -> String {
    track
        .cues
        .iter()
        .enumerate()
        .map(|(i, cue)| {
            format!(
                "{idx}\n{start} --> {end}\n{text}\n",
                idx = i + 1,
                start = to_srt_time(cue.start_secs),
                end = to_srt_time(cue.end_secs),
                text = cue.text,
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

// ─── 单元测试（Stage 15.3） ──────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn default_style() -> SubtitleStyle {
        SubtitleStyle {
            id: "default".to_string(),
            font_family: "Source Han Sans".to_string(),
            font_size: 24,
            color: "#FFFFFF".to_string(),
            stroke_color: "#000000".to_string(),
            stroke_width: 3,
            position: "middle".to_string(),
            opacity: 1.0,
        }
    }

    #[test]
    fn to_ass_color_white_opaque() {
        assert_eq!(to_ass_color("#FFFFFF", 1.0), "&H00FFFFFF");
    }

    #[test]
    fn to_ass_color_red() {
        // #FF0000 → BGR 00 00 FF
        assert_eq!(to_ass_color("#FF0000", 1.0), "&H000000FF");
    }

    #[test]
    fn to_ass_color_with_half_opacity() {
        // 50% → alpha 0x80
        assert_eq!(to_ass_color("#FFFFFF", 0.5), "&H80FFFFFF");
    }

    #[test]
    fn to_ass_color_handles_missing_hash() {
        assert_eq!(to_ass_color("FFFFFF", 1.0), "&H00FFFFFF");
    }

    #[test]
    fn to_ass_color_invalid_returns_default() {
        assert_eq!(to_ass_color("not-a-color", 1.0), "&H00FFFFFF");
    }

    #[test]
    fn to_ass_time_formats_correctly() {
        assert_eq!(to_ass_time(0.0), "0:00:00.00");
        assert_eq!(to_ass_time(1.5), "0:00:01.50");
        assert_eq!(to_ass_time(65.25), "0:01:05.25");
        assert_eq!(to_ass_time(3661.123), "1:01:01.12");
    }

    #[test]
    fn to_ass_time_clamps_negative() {
        assert_eq!(to_ass_time(-5.0), "0:00:00.00");
    }

    #[test]
    fn to_srt_time_formats_correctly() {
        assert_eq!(to_srt_time(0.0), "00:00:00,000");
        assert_eq!(to_srt_time(2.0), "00:00:02,000");
    }

    #[test]
    fn serialize_ass_style_has_all_23_fields() {
        let out = serialize_ass_style(&default_style());
        let fields: Vec<&str> = out.split(',').collect();
        assert_eq!(fields.len(), 23, "expected 23 fields, got {}: {}", fields.len(), out);
        assert_eq!(fields[0], "Style: default");
    }

    #[test]
    fn serialize_ass_style_maps_position() {
        for (pos, expected) in [("top", "8"), ("middle", "5"), ("bottom", "2")] {
            let s = SubtitleStyle {
                position: pos.to_string(),
                ..default_style()
            };
            let out = serialize_ass_style(&s);
            assert!(out.contains(&format!(",{},", expected)), "pos={} out={}", pos, out);
        }
    }

    #[test]
    fn serialize_ass_dialogue_includes_timestamps_and_text() {
        let cue = SubtitleCue {
            id: "1".to_string(),
            start_secs: 0.0,
            end_secs: 3.5,
            text: "Hello world".to_string(),
            style_id: "douyin-default".to_string(),
        };
        let out = serialize_ass_dialogue(&cue, "Default");
        assert_eq!(out, "Dialogue: 0,0:00:00.00,0:00:03.50,douyin-default,,0,0,0,,Hello world");
    }

    #[test]
    fn serialize_ass_dialogue_falls_back_to_default_style() {
        let cue = SubtitleCue {
            id: "1".to_string(),
            start_secs: 0.0,
            end_secs: 1.0,
            text: "hi".to_string(),
            style_id: "".to_string(),
        };
        let out = serialize_ass_dialogue(&cue, "fallback");
        assert!(out.contains(",fallback,"), "got: {}", out);
    }

    #[test]
    fn serialize_ass_dialogue_converts_newlines() {
        let cue = SubtitleCue {
            id: "1".to_string(),
            start_secs: 0.0,
            end_secs: 1.0,
            text: "line1\nline2".to_string(),
            style_id: "d".to_string(),
        };
        let out = serialize_ass_dialogue(&cue, "d");
        assert!(out.contains("line1\\Nline2"), "got: {}", out);
    }

    fn sample_track() -> SubtitleTrack {
        SubtitleTrack {
            cues: vec![
                SubtitleCue {
                    id: "1".to_string(),
                    start_secs: 0.0,
                    end_secs: 2.0,
                    text: "第一句".to_string(),
                    style_id: "default".to_string(),
                },
                SubtitleCue {
                    id: "2".to_string(),
                    start_secs: 2.0,
                    end_secs: 4.5,
                    text: "第二句".to_string(),
                    style_id: "default".to_string(),
                },
            ],
            styles: vec![default_style()],
        }
    }

    #[test]
    fn build_ass_file_contains_three_sections() {
        let out = build_ass_file(&sample_track(), AssBuildOptions::default());
        assert!(out.contains("[Script Info]"));
        assert!(out.contains("[V4+ Styles]"));
        assert!(out.contains("[Events]"));
    }

    #[test]
    fn build_ass_file_emits_play_res_from_options() {
        let opts = AssBuildOptions {
            width: 1080,
            height: 1920,
            ..Default::default()
        };
        let out = build_ass_file(&sample_track(), opts);
        assert!(out.contains("PlayResX: 1080"));
        assert!(out.contains("PlayResY: 1920"));
    }

    #[test]
    fn build_ass_file_emits_one_dialogue_per_cue() {
        let out = build_ass_file(&sample_track(), AssBuildOptions::default());
        let dialogue_count = out.lines().filter(|l| l.starts_with("Dialogue:")).count();
        assert_eq!(dialogue_count, 2);
    }

    #[test]
    fn build_ass_file_falls_back_to_first_style_when_no_default() {
        let opts = AssBuildOptions {
            default_style_id: "".to_string(),
            ..Default::default()
        };
        let out = build_ass_file(&sample_track(), opts);
        let dialogue_lines: Vec<&str> = out.lines().filter(|l| l.starts_with("Dialogue:")).collect();
        assert!(dialogue_lines[0].contains(",default,"));
    }

    #[test]
    fn build_srt_file_numbers_cues_sequentially() {
        let out = build_srt_file(&sample_track());
        assert!(out.starts_with("1\n"));
        assert!(out.contains("\n\n2\n"));
    }
}
