//! Integration tests for `video::mix_audio` and `utils::audio`.
//!
//! These cover the pure-function logic of the audio-mixing pipeline so that
//! regressions are caught by CI *without* requiring an `ffmpeg`/`ffprobe`
//! binary in the runner image. The ffmpeg/ffprobe process spawning itself
//! is exercised by the GUI's smoke tests, not by these unit tests.
//!
//! Historical context: the project's main `lib.rs` has 6 pre-existing
//! compile errors in `ffmpeg_builder.rs` and the `utils/mod.rs` test module
//! that block `cargo test --lib`. Isolating these tests in `tests/`
//! matches the same pattern as `tests/resilience.rs` and `tests/crash_recovery.rs`
//! — see commit 839cca17.

use media::utils::pcm_samples_from_wav;

// ---------------------------------------------------------------------------
// utils::audio::pcm_samples_from_wav
// ---------------------------------------------------------------------------

/// Build a minimal s16le WAV byte stream with a 44-byte header and the
/// given sample values (written in little-endian). Mirrors the helper in
/// `utils/audio.rs` so the integration test exercises the *real* public API
/// without depending on `#[cfg(test)]` internals.
fn wav_bytes(samples: &[i16]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(44 + samples.len() * 2);
    bytes.extend(std::iter::repeat(0u8).take(44));
    for s in samples {
        bytes.extend_from_slice(&s.to_le_bytes());
    }
    bytes
}

#[test]
fn pcm_skips_44_byte_wav_header() {
    let samples = [0i16, 1, 2, 3, 4, 5];
    let bytes = wav_bytes(&samples);
    let out = pcm_samples_from_wav(&bytes);
    assert_eq!(out.len(), samples.len());
}

#[test]
fn pcm_normalizes_to_f32_unit_range() {
    // Note: i16 spans [-32768, 32767], so the output spans [-1.0, 32767/32768]
    // (not ±1.0). The test verifies the *asymmetry* is preserved.
    let samples = [i16::MIN, -16384, 0, 16384, i16::MAX];
    let out = pcm_samples_from_wav(&wav_bytes(&samples));
    assert_eq!(out.len(), 5);
    assert!((out[0] - (-1.0)).abs() < 1e-6);
    assert!((out[1] - (-0.5)).abs() < 1e-6);
    assert_eq!(out[2], 0.0);
    assert!((out[3] - 0.5).abs() < 1e-6);
    // i16::MAX / 32768 = 32767/32768 ≈ 0.99997, not 1.0
    let max_as_f32 = i16::MAX as f32 / 32768.0;
    assert!(
        (out[4] - max_as_f32).abs() < 1e-6,
        "MAX → {}, expected {}",
        out[4],
        max_as_f32
    );
}

#[test]
fn pcm_drops_trailing_partial_chunk() {
    // 44 header + 5 PCM bytes → 2 full samples + 1 dangling byte dropped.
    let mut bytes = vec![0u8; 44];
    bytes.extend_from_slice(&[0x00, 0x01, 0x00, 0x02, 0xAA]);
    let out = pcm_samples_from_wav(&bytes);
    assert_eq!(out.len(), 2);
}

#[test]
fn pcm_treats_short_input_as_raw_pcm() {
    // 4 bytes (< 44) → 2 samples, no header skip.
    // Sample 1: 0x01 0x00 little-endian = 0x0001 = 1 → 1/32768
    // Sample 2: 0xFF 0x7F little-endian = 0x7FFF = 32767 (i16::MAX)
    let bytes: Vec<u8> = vec![0x01, 0x00, 0xFF, 0x7F];
    let out = pcm_samples_from_wav(&bytes);
    assert_eq!(out.len(), 2);
    let expected_lo = 1.0f32 / 32768.0;
    assert!(
        (out[0] - expected_lo).abs() < 1e-9,
        "got {}, expected {}",
        out[0],
        expected_lo
    );
    let expected_hi = 32767.0f32 / 32768.0;
    assert!(
        (out[1] - expected_hi).abs() < 1e-6,
        "got {}, expected {}",
        out[1],
        expected_hi
    );
}

#[test]
fn pcm_empty_input_returns_empty() {
    assert!(pcm_samples_from_wav(&[]).is_empty());
}
