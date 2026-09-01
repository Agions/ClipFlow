// Get audio/video file duration via ffprobe

use crate::binary::ffprobe_binary;
use tokio::process::Command as TokioCommand;


pub async fn get_audio_duration(audio_path: String) -> Result<f64, String> {
    let ffprobe_bin = ffprobe_binary();

    let output = TokioCommand::new(&ffprobe_bin)
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            &audio_path,
        ])
        .output()
        .await
        .map_err(|e| format!("ffprobe failed: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let duration_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    duration_str.parse::<f64>()
        .map_err(|e| format!("failed to parse duration '{duration_str}': {e}"))
}
