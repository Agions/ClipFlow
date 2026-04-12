---
layout: home

title: CutDeck
titleTemplate: false

hero:
  name: CutDeck
  text: AI 智能视频剪辑工具
  tagline: 长视频自动拆条为爆款短片 · 多格式导出 · 本地 Whisper 字幕
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

<!-- Hero Tag -->
<div class="cd-hero-tag">
  <span class="cd-hero-tag-inner">
    <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.5" fill="#10B981"/></svg>
    v1.9.1 已发布
  </span>
</div>

<!-- Social Proof Bar -->
<div class="cd-proof-bar">
  <span class="cd-proof-item">
    <svg class="cd-proof-dot" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.5" fill="#F59E0B"/></svg>
    MIT License
  </span>
  <span class="cd-proof-sep">·</span>
  <span class="cd-proof-item">
    <svg class="cd-proof-dot" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.5" fill="#60A5FA"/></svg>
    Rust + FFmpeg 渲染
  </span>
  <span class="cd-proof-sep">·</span>
  <span class="cd-proof-item">
    <svg class="cd-proof-dot" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.5" fill="#8B5CF6"/></svg>
    TypeScript Strict
  </span>
  <span class="cd-proof-sep">·</span>
  <span class="cd-proof-item">
    <svg class="cd-proof-dot" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="3.5" fill="#10B981"/></svg>
    本地 Whisper ASR
  </span>
</div>

<!-- Comparison Table -->
<section class="cd-section">
  <h2 class="cd-section-title">与"传统剪辑软件"对比</h2>
  <div class="cd-compare-table">
    <div class="cd-compare-row cd-compare-header">
      <div></div>
      <div><strong>传统 Premiere / Final Cut</strong></div>
      <div><strong>CutDeck</strong></div>
    </div>
    <div class="cd-compare-row">
      <div class="cd-compare-dim">上手难度</div>
      <div class="cd-compare-old">专业门槛高，需数周学习</div>
      <div class="cd-compare-new"><span class="cd-compare-highlight">5 分钟上手，AI 自动完成</span></div>
    </div>
    <div class="cd-compare-row">
      <div class="cd-compare-dim">拆条效率</div>
      <div class="cd-compare-old">手动逐帧查找，30 分钟+</div>
      <div class="cd-compare-new"><span class="cd-compare-highlight">AI 自动识别，3 分钟完成</span></div>
    </div>
    <div class="cd-compare-row">
      <div class="cd-compare-dim">字幕制作</div>
      <div class="cd-compare-old">手动听写 + 时间轴，耗时费眼</div>
      <div class="cd-compare-new"><span class="cd-compare-highlight">本地 Whisper 自动生成，断网可用</span></div>
    </div>
    <div class="cd-compare-row">
      <div class="cd-compare-dim">批量处理</div>
      <div class="cd-compare-old">逐个手动导出，效率极低</div>
      <div class="cd-compare-new"><span class="cd-compare-highlight">批量队列并行处理，全自动</span></div>
    </div>
    <div class="cd-compare-row">
      <div class="cd-compare-dim">费用</div>
      <div class="cd-compare-old">订阅制 ¥0/月起，Adobe 全套 ¥500+/月</div>
      <div class="cd-compare-new"><span class="cd-compare-highlight">免费开源，API 费用极低</span></div>
    </div>
  </div>
</section>

<!-- Workflow -->
<section class="cd-section">
  <h2 class="cd-section-title">工作流程</h2>
  <div class="cd-workflow">
    <div class="cd-workflow-step">
      <div class="cd-workflow-num">1</div>
      <div class="cd-workflow-body">
        <div class="cd-workflow-title">导入长视频</div>
        <div class="cd-workflow-desc">拖入 MP4 / MOV / AVI / MKV，系统自动分析</div>
      </div>
    </div>
    <div class="cd-workflow-arrow"><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8h8M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="cd-workflow-step">
      <div class="cd-workflow-num">2</div>
      <div class="cd-workflow-body">
        <div class="cd-workflow-title">AI 6 维评分拆条</div>
        <div class="cd-workflow-desc">画质 / 笑点 / 泪点 / 爽点 / 知识 / 共鸣，自动排序分发</div>
      </div>
    </div>
    <div class="cd-workflow-arrow"><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8h8M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="cd-workflow-step">
      <div class="cd-workflow-num">3</div>
      <div class="cd-workflow-body">
        <div class="cd-workflow-title">本地 Whisper 字幕</div>
        <div class="cd-workflow-desc">faster-whisper 推理，精准时间轴对齐，断网可用</div>
      </div>
    </div>
    <div class="cd-workflow-arrow"><svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8h8M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="cd-workflow-step">
      <div class="cd-workflow-num">4</div>
      <div class="cd-workflow-body">
        <div class="cd-workflow-title">一键导出</div>
        <div class="cd-workflow-desc">H.264/H.265 MP4 / 剪映草稿 / JSON，多平台直出</div>
      </div>
    </div>
  </div>
</section>

<!-- Stats -->
<div class="cd-stats-bar">
  <div class="cd-stat">
    <div class="cd-stat-value">6</div>
    <div class="cd-stat-label">AI 评分维度</div>
  </div>
  <div class="cd-stat-divider"></div>
  <div class="cd-stat">
    <div class="cd-stat-value">3</div>
    <div class="cd-stat-label">导出格式</div>
  </div>
  <div class="cd-stat-divider"></div>
  <div class="cd-stat">
    <div class="cd-stat-value">12+</div>
    <div class="cd-stat-label">视频特效</div>
  </div>
  <div class="cd-stat-divider"></div>
  <div class="cd-stat">
    <div class="cd-stat-value">5</div>
    <div class="cd-stat-label">AI Provider</div>
  </div>
</div>

</div>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Staggered entrance for feature cards
  const cards = document.querySelectorAll('.VPFeature')
  cards.forEach((card, i) => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(16px)'
    card.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`
    requestAnimationFrame(() => {
      card.style.opacity = '1'
      card.style.transform = 'translateY(0)'
    })
  })

  // Workflow steps entrance
  const steps = document.querySelectorAll('.cd-workflow-step')
  steps.forEach((step, i) => {
    step.style.opacity = '0'
    step.style.transform = 'translateY(12px)'
    step.style.transition = `opacity 0.35s ease ${0.1 + i * 0.1}s, transform 0.35s ease ${0.1 + i * 0.1}s`
    requestAnimationFrame(() => {
      step.style.opacity = '1'
      step.style.transform = 'translateY(0)'
    })
  })

  // Stats entrance
  const statsBar = document.querySelector('.cd-stats-bar')
  if (statsBar) {
    statsBar.style.opacity = '0'
    statsBar.style.transition = 'opacity 0.4s ease 0.4s'
    requestAnimationFrame(() => {
      statsBar.style.opacity = '1'
    })
  }

  // Proof bar entrance
  const proofBar = document.querySelector('.cd-proof-bar')
  if (proofBar) {
    proofBar.style.opacity = '0'
    proofBar.style.transition = 'opacity 0.4s ease 0.1s'
    requestAnimationFrame(() => {
      proofBar.style.opacity = '1'
    })
  }

  // Comparison table entrance
  const rows = document.querySelectorAll('.cd-compare-row')
  rows.forEach((row, i) => {
    row.style.opacity = '0'
    row.style.transform = 'translateY(8px)'
    row.style.transition = `opacity 0.3s ease ${0.15 + i * 0.06}s, transform 0.3s ease ${0.15 + i * 0.06}s`
    requestAnimationFrame(() => {
      row.style.opacity = '1'
      row.style.transform = 'translateY(0)'
    })
  })
})
</script>
