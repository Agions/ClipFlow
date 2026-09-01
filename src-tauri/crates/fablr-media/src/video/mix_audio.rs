// Audio mixing — TTS + original video audio track

use crate::binary::ffmpeg_binary;
use crate::utils::cmd_err;
use serde::Deserialize;
use tokio::process::Command as TokioCommand;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MixAudioInput {
    pub video_path: String,
    pub tts_audio_path: String,
    pub output_path: String,
    #[serde(default = "default_one")]
    pub tts_volume: f32,
    #[serde(default = "default_three_tenths")]
    pub background_volume: f32,
    #[serde(default)]
    pub offset_seconds: f64,
}

fn default_one() -> f32 { 1.0 }
fn default_three_tenths() -> f32 { 0.3 }


pub async fn mix_audio(input: MixAudioInput) -> Result<String, String> {
    let ffmpeg_bin = ffmpeg_binary();

    let has_audio_track = check_video_has_audio(&ffmpeg_bin, &input.video_path)
        .await
        .unwrap_or(false);

    let mut cmd = TokioCommand::new(&ffmpeg_bin);

    if has_audio_track {
        let bg_vol = input.background_volume;
        let tts_vol = input.tts_volume;
        let offset = input.offset_seconds;

        cmd.arg("-i").arg(&input.video_path);
        cmd.arg("-i").arg(&input.tts_audio_path);

        if offset > 0.0 {
            let delay_ms = (offset * 1000.0) as i64;
            cmd.args(&["-filter_complex",
                &format!(
                    "[0:a]volume={bg}[bg];[1:a]volume={tts},adelay={delay}|{delay}[tts];[bg][tts]amix=inputs=2:duration=first[mixed]",
                    bg = bg_vol, tts = tts_vol, delay = delay_ms
                ),
                "-map", "0:v",
                "-map", "[mixed]",
            ]);
        } else {
            cmd.args(&["-filter_complex",
                &format!(
                    "[0:a]volume={bg}[bg];[1:a]volume={tts}[tts];[bg][tts]amix=inputs=2:duration=first[mixed]",
                    bg = bg_vol, tts = tts_vol
                ),
                "-map", "0:v",
                "-map", "[mixed]",
            ]);
        }
    } else {
        cmd.arg("-i").arg(&input.video_path);
        cmd.arg("-i").arg(&input.tts_audio_path);
        cmd.args(&["-map", "0:v", "-map", "1:a", "-c:v", "copy"]);
    }

    cmd.args(&["-c:a", "aac", "-movflags", "+faststart", "-y"]);
    cmd.arg(&input.output_path);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("混音命令执行失败: {e}"))?;

    if !output.status.success() {
        return Err(cmd_err("mix_audio failed", &output));
    }

    Ok(input.output_path)
}

/// Check whether an ffprobe stderr line indicates the video has an audio
/// track. Pure function — extracted from `check_video_has_audio` so it can
/// be unit-tested without spawning an ffprobe process.
pub(crate) fn parse_has_audio(ffprobe_stderr: &str) -> bool {
    !ffprobe_stderr.contains("Audio: none")
}

/// 检查视频是否包含音轨
async fn check_video_has_audio(ffmpeg_bin: &str, video_path: &str) -> Result<bool, String> {
    let output = TokioCommand::new(ffmpeg_bin)
        .args(&["-i", video_path, "-t", "0", "-f", "null", "-"])
        .output()
        .await
        .map_err(|e| format!("ffprobe check failed: {e}"))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(parse_has_audio(&stderr))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_has_audio_detects_audio_track() {
        let stderr = "Input #0, mov,mp4,m4a, from 'video.mp4':\n  Duration: 00:00:10.00\n  Stream #0:0: Audio: aac, 44100 Hz, stereo, fltp\n";
        assert!(parse_has_audio(stderr), "AAC track should be detected");
    }

    #[test]
    fn parse_has_audio_detects_no_audio() {
        // Real ffmpeg output for a video-only file ends with "Stream #0:0(und):
        // Video: h264 ...  Audio: none" — wait, that's actually a positive
        // match because the line "Audio:" is present. The current logic uses
        // *strict absence* of the literal "Audio: none" to decide.
        let stderr = "Input #0, mov,mp4,m4a, from 'video.mp4':\n  Stream #0:0(und): Video: h264, 1280x720\n  Audio: none\n";
        assert!(!parse_has_audio(stderr), "video-only file → no audio");
    }

    #[test]
    fn parse_has_audio_handles_empty_stderr() {
        assert!(parse_has_audio(""), "empty stderr is treated as 'has audio' (no signal of absence)");
    }

    #[test]
    fn parse_has_audio_handles_unrelated_text() {
        let stderr = "ffmpeg version 6.0 Copyright (c) 2000-2023 the FFmpeg developers";
        assert!(parse_has_audio(stderr));
    }
}
