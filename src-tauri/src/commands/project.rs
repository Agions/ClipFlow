use crate::types::AutonomousRenderInput;
use crate::utils::chrono_like_timestamp;
use std::path::PathBuf;
use tauri::Manager;
use tokio::fs as tokio_fs;

#[tauri::command]
pub async fn check_app_data_directory(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    tokio_fs::create_dir_all(&cutdeck_dir)
        .await
        .map_err(|e| format!("创建目录失败: {e}"))?;
    Ok(cutdeck_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn save_project_file(
    app: tauri::AppHandle,
    project_id: String,
    content: String,
) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    tokio_fs::create_dir_all(&cutdeck_dir)
        .await
        .map_err(|e| format!("创建目录失败: {e}"))?;
    let mut target_path = PathBuf::from(&cutdeck_dir);
    target_path.push(format!("{project_id}.json"));
    tokio_fs::write(&target_path, content)
        .await
        .map_err(|e| format!("写入项目文件失败: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn load_project_file(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    let target_path = cutdeck_dir.join(format!("{project_id}.json"));
    tokio_fs::read_to_string(&target_path)
        .await
        .map_err(|e| format!("读取项目文件失败: {e}"))
}

#[tauri::command]
pub async fn delete_project_file(
    app: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    let target_path = cutdeck_dir.join(format!("{project_id}.json"));
    if target_path.exists() {
        tokio_fs::remove_file(&target_path)
            .await
            .map_err(|e| format!("删除项目文件失败: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn list_project_files(
    app: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let cutdeck_dir = app_dir.join("CutDeck");
    tokio_fs::create_dir_all(&cutdeck_dir)
        .await
        .map_err(|e| format!("创建目录失败: {e}"))?;

    let mut result: Vec<serde_json::Value> = Vec::new();
    let mut entries =
        tokio_fs::read_dir(&cutdeck_dir).await.map_err(|e| format!("读取项目目录失败: {e}"))?;
    let mut dir_entry = entries
        .next_entry()
        .await
        .map_err(|e| format!("读取目录项失败: {e}"))?;
    while let Some(entry) = dir_entry {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
            dir_entry = entries
                .next_entry()
                .await
                .map_err(|e| format!("读取目录项失败: {e}"))?;
            continue;
        }
        let file_stem = path
            .file_stem()
            .and_then(|name| name.to_str())
            .map(|value| value.to_string())
            .unwrap_or_default();
        match tokio_fs::read_to_string(&path).await {
            Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                Ok(mut json) => {
                    if let Some(object) = json.as_object_mut() {
                        let has_id = object
                            .get("id")
                            .and_then(|value| value.as_str())
                            .map(|value| !value.trim().is_empty())
                            .unwrap_or(false);
                        if !has_id && !file_stem.is_empty() {
                            object.insert(
                                "id".to_string(),
                                serde_json::Value::String(file_stem.clone()),
                            );
                        }
                    }
                    result.push(json)
                }
                Err(_) => {}
            },
            Err(_) => {}
        }
        dir_entry = entries
            .next_entry()
            .await
            .map_err(|e| format!("读取目录项失败: {e}"))?;
    }

    Ok(result)
}

#[tauri::command]
pub async fn list_app_data_files(
    app: tauri::AppHandle,
    directory: String,
) -> Result<Vec<String>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let target_dir = app_dir.join(directory);
    tokio_fs::create_dir_all(&target_dir)
        .await
        .map_err(|e| format!("创建目录失败: {e}"))?;

    let mut files = Vec::new();
    let mut entries =
        tokio_fs::read_dir(&target_dir).await.map_err(|e| format!("读取目录失败: {e}"))?;
    let mut dir_entry = entries
        .next_entry()
        .await
        .map_err(|e| format!("读取目录项失败: {e}"))?;
    while let Some(entry) = dir_entry {
        if entry.path().is_file().await {
            files.push(entry.file_name().to_string_lossy().to_string());
        }
        dir_entry = entries
            .next_entry()
            .await
            .map_err(|e| format!("读取目录项失败: {e}"))?;
    }
    Ok(files)
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    let forbidden = ["/", "/home", "/root", "/tmp", "/var", "/etc", "/usr", "/opt"];
    for dir in forbidden {
        if canonical.starts_with(dir) && canonical != PathBuf::from(dir) {
            if !canonical.starts_with("/tmp/cutdeck") && !canonical.starts_with("/tmp/CutDeck") {
                return Err("禁止删除此路径".to_string());
            }
        }
    }

    if target.exists() {
        tokio_fs::remove_file(&target)
            .await
            .map_err(|e| format!("删除文件失败: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    let allowed_dirs = ["/tmp/cutdeck", "/tmp/CutDeck", ".cutdeck"];
    let is_allowed = allowed_dirs
        .iter()
        .any(|dir| canonical.starts_with(dir));
    if !is_allowed && !path.starts_with("/tmp/") && !path.starts_with(".") {
        return Err("禁止读取此路径".to_string());
    }

    tokio_fs::read_to_string(path)
        .await
        .map_err(|e| format!("读取文件失败: {e}"))
}

#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    let target = PathBuf::from(&path);
    let canonical = target.canonicalize().map_err(|e| format!("路径无效: {e}"))?;

    let allowed_prefixes = ["/tmp/cutdeck", "/tmp/CutDeck"];
    let is_allowed = allowed_prefixes
        .iter()
        .any(|prefix| canonical.starts_with(prefix));
    if !is_allowed && !path.starts_with("/tmp/") && !path.contains("cutdeck") {
        return Err("禁止获取此文件的信息".to_string());
    }

    let metadata = tokio_fs::metadata(&path)
        .await
        .map_err(|e| format!("读取文件信息失败: {e}"))?;
    Ok(metadata.len())
}
