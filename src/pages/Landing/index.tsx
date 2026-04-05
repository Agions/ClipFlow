/**
 * CutDeck Landing Page - AI Cinema Studio Design
 * 深炭底 + 琥珀光 + 电青色 设计系统
 */

import React, { useEffect, useRef } from 'react';
import styles from './index.module.css';

// 功能特性数据
const features = [
  {
    icon: '🎬',
    title: 'AI 字幕',
    description: '自动识别语音并生成精准字幕，支持多语言翻译，一键添加到视频',
  },
  {
    icon: '✨',
    title: '高光检测',
    description: 'AI 智能识别视频中的精彩瞬间，精准定位每个高光时刻',
  },
  {
    icon: '🎯',
    title: '智能分段',
    description: '自动分析内容结构，将长视频智能分割为适合短视频的片段',
  },
  {
    icon: '🎨',
    title: '视频特效',
    description: '内置丰富转场特效和滤镜，让你的视频更具专业质感',
  },
];

// 步骤数据
const steps = [
  {
    emoji: '📤',
    title: '上传视频',
    description: '支持多种格式，快速上传至云端处理',
  },
  {
    emoji: '🧠',
    title: 'AI 分析',
    description: '智能识别内容，定位精彩片段与高光时刻',
  },
  {
    emoji: '✂️',
    title: '获得片段',
    description: '一键导出爆款短视频，直接发布至各平台',
  },
];

export const LandingPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = (x?: number, y?: number) => {
      const p = {
        x: x ?? Math.random() * canvas.width,
        y: y ?? Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      };
      particles.push(p);
      if (particles.length > 80) particles.shift();
    };

    const initParticles = () => {
      for (let i = 0; i < 50; i++) {
        createParticle();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ambient glow orbs
      const time = Date.now() * 0.001;
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.5) * 50,
        canvas.height * 0.4 + Math.cos(time * 0.3) * 30,
        0,
        canvas.width * 0.3,
        canvas.height * 0.4,
        300
      );
      gradient1.addColorStop(0, 'rgba(0, 212, 255, 0.08)');
      gradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.4) * 60,
        canvas.height * 0.6 + Math.sin(time * 0.6) * 40,
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        250
      );
      gradient2.addColorStop(0, 'rgba(255, 159, 67, 0.06)');
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulseAlpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));

        // Draw particle glow
        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glowGradient.addColorStop(0, `rgba(0, 212, 255, ${pulseAlpha})`);
        glowGradient.addColorStop(0.5, `rgba(0, 212, 255, ${pulseAlpha * 0.3})`);
        glowGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Draw core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${pulseAlpha})`;
        ctx.fill();
      }

      // Occasionally spawn new particles
      if (Math.random() < 0.05) {
        createParticle(0, Math.random() * canvas.height);
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className={styles.landing}>
      {/* Particle Canvas Background */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <svg viewBox="0 0 40 40" className={styles.logoIcon}>
              <defs>
                <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9F43" />
                  <stop offset="100%" stopColor="#FF6B35" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#navLogoGrad)" />
              <path d="M14 12L28 20L14 28V12Z" fill="white" />
            </svg>
            <span className={styles.logoText}>CutDeck</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>功能</a>
            <a href="#steps" className={styles.navLink}>工作流</a>
          </div>
          <div className={styles.navActions}>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navGithub}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow1} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>AI 剪辑，一键出片</h1>
          <p className={styles.heroSubtitle}>
            上传长视频，AI 自动分析精彩片段，一键生成爆款短视频
          </p>
          <a href="#features" className={styles.heroCta}>
            开始创作
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            AI 驱动 · 智能分析 · 快速出片
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="steps" className={styles.steps}>
        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>{step.emoji}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={styles.stepConnector}>
                  <svg viewBox="0 0 100 20" className={styles.connectorSvg}>
                    <line
                      x1="0" y1="10" x2="70" y2="10"
                      stroke="#FF9F43"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                    <path
                      d="M65 5 L75 10 L65 15"
                      fill="none"
                      stroke="#FF9F43"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2 className={styles.featuresTitle}>强大的 AI 能力</h2>
        <p className={styles.featuresSubtitle}>一站式解决视频创作难题</p>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{feature.icon}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <svg viewBox="0 0 40 40" className={styles.footerLogo}>
              <defs>
                <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9F43" />
                  <stop offset="100%" stopColor="#FF6B35" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#footerLogoGrad)" />
              <path d="M14 12L28 20L14 28V12Z" fill="white" />
            </svg>
            <span className={styles.footerBrandName}>CutDeck</span>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerGithub}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>View on GitHub</span>
          </a>
        </div>
        <div className={styles.footerCopy}>
          &copy; 2025-2026 CutDeck. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
