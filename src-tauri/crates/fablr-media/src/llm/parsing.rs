//! LLM 响应解析
//! 将 LLM 输出的文本解析为带时间轴的 ScriptSegment

use super::types::{GenerateScriptOutput, ScriptSegment};
use super::helpers::estimate_script_duration;

/// 解析 LLM 输出的脚本文本，生成带时间轴的片段
/// 使用均匀分割策略：总时长 / 片段数 = 每个片段时长
pub fn parse_script_output(raw_text: &str, total_duration: Option<f64>, segment_count: Option<i32>) -> GenerateScriptOutput {
    let clean_text = raw_text.trim().to_string();
    let estimated_duration = estimate_script_duration(&clean_text);

    let effective_duration = total_duration.unwrap_or(estimated_duration);
    let count: usize = segment_count.map(|c| c.max(0) as usize).unwrap_or_else(|| {
        // 根据时长估算片段数：每 30-60 秒一段
        let segs = (effective_duration / 45.0).round() as usize;
        segs.clamp(3, 20)
    });

    let segment_duration = effective_duration / count as f64;

    let segments: Vec<ScriptSegment> = (0..count)
        .map(|i| {
            let start = (i as f64) * segment_duration;
            let end = ((i + 1) as f64) * segment_duration;
            // 估算每段文字量（按比例）
            let char_count = (clean_text.chars().count() as f64 * segment_duration / effective_duration) as usize;
            let text = extract_segment_text(&clean_text, i, count, char_count);
            ScriptSegment {
                index: (i + 1) as i32,
                start,
                end,
                text,
            }
        })
        .collect();

    GenerateScriptOutput {
        script: clean_text,
        estimated_duration_secs: estimated_duration,
        segments,
    }
}

/// 从完整脚本中提取第 i 个片段的文字
fn extract_segment_text(full_script: &str, index: usize, total: usize, _char_count: usize) -> String {
    let all_chars: Vec<char> = full_script.chars().collect();
    let total_chars = all_chars.len();

    if total_chars == 0 {
        return String::new();
    }

    let chars_per_segment = (total_chars + total - 1) / total;
    let start = index * chars_per_segment;
    let end = (start + chars_per_segment).min(total_chars);

    all_chars[start..end].iter().collect::<String>()
}

/// 清理脚本文本中的 markdown 格式和多余空白
pub fn clean_script_text(text: &str) -> String {
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}