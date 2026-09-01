//! 数据库单元测试

#[cfg(test)]
mod tests {
    use crate::*;
    use tempfile::tempdir;

    fn fresh_db() -> Db {
        let dir = tempdir().expect("create temp dir");
        let path = dir.path().join("test.db");
        Db::open(&path).expect("open db")
    }

    #[test]
    fn open_runs_all_migrations() {
        let db = fresh_db();
        // 001 (v3 完整 schema) + 002 (TTS 缓存) + 003 (AssemblyKit)
        assert_eq!(db.schema_version().unwrap(), 3);
    }

    #[test]
    fn project_crud_round_trip() {
        let db = fresh_db();
        let p = ProjectRow {
            id: "p1".to_string(),
            name: "测试项目".to_string(),
            intent_json: r#"{"intent":"short-drama"}"#.to_string(),
            video_path: "/tmp/v.mp4".to_string(),
            subtitle_path: Some("/tmp/s.srt".to_string()),
            created_at: 1700000000,
            updated_at: 1700000000,
        };
        db.upsert_project(&p).unwrap();

        let got = db.get_project("p1").unwrap();
        assert_eq!(got.name, "测试项目");
        assert_eq!(got.video_path, "/tmp/v.mp4");

        let list = db.list_projects().unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn upsert_updates_existing_project() {
        let db = fresh_db();
        let mut p = ProjectRow {
            id: "p2".to_string(),
            name: "old".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 100,
            updated_at: 100,
        };
        db.upsert_project(&p).unwrap();

        p.name = "new".to_string();
        p.updated_at = 200;
        db.upsert_project(&p).unwrap();

        let got = db.get_project("p2").unwrap();
        assert_eq!(got.name, "new");
        assert_eq!(got.created_at, 100); // 不变
        assert_eq!(got.updated_at, 200); // 更新
    }

    #[test]
    fn delete_project_cascades() {
        let db = fresh_db();
        let p = ProjectRow {
            id: "p3".to_string(),
            name: "x".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 0,
            updated_at: 0,
        };
        db.upsert_project(&p).unwrap();

        let j = JobRow {
            id: "j1".to_string(),
            project_id: "p3".to_string(),
            phase: "understanding".to_string(),
            phase_status_json: "{}".to_string(),
            progress_pct: 0.0,
            error_json: None,
            created_at: 0,
            updated_at: 0,
        };
        db.upsert_job(&j).unwrap();

        let a = ArtifactRow {
            id: 0,
            job_id: "j1".to_string(),
            phase: "understanding".to_string(),
            artifact_type: "storyline".to_string(),
            path: "/tmp/s.json".to_string(),
            metadata_json: None,
            created_at: 0,
        };
        db.upsert_artifact(&a).unwrap();

        db.delete_project("p3").unwrap();

        assert!(matches!(db.get_project("p3"), Err(DbError::NotFound(_))));
        assert!(db.latest_job("p3").unwrap().is_none());
        assert!(db.list_artifacts("j1").unwrap().is_empty());
    }

    #[test]
    fn settings_round_trip() {
        let db = fresh_db();
        assert!(db.get_setting("missing").unwrap().is_none());

        db.set_setting("theme", r#""dark""#).unwrap();
        assert_eq!(db.get_setting("theme").unwrap().as_deref(), Some(r#""dark""#));

        // 覆盖
        db.set_setting("theme", r#""light""#).unwrap();
        assert_eq!(db.get_setting("theme").unwrap().as_deref(), Some(r#""light""#));
    }

    // ─── TTS 缓存（Stage 14.5） ────────────────────────────

    fn cache_row(key: &str, path: &str, created_at: i64) -> TtsCacheRow {
        TtsCacheRow {
            cache_key: key.to_string(),
            audio_path: path.to_string(),
            duration_secs: 1.5,
            text_preview: "你好".to_string(),
            created_at,
            accessed_at: created_at,
            access_count: 0,
        }
    }

    #[test]
    fn tts_cache_lookup_miss_returns_none() {
        let db = fresh_db();
        assert!(db.lookup_tts_cache("missing").unwrap().is_none());
    }

    #[test]
    fn tts_cache_upsert_then_lookup_round_trip() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();

        let got = db.lookup_tts_cache("k1").unwrap().unwrap();
        assert_eq!(got.audio_path, "/tmp/a.mp3");
        assert_eq!(got.duration_secs, 1.5);
        assert_eq!(got.access_count, 0);
    }

    #[test]
    fn tts_cache_upsert_existing_bumps_access_count() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/b.mp3", 2000)).unwrap();

        let got = db.lookup_tts_cache("k1").unwrap().unwrap();
        assert_eq!(got.audio_path, "/tmp/b.mp3"); // 路径已更新
        assert_eq!(got.access_count, 1); // 累加 1
    }

    #[test]
    fn tts_cache_touch_updates_access_metadata() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("k1", "/tmp/a.mp3", 1000)).unwrap();
        let updated = db.touch_tts_cache(&["k1".to_string(), "missing".to_string()]).unwrap();
        assert_eq!(updated, 1); // 只有一个 key 存在
    }

    #[test]
    fn tts_cache_clear_expired_removes_old_entries() {
        let db = fresh_db();
        db.upsert_tts_cache(&cache_row("old", "/tmp/o.mp3", 100)).unwrap();
        db.upsert_tts_cache(&cache_row("new", "/tmp/n.mp3", 5000)).unwrap();

        // 清理 created_at < 1000
        let removed = db.clear_expired_tts_cache(1000).unwrap();
        assert_eq!(removed, 1);
        assert!(db.lookup_tts_cache("old").unwrap().is_none());
        assert!(db.lookup_tts_cache("new").unwrap().is_some());
    }

    #[test]
    fn tts_cache_count_reflects_total() {
        let db = fresh_db();
        assert_eq!(db.tts_cache_count().unwrap(), 0);
        db.upsert_tts_cache(&cache_row("a", "/a.mp3", 1)).unwrap();
        db.upsert_tts_cache(&cache_row("b", "/b.mp3", 2)).unwrap();
        db.upsert_tts_cache(&cache_row("c", "/c.mp3", 3)).unwrap();
        assert_eq!(db.tts_cache_count().unwrap(), 3);
    }

    // ─── AssemblyKit 持久化（Stage 16.3） ──────────────────

    fn assembly_row(project_id: &str, json: &str) -> AssemblyKitRow {
        AssemblyKitRow {
            project_id: project_id.to_string(),
            assembly_json: json.to_string(),
            created_at: 1000,
            updated_at: 2000,
        }
    }

    fn ensure_project(db: &Db, id: &str) {
        let p = ProjectRow {
            id: id.to_string(),
            name: "test".to_string(),
            intent_json: "{}".to_string(),
            video_path: "/v.mp4".to_string(),
            subtitle_path: None,
            created_at: 1,
            updated_at: 1,
        };
        db.upsert_project(&p).unwrap();
    }

    #[test]
    fn assembly_kit_upsert_then_get_round_trip() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        let row = assembly_row("p1", r#"{"id":"a1","videoTracks":[]}"#);
        db.upsert_assembly_kit(&row).unwrap();

        let got = db.get_assembly_kit("p1").unwrap().unwrap();
        assert_eq!(got.project_id, "p1");
        assert_eq!(got.assembly_json, r#"{"id":"a1","videoTracks":[]}"#);
        assert_eq!(got.created_at, 1000);
        assert_eq!(got.updated_at, 2000);
    }

    #[test]
    fn assembly_kit_upsert_updates_json_and_timestamp() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "v1")).unwrap();
        db.upsert_assembly_kit(&assembly_row("p1", "v2")).unwrap();

        let got = db.get_assembly_kit("p1").unwrap().unwrap();
        assert_eq!(got.assembly_json, "v2");
        assert_eq!(got.created_at, 1000); // 不变
        assert_eq!(got.updated_at, 2000);
    }

    #[test]
    fn assembly_kit_get_missing_returns_none() {
        let db = fresh_db();
        assert!(db.get_assembly_kit("nonexistent").unwrap().is_none());
    }

    #[test]
    fn assembly_kit_delete_removes_row() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "x")).unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_some());
        db.delete_assembly_kit("p1").unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_none());
    }

    #[test]
    fn assembly_kit_cascades_on_project_delete() {
        let db = fresh_db();
        ensure_project(&db, "p1");
        db.upsert_assembly_kit(&assembly_row("p1", "x")).unwrap();

        // 删 project → 应该级联删 assembly_kit
        db.delete_project("p1").unwrap();
        assert!(db.get_assembly_kit("p1").unwrap().is_none());
    }
}
