//! Audio/PCM processing utilities

/// Convert s16le PCM bytes to normalized f32 samples.
/// Skips the standard 44-byte WAV header before reading PCM samples.
/// Uses `chunks(2)` (not `_exact`) to safely drop any trailing partial chunk.
pub fn pcm_samples_from_wav(pcm_data: &[u8]) -> Vec<f32> {
    // Standard WAV header is 44 bytes (RIFF + fmt + data chunk header)
    let header_size = 44;
    let data = if pcm_data.len() > header_size {
        &pcm_data[header_size..]
    } else {
        pcm_data
    };

    data.chunks(2)
        .filter(|chunk| chunk.len() == 2)
        .map(|chunk| {
            let s16 = i16::from_le_bytes([chunk[0], chunk[1]]);
            s16 as f32 / 32768.0
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a minimal s16le WAV byte stream with a 44-byte header and the
    /// given sample values (written in little-endian).
    fn wav_bytes(samples: &[i16]) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(44 + samples.len() * 2);
        // 44 zero bytes for the standard header (RIFF + fmt + data chunks).
        // pcm_samples_from_wav only checks the *length* of the prefix and
        // does not parse its content, so zero bytes are fine.
        bytes.extend(std::iter::repeat(0u8).take(44));
        for s in samples {
            bytes.extend_from_slice(&s.to_le_bytes());
        }
        bytes
    }

    #[test]
    fn skips_44_byte_header() {
        let samples = [0i16, 1, 2, 3];
        let bytes = wav_bytes(&samples);
        let out = pcm_samples_from_wav(&bytes);
        assert_eq!(out.len(), samples.len());
    }

    #[test]
    fn converts_s16le_to_normalized_f32() {
        // Note: i16 spans [-32768, 32767], so the output spans [-1.0, 32767/32768]
        // (not ±1.0). The test verifies the *asymmetry* is preserved.
        let samples = [i16::MIN, -16384, 0, 16384, i16::MAX];
        let out = pcm_samples_from_wav(&wav_bytes(&samples));
        assert_eq!(out.len(), 5);
        assert!((out[0] - (-1.0)).abs() < 1e-6, "MIN → -1.0, got {}", out[0]);
        assert!((out[1] - (-0.5)).abs() < 1e-6, "-16384 → -0.5, got {}", out[1]);
        assert_eq!(out[2], 0.0);
        assert!((out[3] - 0.5).abs() < 1e-6, "16384 → 0.5, got {}", out[3]);
        let max_as_f32 = i16::MAX as f32 / 32768.0;
        assert!(
            (out[4] - max_as_f32).abs() < 1e-6,
            "MAX → {}, expected {}",
            out[4],
            max_as_f32
        );
    }

    #[test]
    fn handles_short_input_without_header() {
        // Input shorter than 44 bytes is treated as raw PCM (no header skip).
        // 0x01 0x00 little-endian = 0x0001 = 1 → 1/32768
        // 0xFF 0x7F little-endian = 0x7FFF = 32767 (i16::MAX)
        let bytes: Vec<u8> = vec![0x01, 0x00, 0xFF, 0x7F];
        let out = pcm_samples_from_wav(&bytes);
        assert_eq!(out.len(), 2);
        assert!((out[0] - (1.0 / 32768.0)).abs() < 1e-9);
        assert!((out[1] - (32767.0 / 32768.0)).abs() < 1e-6);
    }

    #[test]
    fn drops_trailing_partial_chunk() {
        // 44 header + 5 PCM bytes → 2 full samples + 1 dangling byte dropped.
        let mut bytes = vec![0u8; 44];
        bytes.extend_from_slice(&[0x00, 0x01, 0x00, 0x02, 0xAA]);
        let out = pcm_samples_from_wav(&bytes);
        assert_eq!(out.len(), 2, "trailing partial chunk must be dropped");
    }

    #[test]
    fn empty_input_returns_empty() {
        let out = pcm_samples_from_wav(&[]);
        assert!(out.is_empty());
    }
}