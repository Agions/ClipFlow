---
layout: home

hero:
  name: CutDeck
  text: AI 驱动的专业智能视频剪辑
  tagline: 长视频自动拆条 · 多格式导出 · 本地 Whisper 字幕 · Rust 渲染管线
  image:
    src: /logo.svg
    alt: CutDeck
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/Agions/CutDeck

features:
  - icon: 🎯
    title: AI 智能拆条
    details: 6维 AI 评分驱动，自动识别精彩片段，一键分发抖音 / 小红书 / B站
  - icon: 🎬
    title: 多轨时间轴剪辑
    details: FFmpeg 专业渲染管线，多轨道编辑，12+ 视频特效，开箱即用
  - icon: 🎙️
    title: 本地 Whisper 字幕
    details: faster-whisper 本地转写，精准语音识别与时间轴对齐，断网可用
  - icon: ⚡
    title: AI 剧本生成
    details: DeepSeek / GPT 生成剪辑脚本与解说词，自动合成视频
  - icon: 🔒
    title: 本地优先
    details: 全部运行在本地，无需上传云端，隐私安全，断网可用
  - icon: 📦
    title: Tauri 桌面端
    details: Tauri 2 + React 18，原生性能体验，轻量安装包
---

<div id="cutdeck-root">


<div class="cutdeck-section cutdeck-section--dark">

<div class="cutdeck-section-header">
<span class="cutdeck-section-label">系统架构</span>
<h2 class="cutdeck-section-title">Rust 渲染管线 · 真实 AI 分析</h2>
<p class="cutdeck-section-sub">从视频输入到成品导出，每一层都由成熟开源技术驱动</p>
</div>

<div class="architecture-grid">

<div class="architecture-card">
<h4>🎬 视频处理</h4>
<p>FFmpeg 底层驱动，支持 H.264/H.265/VP9 等全部主流格式，多轨合流与转码</p>
<span class="tag tag-ff">FFmpeg</span>
</div>

<div class="architecture-card">
<h4>🧠 AI 高光检测</h4>
<p>Rust 实现 scdet 场景检测 + 音频能量分析，无需模拟数据，直接驱动剪辑评分</p>
<span class="tag tag-rust">Rust active</span>
</div>

<div class="architecture-card">
<h4>🎙️ Whisper 字幕</h4>
<p>faster-whisper 本地推理，精准语音识别 + 时间轴自动对齐，支持中文优化</p>
<span class="tag tag-rust">faster-whisper</span>
</div>

<div class="architecture-card">
<h4>⚡ AI 剪辑引擎</h4>
<p>TypeScript 实现 6维评分（笑声密度/情感峰值/完整度/静默比/节奏/关键词）</p>
<span class="tag tag-ts">TypeScript</span>
</div>

<div class="architecture-card">
<h4>🛠️ Tauri 2 桌面端</h4>
<p>原生系统窗口，Rust 后端 IPC 调用，视频处理不占用主线程 UI 渲染</p>
<span class="tag tag-rust">Tauri 2</span>
</div>

<div class="architecture-card">
<h4>🎨 React 18 前端</h4>
<p>Zustand 状态管理，OKLCH 色彩系统，响应式多轨时间轴，60fps 流畅编辑体验</p>
<span class="tag tag-ts">React 18</span>
</div>

</div>
</div>

<div class="cutdeck-section">

<div class="cutdeck-section-header">
<span class="cutdeck-section-label">快速开始</span>
<h2 class="cutdeck-section-title">3 步开始创作</h2>
<p class="cutdeck-section-sub">从安装到导出第一个短片段，全程不超过 5 分钟</p>
</div>

<div class="steps-grid">

<div class="step-item">
<div class="step-num">1</div>
<div class="step-body">
<h4>安装 CutDeck</h4>
<p>下载对应平台的安装包，无需配置环境，开箱即用</p>
<div class="step-code"># macOS
brew install cutdeck

# Windows
winget install cutdeck

# 或直接下载二进制
https://github.com/Agions/CutDeck/releases</div>
</div>
</div>

<div class="step-item">
<div class="step-num">2</div>
<div class="step-body">
<h4>导入长视频</h4>
<p>拖拽或点击上传，CutDeck 自动分析视频内容（场景 / 高光 / 字幕）</p>
<div class="step-code">支持的格式：MP4 / MKV / MOV / AVI / WebM
最大分辨率：4K (3840 × 2160)
最大时长：无限制</div>
</div>
</div>

<div class="step-item">
<div class="step-num">3</div>
<div class="step-body">
<h4>AI 拆条 + 导出</h4>
<p>选择目标平台（抖音 / 小红书 / B站），AI 自动生成多个短片段并导出</p>
<div class="step-code"># 自动生成 9:16 竖屏片段
cutdeck split --platform douyin --min-duration 30s

# 导出所有片段
cutdeck export --format mp4 --quality high</div>
</div>
</div>

</div>
</div>

<div class="cutdeck-section cutdeck-section--dark">

<div class="cutdeck-section-header">
<span class="cutdeck-section-label">技术栈</span>
<h2 class="cutdeck-section-title">成熟技术，稳健工程</h2>
</div>

<div class="tech-row">
<span class="tech-badge"><span class="badge-icon">⚙️</span> Tauri 2</span>
<span class="tech-badge"><span class="badge-icon">⚛️</span> React 18</span>
<span class="tech-badge"><span class="badge-icon">🔷</span> TypeScript 5</span>
<span class="tech-badge"><span class="badge-icon">🦀</span> Rust</span>
<span class="tech-badge"><span class="badge-icon">🎞️</span> FFmpeg</span>
<span class="tech-badge"><span class="badge-icon">🧠</span> faster-whisper</span>
<span class="tech-badge"><span class="badge-icon">🟡</span> Ant Design 5</span>
<span class="tech-badge"><span class="badge-icon">📊</span> Zustand v5</span>
<span class="tech-badge"><span class="badge-icon">🎨</span> OKLCH 色彩</span>
<span class="tech-badge"><span class="badge-icon">🔒</span> MIT License</span>
</div>
</div>

<div class="footer-cta">
<h3 class="footer-cta-title">开源免费，隐私优先</h3>
<p class="footer-cta-sub">全部处理在本地完成，无需上传、无追踪、无订阅</p>
<div class="footer-cta-actions">
<a href="https://github.com/Agions/CutDeck" class="footer-btn footer-btn-primary">
★ Star on GitHub
</a>
<a href="/guide/quick-start" class="footer-btn footer-btn-secondary">
阅读文档 →
</a>
</div>
</div>
</div>
