fn main() {
  println!("cargo:rerun-if-changed=src");
  println!("cargo:rerun-if-changed=tauri.conf.json");
  println!("cargo:rerun-if-changed=Cargo.toml");
  tauri_build::build();

  if let Ok(cwd) = std::env::current_dir() {
    if let Some(project_root) = cwd.parent() {
      let script = project_root.join("scripts/validate-models.js");
      if script.exists() {
        if let Ok(status) = std::process::Command::new("node")
          .arg(&script)
          .status()
        {
          if !status.success() {
            eprintln!("[build.rs] 模型同步校验失败，请修复前端 catalog.ts 与 Rust models.json 的不一致");
          }
        }
      }
    }
  }
}
