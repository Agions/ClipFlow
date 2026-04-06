# CutDeck 项目规划 v1.5 — v2.0

> 规划日期：2026-04-06
> 版本基础：v1.4.0（核心流程架构升级完成）
> 行业参考：OpusClip / Vizard / Submagic / InVideo AI 竞品分析

---

## 一、现状评估

### 1.1 已有能力（强项）

| 模块 | 状态 | 说明 |
|------|------|------|
| 工作流引擎 | ✅ 完善 | 12 步骤状态机，StepExecutor 架构清晰 |
| AI 剪辑 | ✅ 可用 | aiClip / smartClip 双模式 |
| 配乐 | ✅ 框架完成 | musicStep 骨架，4 个 TODO 待接入真实 API |
| 字幕识别 | ✅ 框架完成 | Whisper 集成骨架，3 个 TODO |
| 场景检测 | ✅ 完善 | VisionService + extractKeyframes 已修复 |
| UI 设计 | ✅ 成熟 | AI Cinema Studio 设计系统 |
| Tauri 桌面 | ✅ 完善 | v2 插件体系 |

### 1.2 技术债（必须清理）

| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | ASR 服务 3 个 TODO 未实现 | 字幕识别无法真正工作 |
| P0 | 配乐服务 4 个 TODO 未实现 | 自动配乐为空函数 |
| P1 | `plotAnalysis.service.ts` 调用 `extractKeyframes` 参数类型 | 刚修复的方法，调用方未更新 |
| P1 | Vitest 测试并行 worker 隔离问题 | 180 测试 6 个 errors |
| P2 | `dedup.variants.ts` 426 行巨型文件 | 难以维护 |
| P2 | `ai.service.ts` 769 行巨型文件 | 职责单一，应拆分 |

### 1.3 竞品差距分析（2026 行业趋势）

```
CutDeck 当前                        竞品标配（2026）
─────────────────                  ─────────────────────
✓ AI 剪辑工作流                    ✓ 长视频→短视频自动拆条
✓ 多轨时间线                       ✓ AI 自动生成字幕 + 社交平台优化
✓ 多语言字幕提取                   ✓ AI 自动配音/翻译（Dubbing）
✓ 配乐推荐                         ✓ 多格式输出（9:16 / 1:1 / 16:9）
                                     ✓ SEO meta-description 自动生成
                                     ✓ 社交媒体一键发布
                                     ✓ 视频封面自动生成
                                     ✓ Web 端（无需下载）
```

---

## 二、版本规划

### v1.5.0 — 清理技术债（4 月中）

**主题：稳定性收尾，无新功能**

#### P0: TODO 全清理
```
[asr.service.ts]
- TODO: 接入真实 ASR API（Faster-Whisper 本地优先）
- TODO: 讯飞 ASR 接入
- TODO: 腾讯 ASR 接入

[auto-music.service.ts]
- TODO: 接入音乐库 API（免费音乐 API 如 Free Music Archive / Pixabay）
- TODO: 基于 AI 分析推荐音乐
- TODO: 接入音频分析 API
- TODO: 接入节拍检测 API（librosa）
```

#### P1: 类型安全收尾
```
- plotAnalysis.service.ts: extractKeyframes 调用方更新为正确类型
- ai.service.ts: 剩余 2 处内部 as any（内部逻辑区）
```

#### P1: 测试隔离修复
```
- route-preload.test.ts: mock 动态 import，隔离 worker
```

**发布标准：**
- `pnpm run lint` 0 errors
- `pnpm vitest run` 180 passed 0 errors
- 所有 TODO 位置有真实实现或明确 skip 理由

---

### v1.6.0 — 内容复用管道（4 月底）

**主题：长视频 → 多片段短视频自动拆条**

这是 OpusClip / Vizard 的核心能力，也是 2026 年最大需求点。

#### 核心功能

**ClipRepurposingPipeline**（新增 service）
```
输入：长视频（1小时+）
处理：
  1. AI 分析全片，识别"高光时刻"（笑声/情感峰值/语速变化/关键动作）
  2. 每个高光生成一个独立短片段（15-60秒）
  3. 自动添加字幕（带动画）
  4. 生成 3 种比例版本：9:16（TikTok/Reels）、1:1（Instagram）、16:9（YouTube Shorts）
  5. 每片段生成：标题、描述、 hashtags
输出：N 个可发布的短视频 + 元数据
```

**ClipScorer**（参考 Narrafiilm v3.2.0 实现）
```
评分维度：
- 笑声/情感峰值权重
- 语速变化（快节奏 > 慢节奏）
- 关键词命中
- 场景完整性
- 画面稳定性
```

**SEO Meta 生成**
```
- 每片段生成：标题（≤60字）、描述（≤150字）、标签（5-10个）
- 支持平台：YouTube、TikTok、Instagram
```

**多格式导出**
```
- 9:16 portrait（TikTok / Reels / Shorts）
- 1:1 square（Instagram Feed）
- 16:9 landscape（YouTube Shorts）
```

#### 文件变更
```
src/core/services/
  clipRepurposing/
    pipeline.ts        # 拆条管道
    clipScorer.ts     # 片段评分
    seoGenerator.ts   # SEO 元数据生成
    multiFormatExport.ts  # 多格式输出
  workflow/steps/
    repurposingStep.ts    # 新 workflow 步骤
```

---

### v1.7.0 — AI 增强（5 月中）

**主题：配音、翻译、品牌 QA**

#### AI Dubbing（配音/翻译）
```
- 支持目标语言：中/英/日/韩/西/法/德
- 保持原音色克隆（需用户授权）
- 自动对口型
- 多语言字幕同步
```

#### 品牌安全 QA
```
- 自动检测敏感内容（台词/画面）
- 品牌指南合规检查（颜色/字体/水印）
- 发布前人工复核节点
```

#### AI 视频封面生成
```
- 从片段中选取最佳帧
- AI 生成封面文字叠加
- 多版本 A/B 测试封面
```

---

### v1.8.0 — 平台与分发（5 月底）

**主题：社交发布 + Web 端**

#### 社交媒体发布
```
- YouTube Direct Upload（OAuth）
- TikTok API 集成
- 定时发布队列
```

#### Web 端（无需下载）
```
- 核心工作流迁移到 Web
- 使用 WebCodecs 处理视频
- 降低用户门槛
```

#### 开发者 API
```
- REST API 暴露核心能力
- Webhook 事件通知
- API Key 管理
```

---

### v1.9.0 — 性能与架构（6 月中）

**主题：WebCodecs + 性能优化**

#### WebCodecs 视频处理
```
- 浏览器内视频转码（不依赖 FFmpeg）
- 更快的预览渲染
- 降低 Tauri 依赖
```

#### 性能优化
```
- 大型项目懒加载
- 视频缩略图缓存策略
- 工作流增量保存
```

#### 协作功能（可选 v2.0）
```
- 多用户同时编辑
- 评论和标注
- 版本历史
```

---

## 三、技术债务路线图

```
v1.4.0: 架构升级完成 ✅
v1.5.0: TODO 清理 + 类型安全收尾 ✅
v1.6.4: 文件结构优化（hooks合并） ← 当前位置
v1.7.0: AI 增强（配音/翻译）
v1.8.0: 平台分发
v1.9.0: 性能优化
v2.0.0: 协作 + WebCodecs
```

---

## 四、研发决策

### 决策 1：先清理还是先加功能？
**结论：先清理（v1.5.0）**
- TODO 过多会腐蚀架构信心
- 竞品差距中，配音/翻译是最有价值的功能，需要稳定基座

### 决策 2：Web 端 vs 桌面端优先？
**结论：先桌面端稳定，Web 端作为 v1.8.0**
- WebCodecs 尚不成熟（Safari 支持有限）
- Tauri v2 桌面端已经稳定

### 决策 3：Dubbing 自研 vs 第三方 API？
**结论：第三方 API 优先（HeyGen / ElevenLabs）**
- 自研成本高，模型效果差距大
- 先集成验证市场反应，再决策是否自研

---

## 五、下一步行动（v1.5.0）

**立即执行（本周）：**

- [ ] ASR 服务：确认 Faster-Whisper 可用性，实现本地优先策略
- [ ] 配乐服务：接入 Pixabay 音乐 API（免费，无需授权）
- [ ] 修复 plotAnalysis 调用的类型问题
- [ ] 修复 Vitest 测试隔离
- [ ] `ai.service.ts` 和 `dedup.variants.ts` 评估是否需要拆分

**产出：**
- `pnpm vitest run` → 180 passed 0 errors
- `grep -r "TODO" src/core/` → 0 results
