//! Utils — shared utility functions
//!
//! Sub-modules:
//!   time.rs         — parse_fraction, chrono_like_timestamp, format_time, format_srt_time
//!   process.rs      — cmd_first_line, cmd_err, parse_scdet_output
//!   concat.rs       — write_concat_file
//!   audio.rs        — pcm_samples_from_wav
//!   panic_hook.rs   — install_panic_hook, panic_payload_to_string
//!   semaphore.rs    — ResourceLimiter, ResourceError

mod audio;
mod concat;
mod error;
mod media_cache;
mod panic_hook;
mod process;
pub mod resilience;
mod semaphore;
mod time;

pub use audio::pcm_samples_from_wav;
pub use concat::write_concat_file;
pub use error::{err_msg, AppResult};
pub use media_cache::{probe_duration_cached, probe_metadata_cached};
pub use panic_hook::install_panic_hook;
pub use process::{cmd_err, cmd_first_line, parse_scdet_output};
pub use semaphore::{
    resource_error_to_user_message, ResourceError, ResourceLimiter,
};
pub use time::{chrono_like_timestamp, format_srt_time, format_time, now_iso8601, parse_fraction};

#[cfg(test)]
mod tests {
    use super::*;

    /// Construct an `ExitStatus` for unit tests. On unix, `from_raw` is
    /// the only stable way to build one from scratch (it is unsafe on
    /// 1.86+). On Windows, the platform doesn't expose `from_raw`, so we
    /// run a real no-op command and borrow its status.
    #[cfg(unix)]
    fn fake_exit_status(code: i32) -> std::process::ExitStatus {
        // SAFETY: building an ExitStatus from a raw integer is only
        // well-defined for the same platform's `process::exit` calling
        // convention. We only ever pass codes 0 and 1 (success / generic
        // failure) which are valid on every supported unix target.
        // No `unsafe { }` block needed: `from_raw` is itself an `unsafe fn`,
        // so the `unsafe`-ness is carried by the call site implicitly under
        // the `unsafe_op_in_unsafe_fn` lint (enabled by default in 2024
        // edition / rustc 1.86+ for this crate's MSRV).
        std::os::unix::process::ExitStatusExt::from_raw(code)
    }

    #[cfg(windows)]
    fn fake_exit_status(code: i32) -> std::process::ExitStatus {
        // Run `cmd /c exit N` to obtain a real ExitStatus. Slow (one
        // process spawn per call) but only used in 4 unit tests.
        std::process::Command::new("cmd")
            .args(["/C", &format!("exit {code}")])
            .output()
            .expect("failed to spawn cmd")
            .status
    }

    #[test]
    fn test_parse_fraction_float() {
        assert!((parse_fraction("0.5") - 0.5).abs() < 1e-9);
        assert!((parse_fraction("1.0") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_parse_fraction_ratio() {
        assert!((parse_fraction("1/2") - 0.5).abs() < 1e-9);
        assert!((parse_fraction("3/4") - 0.75).abs() < 1e-9);
    }

    #[test]
    fn test_parse_fraction_zero_denominator() {
        assert_eq!(parse_fraction("1/0"), 0.0);
    }

    #[test]
    fn test_parse_fraction_invalid() {
        assert_eq!(parse_fraction(""), 0.0);
        assert_eq!(parse_fraction("abc"), 0.0);
    }

    #[test]
    fn test_format_srt_time_basic() {
        assert_eq!(format_srt_time(0.0), "00:00:00,000");
        assert_eq!(format_srt_time(1.0), "00:00:01,000");
        assert_eq!(format_srt_time(1.234), "00:00:01,234");
        assert_eq!(format_srt_time(3661.0), "01:01:01,000");
    }

    #[test]
    fn test_format_time_basic() {
        assert_eq!(format_time(0.0), "00:00:00.000");
        assert_eq!(format_time(1.0), "00:00:01.000");
        assert_eq!(format_time(1.234), "00:00:01.234");
        assert_eq!(format_time(3661.0), "01:01:01.000");
    }

    #[test]
    fn test_pcm_samples_from_wav_silence() {
        let data: Vec<u8> = vec![0u8; 44 + 4];
        let samples = pcm_samples_from_wav(&data);
        assert_eq!(samples, vec![0.0_f32, 0.0_f32]);
    }

    #[test]
    fn test_pcm_samples_from_wav_max_amplitude() {
        // 44-byte header + 2 bytes of i16 PCM at the maximum positive
        // value (0x7FFF = 32767). After dividing by 32768 the result
        // is just under 1.0 (it's not exactly 1.0 because 0x7FFF is
        // the largest *positive* s16 — the actual 1.0 would be 0x8000
        // which is a different bit pattern). Use a tolerance that
        // matches the existing test_pcm_samples_from_wav_max_amplitude
        // expectation of "approximately 1.0".
        let mut data = vec![0u8; 44];
        data.push(0xFF);
        data.push(0x7F);
        let samples = pcm_samples_from_wav(&data);
        assert_eq!(samples.len(), 1, "max amplitude test feeds one s16 frame");
        assert!((samples[0] - 32767.0 / 32768.0).abs() < 1e-6);
        assert!(samples[0] > 0.99, "max-amplitude sample should be very close to 1.0");
    }

    #[test]
    fn test_pcm_samples_from_wav_short_header() {
        // 4 bytes total — less than the 44-byte header. The fallback
        // branch in `pcm_samples_from_wav` treats the whole input as
        // PCM data, producing 2 samples (2 bytes each).
        let data = vec![0x00, 0x00, 0x01, 0x00];
        let samples = pcm_samples_from_wav(&data);
        assert_eq!(samples.len(), 2);
    }

    #[test]
    fn test_pcm_samples_from_wav_odd_byte_count() {
        // 44-byte header + 3 bytes of PCM. After skipping the header
        // the trailing `chunks(2)` + `filter(len == 2)` keeps exactly
        // one full frame and drops the trailing byte.
        let mut data = vec![0u8; 44];
        data.extend([0x00, 0x00, 0x01]);
        let samples = pcm_samples_from_wav(&data);
        assert_eq!(samples.len(), 1, "odd byte count should yield one full frame");
    }

    #[test]
    fn test_cmd_first_line_stdout() {
        let out = std::process::Output {
            stdout: "line1\nline2".as_bytes().to_vec(),
            stderr: "err1\nerr2".as_bytes().to_vec(),
            status: fake_exit_status(0),
        };
        assert_eq!(cmd_first_line(&out), Some("line1".to_string()));
    }

    #[test]
    fn test_cmd_first_line_fallback_stderr() {
        let out = std::process::Output {
            stdout: vec![],
            stderr: "err1\nerr2".as_bytes().to_vec(),
            status: fake_exit_status(1),
        };
        assert_eq!(cmd_first_line(&out), Some("err1".to_string()));
    }

    #[test]
    fn test_cmd_first_line_empty() {
        let out = std::process::Output {
            stdout: vec![],
            stderr: vec![],
            status: fake_exit_status(0),
        };
        assert_eq!(cmd_first_line(&out), None);
    }

    #[test]
    fn test_cmd_err_includes_stderr() {
        let out = std::process::Output {
            stdout: vec![],
            stderr: "ffmpeg: error".as_bytes().to_vec(),
            status: fake_exit_status(1),
        };
        let result = cmd_err("export failed", &out);
        assert!(result.contains("export failed"));
        assert!(result.contains("ffmpeg: error"));
    }

    #[test]
    fn test_write_concat_file_single_entry() {
        let entries = vec![std::path::PathBuf::from("/tmp/video1.mp4")];
        let path = write_concat_file(&entries).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("video1.mp4"));
        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn test_write_concat_file_escapes_single_quotes() {
        let entries = vec![std::path::PathBuf::from("/tmp/video's.mp4")];
        let path = write_concat_file(&entries).unwrap();
        let content = std::fs::read_to_string(&path).unwrap();
        assert!(content.contains("'\\''"));
        std::fs::remove_file(&path).ok();
    }
}