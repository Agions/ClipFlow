# CutDeck v2.0 — 全自动拆条设计文档

> 生成时间: 2026-04-21  
> 版本: 2.0-draft  
> 状态: Draft → 待主人确认

---

## 1. 概述

### 1.1 解决的问题

传统视频剪辑最大痛点：长视频需要拆成多个短片段分发到不同平台，需要人工反复观看、逐个标记、手动导出。

CutDeck v2.0 将这个过程**完全自动化**。

### 1.2 核心目标

| 目标 | 描述 |
|------|------|
| 全自动拆条 | AI 自动完成选段/剪辑/字幕，最少人工干预 |
| 视频质量兜底 | 情感峰值作为质量加分项，不牺牲内容质量 |
| 三档交互模式 | 简单模式 / 标准模式 / 专业模式，用户按需切换 |
| 剪映草稿导出 | 导出为剪映草稿格式，支持二次精剪辑 |
| 全平台覆盖 | 抖音/小红书/B站/快手/视频号/YouTube/TikTok |

### 1.3 Scope 边界

**包含：**
- AI 选段 → 自动剪辑 → 字幕生成 → 多格式导出
- 三档交互模式（简单/标准/专业）
- 剪映草稿导出（单向，CutDeck → 剪映）
- 双轨字幕（ASR 提取 + AI 字幕生成）
- 全平台多格式导出
- 断点续传 + 自动重试

**明确排除：**
- ❌ 自动配乐/音效（音乐版权问题）
- ❌ 特效/转场自动化（保持手动）
- ❌ 多视频混剪（专注单视频→多片段）
- ❌ 云端渲染/协作（本地 Tauri 优先）

---

## 2. 目标用户

| 用户群 | 场景 | 使用模式 |
|--------|------|---------|
| 个人创作者 | 抖音/B站/YouTube 博主，自己拍自己剪 | 简单模式为主 |
| 内容团队/工作室 | 3-5 人小组，批量处理客户素材 | 标准模式为主 |
| 企业/培训 | 会议录像/培训课程自动剪辑 | 专业模式 |

---

## 3. 成功标准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 拆条准确率 | > 85% | AI 选段质量评估 |
| 单视频处理时间 | < 5 分钟 | 长视频 30min 以内 |
| 导出成功率 | > 95% | 多格式导出稳定性 |
| 用户满意度 | 简单模式无需调整 | B+C 为核心目标 |

---

## 4. 核心架构

### 4.1 整体架构

```
视频上传
    ↓
┌─────────────────────────────────────────────┐
│  AI 分析 (vision.service.ts)                │
│  场景检测 · 情绪识别 · 唇动/静音检测         │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  拆条 Pipeline (clipRepurposing/pipeline)  │
│  6维评分 → 片段生成 → SEO元数据             │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  片段输出 (ClipSegment[])                    │
│  包含: 片段元数据, 字幕, SEO, 时间范围       │
└─────────────────────────────────────────────┘
         ↓             ↓             ↓
   simpleClipList  standardClipList  proClipList
         ↓             ↓             ↓
   片段列表勾选    片段预览+微调    Timeline 编辑
         └─────────────┴─────────────┘
                   ↓
        ┌──────────────────────────┐
        │  剪映草稿导出            │
        │  + 字幕适配剪映格式      │
        └──────────────────────────┘
                   ↓
        ┌──────────────────────────┐
        │  多格式导出              │
        │  抖音/小红书/B站/        │
        │  快手/视频号/            │
        │  YouTube/TikTok          │
        └──────────────────────────┘
```

### 4.2 三档交互模式

#### Simple 模式（个人创作者）
```
AI 拆条完成 → 片段列表展示（缩略图+时长+标题）→ 用户勾选片段 → 选择平台 → 导出
```
- 无需进入时间轴
- 片段不可编辑，信任 AI 选段
- 一键导出到选定平台

#### Standard 模式（工作室）
```
AI 拆条完成 → 片段预览播放 → 可做简单调整（修剪端点/合并相邻片段）→ 确认 → 导出
```
- 片段可微调（trim in/out 点）
- 可合并相邻片段
- 不进入完整时间轴

#### Professional 模式（高端用户）
```
AI 拆条完成 → 片段进入时间轴（Timeline）→ 完整剪辑能力 → 导出
```
- 完整时间轴编辑能力
- 可添加转场/特效（手动）
- 可多片段组合/重排

### 4.3 Pipeline 数据流

```typescript
interface ClipPipelineInput {
  videoPath: string;
  videoMeta: VideoMeta;
  options: {
    targetDuration: { min: number; max: number }; // 9-30s 黄金长度
    completenessWeight: number;  // 完整性权重（底线）
    qualityWeight: number;      // 情感峰值权重（加分项）
  };
}

interface ClipSegment {
  id: string;
  sourceStartMs: number;
  sourceEndMs: number;
  duration: number;
  score: {
    total: number;
    completeness: number;
    emotionPeak: number;
    silenceRatio: number;
    contentDensity: number;
  };
  subtitle: {
    original: string;      // Whisper ASR 原文
    refined: string;       // AI 润色后
    segments: SubtitleSegment[];
  };
  seo: {
    title: string;
    description: string;
    hashtags: string[];
    platform: string;
  };
  thumbnail?: string;
  // 剪映草稿用
  jianYingClip: JianYingClipData;
}
```

---

## 5. AI 选段逻辑

### 5.1 6 维评分体系

| 维度 | 权重策略 | 说明 |
|------|---------|------|
| 完整性 (completeness) | **最高（底线）** | 片段有头有尾，不切半句话；低于阈值直接淘汰 |
| 时长控制 (duration) | **高（底线）** | 9-30 秒黄金长度，不在范围内直接淘汰 |
| 情感峰值 (emotionPeak) | **加分项** | 笑声/掌声/情绪高潮片段得额外加分 |
| 静默比 (silenceRatio) | 辅助 | 静默过多降权 |
| 内容密度 (contentDensity) | 辅助 | 有意义内容占比 |
| 关键词权重 (keywordWeight) | 辅助 | 关键词出现频率 |

### 5.2 选段流程

```
1. 场景检测 → 切分候选片段
2. 完整性过滤 → 去除头部/尾部不完整的片段
3. 时长过滤 → 去除 <9s 或 >30s 的片段
4. 6维评分 → 计算综合得分
5. 去重 → 去除高度重叠的片段
6. 排序 → 按得分降序，保留 Top N
```

---

## 6. 字幕模块

### 6.1 双轨字幕

| 模式 | 输入 | 输出 | 适用场景 |
|------|------|------|---------|
| ASR 提取 | 视频音频 | Whisper 识别原文 + AI 标点/分段 | 通用，所有视频 |
| AI 生成 | 用户脚本/口述 | 符合视频内容的字幕 | 用户有现成脚本 |

### 6.2 字幕格式适配剪映

剪映草稿的字幕结构为 JSON，包含：
- 文字内容
- 时间轴（in/out ms）
- 样式（字体/颜色/描边/阴影/位置）

CutDeck 导出时须按剪映格式生成，确保在剪映中打开后样式一致。

---

## 7. 剪映草稿导出

### 7.1 导出流程

```
CutDeck 片段列表
    ↓
组装剪映草稿 JSON
    ↓
验证草稿结构完整性
    ↓
写入 .jianYing 目录（含 draft_content.json）
    ↓
复制源视频引用（相对路径）
    ↓
提示用户用剪映打开
```

### 7.2 技术要点

- 草稿格式：`.jianYing/draft_content.json`
- 视频路径使用相对路径，避免跨设备失效
- 字幕/片段/时间轴全部转为剪映内部格式
- 导出后提示用户：剪映中可能需要重新链接源视频

---

## 8. 多格式导出

### 8.1 支持平台

| 平台 | 比例 | 分辨率 | 帧率 | 码率预设 |
|------|------|--------|------|---------|
| 抖音 | 9:16 | 1080×1920 | 30 | 高 |
| 小红书 | 9:16 | 1080×1920 | 30 | 高 |
| B站 | 16:9 | 1920×1080 | 30 | 高 |
| 快手 | 9:16 | 1080×1920 | 30 | 中 |
| 视频号 | 16:9 / 9:16 | 1080×1920 | 30 | 中 |
| YouTube | 16:9 | 1920×1080 | 60 | 最高 |
| TikTok | 9:16 | 1080×1920 | 30 | 高 |

### 8.2 导出流程

```
选定片段 + 选定平台
    ↓
FFmpeg 裁剪 + 缩放 + 编码
    ↓
字幕烧录（SRT → ASS 样式）
    ↓
输出 .mp4 + .srt
```

---

## 9. 异常处理

### 9.1 断点续传 + 自动重试策略

```
Step 1: AI 分析
  → 失败：自动重试 2 次
  → 仍失败：保存断点 → 通知用户
  
Step 2: 拆条评分
  → 失败：自动重试 2 次
  → 仍失败：使用已有分析结果，跳过评分
  
Step 3: 字幕生成
  → 失败：降级到本地 Whisper
  → 仍失败：保存断点 → 通知用户
  
Step 4: 草稿导出
  → 失败：保存断点 → 通知用户
  
Step 5: 视频导出
  → 失败：保留已导出片段，标记失败片段
```

### 9.2 断点保存格式

```typescript
interface PipelineCheckpoint {
  videoId: string;
  completedSteps: string[];  // ['analyze', 'segment', 'subtitle']
  currentStep: string;
  partialResults: {
    analysisResult?: AnalysisResult;
    segments?: ClipSegment[];
    subtitles?: SubtitleResult;
  };
  failedReason?: string;
  timestamp: number;
}
```

---

## 10. 现有模块复用

| 模块 | 路径 | 复用方式 |
|------|------|---------|
| 6维评分引擎 | `src/core/services/clipRepurposing/clipScorer.ts` | 直接复用 |
| SEO 生成器 | `src/core/services/clipRepurposing/seoGenerator.ts` | 直接复用 |
| 多格式导出 | `src/core/services/clipRepurposing/multiFormatExport.ts` | 直接复用 |
| Whisper ASR | `src/core/services/asr.service.ts` | 直接复用 |
| 字幕服务 | `src/core/services/subtitle.service.ts` | 扩展支持剪映格式 |
| Vision 分析 | `src/core/services/vision.service.ts` | 直接复用 |
| Timeline Store | `src/store/editorStore.ts` | Professional 模式用 |
| AI Service | `src/core/services/ai.service.ts` | 直接复用 |

---

## 11. 待 Phase 2 细化

- [ ] 剪映草稿 JSON 格式逆向（需实测一个草稿文件）
- [ ] 字幕样式配置面板设计
- [ ] 断点续传的 checkpoint 存储方案（localStorage / 文件）
- [ ] 三档模式的 UI 切换交互
- [ ] 平台预设的码率/分辨率详细配置表
- [ ] 完整性过滤的"头部/尾部"判断逻辑
- [ ] 情感峰值检测的具体实现（音频能量/视觉笑点）

---

## 12. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 剪映草稿格式变化 | 中 | 高 | 保留版本检测，文档记录格式版本 |
| 断点续传状态丢失 | 低 | 中 | localStorage + Tauri 文件双写 |
| 情感峰值误判 | 中 | 中 | 情感峰值仅作加分项，不做硬过滤 |
| 长视频 FFmpeg OOM | 低 | 高 | 分段处理 + 内存监控 |

---

*本文档为 Brainstorming 阶段输出物，待主人确认后进入 Phase 2: Writing Plans*
