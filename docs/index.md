---
layout: home

title: CutDeck
titleTemplate: false

hero:
  name: CutDeck
  text: AI 智能视频剪辑工具
  tagline: 长视频一键智能剪辑为爆款短片 · 多格式导出 · 本地 Whisper 字幕
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
  - icon:
      src: /icons/clip.svg
    title: AI 智能拆条
    details: 6 维 AI 评分，自动识别高光片段，一键分发至抖音 / 小红书 / B 站
  - icon:
      src: /icons/timeline.svg
    title: 多轨时间轴剪辑
    details: FFmpeg 专业渲染管线，多轨道编辑，12+ 视频特效，开箱即用
  - icon:
      src: /icons/subtitle.svg
    title: 本地 Whisper 字幕
    details: faster-whisper 本地推理，精准语音识别与时间轴对齐，断网可用
  - icon:
      src: /icons/script.svg
    title: AI 剧本生成
    details: DeepSeek / GPT 生成解说词，自动合成视频，批量处理无压力
  - icon:
      src: /icons/lock.svg
    title: 本地优先
    details: 全部运行在本地，无需上传云端，隐私安全，断网可用
  - icon:
      src: /icons/desktop.svg
    title: Tauri 桌面端
    details: Tauri 2 + React 18，原生性能体验，轻量安装包

footer: false
---

<div class="cd-home">
  <!-- Shimmer Tag -->
  <div class="cd-hero-tag">
    <span class="cd-hero-tag-inner">v2.0 · now with Tauri ✦</span>
  </div>

  <!-- Platform Proof Bar -->
  <div class="cd-proof-bar">
    <div class="cd-proof-item">
      <span class="cd-proof-dot" style="background:#F59E0B"></span>
      <span>GitHub Stars</span>
    </div>
    <span class="cd-proof-sep">·</span>
    <div class="cd-proof-item">
      <span class="cd-proof-dot" style="background:#10B981"></span>
      <span>FFmpeg</span>
    </div>
    <span class="cd-proof-sep">·</span>
    <div class="cd-proof-item">
      <span class="cd-proof-dot" style="background:#60A5FA"></span>
      <span>Tauri 2</span>
    </div>
    <span class="cd-proof-sep">·</span>
    <div class="cd-proof-item">
      <span class="cd-proof-dot" style="background:#A78BFA"></span>
      <span>faster-whisper</span>
    </div>
  </div>

  <!-- Stats Bar -->
  <div class="cd-stats-bar">
    <div class="cd-stat">
      <span class="cd-stat-value">6+</span>
      <span class="cd-stat-label">AI 评分维度</span>
    </div>
    <div class="cd-stat-divider"></div>
    <div class="cd-stat">
      <span class="cd-stat-value">12+</span>
      <span class="cd-stat-label">视频特效</span>
    </div>
    <div class="cd-stat-divider"></div>
    <div class="cd-stat">
      <span class="cd-stat-value">3</span>
      <span class="cd-stat-label">一键分发平台</span>
    </div>
    <div class="cd-stat-divider"></div>
    <div class="cd-stat">
      <span class="cd-stat-value">MIT</span>
      <span class="cd-stat-label">开源协议</span>
    </div>
  </div>

  <!-- Workflow -->
  <div class="cd-section">
    <div class="cd-section-title">工作流</div>
    <div class="cd-workflow">
      <div class="cd-workflow-step">
        <span class="cd-workflow-num">1</span>
        <div>
          <div class="cd-workflow-title">📥 导入视频</div>
          <p class="cd-workflow-desc">拖拽或选择本地视频文件</p>
        </div>
      </div>
      <div class="cd-workflow-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <div class="cd-workflow-step">
        <span class="cd-workflow-num">2</span>
        <div>
          <div class="cd-workflow-title">⚙️ 设置参数</div>
          <p class="cd-workflow-desc">选择输出格式 &amp; 时长</p>
        </div>
      </div>
      <div class="cd-workflow-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <div class="cd-workflow-step">
        <span class="cd-workflow-num">3</span>
        <div>
          <div class="cd-workflow-title">🤖 AI 分析</div>
          <p class="cd-workflow-desc">6 维评分 · 自动拆条</p>
        </div>
      </div>
      <div class="cd-workflow-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <div class="cd-workflow-step">
        <span class="cd-workflow-num">4</span>
        <div>
          <div class="cd-workflow-title">🎬 导出发布</div>
          <p class="cd-workflow-desc">多格式导出 · 一键分发</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Compare -->
  <div class="cd-section">
    <div class="cd-section-title">为什么选择 CutDeck</div>
    <div class="cd-compare-table">
      <div class="cd-compare-header">
        <div></div>
        <div>传统剪辑</div>
        <div>✦ CutDeck</div>
      </div>
      <div class="cd-compare-row">
        <div class="cd-compare-dim">视频编码</div>
        <div class="cd-compare-old">FFmpeg 手动命令</div>
        <div class="cd-compare-highlight">可视化 + 专业管线</div>
      </div>
      <div class="cd-compare-row">
        <div class="cd-compare-dim">平台发布</div>
        <div class="cd-compare-old">各自上传</div>
        <div class="cd-compare-highlight">一键分发 · 3 平台</div>
      </div>
      <div class="cd-compare-row">
        <div class="cd-compare-dim">高光检测</div>
        <div class="cd-compare-old">肉眼逐帧观看</div>
        <div class="cd-compare-highlight">AI 6 维自动评分</div>
      </div>
      <div class="cd-compare-row">
        <div class="cd-compare-dim">隐私安全</div>
        <div class="cd-compare-old">视频上传云端</div>
        <div class="cd-compare-highlight">100% 本地运行</div>
      </div>
    </div>
  </div>
</div>