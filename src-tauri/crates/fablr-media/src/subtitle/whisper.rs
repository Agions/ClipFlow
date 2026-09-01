// faster-whisper Python 代码片段 — normalize_text + transcribe 逻辑
//
// 加载 Python 模板（whisper_transcribe.py.tmpl），用 3 个占位符
// 替换后返回完整 Python 源码。spawn_blocking 会把这份源码写入
// 临时文件 + 启动 python3 执行。
//
// 重构自原本的 3 段 r#"..."# 字符串拼接 —— 旧实现因 raw string
// 配对问题（Python 里的 `"` 字符与 `r#""#` delimiter 冲突）让
// cargo check 报 lexer 错。改用 `include_str!` 之后 Python
// 代码原样保留在 .py.tmpl 里，Rust 端不参与字符串字面量解析。

/// 运行 faster-whisper 转录并返回完整 Python 脚本源码。
/// 模板里的 `{model_size}` / `{audio_path}` / `{language}` 三个
/// 占位符会被替换为入参。返回的源码可直接喂给 `spawn_blocking`。
pub fn whisper_python_code(model: &str, audio_path: &str, lang_arg: &str) -> String {
    const TEMPLATE: &str = include_str!("whisper_transcribe.py.tmpl");
    // 用 Debug-format audio_path 让 Python 端得到带引号的 repr
    // （如果是裸字符串字面量也得包），这样模板里的 `{audio_path}`
    // 直接展开成 `"..."` 形式。
    let audio_path_repr = format!("{:?}", audio_path);
    TEMPLATE
        .replace("{model_size}", model)
        .replace("{audio_path}", &audio_path_repr)
        .replace("{language}", lang_arg)
}
