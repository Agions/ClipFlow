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

<!-- 增强型首页内容 -->

<style>
/* Hero 区域覆盖样式 */
.VPHero {
  padding-top: 80px !important;
}

.VPHero .tagline {
  font-size: 1.2em !important;
  color: rgba(255, 255, 255, 0.7) !important;
  max-width: 600px;
  margin: 0 auto;
}

/* 统计数字动画 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 700px;
  margin: 60px auto 0;
  padding: 0 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: rgba(255, 180, 50, 0.05);
  border: 1px solid rgba(255, 180, 50, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 180, 50, 0.1);
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 180, 50, 0.1);
}

.stat-number {
  font-size: 2.5em;
  font-weight: 700;
  color: #ffb432;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9em;
  color: rgba(255, 255, 255, 0.6);
}

/* 特性区域样式 */
.VPFeatures {
  padding: 80px 0 !important;
}

.VPFeatures::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 180, 50, 0.3), transparent);
}

/* CTA 区域 */
.home-cta {
  text-align: center;
  padding: 80px 20px;
  position: relative;
}

.home-cta::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 180, 50, 0.3), transparent);
}

.cta-title {
  font-size: 2em;
  font-weight: 700;
  color: white;
  margin-bottom: 20px;
}

.cta-subtitle {
  font-size: 1.1em;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 30px;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* 代码预览区域 */
.code-preview {
  max-width: 800px;
  margin: 60px auto 0;
  padding: 0 20px;
}

.code-preview pre {
  border-radius: 12px;
  border: 1px solid rgba(255, 180, 50, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat-number {
    font-size: 1.8em;
  }
  
  .cta-title {
    font-size: 1.5em;
  }
}
</style>

<!-- 统计数据 -->
<div class="stats-grid">
  <div class="stat-item">
    <div class="stat-number">6+</div>
    <div class="stat-label">AI 评分维度</div>
  </div>
  <div class="stat-item">
    <div class="stat-number">12+</div>
    <div class="stat-label">视频特效</div>
  </div>
  <div class="stat-item">
    <div class="stat-number">3</div>
    <div class="stat-label">一键分发平台</div>
  </div>
  <div class="stat-item">
    <div class="stat-number">MIT</div>
    <div class="stat-label">开源协议</div>
  </div>
</div>
