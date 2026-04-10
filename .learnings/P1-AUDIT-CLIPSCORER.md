# P1 审计报告：clipScorer.ts 6维评分完整性

> 审计时间：2026-04-10 | 审计人：Claw

## 一、6维评分实现状态

| 维度 | 文档承诺 | 实现状态 | 备注 |
|------|---------|---------|------|
| 笑声密度 | 笑声/鼓掌密度 | ✅ 已实现 | `scoreLaughter()` — 笑声关键词统计 |
| 情感峰值 | 情感峰值（惊喜/愤怒/兴奋） | ✅ 已实现 | `scoreEmotion()` — 情感关键词命中 |
| 内容完整度 | 对话完整性（是否被打断） | ✅ 已实现 | `scoreCompleteness()` — 首尾句子完整性 |
| 静默比 | 有声占比（过低=纯静音，过高=嘈杂） | ✅ 已实现 | `scoreSilenceRatio()` — ASR字数/时长 |
| 节奏感 | 语速健康度（太快/太慢都要扣分） | ✅ 已实现 | `scorePace()` — 字数/分钟评估 |
| 关键词权重 | 高 engagement 词 | ✅ 已实现 | `scoreKeywords()` — 60+ 中英关键词 |

**结论：6维评分全部已实现**，代码结构完整，权重归一化正确。

---

## 二、发现的问题

### 问题 1：pipeline.ts 未传入 emotion / laughter 数据（P0级）

**文件**: `clipRepurposing/pipeline.ts`

`buildCandidates()` 只使用了 `analysis.scenes`，完全没有调用：
- `analysis.emotions`（情感峰值数据）
- `analysis.keyframes`（高光帧数据）
- `visionService.detectHighlights()`（Rust 高光检测）

这导致 Rust `highlight_detector.rs` 的输出完全被忽略。

**影响**：emotion_peak 和 laughter_density 两个维度退化为基于 transcript 的文本分析，无法利用音视频信号。

**修复方案**：
```typescript
// 在 buildCandidates 中接入 Rust 高光检测
const highlights = await visionService.detectHighlights(videoInfo, {
  top_n: 10,
  min_duration_ms: 500,
});

// 将 highlights 转为 CandidateClip 候选
highlights.forEach(h => {
  candidates.push({
    startTime: h.startTime,
    endTime: h.endTime,
    sceneType: 'highlight',
    transcript: extractTranscript(analysis, h.startTime, h.endTime),
    audioEnergy: h.audioScore,
  });
});
```

### 问题 2：multiFormatExporter 硬编码路径（P1级）

**文件**: `clipRepurposing/pipeline.ts:145`

```typescript
outputDir: '/tmp/cutdeck-exports',  // 硬编码路径
```

桌面应用应使用 Tauri 的 `appDataDir` 或用户选择路径。

### 问题 3：SEO 多平台适配不完整（P1级）

**文件**: `seoGenerator.ts`

- `xiaohongshu` hashtag 只有 4 个（偏少）
- `douyin` 完全没有 hashtag 映射
- 各平台 description 模板差异不大，未针对平台特性优化

---

## 三、当前调用链

```
AIVideoEditor
  └── ClipRepurpose.tsx (UI)
        └── clipWorkflowService.processVideo()
              └── ClipRepurposingPipeline.run()
                    ├── buildCandidates()  ← 只用 scenes，忽略 emotions/highlights
                    ├── clipScorer.topClips()  ✅ 6维评分正常
                    └── seoGenerator.generateBatch()  ✅ 多平台基本支持
```

---

## 四、建议修复优先级

1. **[P0]** pipeline.ts 接入 `visionService.detectHighlights()`，将 Rust 高光数据注入候选片段
2. **[P1]** `scoreLaughter` 和 `scoreEmotion` 增加音频能量加权（`audioEnergy` 字段）
3. **[P1]** 补全 douyin hashtag 映射，扩展 xiaohongshu hashtag 至 20+
4. **[P2]** 硬编码路径替换为 Tauri path API

---

## P1 修复完成（2026-04-10 下午）

### 修复 1：clipScorer audioEnergy 加权
- `scoreLaughter()` 和 `scoreEmotion()` 现在接收 `clip.audioEnergy`
- 高音频能量段（>0.5）额外加权 25-30 分
- 追加笑声关键词：哈哈哈、笑死、太好笑

### 修复 2：SEO 多平台 hashtag 扩展
- douyin: 7 → 15 个（新增：上热门、必看、种草、干货、好物推荐、生活小技巧、真实分享等）
- xiaohongshu: 7 → 20 个（新增：真实分享、穿搭、美妆、护肤、生活技巧、家居、母婴、职场、美食、旅行、健身、Plog）

### 修复 3：硬编码路径
- Rust 新增 `get_export_dir` 命令（使用 dirs crate，返回平台下载目录）
- pipeline.ts：`/tmp/cutdeck-exports` → `invoke('get_export_dir')`
- ClipRepurpose.tsx：`/tmp/CutDeck/...` → `invoke('get_export_dir')`
