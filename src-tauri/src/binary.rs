use std::path::{Path, PathBuf};

pub(crate) fn resolve_binary_path(binary_name: &str) -> String {
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
                    return probe.to_string_lossy().to_string();
                }
            }
        }
    }

    let common_dirs = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    for dir in common_dirs {
        let candidate = Path::new(dir).join(binary_name);
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }

    binary_name.to_string()
}

pub(crate) fn ffmpeg_binary() -> String {
    resolve_binary_path("ffmpeg")
}

pub(crate) fn ffprobe_binary() -> String {
    resolve_binary_path("ffprobe")
}
