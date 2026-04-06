//! Whisper-based subtitle transcription module.
//!
//! Uses faster-whisper (Python) as the primary engine via subprocess,
//! with graceful fallback handling when the Python environment is unavailable.

use anyhow::Context;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use tauri::Emitter;

// ============================================
// Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleSegment {
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleResult {
    pub language: String,
    pub language_probability: f32,
    pub duration_ms: u64,
    pub segments: Vec<SubtitleSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhisperModelInfo {
    pub name: String,
    pub size: String,
    pub is_downloaded: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeProgress {
    pub stage: String,
    pub progress: f32,
    pub current_segment: Option<u32>,
    pub total_segments: Option<u32>,
}

// ============================================
// Model management
// ============================================

/// Returns the default model directory (~/.cache/whisper)
fn whisper_cache_dir() -> std::path::PathBuf {
    dirs::cache_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("whisper")
}

/// Lists available/found whisper models
#[tauri::command]
pub fn list_whisper_models() -> Vec<WhisperModelInfo> {
    let cache_dir = whisper_cache_dir();
    let known = vec![
        ("tiny", "39M", "tiny.en", "tiny"),
        ("base", "74M", "base.en", "base"),
        ("small", "244M", "small.en", "small"),
        ("medium", "769M", "medium.en", "medium"),
        ("large-v1", "1550M", "large-v1", "large-v1"),
        ("large-v2", "1550M", "large-v2", "large-v2"),
        ("large-v3", "1550M", "large-v3", "large-v3"),
        ("distil-large-v2", "820M", "distil-large-v2", "distil-large-v2"),
        ("distil-medium.en", "448M", "distil-medium.en", "distil-medium.en"),
        ("distil-small.en", "140M", "distil-small.en", "distil-small.en"),
    ];

    known
        .into_iter()
        .map(|(name, size, file, _)| {
            let path = cache_dir.join(file);
            WhisperModelInfo {
                name: name.to_string(),
                size: size.to_string(),
                is_downloaded: path.exists(),
                path: path.exists().then(|| path.to_string_lossy().to_string()),
            }
        })
        .collect()
}

/// Check if faster-whisper Python package is available
#[tauri::command]
pub fn check_faster_whisper() -> Result<bool, String> {
    let output = Command::new("python3")
        .arg("-c")
        .arg("import faster_whisper; print(faster_whisper.__version__)")
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let version = String::from_utf8_lossy(&result.stdout).trim().to_string();
            log::info!("[CutDeck] faster-whisper version: {}", version);
            Ok(true)
        }
        _ => {
            log::warn!("[CutDeck] faster-whisper not installed");
            Ok(false)
        }
    }
}

/// Download a whisper model (placeholder — faster-whisper auto-downloads on first use)
#[tauri::command]
pub async fn download_whisper_model(model_size: String) -> Result<String, String> {
    log::info!("[CutDeck] Model download requested: {}", model_size);

    // faster-whisper auto-downloads models on first use
    // Trigger a small test to kick off the download
    let model_arg = model_size.clone();
    let output = tokio::process::Command::new("python3")
        .arg("-c")
        .arg(format!(
            "from faster_whisper import WhisperModel; m = WhisperModel('{}', device='cpu', compute_type='int8'); del m; print('ok')",
            model_arg
        ))
        .output()
        .await
        .map_err(|e| format!("启动下载进程失败: {e}"))?;

    if output.status.success() {
        Ok(format!("模型 {} 下载完成", model_size))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("模型下载失败: {}", stderr))
    }
}

// ============================================
// Audio extraction helper
// ============================================

/// Extract audio from video file to a temporary WAV (16kHz mono) for whisper
fn extract_audio_to_wav(video_path: &str, output_wav: &Path) -> Result<(), String> {
    let ffmpeg = resolve_binary_path("ffmpeg");
    let output = Command::new(&ffmpeg)
        .args([
            "-y",                      // overwrite
            "-i", video_path,          // input
            "-vn",                     // no video
            "-acodec", "pcm_s16le",   // 16-bit PCM
            "-ar", "16000",            // 16kHz sample rate
            "-ac", "1",                // mono
            "-f", "wav",               // WAV format
            output_wav.to_str().unwrap_or(""),
        ])
        .output()
        .map_err(|e| format!("运行 ffmpeg 提取音频失败: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ffmpeg 音频提取失败: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(())
}

fn resolve_binary_path(binary_name: &str) -> String {
    let env_key = format!("CUTDECK_{}_PATH", binary_name.to_uppercase());
    if let Ok(path) = std::env::var(&env_key) {
        if !path.trim().is_empty() && std::path::Path::new(&path).exists() {
            return path;
        }
    }

    if binary_name == "ffprobe" {
        if let Ok(ffmpeg_path) = std::env::var("CUTDECK_FFMPEG_PATH") {
            let ffmpeg = std::path::PathBuf::from(ffmpeg_path);
            if let Some(parent) = ffmpeg.parent() {
                let probe = parent.join("ffprobe");
                if probe.exists() {
                    return probe.to_string_lossy().to_string();
                }
            }
        }
    }

    let common_dirs = [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
    ];
    for dir in &common_dirs {
        let candidate = std::path::Path::new(dir).join(binary_name);
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }

    binary_name.to_string()
}

// ============================================
// Main transcription command
// ============================================

/// Transcribe audio using faster-whisper
///
/// Model sizes: tiny, base, small, medium, large-v2, large-v3, distil-whisper variants
#[tauri::command]
pub async fn transcribe_audio(
    app: tauri::AppHandle,
    audio_path: String,
    model_size: Option<String>,
    language: Option<String>,
) -> Result<SubtitleResult, String> {
    let model = model_size.unwrap_or_else(|| "base".to_string());
    let lang = language.unwrap_or_else(|| "auto".to_string());

    log::info!(
        "[CutDeck] Starting transcription: path={}, model={}, lang={}",
        audio_path,
        model,
        lang
    );

    // Emit initial progress
    let _ = app.emit("whisper-progress", TranscribeProgress {
        stage: "正在准备音频...".to_string(),
        progress: 0.05,
        current_segment: None,
        total_segments: None,
    });

    // Determine input: if it's a video, extract audio first
    let input_ext = std::path::Path::new(&audio_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let audio_exts = ["wav", "mp3", "m4a", "flac", "ogg", "aac", "wma"];
    let temp_wav: Option<std::path::PathBuf> =
        if !audio_exts.contains(&input_ext.as_str()) {
            // It's a video file — extract audio
            let wav_path = std::env::temp_dir().join(format!(
                "cutdeck_whisper_{}.wav",
                std::process::id()
            ));
            extract_audio_to_wav(&audio_path, &wav_path)
                .map_err(|e| format!("音频提取失败: {e}"))?;
            Some(wav_path)
        } else {
            None
        };

    let final_audio_path = temp_wav
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| audio_path.clone());

    // Emit progress: audio ready
    let _ = app.emit("whisper-progress", TranscribeProgress {
        stage: "正在加载 Whisper 模型...".to_string(),
        progress: 0.15,
        current_segment: None,
        total_segments: None,
    });

    // Build faster-whisper Python command
    let lang_arg = if lang == "auto" {
        "None".to_string()
    } else {
        format!("'{lang}'")
    };

    let python_code = format!(
        r#"
import sys
import json
from faster_whisper import WhisperModel

model_size = "{model}"
device = "cpu"
compute_type = "int8"

# Use CUDA if available (better performance)
try:
    import torch
    if torch.cuda.is_available():
        device = "cuda"
        compute_type = "float16"
        print("Using CUDA", file=sys.stderr)
except ImportError:
    pass

model = WhisperModel(model_size, device=device, compute_type=compute_type)

segments, info = model.transcribe(
    "{audio}",
    language={lang_arg},
    word_timestamps=True,
    vad_filter=True,
    vad_parameters={{"min_silence_duration_ms": 500}},
)

lang = info.language or "unknown"
lang_prob = info.language_probability or 0.0
duration = info.duration or 0.0

result = {{
    "language": lang,
    "language_probability": lang_prob,
    "duration_ms": int(duration * 1000),
    "segments": []
}}

for seg in segments:
    result["segments"].append({{
        "start_ms": int(seg.start * 1000),
        "end_ms": int(seg.end * 1000),
        "text": seg.text.strip()
    }})

print(json.dumps(result, ensure_ascii=False))
"#,
        model = model,
        audio = final_audio_path.replace('\\', "\\\\").replace('"', "\\\""),
        lang_arg = lang_arg
    );

    let _ = app.emit("whisper-progress", TranscribeProgress {
        stage: format!("Whisper {} 模型推理中...", model),
        progress: 0.25,
        current_segment: None,
        total_segments: None,
    });

    let output = tokio::process::Command::new("python3")
        .arg("-c")
        .arg(&python_code)
        .output()
        .await
        .map_err(|e| format!("执行 faster-whisper 失败: {e}"))?;

    // Cleanup temp wav
    if let Some(ref wav) = temp_wav {
        let _ = std::fs::remove_file(wav);
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::error!("[CutDeck] Whisper transcription failed: {}", stderr);

        // Provide helpful error message
        if stderr.contains("No module named") || stderr.contains("ModuleNotFoundError") {
            return Err("faster-whisper 未安装。请运行: pip install faster-whisper".to_string());
        }
        if stderr.contains("model not found") || stderr.contains("download") {
            return Err(format!(
                "Whisper {} 模型未找到，faster-whisper 会自动下载。错误: {}",
                model, stderr
            ));
        }
        return Err(format!("Whisper 转录失败: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: SubtitleResult = serde_json::from_str(&stdout)
        .map_err(|e| format!("解析 Whisper 输出失败: {e}"))?;

    let seg_count = result.segments.len();
    log::info!(
        "[CutDeck] Transcription complete: {} segments, lang={} ({:.2})",
        seg_count,
        result.language,
        result.language_probability
    );

    // Emit completion
    let _ = app.emit("whisper-progress", TranscribeProgress {
        stage: "转录完成".to_string(),
        progress: 1.0,
        current_segment: Some(seg_count as u32),
        total_segments: Some(seg_count as u32),
    });

    Ok(result)
}

/// Get supported languages for whisper transcription
#[tauri::command]
pub fn get_whisper_supported_languages() -> Vec<serde_json::Value> {
    // Common languages supported by Whisper
    vec![
        serde_json::json!({"code": "auto", "name": "自动检测"}),
        serde_json::json!({"code": "zh", "name": "中文"}),
        serde_json::json!({"code": "en", "name": "英语"}),
        serde_json::json!({"code": "ja", "name": "日语"}),
        serde_json::json!({"code": "ko", "name": "韩语"}),
        serde_json::json!({"code": "fr", "name": "法语"}),
        serde_json::json!({"code": "de", "name": "德语"}),
        serde_json::json!({"code": "es", "name": "西班牙语"}),
        serde_json::json!({"code": "pt", "name": "葡萄牙语"}),
        serde_json::json!({"code": "it", "name": "意大利语"}),
        serde_json::json!({"code": "ru", "name": "俄语"}),
        serde_json::json!({"code": "ar", "name": "阿拉伯语"}),
        serde_json::json!({"code": "hi", "name": "印地语"}),
        serde_json::json!({"code": "id", "name": "印尼语"}),
        serde_json::json!({"code": "ms", "name": "马来语"}),
        serde_json::json!({"code": "th", "name": "泰语"}),
        serde_json::json!({"code": "vi", "name": "越南语"}),
    ]
}
