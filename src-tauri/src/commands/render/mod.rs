//! Render command modules
//!
//! Split from the monolithic render.rs for maintainability:
//! - `ffmpeg_builder.rs`   — Shared FFmpeg command construction
//! - `subtitle_burnin.rs`  — Subtitle SRT normalization + burn-in
//! - `transcode.rs`        — Aspect-ratio cropping / quality transcoding
//! - `autonomous_cut.rs`   — AI-driven multi-segment autonomous cut
//! - `preview.rs`         — Quick preview generation

pub mod ass_engine;
pub mod autonomous_cut;
pub mod autonomous_cut_impl;
pub mod ffmpeg_builder;
pub mod preview;
pub mod subtitle_burnin;
pub mod transcode;

pub use autonomous_cut::render_autonomous_cut;
pub use preview::generate_preview;
pub use transcode::{export_video, transcode_with_crop};