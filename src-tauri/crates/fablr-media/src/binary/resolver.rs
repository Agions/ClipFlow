//! Binary path resolution — finds external executables in PATH or common locations

use std::path::{Path, PathBuf};

/// Resolve a binary path, checking env vars, PATH, and common system directories.
pub fn resolve_binary_path(binary_name: &str) -> String {
    if binary_name.is_empty() {
        return binary_name.to_string();
    }
    let env_key = format!("CUTDECK_{}_PATH", binary_name.to_uppercase());
    if let Ok(path) = std::env::var(&env_key) {
        if !path.trim().is_empty() && Path::new(&path).exists() {
            return path;
        }
    }

    if binary_name == "ffprobe" {
        if let Ok(ffmpeg_path) = std::env::var("CUTDECK_FFMPEG_PATH") {
            let ffmpeg = PathBuf::from(ffmpeg_path);
            if let Some(parent) = ffmpeg.parent() {
                let probe = parent.join("ffprobe");
                if probe.exists() {
                    return probe.display().to_string();
                }
            }
        }
    }

    // Search PATH directories
    if let Some(path_var) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(binary_name);
            if candidate.exists() {
                return candidate.display().to_string();
            }
        }
    }

    // Fallback to common system directories
    let common_dirs = [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/snap/bin",
        "/home/linuxbrew/.linuxbrew/bin",
    ];
    for dir in common_dirs {
        let candidate = Path::new(dir).join(binary_name);
        if candidate.exists() {
            return candidate.display().to_string();
        }
    }

    binary_name.to_string()
}

pub fn ffmpeg_binary() -> String { resolve_binary_path("ffmpeg") }
pub fn ffprobe_binary() -> String { resolve_binary_path("ffprobe") }