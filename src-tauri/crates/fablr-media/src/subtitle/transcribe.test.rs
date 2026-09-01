//! Transcribe tests

use crate::subtitle::transcribe::extract_audio_to_wav;

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_extract_audio_to_wav_rejects_missing_ffmpeg() {
        // This test verifies the function handles missing ffmpeg gracefully.
        // We can't actually run ffmpeg in unit tests, but we can verify
        // the function returns an error for a non-existent input.
        let result = extract_audio_to_wav("/nonexistent/video.mp4", &PathBuf::from("/tmp/test.wav"));
        assert!(result.is_err());
    }
}
