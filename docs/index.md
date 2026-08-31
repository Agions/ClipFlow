---
layout: home

hero:
  name: StoryFab
  text: AI 影视解说创作工坊
  tagline: Tauri 2 + React 18 + Rust · 本地优先 · 全链路自动化
  image:
    src: /favicon.svg
    alt: StoryFab
  actions:
    - theme: brand
      text: 快速开始
      link: /getting-started/introduction
    - theme: alt
      text: 功能指南
      link: /features/commentary-mode

features:
  - title: 剪辑模式
    details: AI 自动识别视频高光，智能切分为片段，支持多比例导出。
  - title: 解说模式
    details: 5 步 Agent Pipeline 生成解说视频，Director Agent 把控叙事节奏。
  - title: 本地 Whisper
    details: faster-whisper 离线转字幕，完全断网可用，零隐私风险。
  - title: 多比例导出
    details: 9:16、1:1、16:9、4:5、21:9，硬字幕烧录，一键分发多平台。
  - title: Tauri 2 + React 18
    details: Tauri 2 桌面框架 + React 18 生态成熟，安装包 ~10MB，内存占用 ~50MB。
  - title: TTS 配音
    details: Edge TTS / Azure TTS 双引擎，几十种音色任选，支持自定义导入。
  - title: Director Agent
    details: 多轮对话式策划，AI 自动分析视频内容，生成节奏可控的解说脚本。
  - title: 隐私优先
    details: 视频、字幕、脚本 100% 不离开设备，本地 Rust 引擎全链路处理。
---

## 一句话

把长视频 → 高光片段 + 解说词 + TTS 配音 + 字幕烧录，全链路在桌面应用内完成。

## 技术栈

| 层级 | 技术 | 定位 |
| --- | --- | --- |
| 桌面壳 | Tauri 2 | 安装包 ~10MB，内存 ~50MB，跨平台统一体验 |
| 前端 UI | React 18 + Vite | 组件化、生态成熟、开发效率高 |
| 原生引擎 | Rust | FFmpeg 调用、Whisper 推理、文件系统，极致性能 |
| AI 调用 | 本地 / 可配置 API | 可选云端大模型补充，基础能力完全离线 |

## 适用场景

- **内容创作者**：把直播回放 / 长视频批量切条分发
- **教育工作者**：把课堂录像加解说 + 字幕二次分发
- **小型团队**：零代码完成短片、解说、字幕的完整闭环

[开始创作 →](/getting-started/introduction)
