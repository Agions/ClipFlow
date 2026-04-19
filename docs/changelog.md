---
title: 更新日志
description: CutDeck 版本更新历史，记录每次版本的主要变更。
---

# 更新日志

本文档记录 CutDeck 的所有重要版本更新。

---

## v1.9.8 (2026-04-19)

### 🔒 安全

- **API 密钥加密存储**：API 密钥改用 `tauri-plugin-store` 加密存储（AES 加密），不再明文保存

### 🐛 Bug 修复

- VideoEditor 导出类型安全修复（`Partial<ExportConfig>` + 默认值）
- `handleAnalysisComplete` 闭包陷阱修复（补充 useCallback 依赖项）
- 音量/缩放边界修复（添加 MIN/MAX 常量约束，防止 NaN）

### ⚙️ 代码质量

- 消除 Magic Numbers，提取 8 个命名常量
- Projects 页面网络请求增加 3 次指数退避重试
- Settings 页面移除 `as any` 不安全 cast

## v1.1.1 (2026-04-02)

### 代码优化

- Editor 页面：移除未使用 import，完善占位内容
- Editor 页面：修复 useEffect 依赖缺失
- Editor 页面：复制按钮完整功能实现
- Editor 编辑器：copyClip 复制功能（action + hook + 操作函数）
- Timeline 组件：clipMap HashMap 优化，片段查找 O(n²) → O(1)
- Timeline 组件：handlePasteClip bug 修复
- TimelineRuler：window.innerWidth 响应式问题修复
- WorkflowMonitor：移除 eslint-disable，Timeline items 添加 key
- TimelineClip：移除未使用 Badge import
- ProjectDetail：hooks 重构，消除 rules-of-hooks eslint-disable

### 文档更新

- README 专业精品化升级
- AI 模型配置文档完善
- VitePress 文档站点精品化

---

## v1.1.0 (2026-03-29)

### 新增

- ✨ **设计系统升级** — 全新 UI 界面，现代化科技感设计
- ✨ **专业文档站点** — VitePress 驱动的完整文档系统
- ✨ **多 AI 模型支持** — 新增 Gemini 3.1 Pro、Kimi K2.5 等多个模型
- ✨ **批量处理功能** — 支持队列管理和批量导出
- ✨ **短视频创作指南** — 新增完整的短视频创作文档

### 优化

- 🎨 优化 AI 服务集成，统一管理多提供商
- 🔧 完善组件库，新增多个专业组件
- 📝 优化文档结构和内容

### 修复

- 🔧 修复多种构建问题
- 🔧 修复视频分析性能问题
- 🔧 优化内存占用

---

## v1.0.0 (2026-03-22)

### 新增

- ✨ **初始版本发布** — CutDeck 正式发布
- ✨ **基础 AI 视频分析功能** — 剧情分析、高光识别
- ✨ **智能剪辑工作流** — 自动和半自动两种剪辑模式
- ✨ **多格式导出支持** — MP4、剪映草稿、PR 项目等
- ✨ **React + TypeScript + Vite 技术栈** — 现代化前端架构
- ✨ **Tauri 桌面应用支持** — 跨平台桌面应用框架
- ✨ **Ant Design 5 UI 组件库** — 专业级界面设计

### 功能

- 🎬 剧情分析 — AI 理解视频叙事结构
- ✂️ 智能剪辑 — 一键生成剪辑方案
- 🎙️ AI 配音 — 多音色语音合成
- 🎵 智能混剪 — 自动节奏卡点
- 📝 字幕生成 — ASR + OCR 双重识别
- 🎨 自动包装 — 字幕样式、封面设计

---

## 版本规范

CutDeck 遵循语义化版本规范 (SemVer)：

```
主版本.次版本.修订版本

- 主版本 (major): 不兼容的 API 变更
- 次版本 (minor): 向后兼容的功能新增
- 修订版本 (patch): 向后兼容的问题修复
```

---

## 关于版本发布

关于版本发布的详细信息，请查看 [GitHub Releases](https://github.com/Agions/CutDeck/releases)。

---

## 下一步

- [常见问题](./faq.md) — 常见问题解答
- [贡献指南](./contributing.md) — 参与项目贡献
- [GitHub Releases](https://github.com/Agions/CutDeck/releases) — 查看完整发布说明
