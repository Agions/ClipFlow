//! Hardware acceleration detection and encoding configuration.

use std::path::Path;

/// Hardware acceleration backend detected on the system.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HwAccel {
    /// NVIDIA GPU via NVENC/NVDEC (Linux/Windows)
    Nvidia,
    /// Intel GPU via Quick Sync Video (Linux/Windows)
    IntelQsv,
    /// AMD GPU via VAAPI (Linux)
    AmdVaapi,
    /// Apple Silicon / Intel Mac via VideoToolbox (macOS)
    VideoToolbox,
    /// No hardware acceleration — CPU only
    Cpu,
}

impl HwAccel {
    /// Human-readable name of this hardware acceleration backend.
    pub fn name(self) -> &'static str {
        match self {
            HwAccel::Nvidia => "NVIDIA NVENC/NVDEC",
            HwAccel::IntelQsv => "Intel Quick Sync Video",
            HwAccel::AmdVaapi => "AMD VAAPI",
            HwAccel::VideoToolbox => "Apple VideoToolbox",
            HwAccel::Cpu => "CPU (libx264/libx265)",
        }
    }

    /// FFmpeg decoder name for this backend, if hardware decoding is supported.
    pub fn video_decoder(self) -> Option<&'static str> {
        match self {
            HwAccel::Nvidia => Some("h264_cuvid"),
            HwAccel::IntelQsv => Some("h264_qsv"),
            HwAccel::AmdVaapi => Some("hevc_vaapi"),
            HwAccel::VideoToolbox => Some("h264_videotoolbox"),
            HwAccel::Cpu => None,
        }
    }

    /// FFmpeg H.264 encoder name for this backend (falls back to `libx264` on CPU).
    pub fn h264_encoder(self) -> &'static str {
        match self {
            HwAccel::Nvidia => "h264_nvenc",
            HwAccel::IntelQsv => "h264_qsv",
            HwAccel::AmdVaapi => "h264_vaapi",
            HwAccel::VideoToolbox => "h264_videotoolbox",
            HwAccel::Cpu => "libx264",
        }
    }

    /// FFmpeg HEVC/H.265 encoder name for this backend (falls back to `libx265` on CPU).
    pub fn hevc_encoder(self) -> &'static str {
        match self {
            HwAccel::Nvidia => "hevc_nvenc",
            HwAccel::IntelQsv => "hevc_qsv",
            HwAccel::AmdVaapi => "hevc_vaapi",
            HwAccel::VideoToolbox => "hevc_videotoolbox",
            HwAccel::Cpu => "libx265",
        }
    }

    /// Audio encoder name used for all backends (AAC).
    pub fn audio_encoder(self) -> &'static str {
        "aac"
    }

    /// Optional FFmpeg input device name for this backend.
    pub fn input_device(self) -> Option<&'static str> {
        match self {
            HwAccel::AmdVaapi => Some("vaapi"),
            HwAccel::VideoToolbox => None,
            _ => None,
        }
    }

    /// Extra FFmpeg input arguments required to enable this backend's accelerator.
    pub fn hwaccel_input_args(self) -> Vec<&'static str> {
        match self {
            HwAccel::AmdVaapi => vec!["-vaapi_device", "/dev/dri/renderD128"],
            HwAccel::Nvidia => vec!["-hwaccel", "cuda"],
            _ => vec![],
        }
    }
}

impl std::fmt::Display for HwAccel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// Detects available hardware acceleration on this system.
/// Priority: NVIDIA > Intel QSV > AMD VAAPI > VideoToolbox > CPU
pub fn detect_hw_accel() -> HwAccel {
    if std::process::Command::new("nvidia-smi")
        .arg("--query-gpu=name")
        .arg("--format=csv,noheader")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        log::info!("[Fablr] Detected NVIDIA GPU — using NVENC/NVDEC");
        return HwAccel::Nvidia;
    }

    if std::process::Command::new("vainfo")
        .arg("--show_config")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
    {
        if Path::new("/dev/dri/renderD128").exists() {
            log::info!("[Fablr] Detected AMD GPU — using VAAPI");
            return HwAccel::AmdVaapi;
        }
        log::info!("[Fablr] Detected Intel GPU — using Quick Sync Video");
        return HwAccel::IntelQsv;
    }

    #[cfg(target_os = "macos")]
    {
        log::info!("[Fablr] Detected macOS — using VideoToolbox");
        return HwAccel::VideoToolbox;
    }

    #[cfg(not(target_os = "macos"))]
    {
        log::info!("[Fablr] No GPU detected — using CPU encoding");
        HwAccel::Cpu
    }
}

/// Returns the globally detected hardware acceleration backend.
/// Cached after first call.
pub fn hw_accel() -> HwAccel {
    static HW_DETECTED: std::sync::OnceLock<HwAccel> = std::sync::OnceLock::new();
    *HW_DETECTED.get_or_init(detect_hw_accel)
}
