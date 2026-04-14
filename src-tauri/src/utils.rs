use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn parse_fraction(value: &str) -> f64 {
    if let Some((num, den)) = value.split_once('/') {
        let n = num.parse::<f64>().unwrap_or(0.0);
        let d = den.parse::<f64>().unwrap_or(1.0);
        if d.abs() > f64::EPSILON {
            return n / d;
        }
        return 0.0;
    }
    value.parse::<f64>().unwrap_or(0.0)
}

pub(crate) fn chrono_like_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub(crate) fn format_srt_time(seconds: f64) -> String {
    let total_ms = (seconds * 1000.0).round() as u64;
    let hours = total_ms / 3_600_000;
    let minutes = (total_ms % 3_600_000) / 60_000;
    let secs = (total_ms % 60_000) / 1000;
    let millis = total_ms % 1000;
    format!("{:02}:{:02}:{:02},{:03}", hours, minutes, secs, millis)
}
