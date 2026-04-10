---
layout: home

hero:
  name: CutDeck
  text: AI 智能视频剪辑工具
  tagline: 长视频自动拆条为爆款短片 · 多格式导出 · 本地 Whisper 字幕
  image:
    imageUrl: /CutDeck/logo.svg
    alt: CutDeck
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/Agions/CutDeck

features:
  - icon: 🎬
    title: AI 智能拆条
    details: 6 维 AI 评分，自动识别高光片段，一键分发至抖音 / 小红书 / B 站
  - icon: 🎞️
    title: 多轨时间轴剪辑
    details: FFmpeg 专业渲染管线，多轨道编辑，12+ 视频特效，开箱即用
  - icon: 🎙️
    title: 本地 Whisper 字幕
    details: faster-whisper 本地推理，精准语音识别与时间轴对齐，断网可用
  - icon: ⚡
    title: AI 剧本生成
    details: DeepSeek / GPT 生成解说词，自动合成视频，批量处理无压力
  - icon: 🔒
    title: 本地优先
    details: 全部运行在本地，无需上传云端，隐私安全，断网可用
  - icon: 📦
    title: Tauri 桌面端
    details: Tauri 2 + React 18，原生性能体验，轻量安装包
---

<script setup>
import { onMounted } from 'vue'

// Add subtle entrance animation to feature cards
onMounted(() => {
  const cards = document.querySelectorAll('.VPFeature')
  cards.forEach((card, i) => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(16px)'
    card.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s`
    requestAnimationFrame(() => {
      card.style.opacity = '1'
      card.style.transform = 'translateY(0)'
    })
  })
})
</script>
