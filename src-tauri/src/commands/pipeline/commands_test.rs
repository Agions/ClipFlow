//! pipeline commands 单元测试
//!
//! 覆盖：start_phase / approve_phase / retry_phase / skip_phase 状态机推进。

use super::*;
use crate::commands::pipeline::commands::{
    approve_phase_impl, retry_phase_impl, skip_phase_impl, start_phase_impl,
};
use crate::commands::project::ProjectService;
use db::Db;
use models::{JobPhase, PhaseRunState};
use std::sync::Arc;
use tempfile::tempdir;

fn fresh_service() -> ProjectService {
    let dir = tempdir().unwrap();
    let path = dir.path().join("test.db");
    let db = Arc::new(Db::open(&path).unwrap());
    ProjectService::new(db)
}

#[tokio::test]
async fn start_then_approve_advances_phase() {
    let svc = fresh_service();
    // 先建项目
    let p = crate::commands::project::create(
        &svc,
        crate::commands::project::CreateProjectInput {
            id: None,
            name: "test".into(),
            video_path: "/v.mp4".into(),
            duration_secs: 60.0,
            metadata: serde_json::json!({}),
            intent: None,
        },
    )
    .unwrap();

    // 启动 understanding
    let app = tauri::test::mock_app();
    let app_handle = app.handle().clone();
    let job = start_phase_impl(
        &app_handle,
        &svc,
        PhaseParams {
            project_id: p.id.clone(),
            phase: "understanding".into(),
            params: serde_json::Value::Null,
        },
    )
    .await
    .unwrap();
    assert_eq!(job.phase, JobPhase::Understanding);
    assert_eq!(job.phase_status[&JobPhase::Understanding], PhaseRunState::Running);

    // 审批 → 推到 planning
    let job = approve_phase_impl(&app_handle, &svc, &p.id, "understanding", None)
        .await
        .unwrap();
    assert_eq!(job.phase, JobPhase::Planning);
    assert_eq!(job.phase_status[&JobPhase::Understanding], PhaseRunState::Done);
    assert_eq!(job.phase_status[&JobPhase::Planning], PhaseRunState::Pending);
}

#[tokio::test]
async fn start_phase_rejects_when_predecessor_not_done() {
    let svc = fresh_service();
    let p = crate::commands::project::create(
        &svc,
        crate::commands::project::CreateProjectInput {
            id: None,
            name: "test".into(),
            video_path: "/v.mp4".into(),
            duration_secs: 60.0,
            metadata: serde_json::json!({}),
            intent: None,
        },
    )
    .unwrap();

    // 直接启动 rendering（前置都未完成）应失败
    let app = tauri::test::mock_app();
    let app_handle = app.handle().clone();
    let res = start_phase_impl(
        &app_handle,
        &svc,
        PhaseParams {
            project_id: p.id.clone(),
            phase: "rendering".into(),
            params: serde_json::Value::Null,
        },
    )
    .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn skip_phase_marks_as_skipped() {
    let svc = fresh_service();
    let p = crate::commands::project::create(
        &svc,
        crate::commands::project::CreateProjectInput {
            id: None,
            name: "test".into(),
            video_path: "/v.mp4".into(),
            duration_secs: 60.0,
            metadata: serde_json::json!({}),
            intent: None,
        },
    )
    .unwrap();

    let job = skip_phase_impl(&svc, &p.id, "scripting").unwrap();
    assert_eq!(job.phase_status[&JobPhase::Scripting], PhaseRunState::Skipped);
}

#[tokio::test]
async fn retry_phase_requires_failed() {
    let svc = fresh_service();
    let p = crate::commands::project::create(
        &svc,
        crate::commands::project::CreateProjectInput {
            id: None,
            name: "test".into(),
            video_path: "/v.mp4".into(),
            duration_secs: 60.0,
            metadata: serde_json::json!({}),
            intent: None,
        },
    )
    .unwrap();

    // 未 failed 直接 retry 应返回原 job（不变）
    let job = retry_phase_impl(&svc, &p.id, "scripting").unwrap();
    assert_eq!(job.phase_status[&JobPhase::Scripting], PhaseRunState::Pending);
}
