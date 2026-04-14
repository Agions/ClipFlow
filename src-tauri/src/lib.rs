//! CutDeck — AI-driven professional video editing desktop app
//! Tauri 2.x backend entry point

mod binary;
mod commands;
mod types;
mod utils;

pub use commands::{ai, ffprobe, project, render};
pub use types::*;
