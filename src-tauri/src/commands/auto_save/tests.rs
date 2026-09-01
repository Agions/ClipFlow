//! Auto-save and crash-recovery tests

// `autosave_path` and `project_path` are crate-private helpers in
// `auto_save.rs`; the test module is a sibling file (`mod tests;`),
// so it cannot access them via `super::` without an explicit use.
use super::{autosave_path, project_path};

#[test]
fn test_autosave_path_format() {
    let dir = std::path::PathBuf::from("/data/fablr");
    let id = "my-project";
    let result = autosave_path(&dir, id);
    assert_eq!(result, std::path::PathBuf::from("/data/fablr/my-project.autosave.json"));
}

#[test]
fn test_project_path_format() {
    let dir = std::path::PathBuf::from("/data/fablr");
    let id = "my-project";
    let result = project_path(&dir, id);
    assert_eq!(result, std::path::PathBuf::from("/data/fablr/my-project.json"));
}

#[test]
fn test_autosave_path_strips_suffix_correctly() {
    let dir = std::path::PathBuf::from("/data/fablr");
    let result = autosave_path(&dir, "proj");
    assert!(result.to_str().unwrap().contains(".autosave.json"));
}

#[test]
fn test_autosave_path_unique_per_id() {
    let dir = std::path::PathBuf::from("/data/fablr");
    let p1 = autosave_path(&dir, "project-a");
    let p2 = autosave_path(&dir, "project-b");
    assert_ne!(p1, p2);
}
