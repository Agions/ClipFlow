//! Subtitle burn-in — converts SRT/VTT and burns subtitles into video.
//! Dedicated module so the logic is testable and reusable.

use crate::binary::ffmpeg_binary;
use crate::utils::cmd_err;
use std::path::Path;
use std::process::Command;

/// Normalizes a subtitle file to UTF-8 SRT format, which FFmpeg's subtitles filter
/// handles most reliably. Returns the path to the normalized file (may be the
/// same as input if no conversion needed).
///
/// Supported input formats: .srt, .vtt, .ass/.ssa (basic support).
pub fn normalize_subtitle_file(sub_path: &str, temp_dir: &std::path::Path) -> Result<String, String> {
    let path = Path::new(sub_path);
    if !path.exists() {
        return Err(format!("字幕文件不存在: {}", sub_path));
    }

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");

    // If already .srt, just validate and return the path
    if ext.eq_ignore_ascii_case("srt") {
        return Ok(sub_path.to_string());
    }

    // Convert to SRT via FFmpeg
    let output = temp_dir.join(format!("subtitles_normalized.{}.srt", std::process::id()));
    let output_str = output.to_string_lossy().to_string();

    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y")
        .arg("-i").arg(sub_path)
        .arg(output_str.clone());

    let result = cmd.output().map_err(|e| format!("字幕格式转换失败: {}", e))?;
    if !result.status.success() {
        // Try to provide useful error
        let stderr = String::from_utf8_lossy(&result.stderr);
        tracing::warn!("Subtitle conversion stderr: {}", stderr);
        // Fall back to original file
        return Ok(sub_path.to_string());
    }

    Ok(output_str)
}

/// Burns subtitles into a video using FFmpeg's subtitles filter.
/// The subtitle file should be normalized to SRT format first.
///
/// # Arguments
/// * `input_path` — Source video
/// * `output_path` — Destination with burned-in subtitles
/// * `sub_path` — Path to SRT subtitle file
/// * `style` — Optional style overrides (font, fontsize, primaryColour, etc.)
pub fn burn_subtitles(
    input_path: &str,
    output_path: &str,
    sub_path: &str,
    style: Option<&SubtitleStyle>,
) -> Result<(), String> {
    let mut cmd = Command::new(ffmpeg_binary());
    cmd.arg("-y")
        .arg("-i").arg(input_path);

    // Build subtitles filter with optional style
    let filter = build_subtitle_filter(sub_path, style);
    cmd.arg("-vf").arg(&filter);

    // Use HW-accelerated video encoder for output
    let enc = crate::binary::hw_accel();
    let enc_str = if enc == crate::binary::HwAccel::Cpu {
        "libx264".to_string()
    } else {
        enc.h264_encoder().to_string()
    };
    cmd.args(["-c:v", &enc_str, "-preset", "fast", "-crf", "23"]);
    cmd.args(["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]);
    cmd.arg(output_path);

    let output = cmd.output().map_err(|e| format!("字幕烧入失败: {}", e))?;
    if !output.status.success() {
        return Err(cmd_err("字幕烧入失败", &output));
    }
    Ok(())
}

/// Builds the FFmpeg subtitles filter graph.
/// Handles path escaping for the filename= option.
pub fn build_subtitle_filter(sub_path: &str, style: Option<&SubtitleStyle>) -> String {
    // FFmpeg's filename= option requires the path to be escaped for special chars
    // Use the simpler form: subtitles=filename='path' when no style needed
    // and force_style when style is provided
    let escaped = sub_path.replace('\\', "\\\\").replace('\'', "\\'");

    match style {
        Some(s) => {
            let mut opts = format!("filename='{}'", escaped);
            if let Some(font) = &s.font {
                opts.push_str(&format!(",FontName={}", font));
            }
            if let Some(size) = s.fontsize {
                opts.push_str(&format!(",FontSize={}", size));
            }
            if let Some(color) = &s.primary_colour {
                opts.push_str(&format!(",PrimaryColour={}", color));
            }
            if let Some(bg) = &s.back_colour {
                opts.push_str(&format!(",BackColour={}", bg));
            }
            if let Some(bold) = s.bold {
                if bold { opts.push_str(",Bold=1"); }
            }
            if let Some(italic) = s.italic {
                if italic { opts.push_str(",Italic=1"); }
            }
            opts.push_str(",ForceStyle=1");
            format!("subtitles={}", opts)
        }
        None => format!("subtitles=filename='{}'", escaped),
    }
}

/// Style options for subtitle burn-in.
#[derive(Debug, Default, Clone)]
pub struct SubtitleStyle {
    pub font: Option<String>,
    pub fontsize: Option<i32>,
    /// ASS colour format (e.g., "&H00FFFFFF" for white)
    pub primary_colour: Option<String>,
    pub back_colour: Option<String>,
    pub bold: Option<bool>,
    pub italic: Option<bool>,
}

/// Builder for subtitle burn-in operations.
pub struct SubtitleBurninBuilder<'a> {
    input_path: &'a str,
    output_path: &'a str,
    sub_path: &'a str,
    style: Option<SubtitleStyle>,
}

impl<'a> SubtitleBurninBuilder<'a> {
    pub fn new(input_path: &'a str, output_path: &'a str, sub_path: &'a str) -> Self {
        Self {
            input_path,
            output_path,
            sub_path,
            style: None,
        }
    }

    pub fn style(mut self, style: SubtitleStyle) -> Self {
        self.style = Some(style);
        self
    }

    pub fn build(self) -> Result<(), String> {
        let mut cmd = Command::new(ffmpeg_binary());
        cmd.arg("-y")
            .arg("-i").arg(self.input_path);

        let filter = build_subtitle_filter(self.sub_path, self.style.as_ref());
        cmd.arg("-vf").arg(&filter);

        let enc = crate::binary::hw_accel();
        let enc_str = if enc == crate::binary::HwAccel::Cpu {
            "libx264".to_string()
        } else {
            enc.h264_encoder().to_string()
        };
        cmd.args(["-c:v", &enc_str, "-preset", "fast", "-crf", "23"]);
        cmd.args(["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]);
        cmd.arg(self.output_path);

        let output = cmd.output().map_err(|e| format!("字幕烧入失败: {}", e))?;
        if !output.status.success() {
            return Err(cmd_err("字幕烧入失败", &output));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subtitle_filter_no_style() {
        let filter = build_subtitle_filter("/path/to/subs.srt", None);
        assert_eq!(filter, "subtitles=filename='/path/to/subs.srt'");
    }

    #[test]
    fn test_subtitle_filter_with_style() {
        let style = SubtitleStyle {
            font: Some("Arial".to_string()),
            fontsize: Some(24),
            primary_colour: Some("&H00FFFFFF".to_string()),
            bold: Some(true),
            ..Default::default()
        };
        let filter = build_subtitle_filter("/path/to/subs.srt", Some(&style));
        assert!(filter.contains("FontName=Arial"));
        assert!(filter.contains("FontSize=24"));
        assert!(filter.contains("PrimaryColour=&H00FFFFFF"));
        assert!(filter.contains("Bold=1"));
        assert!(filter.contains("ForceStyle=1"));
    }

    #[test]
    fn test_subtitle_filter_escapes_single_quotes() {
        let filter = build_subtitle_filter("/path/with'apostrophe.srt", None);
        assert!(filter.contains("\\'"));
    }
}
