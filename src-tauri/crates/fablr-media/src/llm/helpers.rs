//! LLM 辅助函数
//! Prompt 构建、时长估算

use super::types::ScriptStyle;

/// 估算脚本时长（秒）
/// 中文平均语速：400字/分钟 ≈ 6.7字/秒，考虑停顿和情绪，实际约 5字/秒
pub fn estimate_script_duration(full_script: &str) -> f64 {
    let char_count = full_script.chars().count();
    (char_count as f64 / 5.0).max(1.0)
}

/// 构建系统提示词
pub fn build_system_prompt(style: &ScriptStyle, target_duration: Option<f64>) -> String {
    let style_desc = match style {
        ScriptStyle::Humorous => "幽默搞笑、吐槽风格，语言生动有趣，善于制造笑点和梗",
        ScriptStyle::Emotional => "煽情动人，注重情感渲染，能够打动人心，引发共鸣",
        ScriptStyle::Suspense => "悬疑紧张，节奏紧凑，善于设置悬念，吊足观众胃口",
        ScriptStyle::Informative => "干货满满，逻辑清晰，信息密度高，有实用价值",
        ScriptStyle::Casual => "轻松随意，像和朋友聊天一样，自然亲切",
    };

    let duration_hint = match target_duration {
        Some(secs) => format!("目标时长约 {} 秒", secs as i32),
        None => "根据内容自由把握时长".to_string(),
    };

    format!(
        "你是一位专业的影视解说博主，擅长用生动的语言解说电影/电视剧/短视频。\n\
         风格要求：{}\n\
         {}\n\
         请根据提供的字幕内容，生成一段精彩的影视解说文案。\n\
         要求：\n\
         1. 语言生动有趣，有感染力\n\
         2. 适当加入场景描述和情感渲染\n\
         3. 不要照搬原字幕，要有自己的解读和评论\n\
         4. 控制节奏，不要太长或太短\n\
         5. 用中文输出",
        style_desc, duration_hint
    )
}

/// 构建用户提示词
pub fn build_user_prompt(subtitles: &str, duration_secs: Option<f64>, target: Option<f64>) -> String {
    let duration_info = match (duration_secs, target) {
        (Some(d), Some(t)) => format!("原视频时长 {:.1} 秒，目标解说时长约 {} 秒", d, t as i32),
        (Some(d), None) => format!("原视频时长 {:.1} 秒", d),
        _ => "视频时长未知".to_string(),
    };

    format!(
        "请为以下影视内容生成解说文案：\n\
         {}\n\n\
         字幕内容：\n{}",
        duration_info, subtitles
    )
}