//! Pipeline orchestrator — 自动跑无 gate 阶段（Stage 13）
//!
//! v3 启动时只做"顺序启动 understanding + planning"，实际业务
//! 逻辑在 steps/ 落地后接入。run_auto 是用户一键触发的入口。

use tauri::{AppHandle, Runtime};

use crate::commands::project::ProjectService;
use crate::domain::job::PipelineJob;

use super::commands::run_auto as run_auto_impl;

/// run_auto 公共入口（re-export 给 lib.rs 注册）
pub async fn run_auto<R: Runtime>(
    app: &AppHandle<R>,
    service: &ProjectService,
    project_id: &str,
) -> Result<PipelineJob, String> {
    run_auto_impl(app, service, project_id).await
}
