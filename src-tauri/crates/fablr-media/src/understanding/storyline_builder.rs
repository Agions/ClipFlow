//! Storyline Builder — L0 内容理解层编排命令
//!
//! 编排顺序（数据单向流转，每步产物仅作为下一步输入）：
//!   ffprobe 元数据 → SmartSegmenter 场景切分 → Whisper 字幕转录
//!   → 高光检测 → Storyline JSON 组装 → artifacts 落盘
//!
//! 全程通过 `understanding-progress` 事件上报进度（0-100），
//! 前端 `core/services/understanding/storyline-service.ts` 监听该事件。

use std::time::Instant;

use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs as tokio_fs;

use crate::highlight::{combiner, HighlightOptions, HighlightSegment};
use crate::segment::{SegmentOptions, SmartSegmenter, VideoSegment};
use crate::subtitle::types::SubtitleResult;
pub use crate::understanding::types::{
    AnalyzeProductionInput, AnalyzeProductionOutput, UnderstandingStage,
};

/// L0 分析进度事件通道（与前端约定一致）
const UNDERSTANDING_PROGRESS_EVENT: &str = "understanding-progress";

/// 场景类型映射：segment 语义类型 → 前端 SceneType
/// （M2 时间轴对齐阶段按需细化映射规则）
fn scene_type_of(segment: &VideoSegment) -> &'static str {
    match segment.segment_type.as_str() {
        "dialogue" => "dialog",
        "action" => "action",
        "transition" => "action",
        "silence" => "text",
        _ => "text",
    }
}

/// 构建 storyline JSON（字段 camelCase，与前端 Storyline 领域模型对齐）
fn build_storyline_json(
    metadata: &fablr_domain::VideoMetadataResult,
    segments: &[VideoSegment],
    subtitle: &SubtitleResult,
    highlights: &[HighlightSegment],
    elapsed_ms: u64,
) -> serde_json::Value {
    let scenes: Vec<serde_json::Value> = segments
        .iter()
        .enumerate()
        .map(|(i, seg)| {
            json!({
                "id": format!("scene-{i}"),
                "startTime": seg.start_ms as f64 / 1000.0,
                "endTime": seg.end_ms as f64 / 1000.0,
                "type": scene_type_of(seg),
                "score": seg.confidence,
                "duration": seg.duration_ms as f64 / 1000.0,
                "confidence": seg.confidence,
            })
        })
        .collect();

    let subtitles: Vec<serde_json::Value> = subtitle
        .segments
        .iter()
        .enumerate()
        .map(|(i, seg)| {
            json!({
                "id": format!("subtitle-{i}"),
                "startTime": seg.start_ms as f64 / 1000.0,
                "endTime": seg.end_ms as f64 / 1000.0,
                "text": seg.text,
                "confidence": seg.probability,
            })
        })
        .collect();

    let highlights_json: Vec<serde_json::Value> = highlights
        .iter()
        .map(|h| {
            json!({
                "startTime": h.start_ms as f64 / 1000.0,
                "endTime": h.end_ms as f64 / 1000.0,
                "score": h.score,
                "reason": h.reason,
            })
        })
        .collect();

    json!({
        "version": 1,
        "scenes": scenes,
        "subtitles": subtitles,
        "highlights": highlights_json,
        "summary": "",
        "keyPoints": [],
        "confidence": 0.8,
        "analyzeMs": elapsed_ms,
        "analyzedAt": crate::utils::now_iso8601(),
        "durationSecs": metadata.duration,
        "width": metadata.width,
        "height": metadata.height,
        "fps": metadata.fps,
        "codec": metadata.codec,
    })
}

/// 计算 artifacts 目录：`appData/Fablr/productions/{id}/artifacts`
async fn artifacts_dir(app: &AppHandle, production_id: &str) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取 AppData 目录: {e}"))?;
    let dir = app_dir
        .join("Fablr")
        .join("productions")
        .join(production_id)
        .join("artifacts");
    tokio_fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("创建产物目录失败: {e}"))?;
    Ok(dir)
}

/// L0 全链路编排命令：元数据 → 场景 → 字幕 → 高光 → storyline.json 落盘

pub async fn analyze_production(
    app: AppHandle,
    input: AnalyzeProductionInput,
) -> Result<AnalyzeProductionOutput, String> {
    let video_path = input.video_path.trim().to_string();
    if video_path.is_empty() {
        return Err("视频路径不能为空".to_string());
    }
    if input.production_id.trim().is_empty() {
        return Err("productionId 不能为空".to_string());
    }

    let started = Instant::now();
    let emit = |stage: UnderstandingStage, percent: f64, message: &str| {
        let _ = app.emit(
            UNDERSTANDING_PROGRESS_EVENT,
            json!({ "stage": stage.as_str(), "percent": percent, "message": message }),
        );
    };

    emit(UnderstandingStage::Metadata, 5.0, "正在读取视频元数据...");
    let metadata = crate::video::analyze_video(video_path.clone()).await?;
    emit(UnderstandingStage::Metadata, 15.0, "元数据读取完成");

    // 2. 场景切分（15-40%）
    emit(UnderstandingStage::Segment, 20.0, "正在切分场景...");
    let segmenter = SmartSegmenter::new();
    let segments = segmenter
        .smart_segment(&video_path, &SegmentOptions::default())
        .await;
    emit(
        UnderstandingStage::Segment,
        40.0,
        &format!("场景切分完成：{} 段", segments.len()),
    );

    // 3. 字幕转录（40-70%）
    emit(UnderstandingStage::Transcribe, 45.0, "正在转录字幕（Whisper）...");
    let subtitle = crate::subtitle::transcribe::transcribe_audio(
        app.clone(),
        video_path.clone(),
        input.whisper_model.clone(),
        input.language.clone(),
    )
    .await?;
    emit(
        UnderstandingStage::Transcribe,
        70.0,
        &format!("字幕转录完成：{} 条", subtitle.segments.len()),
    );

    // 4. 高光检测（70-90%）
    emit(UnderstandingStage::Highlight, 75.0, "正在检测高光片段...");
    let highlights = combiner::get_highlights(&video_path, &HighlightOptions::default()).await;
    emit(
        UnderstandingStage::Highlight,
        90.0,
        &format!("高光检测完成：{} 段", highlights.len()),
    );

    // 5. 构建 storyline 并落盘（90-100%）
    emit(UnderstandingStage::Build, 92.0, "正在构建剧情时间线...");
    let elapsed_ms = started.elapsed().as_millis() as u64;
    let storyline_json = build_storyline_json(&metadata, &segments, &subtitle, &highlights, elapsed_ms);
    let dir = artifacts_dir(&app, &input.production_id).await?;
    let storyline_path = dir.join("storyline.json");
    let payload = serde_json::to_string_pretty(&storyline_json)
        .map_err(|e| format!("序列化 storyline 失败: {e}"))?;
    tokio_fs::write(&storyline_path, payload)
        .await
        .map_err(|e| format!("写入 storyline.json 失败: {e}"))?;
    emit(
        UnderstandingStage::Done,
        100.0,
        "剧情时间线构建完成，产物已落盘",
    );

    Ok(AnalyzeProductionOutput {
        storyline_path: storyline_path.display().to_string(),
        scenes_count: segments.len(),
        subtitles_count: subtitle.segments.len(),
        highlights_count: highlights.len(),
        duration_secs: metadata.duration,
    })
}
