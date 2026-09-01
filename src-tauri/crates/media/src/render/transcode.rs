use tauri::{AppHandle, Emitter, State};

use crate::binary::ffmpeg_binary;
use crate::render::ffmpeg_builder::quality_preset;
use models::{ExportVideoInput, TranscodeCropInput};
use crate::utils::{cmd_err, resource_error_to_user_message, ResourceLimiter};

const TRANSCODE_PROGRESS_EVENT: &str = "transcode-with-crop-progress";

/// Builder for FFmpeg transcode commands.
pub struct TranscodeBuilder<'a> {
    input_path: &'a str,
    output_path: &'a str,
    aspect: Option<&'a str>,
    quality: Option<&'a str>,
    start_time: Option<f64>,
    end_time: Option<f64>,
    video_codec: Option<&'a str>,
    crf: Option<u8>,
    audio_codec: Option<&'a str>,
}

impl<'a> TranscodeBuilder<'a> {
    pub fn new(input_path: &'a str, output_path: &'a str) -> Self {
        Self {
            input_path,
            output_path,
            aspect: None,
            quality: None,
            start_time: None,
            end_time: None,
            video_codec: None,
            crf: None,
            audio_codec: None,
        }
    }

    pub fn aspect(mut self, aspect: &'a str) -> Self {
        self.aspect = Some(aspect);
        self
    }

    pub fn quality(mut self, quality: &'a str) -> Self {
        self.quality = Some(quality);
        self
    }

    pub fn time_range(mut self, start: f64, end: f64) -> Self {
        self.start_time = Some(start);
        self.end_time = Some(end);
        self
    }

    pub fn video_codec(mut self, codec: &'a str) -> Self {
        self.video_codec = Some(codec);
        self
    }

    pub fn crf(mut self, crf: u8) -> Self {
        self.crf = Some(crf);
        self
    }

    pub fn audio_codec(mut self, codec: &'a str) -> Self {
        self.audio_codec = Some(codec);
        self
    }

    pub fn build(self) -> Result<(), String> {
        let mut cmd = std::process::Command::new(ffmpeg_binary());
        cmd.arg("-y").arg("-hide_banner");

        if let (Some(s), Some(e)) = (self.start_time, self.end_time) {
            cmd.arg("-ss").arg(s.to_string());
            cmd.arg("-t").arg((e - s).max(0.1).to_string());
        }

        cmd.arg("-i").arg(self.input_path);

        if let Some(aspect) = self.aspect {
            let vf_filter = match aspect {
                "9:16" => "scale=1080:1920:force_original_aspect_ratio=decrease,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1",
                "1:1" => "scale='min(iw\\,ih):min(iw\\,ih)',crop='min(iw\\,ih):min(iw\\,ih)',setsar=1",
                "16:9" => "scale=1920:1080:force_original_aspect_ratio=decrease,crop=1920:1080:(iw-1920)/2:(ih-1080)/2,setsar=1",
                _ => return Err("不支持的宽高比，仅支持 9:16、1:1、16:9".to_string()),
            };
            cmd.arg("-vf").arg(vf_filter);
        }

        let enc = self.video_codec.unwrap_or_else(|| {
            let hw = crate::binary::hw_accel();
            if hw == crate::binary::HwAccel::Cpu { "libx264" } else { hw.h264_encoder() }
        });

        let (crf, preset) = quality_preset(self.quality.unwrap_or("medium"));
        let crf_val = self.crf.unwrap_or(crf);
        cmd.args(["-c:v", enc, "-crf", &crf_val.to_string(), "-preset", preset]);

        let audio = self.audio_codec.unwrap_or("aac");
        cmd.args(["-c:a", audio, "-b:a", "192k", "-movflags", "+faststart"]);
        cmd.arg(self.output_path);

        let output = cmd.output().map_err(|e| format!("FFmpeg 执行失败: {e}"))?;
        if output.status.success() {
            Ok(())
        } else {
            Err(cmd_err("转码失败", &output))
        }
    }
}

/// Tauri event channel for transcode progress. Emits `{ stage, percent }`
/// payloads before/after the blocking ffmpeg invocation. The `spawn_blocking`
/// hop keeps the Tauri main thread and Tokio worker pool responsive while
/// the multi-minute encode runs (see Tauri discussion #10329).

pub async fn transcode_with_crop(
    app: AppHandle,
    limiter: State<'_, ResourceLimiter>,
    input: TranscodeCropInput,
) -> Result<String, String> {
    if input.input_path.trim().is_empty() || input.output_path.trim().is_empty() {
        return Err("输入或输出路径不能为空".to_string());
    }
    // P0-2: reserve a resource permit before doing heavy ffmpeg work.
    // The permit is held for the lifetime of the spawned blocking task and
    // auto-released on drop (success, error, or panic inside the closure).
    let _permit = limiter
        .acquire()
        .await
        .map_err(resource_error_to_user_message)?;
    let aspect = input.aspect.clone();
    let quality = input.quality.clone();

    // Offload the ffmpeg encode to a dedicated blocking thread so the Tauri
    // main thread (and the Tokio worker pool) stay responsive while the
    // multi-minute transcode runs. See Tauri discussion #10329.
    let app_for_emit = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let _ = app_for_emit.emit(
            TRANSCODE_PROGRESS_EVENT,
            serde_json::json!({ "stage": "start", "percent": 0 }),
        );

        let mut cmd = std::process::Command::new(ffmpeg_binary());
        cmd.arg("-y").arg("-hide_banner");
        if let (Some(s), Some(e)) = (input.start_time, input.end_time) {
            cmd.arg("-ss").arg(s.to_string());
            cmd.arg("-t").arg((e - s).max(0.1).to_string());
        }
        cmd.arg("-i").arg(&input.input_path);
        let vf_filter: String = match aspect.as_str() {
            "9:16" => {
                "scale=1080:1920:force_original_aspect_ratio=decrease,crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1".to_string()
            }
            "1:1" => {
                "scale='min(iw\\,ih):min(iw\\,ih)',crop='min(iw\\,ih):min(iw\\,ih)',setsar=1".to_string()
            }
            "16:9" => {
                "scale=1920:1080:force_original_aspect_ratio=decrease,crop=1920:1080:(iw-1920)/2:(ih-1080)/2,setsar=1".to_string()
            }
            _ => return Err("不支持的宽高比，仅支持 9:16、1:1、16:9".to_string()),
        };
        cmd.arg("-vf").arg(&vf_filter);

        use crate::binary::HwAccel;
        let hw = crate::binary::hw_accel();
        let enc = if hw == HwAccel::Cpu { "libx264" } else { hw.h264_encoder() };
        let (crf, preset) = quality_preset(quality.as_deref().unwrap_or("medium"));
        cmd.args(["-c:v", enc, "-crf", &crf.to_string(), "-preset", preset]);
        cmd.args(["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]);
        cmd.arg(&input.output_path);
        let output = cmd.output().map_err(|e| format!("FFmpeg 执行失败: {e}"))?;
        if output.status.success() {
            let _ = app_for_emit.emit(
                TRANSCODE_PROGRESS_EVENT,
                serde_json::json!({ "stage": "done", "percent": 100 }),
            );
            Ok(input.output_path)
        } else {
            Err(cmd_err("裁切导出失败", &output))
        }
    })
    .await
    .map_err(|e| format!("transcode task join error: {e}"))??;

    Ok(result)
}

/// Export video — full-featured video export with optional subtitle burn-in.
/// Returns { output_path, duration, file_size }.

pub async fn export_video(
    limiter: State<'_, ResourceLimiter>,
    input: ExportVideoInput,
) -> Result<ExportVideoResult, String> {
    if input.input_path.trim().is_empty() || input.output_path.trim().is_empty() {
        return Err("输入或输出路径不能为空".to_string());
    }
    // P0-2: reserve a permit for the duration of the export. Released when
    // this future is dropped, which covers both success and error paths.
    let _permit = limiter
        .acquire()
        .await
        .map_err(resource_error_to_user_message)?;

    // Subtitle burn-in path — normalize then delegate to subtitle_burnin module
    let sub_path_normalized = match &input.subtitle_path {
        Some(p) if !p.is_empty() && input.burn_subtitles == Some(true) => {
            Some(crate::render::subtitle_burnin::normalize_subtitle_file(p, &std::env::temp_dir())?)
        }
        _ => None,
    };

    if let Some(ref norm_sub) = sub_path_normalized {
        // Burn subtitles via dedicated module (handles its own FFmpeg invocation)
        crate::render::subtitle_burnin::burn_subtitles(
            &input.input_path,
            &input.output_path,
            norm_sub,
            None,
        )?;
    } else {
        // Plain encode — no subtitles
        let mut cmd = std::process::Command::new(ffmpeg_binary());
        cmd.arg("-y").arg("-hide_banner");
        cmd.arg("-i").arg(&input.input_path);

        use crate::binary::HwAccel;
        let hw = crate::binary::hw_accel();
        let video_codec = match input.video_codec.as_deref() {
            Some("h265") | Some("hevc") => {
                if hw == HwAccel::Cpu { "libx265" } else { hw.hevc_encoder() }
            }
            Some("h264") | None => {
                if hw == HwAccel::Cpu { "libx264" } else { hw.h264_encoder() }
            }
            Some(c) => c,
        };
        let crf = input.crf.unwrap_or(23);
        cmd.args(["-c:v", video_codec, "-crf", &crf.to_string()]);

        let audio_codec = input.audio_codec.as_deref().unwrap_or("aac");
        cmd.args(["-c:a", audio_codec, "-b:a", "192k"]);
        cmd.args(["-movflags", "+faststart"]);
        cmd.arg(&input.output_path);

        let output = cmd.output().map_err(|e| format!("FFmpeg 执行失败: {e}"))?;
        if !output.status.success() {
            return Err(cmd_err("导出失败", &output));
        }
    }

    // Get file size
    let metadata = std::fs::metadata(&input.output_path)
        .map_err(|e| format!("无法读取输出文件元数据: {e}"))?;
    let file_size = metadata.len();

    // Get duration via ffprobe
    let duration = get_duration_of_file(&input.output_path)
        .unwrap_or(0.0);

    Ok(ExportVideoResult {
        output_path: input.output_path,
        duration,
        file_size,
    })
}

fn get_duration_of_file(path: &str) -> Option<f64> {
    // Routed through the in-process metadata cache so repeated probes of the
    // same (unmodified) output file skip the ffprobe process. The cached
    // `duration` is parsed from the same `format=duration` field, so the
    // returned value is identical to the legacy raw-ffprobe probe.
    crate::utils::probe_duration_cached(std::path::Path::new(path)).ok()
}

pub use models::ExportVideoResult;
