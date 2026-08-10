//! AssemblyKit 持久化 IPC（Stage 16.3）
//!
//! 2 个 Tauri command：
//! - assembly_kit_save   保存/更新项目对应的 AssemblyKit
//! - assembly_kit_load   加载项目对应的 AssemblyKit
//!
//! 数据契约：前端传 AssemblyKit JSON 字符串，后端整段存 SQLite。
//! 存整段 JSON 是有意为之：AssemblyKit 结构复杂（含视频/音频/字幕轨），
//! 且未来可能演进；强 schema 容易成为瓶颈。

use serde::{Deserialize, Serialize};

use crate::commands::project::ProjectService;
use crate::db::AssemblyKitRow;

// ─── 公开 API ───────────────────────────────────────────

/// 保存/更新 AssemblyKit（Stage 16.3 IPC）
#[tauri::command]
pub fn assembly_kit_save(
    service: tauri::State<'_, ProjectService>,
    project_id: String,
    assembly_json: String,
) -> Result<AssemblyKitMeta, String> {
    // 校验 project 存在（get_project 在不存在时返回 NotFound 错误）
    if service
        .db()
        .get_project(&project_id)
        .is_err()
    {
        return Err(format!("project '{}' not found", project_id));
    }

    // 检查是否已有记录（决定 created_at 是否保留）
    let now = now_unix();
    let (created_at, updated_at) = match service
        .db()
        .get_assembly_kit(&project_id)
        .map_err(stringify_err)?
    {
        Some(existing) => (existing.created_at, now),
        None => (now, now),
    };

    let row = AssemblyKitRow {
        project_id: project_id.clone(),
        assembly_json,
        created_at,
        updated_at,
    };
    service.db().upsert_assembly_kit(&row).map_err(stringify_err)?;

    Ok(AssemblyKitMeta {
        project_id,
        created_at,
        updated_at,
    })
}

/// 加载 AssemblyKit（Stage 16.3 IPC）
#[tauri::command]
pub fn assembly_kit_load(
    service: tauri::State<'_, ProjectService>,
    project_id: String,
) -> Result<Option<LoadedAssemblyKit>, String> {
    let row = service
        .db()
        .get_assembly_kit(&project_id)
        .map_err(stringify_err)?;
    Ok(row.map(|r| LoadedAssemblyKit {
        project_id: r.project_id,
        assembly_json: r.assembly_json,
        created_at: r.created_at,
        updated_at: r.updated_at,
    }))
}

// ─── 响应类型 ───────────────────────────────────────────

/// save 返回的元信息（前端用 updated_at 刷新本地缓存）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssemblyKitMeta {
    pub project_id: String,
    pub created_at: i64,
    pub updated_at: i64,
}

/// load 返回的完整数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedAssemblyKit {
    pub project_id: String,
    pub assembly_json: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// ─── 内部工具 ───────────────────────────────────────────

fn stringify_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ─── 单元测试 ───────────────────────────────────────────
//
// 集成测试在 db::tests 覆盖；这里只验 service 注入的项目存在性检查。

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Db, ProjectRow};
    use std::sync::Arc;

    fn fresh_service() -> ProjectService {
        let dir = tempfile::tempdir().unwrap();
        let db = Arc::new(Db::open(&dir.path().join("test.db")).unwrap());
        ProjectService::new(db)
    }

    fn ensure_project(svc: &ProjectService, id: &str) {
        svc.db()
            .upsert_project(&ProjectRow {
                id: id.to_string(),
                name: "test".to_string(),
                intent_json: "{}".to_string(),
                video_path: "/v.mp4".to_string(),
                subtitle_path: None,
                created_at: 100,
                updated_at: 100,
            })
            .unwrap();
    }

    #[test]
    fn save_rejects_unknown_project() {
        let svc = fresh_service();
        // 模拟 assembly_kit_save 的项目存在性检查（get_project 在不存在时返回 Err）
        let exists = svc.db().get_project("ghost").is_ok();
        assert!(!exists);
    }

    #[test]
    fn save_preserves_created_at_when_kit_exists() {
        let svc = fresh_service();
        ensure_project(&svc, "p1");
        // 第一次写
        let now = now_unix();
        svc.db()
            .upsert_assembly_kit(&AssemblyKitRow {
                project_id: "p1".to_string(),
                assembly_json: "v1".to_string(),
                created_at: now,
                updated_at: now,
            })
            .unwrap();

        // 模拟第二次 save（保留 created_at）
        let (created_at, updated_at) = match svc.db().get_assembly_kit("p1").unwrap() {
            Some(existing) => (existing.created_at, now_unix()),
            None => (now_unix(), now_unix()),
        };
        svc.db()
            .upsert_assembly_kit(&AssemblyKitRow {
                project_id: "p1".to_string(),
                assembly_json: "v2".to_string(),
                created_at,
                updated_at,
            })
            .unwrap();

        let got = svc.db().get_assembly_kit("p1").unwrap().unwrap();
        assert_eq!(got.assembly_json, "v2");
        assert_eq!(got.created_at, now); // 不变
    }
}
