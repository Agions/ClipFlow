//! Binary — external executable resolution and hardware acceleration
//!
//! Sub-modules:
//!   resolver.rs  — resolve_binary_path, ffmpeg_binary, ffprobe_binary
//!   hw_accel.rs  — HwAccel enum, detect_hw_accel, hw_accel singleton

mod hw_accel;
mod resolver;

pub use hw_accel::{detect_hw_accel, hw_accel, HwAccel};
pub use resolver::{ffmpeg_binary, ffprobe_binary, resolve_binary_path};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hw_accel_names() {
        assert_eq!(HwAccel::Cpu.name(), "CPU (libx264/libx265)");
        assert_eq!(HwAccel::Nvidia.h264_encoder(), "h264_nvenc");
        assert_eq!(HwAccel::Nvidia.hevc_encoder(), "hevc_nvenc");
        assert_eq!(HwAccel::Cpu.h264_encoder(), "libx264");
    }

    #[test]
    fn test_hwaccel_input_args() {
        assert!(HwAccel::Nvidia.hwaccel_input_args().contains(&"-hwaccel"));
        assert!(HwAccel::AmdVaapi.hwaccel_input_args().contains(&"-vaapi_device"));
        assert!(HwAccel::Cpu.hwaccel_input_args().is_empty());
    }
}