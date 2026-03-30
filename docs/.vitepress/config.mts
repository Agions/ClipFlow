import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'StoryForge',
  description: 'AI 驱动的专业智能视频剪辑工具',
  
  base: '/StoryForge/',
  
  lang: 'zh-CN',
  
  cleanUrls: true,
  
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/StoryForge/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['script', { id: 'check-dark-mode' }, `
      (function() {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.style.backgroundColor = "#ffffff";
        document.body.style.color = "#3c3c43";
      })();
    `],
    ['style', {}, `
      html, body, .vp-nav, .VPContent, .vp-doc, .VPHero, .VPFeature, .VPFooter {
        background-color: #ffffff !important;
        color: #3c3c43 !important;
      }
      html.dark, html.dark body {
        background-color: #ffffff !important;
        color: #3c3c43 !important;
      }
      .vp-c-text-1 { color: #3c3c43 !important; }
      .vp-c-text-2 { color: #67676c !important; }
      .vp-c-bg { background-color: #ffffff !important; }
      .vp-c-bg-alt { background-color: #f6f6f7 !important; }
      .vp-c-bg-soft { background-color: #f6f6f7 !important; }
      .vp-nav { background-color: #ffffff !important; }
      .VPNavBar { background-color: #ffffff !important; }
      .VPFooter { background-color: #ffffff !important; }
    `],
  ],

  appearance: false,

  themeConfig: {
    logo: 'logo.svg',
    siteTitle: 'StoryForge',
    
    nav: [
      { text: '文档', link: '/' },
      { text: '快速开始', link: '/getting-started' },
      { text: '功能介绍', link: '/features' },
      { 
        text: '更多',
        items: [
          { text: '安装配置', link: '/installation' },
          { text: 'AI 模型配置', link: '/ai-config' },
          { text: '常见问题', link: '/faq' },
        ]
      },
      { 
        text: 'GitHub',
        link: 'https://github.com/Agions/StoryForge' 
      }
    ],

    sidebar: {
      '/': [
        {
          text: '入门',
          items: [
            { text: '概述', link: '/' },
            { text: '快速开始', link: '/getting-started' },
            { text: '功能介绍', link: '/features' },
          ]
        },
        {
          text: '指南',
          items: [
            { text: '安装配置', link: '/installation' },
            { text: 'AI 模型配置', link: '/ai-config' },
            { text: '项目结构', link: '/project-structure' },
          ]
        },
        {
          text: '其他',
          items: [
            { text: '常见问题', link: '/faq' },
            { text: '更新日志', link: '/changelog' },
          ]
        }
      ]
    },

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2025-2026 Agions'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/StoryForge' }
    ],

    editLink: {
      pattern: 'https://github.com/Agions/StoryForge/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    search: {
      provider: 'local'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },

  sitemap: {
    hostname: 'https://agions.github.io/StoryForge'
  }
})
