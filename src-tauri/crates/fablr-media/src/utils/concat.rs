//! FFmpeg concat file utilities

use super::time::chrono_like_timestamp;

/// Write an FFmpeg concat file and return the path.
/// The file is written to std::env::temp_dir() with a unique name.
/// Caller is responsible for cleanup.
pub fn write_concat_file(entries: &[impl AsRef<std::path::Path>]) -> Result<std::path::PathBuf, String> {
    let concat_file = std::env::temp_dir()
        .join(format!("concat_{}.txt", chrono_like_timestamp()));

    let content = entries
        .iter()
        .map(|p| {
            let escaped = p.as_ref().to_string_lossy().replace('\'', "'\\''");
            format!("file '{}'", escaped)
        })
        .collect::<Vec<_>>()
        .join("\n");

    std::fs::write(&concat_file, content)
        .map_err(|e| format!("写入 concat 文件失败: {}", e))?;

    Ok(concat_file)
}