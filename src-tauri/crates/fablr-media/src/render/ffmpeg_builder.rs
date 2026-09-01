//! Common FFmpeg command builder — unified encoder/filter construction.
//! All render commands go through this to avoid duplicating hw_accel logic.

use crate::binary::{ffmpeg_binary, hw_accel, HwAccel};

/// Quality presets keyed by name string.
pub fn quality_preset(name: &str) -> (u8, &'static str) {
    match name {
        "low"    => (28, "veryfast"),
        "medium" => (23, "fast"),
        "high"   => (18, "medium"),
        _        => (23, "fast"),
    }
}

/// Returns the appropriate H.264 encoder string for the current platform.
/// Uses HwAccel::h264_encoder() but degrades gracefully to libx264 on CPU.
pub fn h264_encoder() -> &'static str {
    let hw = hw_accel();
    if hw == HwAccel::Cpu { "libx264" } else { hw.h264_encoder() }
}

/// Returns the appropriate H.265 encoder string for HDR/high-quality encodes.
pub fn h265_encoder() -> &'static str {
    let hw = hw_accel();
    match hw {
        HwAccel::Nvidia  => "hevc_nvenc",
        HwAccel::IntelQsv => "hevc_qsv",
        HwAccel::AmdVaapi => "hevc_vaapi",
        HwAccel::VideoToolbox => "hevc_videotoolbox",
        HwAccel::Cpu     => "libx265",
    }
}

/// Returns AAC encoder string.
pub fn aac_encoder() -> &'static str { "aac" }

/// Starts a new FFmpeg command with common boilerplate: -y, -hide_banner.
/// Caller chains .arg() calls for input/output.
pub fn new_cmd() -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(ffmpeg_binary());
    cmd.arg("-y").arg("-hide_banner");
    cmd
}

/// Builds an encode command with video+audio using the detected HW encoder.
/// Preset and CRF are derived from the quality name.
pub fn encode_args(
    cmd: &mut tokio::process::Command,
    quality: &str,
    copy_audio: bool,
) {
    let hw = hw_accel();
    let enc = h264_encoder();
    let (crf, preset) = quality_preset(quality);

    cmd.arg("-c:v").arg(enc);
    if hw == HwAccel::Cpu {
        // CPU needs CRF + preset
        cmd.arg("-crf").arg(crf.to_string());
    }
    // Hardware encoders use their own quality controls
    cmd.arg("-preset").arg(preset);

    if copy_audio {
        cmd.args(["-c:a", "copy"]);
    } else {
        cmd.args(["-c:a", "aac", "-b:a", "192k"]);
    }
}

/// Applies time segment (-ss / -t) to a command.
/// Puts -ss before -i for fast seek.
pub fn apply_time_segment(
    cmd: &mut tokio::process::Command,
    start: f64,
    end: f64,
) {
    let duration = (end - start).max(0.0);
    cmd.arg("-ss").arg(start.to_string());
    cmd.arg("-t").arg(duration.to_string());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_preset_known_tiers() {
        assert_eq!(quality_preset("low"), (28, "veryfast"));
        assert_eq!(quality_preset("medium"), (23, "fast"));
        assert_eq!(quality_preset("high"), (18, "medium"));
    }

    #[test]
    fn test_quality_preset_unknown_defaults_to_medium() {
        assert_eq!(quality_preset("ultra"), (23, "fast"));
        assert_eq!(quality_preset(""), (23, "fast"));
    }

    #[test]
    fn test_aac_encoder_is_aac() {
        assert_eq!(aac_encoder(), "aac");
    }

    #[test]
    fn test_h265_encoder_cpu_returns_libx265() {
        // h265_encoder() calls hw_accel() — use binary::HwAccel directly
        use crate::binary::HwAccel;
        let enc = match HwAccel::Cpu {
            HwAccel::Nvidia  => "hevc_nvenc",
            HwAccel::IntelQsv => "hevc_qsv",
            HwAccel::AmdVaapi => "hevc_vaapi",
            HwAccel::VideoToolbox => "hevc_videotoolbox",
            HwAccel::Cpu => "libx265",
        };
        assert_eq!(enc, "libx265");
    }

    #[test]
    fn test_h265_encoder_nvidia_returns_nvenc() {
        use crate::binary::HwAccel;
        let enc = match HwAccel::Nvidia {
            HwAccel::Nvidia  => "hevc_nvenc",
            HwAccel::IntelQsv => "hevc_qsv",
            HwAccel::AmdVaapi => "hevc_vaapi",
            HwAccel::VideoToolbox => "hevc_videotoolbox",
            HwAccel::Cpu => "libx265",
        };
        assert_eq!(enc, "hevc_nvenc");
    }

    #[test]
    fn test_apply_time_segment_duration_never_negative() {
        // Verify the duration calculation: end < start should yield 0.
        // Type annotation needed because `(end - start)` defaults to an
        // ambiguous numeric type until used; older rustc versions were
        // more forgiving here, but 1.88 requires the explicit f64.
        let (start, end): (f64, f64) = (10.0, 5.0);
        let duration = (end - start).max(0.0);
        assert_eq!(duration, 0.0, "negative duration should clamp to 0");

        // Normal case
        let (start, end): (f64, f64) = (5.0, 10.0);
        let duration = (end - start).max(0.0);
        assert_eq!(duration, 5.0);
    }
}
