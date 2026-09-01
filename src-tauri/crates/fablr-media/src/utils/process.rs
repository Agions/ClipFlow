//! Process/command output utilities

/// Extract first line from command output (stdout, fallback to stderr).
pub fn cmd_first_line(out: &std::process::Output) -> Option<String> {
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .next()
        .map(|s| s.to_string())
        .or_else(|| String::from_utf8_lossy(&out.stderr).lines().next().map(|s| s.to_string()))
}

/// Build error string from failed command.
pub fn cmd_err(msg: &str, out: &std::process::Output) -> String {
    format!("{}: {}", msg, String::from_utf8_lossy(&out.stderr))
}

/// Parse FFmpeg scdet stderr output, returning Vec of (time_ms, score).
pub fn parse_scdet_output(stderr: &str) -> Vec<(u64, f32)> {
    let mut scene_changes = Vec::new();
    for line in stderr.lines() {
        if line.contains("[scdet]") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            for (i, part) in parts.iter().enumerate() {
                if *part == "[scdet]" && i + 2 < parts.len() {
                    if let (Ok(time_secs), Ok(score)) = (
                        parts[i + 1].parse::<f64>(),
                        parts[i + 2].parse::<f32>(),
                    ) {
                        scene_changes.push(((time_secs * 1000.0) as u64, score));
                    }
                    break;
                }
            }
        }
    }
    scene_changes
}