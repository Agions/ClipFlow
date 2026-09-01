//! commands/project — 项目持久化 IPC 命令（Stage 12.4）
//!
//! 5 个 command 替代 v2 散落的 `save_project_file` / `load_project_file` /
//! `list_project_files`：
//! - project_create  创建项目（含 IntentConfig）
//! - project_list    列出所有项目
//! - project_load    加载项目（含任务状态）
//! - project_save    保存项目元数据
//! - project_delete  删除项目（级联）

use serde::{Deserialize, Serialize};
use tauri::State;

pub use fablr_db::ProjectService;
use fablr_db::{DbError, DbResult, ArtifactRow, JobRow, ProjectRow};
use fablr_domain::intent::IntentConfig;
use fablr_domain::production::{Production, ProductionSource, ProductionStatus};

// ─── IPC DTO ──────────────────────────────────────────────────

/// Project 完整 DTO（含任务状态和产物路径）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub intent: IntentConfig,
    pub video_path: String,
    pub subtitle_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub latest_job: Option<JobDto>,
}

/// Job 状态 DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobDto {
    pub id: String,
    pub project_id: String,
    pub phase: String,
    pub phase_status: serde_json::Value,
    pub progress_pct: f32,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactDto {
    pub id: i64,
    pub job_id: String,
    pub phase: String,
    pub artifact_type: String,
    pub path: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub id: Option<String>,
    pub name: String,
    pub video_path: String,
    pub duration_secs: f64,
    pub metadata: serde_json::Value,
    pub intent: Option<IntentConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProjectInput {
    pub id: String,
    pub name: String,
    pub intent: IntentConfig,
    pub video_path: String,
    pub subtitle_path: Option<String>,
}

// ─── Command ──────────────────────────────────────────────────

/// 创建项目
#[tauri::command]
pub fn project_create(
    input: CreateProjectInput,
    service: State<'_, ProjectService>,
) -> Result<ProjectDto, String> {
    create(&service, input).map_err(stringify_err)
}

/// 列出所有项目
#[tauri::command]
pub fn project_list(service: State<'_, ProjectService>) -> Result<Vec<ProjectDto>, String> {
    list(&service).map_err(stringify_err)
}

/// 加载项目（含最新任务状态）
#[tauri::command]
pub fn project_load(
    id: String,
    service: State<'_, ProjectService>,
) -> Result<ProjectDto, String> {
    load(&service, &id).map_err(stringify_err)
}

/// 保存项目元数据
#[tauri::command]
pub fn project_save(
    input: SaveProjectInput,
    service: State<'_, ProjectService>,
) -> Result<ProjectDto, String> {
    save(&service, input).map_err(stringify_err)
}

/// 删除项目（级联任务和产物）
#[tauri::command]
pub fn project_delete(id: String, service: State<'_, ProjectService>) -> Result<(), String> {
    service.db().delete_project(&id).map_err(stringify_err)
}

// ─── 纯函数实现（便于单元测试） ──────────────────────────────

pub fn create(service: &ProjectService, input: CreateProjectInput) -> DbResult<ProjectDto> {
    use fablr_domain::intent::DEFAULT_INTENT_CONFIG;
    let now = now_unix();
    let id = input.id.unwrap_or_else(unique_id);
    let intent = input.intent.unwrap_or(DEFAULT_INTENT_CONFIG);
    let intent_json = serde_json::to_string(&intent).map_err(sqlx_err)?;
    let row = ProjectRow {
        id: id.clone(),
        name: input.name,
        intent_json,
        video_path: input.video_path,
        subtitle_path: None,
        created_at: now,
        updated_at: now,
    };
    service.db().upsert_project(&row)?;
    // 记录 _duration_secs / _metadata 以备后续 Production 装配
    let _ = (input.duration_secs, input.metadata);
    load_by_row(service, row)
}

/// 生成时间戳+随机后缀 ID（避免同秒创建冲突）
fn unique_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("project_{:x}_{:x}", ms, n)
}

pub fn list(service: &ProjectService) -> DbResult<Vec<ProjectDto>> {
    let rows = service.db().list_projects()?;
    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        out.push(load_by_row(service, r)?);
    }
    Ok(out)
}

pub fn load(service: &ProjectService, id: &str) -> DbResult<ProjectDto> {
    let row = service.db().get_project(id)?;
    load_by_row(service, row)
}

pub fn save(service: &ProjectService, input: SaveProjectInput) -> DbResult<ProjectDto> {
    let existing = service.db().get_project(&input.id)?;
    let intent_json = serde_json::to_string(&input.intent).map_err(sqlx_err)?;
    let row = ProjectRow {
        id: input.id,
        name: input.name,
        intent_json,
        video_path: input.video_path,
        subtitle_path: input.subtitle_path,
        created_at: existing.created_at,
        updated_at: now_unix(),
    };
    service.db().upsert_project(&row)?;
    load_by_row(service, row)
}

fn load_by_row(service: &ProjectService, row: ProjectRow) -> DbResult<ProjectDto> {
    let intent: IntentConfig = serde_json::from_str(&row.intent_json).map_err(sqlx_err)?;
    let latest_job = match service.db().latest_job(&row.id)? {
        Some(j) => Some(job_to_dto(service, j)?),
        None => None,
    };
    Ok(ProjectDto {
        id: row.id,
        name: row.name,
        intent,
        video_path: row.video_path,
        subtitle_path: row.subtitle_path,
        created_at: unix_to_iso(row.created_at),
        updated_at: unix_to_iso(row.updated_at),
        latest_job,
    })
}

fn job_to_dto(_service: &ProjectService, j: JobRow) -> DbResult<JobDto> {
    let phase_status: serde_json::Value =
        serde_json::from_str(&j.phase_status_json).map_err(sqlx_err)?;
    let error = j.error_json;
    Ok(JobDto {
        id: j.id,
        project_id: j.project_id,
        phase: j.phase,
        phase_status,
        progress_pct: j.progress_pct,
        error,
        created_at: unix_to_iso(j.created_at),
        updated_at: unix_to_iso(j.updated_at),
    })
}

// ─── 工具 ──────────────────────────────────────────────────

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn unix_to_iso(unix_secs: i64) -> String {
    // 将 Unix 秒数转为 ISO 8601 字符串（UTC）
    let (year, month, day, hour, min, sec) = epoch_to_civil(unix_secs);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hour, min, sec
    )
}

/// Howard Hinnant 的 epoch → 公历日期算法（无外部依赖）
fn epoch_to_civil(secs: i64) -> (i32, u32, u32, u32, u32, u32) {
    let days = secs.div_euclid(86_400);
    let secs_of_day = secs.rem_euclid(86_400);
    let hour = (secs_of_day / 3600) as u32;
    let min = ((secs_of_day % 3600) / 60) as u32;
    let sec = (secs_of_day % 60) as u32;

    // 1970-01-01 = day 0
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let year = (if m <= 2 { y + 1 } else { y }) as i32;
    (year, m, d, hour, min, sec)
}

fn stringify_err(e: DbError) -> String {
    e.to_string()
}

fn sqlx_err(e: serde_json::Error) -> DbError {
    DbError::InvalidData(format!("serde_json: {}", e))
}

// ─── 单元测试 ──────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use fablr_db::Db;
    use tempfile::tempdir;

    fn fresh_service() -> ProjectService {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.db");
        let db = Arc::new(Db::open(&path).unwrap());
        ProjectService::new(db)
    }

    fn sample_input(name: &str) -> CreateProjectInput {
        CreateProjectInput {
            id: None,
            name: name.to_string(),
            video_path: "/v.mp4".to_string(),
            duration_secs: 120.0,
            metadata: serde_json::json!({"width": 1920, "height": 1080}),
            intent: None,
        }
    }

    #[test]
    fn create_then_list_then_load() {
        let svc = fresh_service();
        let p1 = create(&svc, sample_input("项目 A")).unwrap();
        let p2 = create(&svc, sample_input("项目 B")).unwrap();

        assert_eq!(p1.name, "项目 A");
        assert!(p1.id.starts_with("project_"));

        let all = list(&svc).unwrap();
        assert_eq!(all.len(), 2);

        let got = load(&svc, &p2.id).unwrap();
        assert_eq!(got.name, "项目 B");
    }

    #[test]
    fn save_updates_name_and_intent() {
        let svc = fresh_service();
        let p = create(&svc, sample_input("old name")).unwrap();

        let save_input = SaveProjectInput {
            id: p.id.clone(),
            name: "new name".to_string(),
            intent: fablr_domain::intent::intent_default_config(
                fablr_domain::intent::ContentIntent::MovieReview,
            ),
            video_path: p.video_path.clone(),
            subtitle_path: Some("/s.srt".to_string()),
        };
        let updated = save(&svc, save_input).unwrap();
        assert_eq!(updated.name, "new name");
        assert_eq!(
            updated.intent.intent,
            fablr_domain::intent::ContentIntent::MovieReview
        );
        assert_eq!(updated.subtitle_path.as_deref(), Some("/s.srt"));
    }

    #[test]
    fn delete_removes_project() {
        let svc = fresh_service();
        let p = create(&svc, sample_input("x")).unwrap();
        service_delete(&svc, &p.id).unwrap();
        assert!(matches!(load(&svc, &p.id), Err(DbError::NotFound(_))));
    }

    fn service_delete(svc: &ProjectService, id: &str) -> DbResult<()> {
        svc.db().delete_project(id)
    }
}

// 抑制 unused warnings
#[allow(dead_code)]
fn _silence_unused(_: ArtifactRow) {}
#[allow(dead_code)]
fn _silence_production() {
    let _: Option<ProductionSource> = None;
    let _: ProductionStatus = ProductionStatus::Draft;
    let _: Option<Production> = None;
}
